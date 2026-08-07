/**
 * Campaign JSON Schema (draft-07).
 *
 * This is the single source of truth for what a valid Retail Media campaign
 * looks like. It is consumed two ways:
 *   1. services/campaign-api validates every write against it with ajv.
 *   2. apps/web feeds it into a small ajv-powered adapter that plugs into
 *      Formik's `validate` prop, so the wizard's field-level errors are
 *      generated from the exact same schema the API enforces - no drift
 *      between what the form allows and what the API accepts.
 */
export const CAMPAIGN_JSON_SCHEMA = {
  $id: "https://retail-media-demo/schemas/campaign.schema.json",
  type: "object",
  additionalProperties: false,
  required: [
    "advertiserName",
    "productSku",
    "productName",
    "headline",
    "bodyCopy",
    "destinationUrl",
    "budget",
    "targeting",
    "frequencyCap",
    "schedule",
  ],
  properties: {
    advertiserName: { type: "string", minLength: 2, maxLength: 80 },
    productSku: { type: "string", pattern: "^[A-Za-z0-9_-]{3,32}$" },
    productName: { type: "string", minLength: 2, maxLength: 120 },
    headline: { type: "string", minLength: 5, maxLength: 60 },
    bodyCopy: { type: "string", minLength: 10, maxLength: 160 },
    destinationUrl: { type: "string", format: "uri" },
    imageUrl: { type: "string", format: "uri" },
    budget: {
      type: "object",
      additionalProperties: false,
      required: ["dailyCapCents", "totalCapCents"],
      properties: {
        dailyCapCents: { type: "integer", minimum: 100 },
        totalCapCents: { type: "integer", minimum: 100 },
      },
    },
    targeting: {
      type: "object",
      additionalProperties: false,
      required: ["categories", "placements"],
      properties: {
        categories: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          maxItems: 10,
        },
        keywords: {
          type: "array",
          items: { type: "string", minLength: 1 },
          maxItems: 20,
          default: [],
        },
        placements: {
          type: "array",
          items: { enum: ["search", "category", "pdp"] },
          minItems: 1,
        },
      },
    },
    frequencyCap: {
      type: "object",
      additionalProperties: false,
      required: ["impressionsPerUserPerDay"],
      properties: {
        impressionsPerUserPerDay: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
    schedule: {
      type: "object",
      additionalProperties: false,
      required: ["startDate", "endDate"],
      properties: {
        startDate: { type: "string", format: "date" },
        endDate: { type: "string", format: "date" },
      },
    },
  },
} as const;

export type Placement = "search" | "category" | "pdp";

export type CampaignStatus = "draft" | "active" | "paused" | "ended";

export interface CampaignInput {
  advertiserName: string;
  productSku: string;
  productName: string;
  headline: string;
  bodyCopy: string;
  destinationUrl: string;
  imageUrl?: string;
  budget: {
    dailyCapCents: number;
    totalCapCents: number;
  };
  targeting: {
    categories: string[];
    keywords?: string[];
    placements: Placement[];
  };
  frequencyCap: {
    impressionsPerUserPerDay: number;
  };
  schedule: {
    startDate: string;
    endDate: string;
  };
}

export interface Campaign extends CampaignInput {
  id: string;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}
