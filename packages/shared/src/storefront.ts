import type { CatalogProduct } from "./product";

export interface ShopSearch {
  products: CatalogProduct[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  processingTimeMS: number;
  facets: Record<string, Record<string, number>>;
  searchId?: string;
  queryID?: string;
  appliedRules: string[];
  queryCategorization?: unknown;
  analyticsRecorded: boolean;
  engine: "algolia" | "mongodb";
}
export interface ShopArticle { objectID: string; title: string; summary: string; body: string; category: string; }
export interface ShopAutocomplete { products: CatalogProduct[]; articles: ShopArticle[]; suggestions: { query: string; label: string }[]; }
export interface ShopConfig {
  algolia: boolean;
  productIndex: string;
  searchableAttributes: string[];
  customRanking: string[];
  ranking: string[];
  features: { personalization: boolean; reRanking: boolean; neuralSearch: boolean; queryCategorization: boolean };
}
export interface ShopEventInput { eventId: string; type: "click" | "cart" | "view"; userToken: string; objectID: string; searchId?: string; position?: number; }
export interface CartItem { product: CatalogProduct; quantity: number; searchId?: string; position?: number; }
export interface DemoOrder { orderId: string; totalCents: number; currency: "USD"; items: { objectID: string; name: string; quantity: number; unitPriceCents: number }[]; }
export interface MerchRule { objectID: string; query: string; category?: string; productIds: string[]; enabled: boolean; }
export interface ShopAnalytics {
  days: number; searches: number; noResultsRate: number; clickThroughRate: number;
  addToCartRate: number; purchaseRate: number; averageClickPosition: number | null;
  orders: number; revenueCents: number; averageOrderValueCents: number;
  topSearches: { query: string; count: number }[];
  noResults: { query: string; count: number }[];
  topProducts: { name: string; clicks: number; carts: number; purchases: number }[];
  categories: { category: string; searches: number; clicks: number; carts: number; purchases: number;
    noResultsRate: number; clickThroughRate: number; addToCartRate: number; purchaseRate: number;
    averageClickPosition: number | null; revenueCents: number; averageOrderValueCents: number }[];
  daily: { date: string; searches: number; clicks: number; purchases: number }[];
  insights: { sent: number; failed: number; pending: number; not_configured: number };
}
