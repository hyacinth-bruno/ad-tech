import { Queue } from "bullmq";
import { QueueName, type AdEventJobData, type AdEventJobName } from "@retail-media/shared";

let queue: Queue<AdEventJobData, void, AdEventJobName> | null = null;

function getQueue(): Queue<AdEventJobData, void, AdEventJobName> {
  if (!queue) {
    queue = new Queue(QueueName.AdEvents, {
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
  }
  return queue;
}

/**
 * Enqueues an impression/click event instead of writing analytics
 * synchronously on the ad-serving request. Serving stays fast; the worker
 * (services/worker) aggregates these with retry/backoff off the critical path.
 */
export async function enqueueAdEvent(name: AdEventJobName, data: AdEventJobData): Promise<void> {
  await getQueue().add(name, data);
}
