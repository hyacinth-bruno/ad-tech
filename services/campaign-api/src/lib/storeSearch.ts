import algoliasearch from "algoliasearch";
import { randomUUID } from "node:crypto";
import type { CatalogProduct, ShopSearch, ShopConfig, ShopAutocomplete, ShopArticle } from "@retail-media/shared";
import { getProductsIndex, searchProducts } from "./productCatalog";
import { StoreEventModel } from "../models/StoreEvent";
import { logger } from "./logger";

export const productFields = ["objectID", "source", "sourceProductId", "sku", "name", "brand", "description", "imageUrl", "destinationUrl", "categories", "price", "currency", "popularityScore", "rating"];
export function storeClient() {
  if (!process.env.ALGOLIA_APP_ID || !process.env.ALGOLIA_ADMIN_API_KEY) return null;
  return algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY);
}
export function storeIndexNames() {
  const products = process.env.ALGOLIA_PRODUCTS_INDEX || "products";
  const names = { products, articles: `${products}_articles`, suggestions: `${products}_suggestions` };
  if (Object.values(names).includes(process.env.ALGOLIA_CAMPAIGNS_INDEX || "campaigns")) throw new Error("Storefront indexes must be separate from campaigns");
  return names;
}
let configCache: { at: number; value: ShopConfig } | undefined;
export function clearStoreConfig() { configCache = undefined; }
export async function getStoreConfig(): Promise<ShopConfig> {
  if (configCache && Date.now() - configCache.at < 15000) return configCache.value;
  const index = getProductsIndex();
  const settings = index ? await index.getSettings() : undefined;
  const value: ShopConfig = {
    algolia: Boolean(index), productIndex: storeIndexNames().products,
    searchableAttributes: [...(settings?.searchableAttributes ?? [])],
    customRanking: [...(settings?.customRanking ?? [])], ranking: [...(settings?.ranking ?? [])],
    features: {
      personalization: process.env.ALGOLIA_PERSONALIZATION_ENABLED === "true",
      reRanking: process.env.ALGOLIA_RERANKING_ENABLED === "true",
      neuralSearch: settings?.mode === "neuralSearch",
      queryCategorization: process.env.ALGOLIA_QUERY_CATEGORIZATION_ENABLED === "true",
    },
  };
  configCache = { at: Date.now(), value };
  return value;
}
export interface StoreSearchInput {
  q: string; category?: string; brand?: string; minPrice?: number; maxPrice?: number;
  page: number; userToken: string; preview?: boolean;
}
export async function storeSearch(input: StoreSearchInput): Promise<ShopSearch> {
  const index = getProductsIndex();
  const pageSize = 24;
  let result: ShopSearch;
  if (index) {
    const config = await getStoreConfig();
    const response = await index.search<CatalogProduct>(input.q, {
      page: input.page - 1, hitsPerPage: pageSize,
      facets: ["categories", "brand"], maxValuesPerFacet: 100,
      facetFilters: [input.category ? [`categories:${input.category}`] : [], input.brand ? [`brand:${input.brand}`] : []].filter((v) => v.length),
      numericFilters: [input.minPrice !== undefined ? `price>=${input.minPrice}` : "", input.maxPrice !== undefined ? `price<=${input.maxPrice}` : ""].filter(Boolean),
      attributesToRetrieve: productFields, attributesToHighlight: [],
      clickAnalytics: !input.preview, analytics: !input.preview,
      analyticsTags: ["northstar-storefront", input.category ? "category-page" : "search-page"],
      userToken: input.userToken, enablePersonalization: config.features.personalization,
      enableReRanking: config.features.reRanking, getRankingInfo: true,
    });
    const extra = response as typeof response & { appliedRules?: { objectID: string }[]; extensions?: { queryCategorization?: unknown } };
    result = {
      products: response.hits, total: response.nbHits, page: input.page, pages: Math.min(response.nbPages, Math.ceil(10000 / pageSize)), pageSize,
      processingTimeMS: response.processingTimeMS, facets: response.facets ?? {}, queryID: response.queryID,
      appliedRules: (extra.appliedRules ?? []).map((r) => r.objectID),
      queryCategorization: extra.extensions?.queryCategorization, analyticsRecorded: false, engine: "algolia",
    };
  } else {
    if (input.brand || input.minPrice !== undefined || input.maxPrice !== undefined) throw new Error("Faceted storefront search requires Algolia");
    const local = await searchProducts(input.q, input.category, input.page, pageSize);
    result = { ...local, pages: Math.ceil(local.total / pageSize), processingTimeMS: 0, facets: {}, appliedRules: [], analyticsRecorded: false, engine: "mongodb" };
  }
  if (!input.preview) {
    const searchId = randomUUID();
    try {
      await StoreEventModel.create({ eventId: searchId, type: "search", userToken: input.userToken,
        query: input.q, category: input.category ?? "", queryID: result.queryID, totalHits: result.total,
        objectIDs: result.products.map((p) => p.objectID), position: (input.page - 1) * pageSize,
        insightsStatus: "not_configured" });
      result.searchId = searchId;
      result.analyticsRecorded = true;
    } catch (err) { logger.error({ err }, "Search telemetry could not be saved"); }
  }
  return result;
}

export async function storeAutocomplete(q: string): Promise<ShopAutocomplete> {
  const client = storeClient();
  if (!client) return { products: (await searchProducts(q, undefined, 1, 5)).products, articles: [], suggestions: [] };
  const names = storeIndexNames();
  const { results } = await client.search<CatalogProduct | ShopArticle | { query: string; source: string }>([
    { indexName: names.products, query: q, params: { hitsPerPage: 5, attributesToRetrieve: productFields, attributesToHighlight: [], analytics: false } },
    { indexName: names.articles, query: q, params: { hitsPerPage: 3, attributesToHighlight: [], analytics: false } },
    { indexName: names.suggestions, query: q, params: { hitsPerPage: 5, attributesToHighlight: [], analytics: false } },
  ]);
  const hits = results.map((r) => "hits" in r ? r.hits : []);
  return { products: hits[0] as CatalogProduct[], articles: hits[1] as ShopArticle[],
    suggestions: (hits[2] as { query: string; source: string }[]).map((s) => ({ query: s.query, label: s.source === "popular" ? "Popular search" : "Suggested search" })) };
}
