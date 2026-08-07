import { Schema, model } from "mongoose";

const campaignStatsSchema = new Schema(
  {
    campaignId: { type: String, required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD, UTC
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

campaignStatsSchema.index({ campaignId: 1, date: 1 }, { unique: true });

export const CampaignStatsModel = model("CampaignStats", campaignStatsSchema);
