import algoliasearch from "algoliasearch";
import type { CatalogProduct, ProductSearchResult } from "@retail-media/shared";
import { ProductModel } from "../models/Product";

export function getProductsIndex() {
  const { ALGOLIA_APP_ID: appId, ALGOLIA_ADMIN_API_KEY: key } = process.env;
  if (!appId || !key) return null;
  const name = process.env.ALGOLIA_PRODUCTS_INDEX || "products";
  if (name === (process.env.ALGOLIA_CAMPAIGNS_INDEX || "campaigns")) {
    throw new Error("Product and campaign indexes must have different names");
  }
  return algoliasearch(appId, key).initIndex(name);
}

export async function searchProducts(q: string, category: string | undefined, page: number, pageSize: number): Promise<ProductSearchResult> {
  const index = getProductsIndex();
  if (index) {
    const result = await index.search<CatalogProduct>(q, {
      page: page - 1, hitsPerPage: pageSize,
      ...(category ? { facetFilters: [[`categories:${category}`]] } : {}),
    });
    return { products: result.hits, total: result.nbHits, page, pageSize };
  }
  // Local-only development remains usable without an Algolia account.
  const filter: Record<string, unknown> = {};
  if (category) filter.categories = category;
  if (q) {
    const literal = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "brand", "sku"].map((field) => ({ [field]: { $regex: literal, $options: "i" } }));
  }
  const [products, total] = await Promise.all([
    ProductModel.find(filter).select("-_id -__v -createdAt -updatedAt").sort({ name: 1, objectID: 1 })
      .skip((page - 1) * pageSize).limit(pageSize).lean(),
    ProductModel.countDocuments(filter),
  ]);
  return { products, total, page, pageSize };
}
