import type { ShopAnalytics } from "@retail-media/shared";
import { StoreEventModel, StoreOrderModel, type StoreEvent } from "../models/StoreEvent";
import { storeIndexNames } from "./storeSearch";

export async function deliverInsights(event: StoreEvent) {
  if (event.type === "search") return;
  const appId = process.env.ALGOLIA_APP_ID;
  const key = process.env.ALGOLIA_INSIGHTS_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY;
  if (!appId || !key) {
    await StoreEventModel.updateOne({ eventId: event.eventId }, { $set: { insightsStatus: "not_configured" } });
    return;
  }
  const conversion = event.type === "cart" || event.type === "purchase";
  const payload = {
    eventType: event.type === "click" ? "click" : conversion ? "conversion" : "view",
    ...(conversion ? { eventSubtype: event.type === "cart" ? "addToCart" : "purchase" } : {}),
    eventName: { click: "Product Clicked", cart: "Product Added To Cart", purchase: "Demo Product Purchased", view: "Product Viewed" }[event.type],
    index: storeIndexNames().products, userToken: event.userToken, objectIDs: [event.objectID],
    timestamp: new Date(event.createdAt).getTime(),
    ...(event.queryID && event.type !== "view" ? { queryID: event.queryID } : {}),
    ...(event.type === "click" && event.queryID ? { positions: [event.position] } : {}),
    ...(conversion ? { currency: "USD", value: Math.round((event.price ?? 0) * (event.quantity ?? 1) * 100) / 100,
      objectData: [{ price: event.price ?? 0, quantity: event.quantity ?? 1 }] } : {}),
  };
  let status: "sent" | "failed" = "failed";
  try {
    const response = await fetch("https://insights.algolia.io/1/events", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Algolia-Application-Id": appId, "X-Algolia-API-Key": key },
      body: JSON.stringify({ events: [payload] }), signal: AbortSignal.timeout(4000),
    });
    if (response.ok) status = "sent";
  } catch { /* Keep the persisted event for an explicit retry from the studio. */ }
  await StoreEventModel.updateOne({ eventId: event.eventId }, { $set: { insightsStatus: status } });
}

export async function saveStoreEvent(event: Partial<StoreEvent> & Pick<StoreEvent, "eventId" | "type" | "userToken">) {
  const result = await StoreEventModel.updateOne({ eventId: event.eventId }, { $setOnInsert: event }, { upsert: true });
  if (result.upsertedCount) {
    const saved = await StoreEventModel.findOne({ eventId: event.eventId }).lean();
    if (saved) await deliverInsights(saved);
  }
}

/** Rates use searches with at least one attributed action, not raw event counts. */
export function calculateAnalytics(events: StoreEvent[], orders: { totalCents: number }[], days: number): ShopAnalytics {
  const searches = events.filter((e) => e.type === "search");
  const searchIds = new Set(searches.map((e) => e.eventId));
  const clicks = events.filter((e) => e.type === "click");
  const rate = (type: string) => searches.length ? new Set(events.filter((e) => e.type === type && e.searchId && searchIds.has(e.searchId)).map((e) => e.searchId)).size / searches.length : 0;
  const queries = (source: StoreEvent[]) => {
    const map = new Map<string, number>();
    for (const e of source) if (e.query) map.set(e.query, (map.get(e.query) ?? 0) + 1);
    return [...map].map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  };
  const products = new Map<string, { name: string; clicks: number; carts: number; purchases: number }>();
  const categories = new Map<string, { category: string; searches: number; clicks: number; carts: number; purchases: number }>();
  const daily = new Map<string, { date: string; searches: number; clicks: number; purchases: number }>();
  const insights = { sent: 0, failed: 0, pending: 0, not_configured: 0 };
  for (const e of events) {
    if (e.type !== "search") insights[e.insightsStatus as keyof typeof insights]++;
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    const row = daily.get(day) ?? { date: day, searches: 0, clicks: 0, purchases: 0 };
    if (e.type === "search") row.searches++;
    if (e.type === "click") row.clicks++;
    if (e.type === "purchase") row.purchases++;
    daily.set(day, row);
    if (e.objectID && e.type !== "view") {
      const p = products.get(e.objectID) ?? { name: e.productName || e.objectID, clicks: 0, carts: 0, purchases: 0 };
      if (e.type === "click") p.clicks++;
      if (e.type === "cart") p.carts++;
      if (e.type === "purchase") p.purchases++;
      products.set(e.objectID, p);
    }
    if (e.category) {
      const c = categories.get(e.category) ?? { category: e.category, searches: 0, clicks: 0, carts: 0, purchases: 0 };
      if (e.type === "search") c.searches++;
      if (e.type === "click") c.clicks++;
      if (e.type === "cart") c.carts++;
      if (e.type === "purchase") c.purchases++;
      categories.set(e.category, c);
    }
  }
  const positionedClicks = clicks.filter((e) => e.position !== undefined);
  const revenueCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const categoryMetrics = [...categories.values()].map((c) => {
    const source = events.filter((e) => e.category === c.category);
    const searches = source.filter((e) => e.type === "search");
    const ids = new Set(searches.map((s) => s.eventId));
    const actionRate = (type: string) => searches.length ? new Set(source.filter((e) => e.type === type && e.searchId && ids.has(e.searchId)).map((e) => e.searchId)).size / searches.length : 0;
    const positions = source.filter((e) => e.type === "click" && e.position !== undefined);
    const purchases = source.filter((e) => e.type === "purchase");
    const orderIds = new Set(purchases.map((e) => e.orderId).filter(Boolean));
    const revenueCents = purchases.reduce((sum, e) => sum + Math.round((e.price ?? 0) * 100) * (e.quantity ?? 1), 0);
    return { ...c, noResultsRate: searches.length ? searches.filter((e) => e.totalHits === 0).length / searches.length : 0,
      clickThroughRate: actionRate("click"), addToCartRate: actionRate("cart"), purchaseRate: actionRate("purchase"),
      averageClickPosition: positions.length ? positions.reduce((sum, e) => sum + e.position!, 0) / positions.length : null,
      revenueCents, averageOrderValueCents: orderIds.size ? Math.round(revenueCents / orderIds.size) : 0 };
  });
  return { days, searches: searches.length, noResultsRate: searches.length ? searches.filter((e) => e.totalHits === 0).length / searches.length : 0,
    clickThroughRate: rate("click"), addToCartRate: rate("cart"), purchaseRate: rate("purchase"),
    averageClickPosition: positionedClicks.length ? positionedClicks.reduce((sum, e) => sum + e.position!, 0) / positionedClicks.length : null,
    orders: orders.length, revenueCents, averageOrderValueCents: orders.length ? Math.round(revenueCents / orders.length) : 0,
    topSearches: queries(searches), noResults: queries(searches.filter((e) => e.totalHits === 0)),
    topProducts: [...products.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 10),
    categories: categoryMetrics.sort((a, b) => b.searches - a.searches).slice(0, 10), daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)), insights };
}

export async function getShopAnalytics(days: number): Promise<ShopAnalytics> {
  const createdAt = { $gte: new Date(Date.now() - days * 86400000) };
  const [events, orders] = await Promise.all([StoreEventModel.find({ createdAt }).lean(), StoreOrderModel.find({ createdAt }).select("totalCents").lean()]);
  return calculateAnalytics(events, orders, days);
}
