import { Autocomplete, Highlight } from "react-instantsearch";
import type { Hit } from "instantsearch.js";
import { campaignIndexName, type CampaignSearchRecord } from "@/lib/campaignSearch";

// The widget determines detached mode from matchMedia during its initial render.
// Load it on the client to keep mobile markup from conflicting with SSR.
export default function CampaignAutocomplete({ statusFilter }: { statusFilter?: string }) {
  return (<Autocomplete<CampaignSearchRecord>
            placeholder="Search products, headlines or campaign copy…"
            detachedMediaQuery="(max-width: 599px)"
            showRecent={{ storageKey: "northstar-campaign-searches" }}
            indices={[{
              indexName: campaignIndexName,
              getQuery: (item) => item.productName,
              searchParameters: { hitsPerPage: 5, filters: statusFilter && statusFilter !== "all" ? `status:${statusFilter}` : "", attributesToHighlight: ["productName", "headline"], attributesToSnippet: ["bodyCopy:30"] },
              headerComponent: () => <span>Campaign matches</span>,
              noResultsComponent: () => <p>No matching campaigns. Try a shorter search.</p>,
              itemComponent: ({ item, onSelect }) => <button type="button" className="campaign-suggestion" onClick={onSelect}>
                {item.imageUrl && /^https?:\/\//i.test(item.imageUrl) && <img src={item.imageUrl} alt="" />}
                <span><strong><Highlight attribute="productName" hit={item as Hit<CampaignSearchRecord>} /></strong><span><Highlight attribute="headline" hit={item as Hit<CampaignSearchRecord>} /></span></span>
              </button>,
            }]}
          />);
}
