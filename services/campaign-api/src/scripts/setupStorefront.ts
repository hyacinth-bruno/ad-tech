import "dotenv/config";
import { storeClient, storeIndexNames } from "../lib/storeSearch";
import { SHOP_ARTICLES, SHOP_SUGGESTIONS } from "../lib/storeContent";

async function main() {
  const client = storeClient();
  if (!client) throw new Error("Configure ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY first");
  const names = storeIndexNames();
  const index = client.initIndex(names.products);
  const current = await index.getSettings();
  const settings = {
    attributesForFaceting: [...new Set([...(current.attributesForFaceting ?? []), "categories", "brand"])],
    customRanking: current.customRanking?.length ? current.customRanking : ["desc(popularityScore)", "desc(rating)"],
  };
  if (JSON.stringify(current.attributesForFaceting) !== JSON.stringify(settings.attributesForFaceting) || JSON.stringify(current.customRanking ?? []) !== JSON.stringify(settings.customRanking)) await index.setSettings(settings).wait();
  const articles = client.initIndex(names.articles), suggestions = client.initIndex(names.suggestions);
  const articleSettings = await articles.getSettings().catch((e) => { if (e.status !== 404) throw e; return null; });
  if (!articleSettings) await articles.setSettings({ searchableAttributes: ["title", "summary", "category", "body"] }).wait();
  const suggestionSettings = await suggestions.getSettings().catch((e) => { if (e.status !== 404) throw e; return null; });
  if (!suggestionSettings) await suggestions.setSettings({ searchableAttributes: ["query"], customRanking: ["desc(count)"] }).wait();
  await articles.saveObjects(SHOP_ARTICLES).wait();
  await suggestions.saveObjects(SHOP_SUGGESTIONS.map((query, i) => ({ objectID: `suggested-${i}`, query, count: 0, source: "suggested" }))).wait();
  console.log(JSON.stringify({ ready: true, indexes: names, articles: SHOP_ARTICLES.length, suggestedSearches: SHOP_SUGGESTIONS.length, aiModels: "Activate in the Algolia dashboard; no subscription changes made." }));
}
main().catch((err) => { console.error(err.message); process.exitCode = 1; });
