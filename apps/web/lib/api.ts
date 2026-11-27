import axios from "axios";
import type { Campaign, CampaignInput, ProductSearchResult } from "@retail-media/shared";

export const campaignApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_CAMPAIGN_API_URL,
});

export const adDeliveryApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AD_DELIVERY_API_URL,
});

export async function listCampaigns(params?: { status?: string; category?: string }): Promise<Campaign[]> {
  const { data } = await campaignApi.get<Campaign[]>("/campaigns", { params });
  return data;
}

export async function searchProducts(q = "", signal?: AbortSignal): Promise<ProductSearchResult> {
  const { data } = await campaignApi.get<ProductSearchResult>("/products", { params: { q }, signal });
  return data;
}

export async function listActiveCategories(): Promise<string[]> {
  const { data } = await campaignApi.get<string[]>("/campaigns/categories");
  return data;
}

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data } = await campaignApi.post<Campaign>("/campaigns", input);
  return data;
}

export async function setCampaignStatus(id: string, status: string): Promise<Campaign> {
  const { data } = await campaignApi.post<Campaign>(`/campaigns/${id}/status`, { status });
  return data;
}

export interface ServedAd {
  campaignId: string;
  productSku: string;
  headline: string;
  bodyCopy: string;
  destinationUrl: string;
  imageUrl?: string;
}

export async function serveAd(params: { category: string; placement: string; userId: string; keyword?: string }): Promise<ServedAd | null> {
  const res = await adDeliveryApi.get<ServedAd>("/serve", { params, validateStatus: (s) => s === 200 || s === 204 });
  return res.status === 204 ? null : res.data;
}

export async function recordClick(params: { campaignId: string; userId: string; placement: string }): Promise<void> {
  await adDeliveryApi.post("/serve/click", params);
}
