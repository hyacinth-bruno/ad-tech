import algoliasearch from "algoliasearch";

const appId = process.env.ALGOLIA_APP_ID;
const searchKey = process.env.ALGOLIA_SEARCH_API_KEY;
const indexName = process.env.ALGOLIA_CAMPAIGNS_INDEX ?? "campaigns";

const client = appId && searchKey ? algoliasearch(appId, searchKey) : null;
const index = client?.initIndex(indexName) ?? null;

export interface AdCandidate {
  objectID: string;
  productName: string;
  headline: string;
  bodyCopy: string;
  destinationUrl: string;
  imageUrl?: string;
  frequencyCap: number;
}

export interface CandidateQuery {
  category: string;
  placement: "search" | "category" | "pdp";
  keyword?: string;
}

/**
 * Fetches the ranked candidate pool for a placement request. Algolia's own
 * relevance ranking (plus a facet filter on category/placement/status) does
 * the heavy lifting here; frequency capping and final selection happen
 * after, against Redis, which is a much cheaper check than doing it inside
 * the search index.
 */
export async function findCandidates(query: CandidateQuery, hitsPerPage = 5): Promise<AdCandidate[]> {
  if (!index) {
    return [];
  }
  const { hits } = await index.search<AdCandidate>(query.keyword ?? "", {
    filters: `status:active AND categories:${query.category} AND placements:${query.placement}`,
    hitsPerPage,
  });
  return hits;
}
