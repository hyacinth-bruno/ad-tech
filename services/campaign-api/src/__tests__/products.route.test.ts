import express from "express";
import request from "supertest";

jest.mock("../lib/productCatalog", () => ({ searchProducts: jest.fn() }));
import { searchProducts } from "../lib/productCatalog";
import { productsRouter } from "../routes/products";

const app = express();
app.use("/products", productsRouter);
beforeEach(() => jest.resetAllMocks());

it("passes search, category and pagination to the catalog", async () => {
  const payload = { products: [{ objectID: "algolia-bestbuy-12345" }], total: 140, page: 2, pageSize: 20 };
  (searchProducts as jest.Mock).mockResolvedValue(payload);
  const response = await request(app).get("/products").query({ q: " headphones ", category: "Audio", page: 2 });
  expect(response.status).toBe(200);
  expect(response.body).toEqual(payload);
  expect(searchProducts).toHaveBeenCalledWith("headphones", "Audio", 2, 20);
});

it.each(["page=0", "page=1001", "pageSize=101", "page=501&pageSize=20", "page=1.5", "q[x]=injected", "category[x]=injected", "q=" + "a".repeat(201)])(
  "rejects malformed or excessive query parameters: %s", async (query) => {
    expect((await request(app).get(`/products?${query}`)).status).toBe(422);
    expect(searchProducts).not.toHaveBeenCalled();
  },
);

it("reports a catalog outage rather than silently showing an empty catalog", async () => {
  (searchProducts as jest.Mock).mockRejectedValue(new Error("search unavailable"));
  const response = await request(app).get("/products");
  expect(response.status).toBe(503);
  expect(response.body).toEqual({ error: "catalog_unavailable" });
});
