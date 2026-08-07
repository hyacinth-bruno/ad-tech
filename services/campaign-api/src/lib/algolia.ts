import algoliasearch from "algoliasearch";
import { logger } from "./logger";
import type { CampaignDocument } from "../models/Campaign";

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_API_KEY;
const indexName = process.env.ALGOLIA_CAMPAIGNS_INDEX ?? "campaigns";

const client = appId && adminKey ? algoliasearch(appId, adminKey) : null;
const index = client?.initIndex(indexName) ?? null;

/**
 * Mirrors an active campaign into Algolia so ad-delivery-api can do
 * sub-50ms "best matching campaign for this category/keyword" lookups
 * instead of hitting MongoDB on the hot request path. Called after every
 * create/update via the campaign.created / campaign.updated events.
 */
export async function indexCampaign(campaign: CampaignDocument & { _id: unknown }): Promise<void> {
  if (!index) {
    logger.warn("Algolia not configured (ALGOLIA_APP_ID / ALGOLIA_ADMIN_API_KEY missing) - skipping index write");
    return;
  }
  await index.saveObject({
    objectID: String(campaign._id),
    productSku: campaign.productSku,
    productName: campaign.productName,
    headline: campaign.headline,
    bodyCopy: campaign.bodyCopy,
    destinationUrl: campaign.destinationUrl,
    imageUrl: campaign.imageUrl,
    categories: campaign.targeting!.categories,
    keywords: campaign.targeting!.keywords,
    placements: campaign.targeting!.placements,
    status: campaign.status,
    frequencyCap: campaign.frequencyCap!.impressionsPerUserPerDay,
  });
  logger.info({ campaignId: String(campaign._id) }, "indexed campaign in Algolia");
}

export async function removeCampaignFromIndex(campaignId: string): Promise<void> {
  if (!index) return;
  await index.deleteObject(campaignId);
}
