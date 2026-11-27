import type { SearchClient } from "instantsearch.js";
import { liteClient } from "algoliasearch/lite";

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY;
export const campaignIndexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? "campaigns";
// Keep the client stable across renders so InstantSearch can reuse its cache.
// Backend services retain v4; the hoisted helper resolves their v4 types.
// InstantSearch supports this v5 client at runtime; bridge that monorepo type boundary.
export const campaignSearchClient = appId && searchKey ? liteClient(appId, searchKey) as unknown as SearchClient : null;
export type CampaignSearchRecord = {
  objectID: string;
  productName: string;
  headline: string;
  bodyCopy: string;
  imageUrl?: string;
};
