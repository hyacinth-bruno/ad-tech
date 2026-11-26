import request from "supertest";

jest.mock("../models/Campaign", () => ({
  CampaignModel: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    distinct: jest.fn(),
  },
}));
jest.mock("../lib/rabbitmq", () => ({
  publishEvent: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../lib/algolia", () => ({
  indexCampaign: jest.fn().mockResolvedValue(undefined),
  removeCampaignFromIndex: jest.fn().mockResolvedValue(undefined),
}));

import { createApp } from "../app";
import { CampaignModel } from "../models/Campaign";
import { publishEvent } from "../lib/rabbitmq";
import { indexCampaign } from "../lib/algolia";

const validPayload = {
  advertiserName: "Acme Supplements",
  productSku: "ACME-PROT-001",
  productName: "Whey Protein 1kg",
  headline: "Fuel your workouts with Acme Whey",
  bodyCopy: "Clean-label whey protein, 25g per serving. Ships free over 30 EUR.",
  destinationUrl: "https://shop.example.com/acme-whey-1kg",
  budget: { dailyCapCents: 5000, totalCapCents: 100000 },
  targeting: { categories: ["sports-nutrition"], keywords: ["protein", "whey"], placements: ["search", "pdp"] },
  frequencyCap: { impressionsPerUserPerDay: 3 },
  schedule: { startDate: "2026-09-01", endDate: "2026-09-30" },
};

describe("POST /campaigns", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a payload that violates the shared JSON Schema", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/campaigns")
      .send({ ...validPayload, headline: "Hi" }); // below minLength: 5

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("validation_failed");
    expect(res.body.fields).toHaveProperty("headline");
    expect(CampaignModel.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown placement value not in the schema enum", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/campaigns")
      .send({ ...validPayload, targeting: { ...validPayload.targeting, placements: ["email-blast"] } });

    expect(res.status).toBe(422);
    // ajv reports enum violations on array items at the item's own index
    // path (targeting.placements.0), not the array field itself. Our error
    // map uses that whole string as one flat key, so pass it as a single
    // literal key (array form) rather than a dotted lookup path.
    expect(res.body.fields).toHaveProperty(["targeting.placements.0"]);
  });

  it("persists a valid campaign, publishes a RabbitMQ event, and indexes it in Algolia", async () => {
    const created = { _id: "cmp_123", ...validPayload, status: "draft" };
    (CampaignModel.create as jest.Mock).mockResolvedValue(created);

    const app = createApp();
    const res = await request(app).post("/campaigns").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body._id).toBe("cmp_123");
    expect(CampaignModel.create).toHaveBeenCalledTimes(1);
    expect(CampaignModel.create).toHaveBeenCalledWith(expect.objectContaining({ status: "draft" }));
    expect(publishEvent).toHaveBeenCalledWith(
      "campaign.created",
      expect.objectContaining({ campaignId: "cmp_123", productSku: "ACME-PROT-001" })
    );
    expect(indexCampaign).toHaveBeenCalledWith(created);
  });

  it("still returns 201 if the RabbitMQ publish fails (write already committed)", async () => {
    const created = { _id: "cmp_456", ...validPayload, status: "draft" };
    (CampaignModel.create as jest.Mock).mockResolvedValue(created);
    (publishEvent as jest.Mock).mockRejectedValueOnce(new Error("broker unavailable"));

    const app = createApp();
    const res = await request(app).post("/campaigns").send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body._id).toBe("cmp_456");
  });

  it.each(["draft", "active", "paused", "ended"])("creates a campaign directly in the chosen %s state", async (status) => {
    (CampaignModel.create as jest.Mock).mockImplementationOnce(async (data) => ({ _id: "cmp_status", ...data }));
    const response = await request(createApp()).post("/campaigns").send({ ...validPayload, status });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe(status);
    expect(CampaignModel.create).toHaveBeenCalledWith(expect.objectContaining({ status }));
    expect(indexCampaign).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });

  it("rejects an unsupported initial status before saving", async () => {
    const response = await request(createApp()).post("/campaigns").send({ ...validPayload, status: "scheduled" });
    expect(response.status).toBe(422);
    expect(response.body.fields).toHaveProperty("status");
    expect(CampaignModel.create).not.toHaveBeenCalled();
  });
});

describe("GET /campaigns/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 for a campaign that does not exist", async () => {
    (CampaignModel.findById as jest.Mock).mockResolvedValue(null);
    const app = createApp();
    const res = await request(app).get("/campaigns/does-not-exist");
    expect(res.status).toBe(404);
  });
});

it("suggests sorted categories from all active campaigns without treating categories as an ID", async () => {
  (CampaignModel.distinct as jest.Mock).mockResolvedValue(["Headphones", "Audio"]);
  const response = await request(createApp()).get("/campaigns/categories");
  expect(response.status).toBe(200);
  expect(response.body).toEqual(["Audio", "Headphones"]);
  expect(CampaignModel.distinct).toHaveBeenCalledWith("targeting.categories", { status: "active" });
});
