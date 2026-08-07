import type { Redis } from "ioredis";
import { RedisKey } from "@retail-media/shared";

function todayKey(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function secondsUntilMidnightUTC(now: Date): number {
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 1000));
}

/**
 * Atomically checks whether a user is still under a campaign's daily
 * impression cap, and if so, counts this impression. Uses a single Redis
 * key per (campaign, user, day) with a TTL that expires at UTC midnight, so
 * no cleanup job is needed - Redis garbage-collects the counters itself.
 *
 * Returns true if the impression is allowed (and has now been counted),
 * false if the user has already hit their cap for today.
 */
export async function tryConsumeImpression(
  redis: Redis,
  campaignId: string,
  userId: string,
  capPerDay: number,
  now: Date = new Date()
): Promise<boolean> {
  const key = RedisKey.frequencyCap(campaignId, userId, todayKey(now));

  // INCR is atomic; we only set an expiry the first time the key is created
  // (count === 1) so a slow retry doesn't keep resetting the TTL forward.
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, secondsUntilMidnightUTC(now));
  }

  if (count > capPerDay) {
    // Roll back the increment for the impression we're rejecting, so the
    // counter reflects impressions actually served, not attempts.
    await redis.decr(key);
    return false;
  }
  return true;
}

export async function getImpressionCount(redis: Redis, campaignId: string, userId: string, now: Date = new Date()): Promise<number> {
  const key = RedisKey.frequencyCap(campaignId, userId, todayKey(now));
  const value = await redis.get(key);
  return value ? Number(value) : 0;
}
