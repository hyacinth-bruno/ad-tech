import { Router, type Request, type Response } from "express";
import { validateCampaign, RoutingKey, type CampaignCreatedEvent, type CampaignStatusChangedEvent } from "@retail-media/shared";
import { CampaignModel } from "../models/Campaign";
import { publishEvent } from "../lib/rabbitmq";
import { indexCampaign, removeCampaignFromIndex } from "../lib/algolia";
import { generateCopySuggestions } from "../lib/aiCopy";
import { logger } from "../lib/logger";

export const campaignsRouter = Router();

// ---- Create ---------------------------------------------------------------

campaignsRouter.post("/", async (req: Request, res: Response) => {
  const result = validateCampaign(req.body);
  if (!result.valid) {
    return res.status(422).json({ error: "validation_failed", fields: result.errors });
  }

  const doc = await CampaignModel.create(result.data);

  const event: CampaignCreatedEvent = {
    type: "campaign.created",
    campaignId: String(doc._id),
    productSku: doc.productSku,
    // Mongoose's InferSchemaType marks nested subdocuments optional even
    // though they're `required` in the schema; ajv already guaranteed this
    // shape before we got here (see validateCampaign above).
    categories: doc.targeting!.categories,
    occurredAt: new Date().toISOString(),
  };

  try {
    await publishEvent(RoutingKey.CampaignCreated, event);
    await indexCampaign(doc);
  } catch (err) {
    // The campaign is already persisted; a downstream indexing/eventing
    // failure shouldn't roll back the write, but it must be visible.
    logger.error({ err, campaignId: String(doc._id) }, "post-create side effects failed");
  }

  return res.status(201).json(doc);
});

// ---- Read -------------------------------------------------------------

campaignsRouter.get("/", async (req: Request, res: Response) => {
  const { status, category } = req.query;
  const filter: Record<string, unknown> = {};
  if (typeof status === "string") filter.status = status;
  if (typeof category === "string") filter["targeting.categories"] = category;

  const campaigns = await CampaignModel.find(filter).sort({ updatedAt: -1 }).limit(100);
  return res.json(campaigns);
});

campaignsRouter.get("/:id", async (req: Request, res: Response) => {
  const campaign = await CampaignModel.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: "not_found" });
  return res.json(campaign);
});

// ---- Status transitions (draft -> active -> paused/ended) -------------

campaignsRouter.post("/:id/status", async (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  const allowed = ["draft", "active", "paused", "ended"];
  if (!status || !allowed.includes(status)) {
    return res.status(422).json({ error: "validation_failed", fields: { status: `must be one of ${allowed.join(", ")}` } });
  }

  const campaign = await CampaignModel.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: "not_found" });

  const previousStatus = campaign.status;
  campaign.status = status as typeof campaign.status;
  await campaign.save();

  const event: CampaignStatusChangedEvent = {
    type: "campaign.status_changed",
    campaignId: String(campaign._id),
    previousStatus,
    status,
    occurredAt: new Date().toISOString(),
  };

  try {
    await publishEvent(RoutingKey.CampaignStatusChanged, event);
    if (status === "active") {
      await indexCampaign(campaign);
    } else {
      await removeCampaignFromIndex(String(campaign._id));
    }
  } catch (err) {
    logger.error({ err, campaignId: String(campaign._id) }, "post-status-change side effects failed");
  }

  return res.json(campaign);
});

// ---- AI-assisted creative -------------------------------------------------

campaignsRouter.post("/ai/copy-suggestions", async (req: Request, res: Response) => {
  const { productName, advertiserName, categories, placements, tone } = req.body as {
    productName?: string;
    advertiserName?: string;
    categories?: string[];
    placements?: string[];
    tone?: "direct" | "playful" | "premium";
  };

  if (!productName || !advertiserName || !categories?.length || !placements?.length) {
    return res.status(422).json({
      error: "validation_failed",
      fields: { body: "productName, advertiserName, categories, and placements are required" },
    });
  }

  try {
    const result = await generateCopySuggestions({ productName, advertiserName, categories, placements, tone });
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "AI copy suggestion failed");
    return res.status(502).json({ error: "ai_generation_failed" });
  }
});
