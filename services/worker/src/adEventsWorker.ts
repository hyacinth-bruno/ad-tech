import { Worker, type Job } from "bullmq";
import pino from "pino";
import { QueueName, type AdEventJobData, type AdEventJobName } from "@retail-media/shared";
import { CampaignStatsModel } from "./models/CampaignStats";

const logger = pino({ name: "ad-events-worker" });

/**
 * Consumes impression/click jobs enqueued by ad-delivery-api and rolls them
 * up into a per-campaign, per-day counter document via an atomic $inc
 * upsert. Concurrency is capped so a burst of jobs doesn't hammer MongoDB;
 * BullMQ's built-in retry/backoff (configured at enqueue time) handles
 * transient Mongo connection issues without losing events.
 */
export function startAdEventsWorker(): Worker<AdEventJobData, void, AdEventJobName> {
  const worker = new Worker<AdEventJobData, void, AdEventJobName>(
    QueueName.AdEvents,
    async (job: Job<AdEventJobData, void, AdEventJobName>) => {
      const { campaignId, occurredAt } = job.data;
      const date = occurredAt.slice(0, 10);
      const field = job.name === "impression" ? "impressions" : "clicks";

      await CampaignStatsModel.updateOne(
        { campaignId, date },
        { $inc: { [field]: 1 } },
        { upsert: true }
      );
    },
    {
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      concurrency: 10,
    }
  );

  worker.on("completed", (job) => logger.debug({ jobId: job.id, name: job.name }, "job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "job failed"));

  return worker;
}
