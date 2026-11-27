const search = jest.fn().mockResolvedValue({ hits: [] });
jest.mock("algoliasearch", () => ({
  __esModule: true,
  default: jest.fn(() => ({ initIndex: () => ({ search }) })),
}));

it("quotes category names with spaces, quotes and filter-like content", async () => {
  const previousApp = process.env.ALGOLIA_APP_ID;
  const previousKey = process.env.ALGOLIA_SEARCH_API_KEY;
  process.env.ALGOLIA_APP_ID = "test";
  process.env.ALGOLIA_SEARCH_API_KEY = "test";
  try {
    const { findCandidates } = await import("../lib/algoliaSearch");
    await findCandidates({ category: 'Audio "Premium" OR status:draft', placement: "search" });
    expect(search).toHaveBeenCalledWith("", {
      filters: 'status:active AND categories:"Audio \\"Premium\\" OR status:draft" AND placements:"search"',
      hitsPerPage: 5,
    });
  } finally {
    if (previousApp === undefined) delete process.env.ALGOLIA_APP_ID;
    else process.env.ALGOLIA_APP_ID = previousApp;
    if (previousKey === undefined) delete process.env.ALGOLIA_SEARCH_API_KEY;
    else process.env.ALGOLIA_SEARCH_API_KEY = previousKey;
  }
});
