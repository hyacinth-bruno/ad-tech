import type { ShopSearch, ShopAutocomplete, ShopConfig, CatalogProduct, ShopArticle, ShopEventInput, DemoOrder, CartItem, ShopAnalytics, MerchRule } from "@retail-media/shared";
import { campaignApi } from "./api";

export const money = (value?: number) => value === undefined ? "Price unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
let memoryToken: string | undefined;
export function shopToken(): string {
  const key = "retail-shop-user";
  try {
    const saved = window.localStorage.getItem(key);
    if (saved && /^[A-Za-z0-9_-]{8,160}$/.test(saved)) return saved;
    memoryToken ??= `shop-${crypto.randomUUID()}`;
    window.localStorage.setItem(key, memoryToken);
  } catch { memoryToken ??= `shop-${crypto.randomUUID()}`; }
  return memoryToken;
}
export async function shopSearch(params: Record<string, string | number | undefined>, signal?: AbortSignal): Promise<ShopSearch> {
  return (await campaignApi.get<ShopSearch>("/store/search", { params, signal })).data;
}
export async function autocomplete(q: string, signal?: AbortSignal): Promise<ShopAutocomplete> {
  return (await campaignApi.get<ShopAutocomplete>("/store/autocomplete", { params: { q }, signal })).data;
}
export async function shopConfig(): Promise<ShopConfig> { return (await campaignApi.get<ShopConfig>("/store/config")).data; }
export async function shopProduct(id: string): Promise<CatalogProduct> { return (await campaignApi.get<CatalogProduct>(`/store/products/${encodeURIComponent(id)}`)).data; }
export async function shopArticle(id: string): Promise<ShopArticle> { return (await campaignApi.get<ShopArticle>(`/store/articles/${encodeURIComponent(id)}`)).data; }
export async function shopEvent(input: Omit<ShopEventInput, "eventId" | "userToken">): Promise<void> {
  await campaignApi.post("/store/events", { ...input, eventId: crypto.randomUUID(), userToken: shopToken() });
}
export async function checkout(orderId: string, items: CartItem[]): Promise<DemoOrder> {
  return (await campaignApi.post<DemoOrder>("/store/checkout", { orderId, userToken: shopToken(), items: items.map((i) => ({ objectID: i.product.objectID, quantity: i.quantity, searchId: i.searchId })) })).data;
}
export async function shopAnalytics(days: number): Promise<ShopAnalytics> { return (await campaignApi.get<ShopAnalytics>("/store/studio/analytics", { params: { days } })).data; }
export async function shopRules(): Promise<MerchRule[]> { return (await campaignApi.get<MerchRule[]>("/store/studio/rules")).data; }
