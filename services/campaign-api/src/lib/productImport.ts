import type { CatalogProduct } from "@retail-media/shared";

export const PRODUCT_DATASET_URL = "https://raw.githubusercontent.com/algolia/datasets/master/ecommerce/records.json";

function text(value: unknown): string {
  if (typeof value !== "string") return "";
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ", reg: "®", trade: "™", copy: "©" };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|reg|trade|copy);/gi, (match, entity: string) => {
    if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? match;
    const hex = entity[1].toLowerCase() === "x";
    const code = parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
  }).replace(/\s+/g, " ").trim();
}

function webUrl(value: unknown): string | undefined {
  try {
    const url = new URL(text(value));
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return;
    url.protocol = "https:";
    return url.href;
  } catch { return; }
}

export function normalizeProducts(input: unknown): { products: CatalogProduct[]; skipped: number } {
  if (!Array.isArray(input)) throw new Error("Expected the Algolia dataset to be an array");
  const products = new Map<string, CatalogProduct>();
  let skipped = 0;
  for (const row of input) {
    if (!row || typeof row !== "object") { skipped++; continue; }
    const id = text(row.objectID);
    const name = text(row.name);
    const destinationUrl = webUrl(row.url);
    const categories: string[] = Array.isArray(row.categories)
      ? [...new Set<string>(row.categories.map(text).filter(Boolean))].slice(0, 10) : [];
    if (!/^[A-Za-z0-9_-]{1,29}$/.test(id) || name.length < 2 || !destinationUrl || !categories.length) {
      skipped++;
      continue;
    }
    const objectID = `algolia-bestbuy-${id}`;
    if (products.has(objectID)) { skipped++; continue; }
    products.set(objectID, {
      objectID, source: "algolia-bestbuy", sourceProductId: id, sku: `BB-${id}`,
      name, brand: [text(row.brand), text(row.manufacturer)].find((brand) => brand.length >= 2) || "Best Buy",
      description: text(row.description) || text(row.shortDescription),
      destinationUrl, imageUrl: webUrl(row.image), categories,
      ...(typeof row.price === "number" && Number.isFinite(row.price) && row.price >= 0 ? { price: row.price } : {}),
      currency: "USD",
      ...(typeof row.popularity === "number" && Number.isFinite(row.popularity) && row.popularity >= 0 ? { popularityScore: row.popularity } : {}),
      ...(typeof row.rating === "number" && row.rating >= 0 && row.rating <= 5 ? { rating: row.rating } : {}),
    });
  }
  return { products: [...products.values()], skipped };
}
