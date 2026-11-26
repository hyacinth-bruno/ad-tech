import { Router, type Request, type Response, type NextFunction } from "express";
import { randomUUID, createHash } from "node:crypto";
import type { MerchRule } from "@retail-media/shared";
import { getProductsIndex } from "../lib/productCatalog";
import { ProductModel } from "../models/Product";
import { StoreEventModel, StoreOrderModel } from "../models/StoreEvent";
import { storeSearch, storeAutocomplete, getStoreConfig, clearStoreConfig, storeClient, storeIndexNames } from "../lib/storeSearch";
import { saveStoreEvent, getShopAnalytics, deliverInsights } from "../lib/storeAnalytics";
import { SHOP_ARTICLES } from "../lib/storeContent";
import { logger } from "../lib/logger";

export const storefrontRouter = Router();
class StoreError extends Error { constructor(public status: number, message: string) { super(message); } }
function route(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response) => { void fn(req, res).catch((err) => {
    logger.error({ err }, "Storefront request failed");
    res.status(err instanceof StoreError ? err.status : 503).json({ error: err instanceof StoreError ? err.message : "The storefront service is unavailable. Please try again." });
  }); };
}
function string(value: unknown, max = 200, fallback = ""): string {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || value.length > max) throw new StoreError(422, "Invalid text parameter");
  return value.trim();
}
function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,160}$/.test(value)) throw new StoreError(422, "Invalid identifier");
  return value;
}
function price(value: unknown): number | undefined {
  if (value === undefined || value === "") return;
  if (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > 10000000) throw new StoreError(422, "Invalid price");
  return Number(value);
}
async function searchContext(searchId: unknown, userToken: string, objectID: string) {
  if (!searchId) return {};
  const search = await StoreEventModel.findOne({ eventId: identifier(searchId), type: "search", userToken }).lean();
  const offset = search?.objectIDs.indexOf(objectID) ?? -1;
  if (!search || offset < 0) throw new StoreError(422, "Product does not belong to this search");
  return { searchId: search.eventId, queryID: search.queryID, query: search.query,
    category: search.category, position: (search.position ?? 0) + offset + 1 };
}

storefrontRouter.get("/config", route(async (_req, res) => res.json(await getStoreConfig())));
storefrontRouter.get("/search", route(async (req, res) => {
  const pageValue = string(req.query.page, 4, "1");
  if (!/^[1-9]\d*$/.test(pageValue) || (Number(pageValue) - 1) * 24 >= 10000) throw new StoreError(422, "Invalid page");
  const minPrice = price(req.query.minPrice), maxPrice = price(req.query.maxPrice);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new StoreError(422, "Minimum price exceeds maximum price");
  const preview = req.query.preview === "1";
  const result = await storeSearch({ q: string(req.query.q), category: string(req.query.category) || undefined,
    brand: string(req.query.brand, 100) || undefined, minPrice, maxPrice, page: Number(pageValue),
    userToken: req.query.userToken ? identifier(req.query.userToken) : `anonymous-${randomUUID()}`, preview });
  return res.json(result);
}));
storefrontRouter.get("/autocomplete", route(async (req, res) => res.json(await storeAutocomplete(string(req.query.q)))));
storefrontRouter.get("/articles/:id", route(async (req, res) => {
  const article = SHOP_ARTICLES.find((a) => a.objectID === req.params.id);
  if (!article) throw new StoreError(404, "Article not found");
  return res.json(article);
}));
storefrontRouter.get("/products/:id", route(async (req, res) => {
  const id = string(req.params.id, 160);
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(id)) throw new StoreError(422, "Invalid product identifier");
  const product = await ProductModel.findOne({ $or: [{ objectID: id }, { sku: id }] }).select("-_id -__v -createdAt -updatedAt").lean();
  if (!product) throw new StoreError(404, "Product not found");
  return res.json(product);
}));
storefrontRouter.post("/events", route(async (req, res) => {
  const { eventId, type, userToken, objectID, searchId } = req.body;
  if (!["view", "click", "cart"].includes(type)) throw new StoreError(422, "Invalid event type");
  identifier(eventId); identifier(userToken); identifier(objectID);
  const product = await ProductModel.findOne({ objectID }).lean();
  if (!product) throw new StoreError(404, "Product not found");
  const context = await searchContext(searchId, userToken, objectID);
  await saveStoreEvent({ ...context, eventId, type, userToken, objectID, productName: product.name, price: product.price });
  return res.status(202).json({ recorded: true });
}));
storefrontRouter.post("/checkout", route(async (req, res) => {
  const orderId = identifier(req.body.orderId), userToken = identifier(req.body.userToken);
  const existing = await StoreOrderModel.findOne({ orderId }).lean();
  if (existing && existing.userToken !== userToken) throw new StoreError(409, "Order identifier is already in use");
  const requested: unknown = req.body.items;
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > 20) throw new StoreError(422, "Checkout accepts 1–20 different products");
  const items = [];
  const ids = new Set<string>();
  for (const row of requested) {
    if (!row || typeof row !== "object") throw new StoreError(422, "Invalid cart item");
    const objectID = identifier(row.objectID);
    if (ids.has(objectID) || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 20) throw new StoreError(422, "Invalid cart quantity or duplicate product");
    ids.add(objectID);
    const product = await ProductModel.findOne({ objectID }).lean();
    if (!product || product.price === undefined) throw new StoreError(422, "This product has no sample price");
    const context = await searchContext(row.searchId, userToken, objectID);
    items.push({ objectID, name: product.name, quantity: row.quantity, unitPriceCents: Math.round(product.price * 100), ...context });
  }
  const order = existing ?? await StoreOrderModel.findOneAndUpdate({ orderId }, { $setOnInsert: {
    orderId, userToken, items, currency: "USD", totalCents: items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
  } }, { upsert: true, new: true }).lean();
  if (!order || order.userToken !== userToken) throw new StoreError(409, "Order conflict");
  for (const item of order.items) {
    const context = await searchContext(item.searchId, userToken, item.objectID!);
    await saveStoreEvent({ ...context, eventId: `${orderId}-${item.objectID}`, orderId, type: "purchase", userToken,
      objectID: item.objectID, productName: item.name, price: (item.unitPriceCents ?? 0) / 100, quantity: item.quantity ?? 1 });
  }
  return res.status(existing ? 200 : 201).json({ orderId: order.orderId, totalCents: order.totalCents, currency: order.currency, items: order.items });
}));

// These settings mutate the real Algolia index. This demo has no user accounts:
// restrict studio writes to loopback clients and the known local web origin.
export function requireLocalStudio(req: Request, res: Response, next: NextFunction) {
  const address = req.socket.remoteAddress;
  const origin = req.get("Origin");
  const origins = ["http://localhost:3000", "http://127.0.0.1:3000"];
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address ?? "") || (origin && !origins.includes(origin))) {
    return res.status(403).json({ error: "Studio writes are limited to the local demo" });
  }
  next();
}
storefrontRouter.get("/studio/analytics", route(async (req, res) => {
  if (req.query.days !== undefined && !["7", "30"].includes(req.query.days as string)) throw new StoreError(422, "Use a 7 or 30 day window");
  return res.json(await getShopAnalytics(req.query.days === "30" ? 30 : 7));
}));
storefrontRouter.post("/studio/retry-insights", requireLocalStudio, route(async (_req, res) => {
  const events = await StoreEventModel.find({ insightsStatus: { $in: ["failed", "pending"] }, type: { $ne: "search" }, createdAt: { $gte: new Date(Date.now() - 4 * 86400000) } }).sort({ createdAt: 1 }).limit(20).lean();
  await Promise.all(events.map(deliverInsights));
  return res.json({ retried: events.length });
}));
storefrontRouter.post("/studio/relevance", requireLocalStudio, route(async (req, res) => {
  const allowed = ["name", "brand", "sku", "categories", "description"];
  const attrs: unknown = req.body.searchableAttributes;
  const custom: unknown = req.body.customRanking;
  if (!Array.isArray(attrs) || attrs.length !== allowed.length || new Set(attrs).size !== allowed.length || attrs.some((a) => !allowed.includes(a))) throw new StoreError(422, "Order each searchable attribute exactly once");
  if (!Array.isArray(custom) || custom.length > 3 || custom.some((v) => !["desc(popularityScore)", "desc(rating)", "asc(price)", "desc(price)"].includes(v))) throw new StoreError(422, "Invalid custom ranking");
  const index = getProductsIndex();
  if (!index) throw new StoreError(503, "Configure Algolia first");
  const current = await index.getSettings();
  if (JSON.stringify(current.searchableAttributes) !== JSON.stringify(attrs) || JSON.stringify(current.customRanking ?? []) !== JSON.stringify(custom)) {
    await index.setSettings({ searchableAttributes: attrs, customRanking: custom }).wait();
  }
  clearStoreConfig();
  return res.json(await getStoreConfig());
}));
storefrontRouter.get("/studio/rules", route(async (_req, res) => {
  const index = getProductsIndex();
  if (!index) return res.json([]);
  const rules = await index.searchRules("", { hitsPerPage: 100 });
  return res.json(rules.hits.filter((r) => r.objectID.startsWith("store-")).map((r) => {
    const metadata = r.consequence?.userData as Partial<MerchRule> | undefined;
    return { objectID: r.objectID, query: metadata?.query ?? "", category: metadata?.category,
      productIds: r.consequence?.promote?.map((p) => "objectID" in p ? p.objectID : "").filter(Boolean) ?? [], enabled: r.enabled !== false };
  }));
}));
storefrontRouter.post("/studio/rules", requireLocalStudio, route(async (req, res) => {
  const query = string(req.body.query, 100), category = string(req.body.category);
  const productIds: unknown = req.body.productIds;
  if (query.length < 2 || !Array.isArray(productIds) || productIds.length > 10 || (!category && !productIds.length)) throw new StoreError(422, "Supply a query and a category filter or up to 10 promoted products");
  productIds.forEach(identifier);
  if (new Set(productIds).size !== productIds.length || await ProductModel.countDocuments({ objectID: { $in: productIds } }) !== productIds.length) throw new StoreError(422, "Promoted products must exist and be unique");
  if (category && !await ProductModel.exists({ categories: category })) throw new StoreError(422, "Category not found");
  if (category && productIds.length && await ProductModel.countDocuments({ objectID: { $in: productIds }, categories: category }) !== productIds.length) throw new StoreError(422, "Promoted products must match the selected category");
  const index = getProductsIndex();
  if (!index) throw new StoreError(503, "Configure Algolia first");
  const objectID = `store-${createHash("sha256").update(query.toLowerCase()).digest("hex").slice(0, 16)}`;
  const enabled = req.body.enabled !== false;
  const rule = { objectID, enabled, description: `Storefront merchandising for ${query}`,
    conditions: [{ pattern: query, anchoring: "contains" as const, alternatives: true }],
    consequence: { promote: productIds.map((id, position) => ({ objectID: id as string, position })), filterPromotes: true,
      ...(category ? { params: { filters: `categories:${JSON.stringify(category)}` } } : {}), userData: { query, category } } };
  const existing = await index.getRule(objectID).catch((err) => { if (err.status !== 404) throw err; return null; });
  if (!existing || JSON.stringify(existing.conditions) !== JSON.stringify(rule.conditions) || JSON.stringify(existing.consequence) !== JSON.stringify(rule.consequence) || existing.enabled !== enabled) await index.saveRule(rule).wait();
  return res.json({ objectID, query, category, productIds, enabled });
}));
storefrontRouter.delete("/studio/rules/:id", requireLocalStudio, route(async (req, res) => {
  const id = string(req.params.id, 30);
  if (!/^store-[a-f0-9]{16}$/.test(id)) throw new StoreError(422, "Only storefront rules can be deleted here");
  const index = getProductsIndex();
  if (!index) throw new StoreError(503, "Configure Algolia first");
  await index.deleteRule(id).wait();
  return res.status(204).send();
}));
storefrontRouter.post("/studio/sync-suggestions", requireLocalStudio, route(async (_req, res) => {
  const client = storeClient();
  if (!client) throw new StoreError(503, "Configure Algolia first");
  const analytics = await getShopAnalytics(30);
  const rows = analytics.topSearches.map((s) => ({ objectID: `popular-${createHash("sha256").update(s.query).digest("hex").slice(0, 16)}`, query: s.query, count: s.count, source: "popular" }));
  const index = client.initIndex(storeIndexNames().suggestions);
  const wanted = new Set(rows.map((r) => r.objectID));
  const stale: string[] = [];
  await index.browseObjects<{ source: string }>({ batch: (hits) => {
    for (const hit of hits) if (hit.source === "popular" && hit.objectID.startsWith("popular-") && !wanted.has(hit.objectID)) stale.push(hit.objectID);
  } });
  if (stale.length) await index.deleteObjects(stale).wait();
  if (rows.length) await index.saveObjects(rows).wait();
  return res.json({ synced: rows.length, removed: stale.length });
}));
