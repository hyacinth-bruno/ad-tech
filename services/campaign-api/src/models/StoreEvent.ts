import { Schema, model, type InferSchemaType } from "mongoose";

const eventSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ["search", "click", "cart", "purchase", "view"] },
  userToken: { type: String, required: true },
  query: { type: String, default: "" },
  category: { type: String, default: "" },
  queryID: String,
  searchId: String,
  orderId: String,
  objectID: String,
  productName: String,
  objectIDs: [String],
  position: Number,
  totalHits: Number,
  price: Number,
  quantity: { type: Number, default: 1 },
  insightsStatus: { type: String, enum: ["sent", "failed", "pending", "not_configured"], default: "pending" },
  createdAt: { type: Date, default: Date.now, index: true },
});
eventSchema.index({ userToken: 1, eventId: 1 });
eventSchema.index({ searchId: 1, type: 1 });
export const StoreEventModel = model("StoreEvent", eventSchema);
export type StoreEvent = InferSchemaType<typeof eventSchema>;

const orderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  userToken: { type: String, required: true },
  totalCents: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  items: [{ _id: false, objectID: String, name: String, quantity: Number, unitPriceCents: Number, searchId: String, position: Number }],
  createdAt: { type: Date, default: Date.now, index: true },
});
export const StoreOrderModel = model("StoreOrder", orderSchema);
