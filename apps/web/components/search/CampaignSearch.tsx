import dynamic from "next/dynamic";
import { useMemo, type ReactNode } from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import {
  SearchBox, Configure, Highlight, Hits, InstantSearch, InstantSearchSSRProvider,
  Pagination, Snippet, Stats, useInstantSearch, type InstantSearchServerState,
} from "react-instantsearch";
import { history } from "instantsearch.js/es/lib/routers";
import type { Hit, UiState } from "instantsearch.js";
import { campaignIndexName, campaignSearchClient, type CampaignSearchRecord } from "@/lib/campaignSearch";

const CampaignAutocomplete = dynamic(() => import("./CampaignAutocomplete"), { ssr: false, loading: () => <div className="campaign-search-placeholder">Loading campaign search…</div> });

type Props = { serverState?: InstantSearchServerState; url: string; initialError?: boolean; defaultContent?: ReactNode; toolbar?: ReactNode; statusFilter?: string };
type RouteState = { q?: string; page?: number };
const displayParameters = { attributesToHighlight: ["productName", "headline"], attributesToSnippet: ["bodyCopy:30"] };

function CampaignHit({ hit }: { hit: Hit<CampaignSearchRecord> }) {
  return <article className="campaign-hit">
    {hit.imageUrl && /^https?:\/\//i.test(hit.imageUrl) ? <img className="campaign-hit-image" src={hit.imageUrl} alt={hit.productName} loading="lazy" /> : <div className="campaign-hit-image campaign-hit-no-image">No image supplied</div>}
    <div className="campaign-hit-copy">
      <h2><Highlight attribute="productName" hit={hit} /></h2>
      <p className="campaign-hit-headline"><Highlight attribute="headline" hit={hit} /></p>
      <p><Snippet attribute="bodyCopy" hit={hit} /></p>
    </div>
  </article>;
}
function Results({ defaultContent, statusFilter }: { defaultContent?: ReactNode; statusFilter?: string }) {
  const { results, status, error, refresh, indexUiState } = useInstantSearch({ catchError: true });
  if (!indexUiState.query && defaultContent) return <>{defaultContent}</>;
  if (error) return <Alert severity="error" action={<Button onClick={refresh}>Retry</Button>}>Campaign search is unavailable. Please try again.</Alert>;
  return <section id="campaign-results" role="tabpanel" aria-labelledby={statusFilter ? `campaign-tab-${statusFilter}` : undefined} aria-label="Campaign search results" aria-busy={status === "loading" || status === "stalled"} className="campaign-results">
    <div role="status" aria-live="polite"><Stats translations={{ rootElementText: ({ nbHits }) => `${nbHits.toLocaleString()} matching campaigns` }} />{status === "stalled" && <p>Searching campaigns…</p>}</div>
    {!results.__isArtificial && results.nbHits === 0 ? <Box sx={{ py: 6 }}><Typography component="h2" variant="h6">No campaigns found</Typography><Typography color="text.secondary">Try a shorter product name or a different keyword{indexUiState.query ? ` instead of “${indexUiState.query}”` : ""}.</Typography></Box> : <Hits<CampaignSearchRecord> hitComponent={CampaignHit} />}
    <Pagination padding={2} showFirst={false} showLast={false} />
  </section>;
}
export function CampaignSearch({ serverState, url, initialError, defaultContent, toolbar, statusFilter }: Props) {
  const routing = useMemo(() => ({
    router: history<RouteState>({ getLocation: () => typeof window === "undefined" ? new URL(url) as unknown as Location : window.location, cleanUrlOnDispose: false }),
    stateMapping: {
      stateToRoute: (state: UiState): RouteState => ({ q: state[campaignIndexName]?.query || undefined, page: state[campaignIndexName]?.page || undefined }),
      routeToState: (route: RouteState): UiState => ({ [campaignIndexName]: { query: typeof route.q === "string" ? route.q : "", page: Number(route.page) > 0 ? Math.floor(Number(route.page)) : 1 } }),
    },
  }), [url]);
  if (!campaignSearchClient) return <Stack gap={2}><Alert severity="info">Set the public Algolia environment variables to enable campaign search.</Alert>{toolbar}{defaultContent}</Stack>;
  return <InstantSearchSSRProvider {...serverState}>
    <InstantSearch searchClient={campaignSearchClient} indexName={campaignIndexName} routing={routing} insights>
      {/* Own the query during SSR and while autocomplete loads on the client. */}
      <SearchBox hidden />
      <Configure hitsPerPage={9} {...displayParameters} filters={statusFilter && statusFilter !== "all" ? `status:${statusFilter}` : ""} />
      <Stack gap={3} className="campaign-search">
        {initialError && <Alert severity="warning">The initial search could not load. Try searching again.</Alert>}
        <div aria-label="Search campaigns">
          <CampaignAutocomplete statusFilter={statusFilter} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>Type for suggestions. Press Enter to search all campaigns.</Typography>
        </div>
        {toolbar}
        <Results defaultContent={defaultContent} statusFilter={statusFilter} />
      </Stack>
    </InstantSearch>
  </InstantSearchSSRProvider>;
}
