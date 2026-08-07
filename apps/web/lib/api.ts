import axios from "axios";
import type { Campaign, CampaignInput } from "@retail-media/shared";

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

export async function createCampaign(input: CampaignInput): Promise<Campaign> {
  const { data } = await campaignApi.post<Campaign>("/campaigns", input);
  return data;
}

export async function setCampaignStatus(id: string, status: string): Promise<Campaign> {
  const { data } = await campaignApi.post<Campaign>(`/campaigns/${id}/status`, { status });
  return data;
}

export interface CopySuggestion {
  headline: string;
  bodyCopy: string;
  rationale: string;
}

export async function getCopySuggestions(input: {
  productName: string;
  advertiserName: string;
  categories: string[];
  placements: string[];
}): Promise<CopySuggestion[]> {
  const { data } = await campaignApi.post<{ suggestions: CopySuggestion[] }>("/campaigns/ai/copy-suggestions", input);
  return data.suggestions;
}

export interface ServedAd {
  campaignId: string;
  headline: string;
  bodyCopy: string;
  destinationUrl: string;
  imageUrl?: string;
}

export async function serveAd(params: { category: string; placement: string; userId: string }): Promise<ServedAd | null> {
  const res = await adDeliveryApi.get<ServedAd>("/serve", { params, validateStatus: (s) => s === 200 || s === 204 });
  return res.status === 204 ? null : res.data;
}

export async function recordClick(params: { campaignId: string; userId: string; placement: string }): Promise<void> {
  await adDeliveryApi.post("/serve/click", params);
}
