/** Historical sample data, separate from paid advertising campaigns. */
export interface CatalogProduct {
  objectID: string;
  source: "algolia-bestbuy";
  sourceProductId: string;
  sku: string;
  name: string;
  brand: string;
  description: string;
  imageUrl?: string;
  destinationUrl: string;
  categories: string[];
  price?: number;
  currency: "USD";
  popularityScore?: number;
  rating?: number;
}

export interface ProductSearchResult {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
}

/** Fill the existing wizard without requiring an AI API key. */
export function productCampaignFields(product: CatalogProduct) {
  return {
    advertiserName: product.brand.slice(0, 80),
    productSku: product.sku,
    productName: product.name.slice(0, 120),
    destinationUrl: product.destinationUrl,
    imageUrl: product.imageUrl ?? "",
    headline: `Explore ${product.name}`.slice(0, 60),
    bodyCopy: (product.description.length >= 10
      ? product.description
      : `Discover ${product.name} from ${product.brand}.`).slice(0, 160),
  };
}
