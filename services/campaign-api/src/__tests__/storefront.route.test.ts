import express from "express";
import request from "supertest";
jest.mock("../lib/storeSearch", () => ({ storeSearch: jest.fn(), storeAutocomplete: jest.fn(), getStoreConfig: jest.fn() }));
jest.mock("../models/Product", () => ({ ProductModel: { findOne: jest.fn(), countDocuments: jest.fn(), exists: jest.fn() } }));
jest.mock("../models/StoreEvent", () => ({ StoreEventModel: { findOne: jest.fn() }, StoreOrderModel: { findOne: jest.fn(), findOneAndUpdate: jest.fn() } }));
jest.mock("../lib/storeAnalytics", () => ({ saveStoreEvent: jest.fn(), getShopAnalytics: jest.fn() }));
import { storefrontRouter } from "../routes/storefront";
import { storeSearch } from "../lib/storeSearch";
import { ProductModel } from "../models/Product";
import { StoreEventModel, StoreOrderModel } from "../models/StoreEvent";
import { saveStoreEvent } from "../lib/storeAnalytics";

const app = express(); app.use(express.json()); app.use("/store", storefrontRouter);
const product = { objectID: "algolia-bestbuy-1234", name: "Test headphones", price: 49.99 };
beforeEach(() => { jest.resetAllMocks(); (ProductModel.findOne as jest.Mock).mockReturnValue({ lean: async () => product }); });

it.each(["algolia-bestbuy-1234", "BB-1234"])("opens a product by its catalog ID or advertised SKU (%s)", async (id) => {
  (ProductModel.findOne as jest.Mock).mockReturnValue({ select: () => ({ lean: async () => product }) });
  const response = await request(app).get(`/store/products/${id}`);
  expect(response.status).toBe(200);
  expect(response.body.objectID).toBe(product.objectID);
  expect(ProductModel.findOne).toHaveBeenCalledWith({ $or: [{ objectID: id }, { sku: id }] });
});

it.each(["page=0", "page=418", "page=abc", "q[x]=injection", "minPrice=-1", "maxPrice=Infinity", "minPrice=99&maxPrice=10", "userToken=a@b.com"])("validates storefront queries (%s)", async (query) => {
  const r = await request(app).get(`/store/search?${query}`);
  expect(r.status).toBe(422); expect(storeSearch).not.toHaveBeenCalled();
});
it("blocks studio mutations from arbitrary website origins", async () => {
  const r = await request(app).post("/store/studio/relevance").set("Origin", "https://unrelated.example").send({});
  expect(r.status).toBe(403);
});
it("rejects promoting products outside a rule's selected category", async () => {
  (ProductModel.countDocuments as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
  (ProductModel.exists as jest.Mock).mockResolvedValue({ _id: "category-exists" });
  const r = await request(app).post("/store/studio/rules").send({ query: "headphones", category: "Laptops", productIds: [product.objectID] });
  expect(r.status).toBe(422);
  expect(r.body.error).toBe("Promoted products must match the selected category");
});
it("rejects attributing actions to products that were not in the user's search", async () => {
  (StoreEventModel.findOne as jest.Mock).mockReturnValue({ lean: async () => ({ eventId: "search-12345", objectIDs: ["different-product"] }) });
  const r = await request(app).post("/store/events").send({ eventId: "event-12345", userToken: "shop-test-user", type: "click", objectID: product.objectID, searchId: "search-12345" });
  expect(r.status).toBe(422); expect(saveStoreEvent).not.toHaveBeenCalled();
});
it("uses server catalog prices at checkout and records the saved order once", async () => {
  (StoreOrderModel.findOne as jest.Mock).mockReturnValue({ lean: async () => null });
  (StoreOrderModel.findOneAndUpdate as jest.Mock).mockImplementation((_filter, update) => ({ lean: async () => update.$setOnInsert }));
  (saveStoreEvent as jest.Mock).mockResolvedValue(undefined);
  const r = await request(app).post("/store/checkout").send({ orderId: "order-12345", userToken: "shop-test-user", items: [{ objectID: product.objectID, quantity: 2, price: 0.01 }] });
  expect(r.status).toBe(201); expect(r.body.totalCents).toBe(9998);
  expect(saveStoreEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "purchase", price: 49.99, quantity: 2 }));
});
it("returns the existing receipt on retry instead of charging or creating another order", async () => {
  const saved = { orderId: "order-12345", userToken: "shop-test-user", totalCents: 4999, currency: "USD", items: [{ ...product, unitPriceCents: 4999, quantity: 1 }] };
  (StoreOrderModel.findOne as jest.Mock).mockReturnValue({ lean: async () => saved });
  const r = await request(app).post("/store/checkout").send({ orderId: saved.orderId, userToken: saved.userToken, items: [{ objectID: product.objectID, quantity: 1 }] });
  expect(r.status).toBe(200); expect(r.body.totalCents).toBe(4999);
  expect(StoreOrderModel.findOneAndUpdate).not.toHaveBeenCalled();
});
it("rejects duplicate items and quantities outside the demo cart bounds", async () => {
  (StoreOrderModel.findOne as jest.Mock).mockReturnValue({ lean: async () => null });
  for (const items of [[{ objectID: product.objectID, quantity: 21 }], [{ objectID: product.objectID, quantity: 1 }, { objectID: product.objectID, quantity: 1 }]]) {
    const r = await request(app).post("/store/checkout").send({ orderId: "order-12345", userToken: "shop-test-user", items });
    expect(r.status).toBe(422);
  }
  expect(StoreOrderModel.findOneAndUpdate).not.toHaveBeenCalled();
});
