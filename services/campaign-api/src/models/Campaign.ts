import { Schema, model, type InferSchemaType } from "mongoose";

const campaignSchema = new Schema(
  {
    advertiserName: { type: String, required: true },
    productSku: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    headline: { type: String, required: true },
    bodyCopy: { type: String, required: true },
    destinationUrl: { type: String, required: true },
    imageUrl: { type: String },
    budget: {
      dailyCapCents: { type: Number, required: true },
      totalCapCents: { type: Number, required: true },
    },
    targeting: {
      categories: { type: [String], required: true, index: true },
      keywords: { type: [String], default: [] },
      placements: { type: [String], required: true },
    },
    frequencyCap: {
      impressionsPerUserPerDay: { type: Number, required: true },
    },
    schedule: {
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "ended"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index supporting the ad-delivery service's hot-path lookup:
// "active campaigns targeting this category, most recently updated first".
campaignSchema.index({ status: 1, "targeting.categories": 1, updatedAt: -1 });

export type CampaignDocument = InferSchemaType<typeof campaignSchema>;

export const CampaignModel = model("Campaign", campaignSchema);
