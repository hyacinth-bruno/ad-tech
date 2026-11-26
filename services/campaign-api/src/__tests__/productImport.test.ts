import { productCampaignFields, validateCampaign } from "@retail-media/shared";
import { normalizeProducts } from "../lib/productImport";

const source = {
  objectID: "12345", name: "Sample Headphones", brand: "Example",
  description: "Comfortable over-ear headphones for everyday listening.",
  image: "https://cdn-demo.algolia.com/bestbuy/12345.jpg",
  url: "http://www.bestbuy.com/site/headphones/12345.p",
  categories: ["Audio", "Headphones"], price: 49.99,
};

it("maps sample products into fields accepted by the existing campaign schema", () => {
  const { products } = normalizeProducts([{ ...source, name: "Long product name ".repeat(20), description: "Description ".repeat(100) }]);
  const product = products[0];
  expect(product.destinationUrl).toBe("https://www.bestbuy.com/site/headphones/12345.p");
  const campaign = {
    ...productCampaignFields(product),
    targeting: { categories: product.categories, placements: ["search", "category", "pdp"] },
    budget: { dailyCapCents: 1000, totalCapCents: 10000 },
    schedule: { startDate: "2026-11-26", endDate: "2026-12-26" },
    frequencyCap: { impressionsPerUserPerDay: 3 },
  };
  expect(validateCampaign(campaign).valid).toBe(true);
});

it("skips duplicate source IDs, malformed rows and unsafe destination protocols", () => {
  const result = normalizeProducts([
    source, source, null, { ...source, objectID: "bad id" },
    { ...source, objectID: "54321", url: "javascript:alert(1)" },
    { ...source, objectID: "77777", categories: [] },
  ]);
  expect(result.products).toHaveLength(1);
  expect(result.skipped).toBe(5);
  expect(normalizeProducts([source]).products[0].objectID).toBe(result.products[0].objectID);
});

it("omits unsafe images and supplies usable copy when the description is missing", () => {
  const { products: [product] } = normalizeProducts([{ ...source, description: "", brand: "", image: "data:text/html,bad" }]);
  expect(product.imageUrl).toBeUndefined();
  expect(product.brand).toBe("Best Buy");
  expect(productCampaignFields(product).bodyCopy).toBe("Discover Sample Headphones from Best Buy.");
  expect(() => normalizeProducts({})).toThrow("array");
});

it("decodes source entities into readable product text without interpreting HTML", () => {
  const { products: [product] } = normalizeProducts([{ ...source, name: "Example&#174; &amp; Audio&#x2122;", description: "A &#99999999; sample", brand: "X" }]);
  expect(product.name).toBe("Example® & Audio™");
  expect(product.description).toBe("A � sample");
  expect(product.brand).toBe("Best Buy");
});

it("preserves the sample popularity score and omits ratings outside the five-star scale", () => {
  const { products: [product] } = normalizeProducts([{ ...source, popularity: 7890, rating: 6 }]);
  expect(product.popularityScore).toBe(7890);
  expect(product.rating).toBeUndefined();
});
