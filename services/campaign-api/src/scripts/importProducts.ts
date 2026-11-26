import "dotenv/config";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import { normalizeProducts, PRODUCT_DATASET_URL } from "../lib/productImport";
import { getProductsIndex } from "../lib/productCatalog";
import { ProductModel } from "../models/Product";

async function main() {
  const args = process.argv.slice(2);
  let file: string | undefined;
  let limit: number | undefined;
  let dryRun = false;
  let localOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) file = args[++i];
    else if (args[i] === "--limit" && /^[1-9]\d*$/.test(args[i + 1] ?? "")) limit = Number(args[++i]);
    else if (args[i] === "--dry-run") dryRun = true;
    else if (args[i] === "--local-only") localOnly = true;
    else throw new Error("Usage: import:products [--file path] [--limit N] [--dry-run] [--local-only]");
  }
  let input: unknown;
  if (file) input = JSON.parse(await readFile(file, "utf8"));
  else {
    const response = await fetch(PRODUCT_DATASET_URL, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Dataset download failed: HTTP ${response.status}`);
    input = await response.json();
  }
  const normalized = normalizeProducts(input);
  const products = normalized.products.slice(0, limit);
  console.log(JSON.stringify({ source: PRODUCT_DATASET_URL, valid: normalized.products.length, selected: products.length, skipped: normalized.skipped, dryRun }));
  if (!products.length) throw new Error("No valid products to import");
  if (dryRun) return;
  const index = localOnly ? null : getProductsIndex();
  if (!localOnly && !index) throw new Error("Configure ALGOLIA_APP_ID and ALGOLIA_ADMIN_API_KEY, or explicitly use --local-only");
  await mongoose.connect(process.env.MONGODB_URI ?? "mongodb://localhost:27017/retail_media", { serverSelectionTimeoutMS: 10000 });
  await ProductModel.init();
  if (index) {
    const current = await index.getSettings().catch((err) => {
      if (err.status !== 404) throw err;
      return undefined;
    });
    const settings = {
      searchableAttributes: current?.searchableAttributes ?? ["name", "brand", "sku", "categories", "description"],
      attributesForFaceting: [...new Set([...(current?.attributesForFaceting ?? []), "categories", "brand"])],
      paginationLimitedTo: 10000,
    };
    if (!current || Object.entries(settings).some(([key, value]) =>
      JSON.stringify(current[key as keyof typeof current]) !== JSON.stringify(value))) {
      console.log("Configuring the Algolia product index...");
      await index.setSettings(settings).wait();
    }
  }
  for (let i = 0; i < products.length; i += 500) {
    const batch = products.slice(i, i + 500);
    // Stable source IDs make retries safe; existing campaigns are never changed.
    await ProductModel.bulkWrite(batch.map((product) => ({
      updateOne: { filter: { objectID: product.objectID }, update: { $set: product }, upsert: true },
    })));
    console.log(`Saved to MongoDB ${Math.min(i + 500, products.length)}/${products.length}`);
  }
  if (index) {
    console.log(`Indexing ${products.length} products in Algolia...`);
    // The SDK splits the payload into batches and waits for every indexing task.
    await index.saveObjects(products).wait();
  }
  console.log(`Catalog ready: ${await ProductModel.countDocuments({ source: "algolia-bestbuy" })} products in MongoDB${index ? ` and synced to Algolia index ${index.indexName}` : " (local only)"}. No campaigns were launched.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "Product import failed");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
