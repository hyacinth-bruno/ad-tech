import { Schema, model } from "mongoose";
import type { CatalogProduct } from "@retail-media/shared";

const productSchema = new Schema<CatalogProduct>({
  objectID: { type: String, required: true, unique: true },
  source: { type: String, required: true, enum: ["algolia-bestbuy"] },
  sourceProductId: { type: String, required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  brand: { type: String, required: true },
  description: { type: String, default: "" },
  imageUrl: String,
  destinationUrl: { type: String, required: true },
  categories: { type: [String], required: true, index: true },
  price: Number,
  currency: { type: String, required: true, enum: ["USD"] },
  popularityScore: Number,
  rating: Number,
}, { timestamps: true });

export const ProductModel = model<CatalogProduct>("Product", productSchema);
