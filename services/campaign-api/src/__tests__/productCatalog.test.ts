const search = jest.fn();
const initIndex = jest.fn(() => ({ search }));
jest.mock("algoliasearch", () => ({ __esModule: true, default: jest.fn(() => ({ initIndex })) }));
jest.mock("../models/Product", () => ({ ProductModel: { find: jest.fn(), countDocuments: jest.fn() } }));

import { getProductsIndex, searchProducts } from "../lib/productCatalog";
import { ProductModel } from "../models/Product";

const originalEnv = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv, ALGOLIA_APP_ID: "test-app", ALGOLIA_ADMIN_API_KEY: "test-key" };
  delete process.env.ALGOLIA_PRODUCTS_INDEX;
  delete process.env.ALGOLIA_CAMPAIGNS_INDEX;
});
afterEach(() => { process.env = originalEnv; });

it("refuses a product index configured to overwrite the campaign index", () => {
  process.env.ALGOLIA_PRODUCTS_INDEX = "campaigns";
  expect(() => getProductsIndex()).toThrow("different names");
  expect(initIndex).not.toHaveBeenCalled();
});

it("searches the separate product index with exact category facets and pagination", async () => {
  search.mockResolvedValue({ hits: [{ objectID: "product-1" }], nbHits: 31 });
  const result = await searchProducts("headphones", "Audio & Video", 2, 20);
  expect(initIndex).toHaveBeenCalledWith("products");
  expect(search).toHaveBeenCalledWith("headphones", { page: 1, hitsPerPage: 20, facetFilters: [["categories:Audio & Video"]] });
  expect(result).toEqual({ products: [{ objectID: "product-1" }], total: 31, page: 2, pageSize: 20 });
});

it("treats regex characters as literal text in MongoDB fallback searches", async () => {
  delete process.env.ALGOLIA_ADMIN_API_KEY;
  const chain = { select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
  (ProductModel.find as jest.Mock).mockReturnValue(chain);
  (ProductModel.countDocuments as jest.Mock).mockResolvedValue(0);
  await searchProducts("(a+)+$", undefined, 1, 20);
  const filter = (ProductModel.find as jest.Mock).mock.calls[0][0];
  expect(filter.$or[0].name.$regex).toBe("\\(a\\+\\)\\+\\$");
  expect(search).not.toHaveBeenCalled();
});
