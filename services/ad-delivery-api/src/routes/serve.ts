import { Router, type Request, type Response } from "express";
import { getRedis } from "../lib/redis";
import { findCandidates, type AdCandidate } from "../lib/algoliaSearch";
import { tryConsumeImpression } from "../lib/frequencyCap";
import { enqueueAdEvent } from "../lib/queue";

export const serveRouter = Router();

/**
 * GET /serve?category=sports-nutrition&placement=pdp&userId=u_123
 *
 * Hot-path ad selection:
 *   1. Pull ranked candidates for this placement from Algolia.
 *   2. Walk candidates in ranked order, frequency-capping each against
 *      Redis, and serve the first one the user hasn't maxed out on today.
 *   3. Enqueue an impression event to BullMQ (fire-and-forget from the
 *      response's perspective) instead of writing analytics inline.
 */
serveRouter.get("/", async (req: Request, res: Response) => {
  const { category, placement, userId, keyword } = req.query as {
    category?: string;
    placement?: "search" | "category" | "pdp";
    userId?: string;
    keyword?: string;
  };

  if (!category || !placement || !userId) {
    return res.status(422).json({ error: "validation_failed", fields: { query: "category, placement, and userId are required" } });
  }

  const candidates = await findCandidates({ category, placement, keyword });
  const redis = getRedis();

  let served: AdCandidate | null = null;
  for (const candidate of candidates) {
    const allowed = await tryConsumeImpression(redis, candidate.objectID, userId, candidate.frequencyCap);
    if (allowed) {
      served = candidate;
      break;
    }
  }

  if (!served) {
    return res.status(204).send();
  }

  await enqueueAdEvent("impression", {
    campaignId: served.objectID,
    userId,
    placement,
    occurredAt: new Date().toISOString(),
  });

  return res.json({
    campaignId: served.objectID,
    productSku: served.productSku,
    headline: served.headline,
    bodyCopy: served.bodyCopy,
    destinationUrl: served.destinationUrl,
    imageUrl: served.imageUrl,
  });
});

serveRouter.post("/click", async (req: Request, res: Response) => {
  const { campaignId, userId, placement } = req.body as {
    campaignId?: string;
    userId?: string;
    placement?: "search" | "category" | "pdp";
  };

  if (!campaignId || !userId || !placement) {
    return res.status(422).json({ error: "validation_failed", fields: { body: "campaignId, userId, and placement are required" } });
  }

  await enqueueAdEvent("click", { campaignId, userId, placement, occurredAt: new Date().toISOString() });
  return res.status(202).json({ status: "recorded" });
});
