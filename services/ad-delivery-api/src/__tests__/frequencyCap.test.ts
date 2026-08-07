import Redis from "ioredis";
import { tryConsumeImpression, getImpressionCount } from "../lib/frequencyCap";

// These tests run against a real Redis instance (REDIS_URL, defaults to
// localhost:6379) rather than a mock - frequency capping is exactly the
// kind of atomic-counter logic that's easy to get subtly wrong with a fake
// client (race conditions, TTL edge cases), so it's worth the real thing.
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

beforeEach(async () => {
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
});

describe("tryConsumeImpression", () => {
  it("allows impressions up to the daily cap and blocks the one after", async () => {
    const cap = 3;
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(await tryConsumeImpression(redis, "cmp_1", "user_1", cap));
    }
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("does not increment the stored count past the cap on rejected attempts", async () => {
    const cap = 2;
    await tryConsumeImpression(redis, "cmp_2", "user_2", cap);
    await tryConsumeImpression(redis, "cmp_2", "user_2", cap);
    await tryConsumeImpression(redis, "cmp_2", "user_2", cap); // rejected
    await tryConsumeImpression(redis, "cmp_2", "user_2", cap); // rejected

    const count = await getImpressionCount(redis, "cmp_2", "user_2");
    expect(count).toBe(2);
  });

  it("tracks separate counters per user for the same campaign", async () => {
    const cap = 1;
    const userA = await tryConsumeImpression(redis, "cmp_3", "user_a", cap);
    const userB = await tryConsumeImpression(redis, "cmp_3", "user_b", cap);
    const userASecond = await tryConsumeImpression(redis, "cmp_3", "user_a", cap);

    expect(userA).toBe(true);
    expect(userB).toBe(true);
    expect(userASecond).toBe(false);
  });

  it("tracks separate counters per campaign for the same user", async () => {
    const cap = 1;
    const campaignX = await tryConsumeImpression(redis, "cmp_x", "user_5", cap);
    const campaignY = await tryConsumeImpression(redis, "cmp_y", "user_5", cap);

    expect(campaignX).toBe(true);
    expect(campaignY).toBe(true);
  });

  it("sets a TTL on the counter so it self-expires (no cleanup job needed)", async () => {
    await tryConsumeImpression(redis, "cmp_ttl", "user_ttl", 5);
    const key = `freq:cmp_ttl:user_ttl:${new Date().toISOString().slice(0, 10)}`;
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(86400);
  });
});
