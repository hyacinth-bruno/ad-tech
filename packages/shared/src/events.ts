/**
 * Cross-service messaging contracts.
 *
 * Two distinct messaging systems are used deliberately, matching how they
 * behave differently in production ad-serving stacks:
 *
 * - RabbitMQ: cross-service domain events (fan-out). When a campaign is
 *   created/updated, campaign-api publishes one event; ad-delivery-api and
 *   the indexing worker each bind their own queue to it independently.
 *   Good fit for "N services need to react to this fact".
 *
 * - BullMQ (Redis-backed): high-volume, single-consumer background jobs -
 *   impression/click events off the hot request path of ad serving, with
 *   retries/backoff. Good fit for "this exact job must run, possibly
 *   millions of times a day, with retry semantics".
 */

// ---- RabbitMQ: domain events -------------------------------------------

export const RABBITMQ_EXCHANGE = "retail_media.campaigns";

export const RoutingKey = {
  CampaignCreated: "campaign.created",
  CampaignUpdated: "campaign.updated",
  CampaignStatusChanged: "campaign.status_changed",
} as const;

export interface CampaignCreatedEvent {
  type: "campaign.created";
  campaignId: string;
  productSku: string;
  categories: string[];
  occurredAt: string;
}

export interface CampaignStatusChangedEvent {
  type: "campaign.status_changed";
  campaignId: string;
  previousStatus: string;
  status: string;
  occurredAt: string;
}

// ---- BullMQ: background jobs -------------------------------------------

export const QueueName = {
  AdEvents: "ad-events",
} as const;

export type AdEventJobName = "impression" | "click";

export interface AdEventJobData {
  campaignId: string;
  userId: string;
  placement: "search" | "category" | "pdp";
  occurredAt: string;
}

// ---- Redis key helpers (frequency capping + hot-campaign cache) --------

export const RedisKey = {
  /** Sorted-set / counter of impressions shown to a user for a campaign today. */
  frequencyCap: (campaignId: string, userId: string, yyyyMmDd: string) =>
    `freq:${campaignId}:${userId}:${yyyyMmDd}`,
  /** Cached, pre-serialized active-campaign lookup by category, short TTL. */
  activeCampaignsByCategory: (category: string) => `cache:campaigns:category:${category}`,
};
