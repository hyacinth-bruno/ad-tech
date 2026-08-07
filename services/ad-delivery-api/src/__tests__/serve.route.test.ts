import request from "supertest";
import Redis from "ioredis";

jest.mock("../lib/algoliaSearch", () => ({
  findCandidates: jest.fn(),
}));
jest.mock("../lib/queue", () => ({
  enqueueAdEvent: jest.fn().mockResolvedValue(undefined),
}));

import { createApp } from "../app";
import { findCandidates } from "../lib/algoliaSearch";
import { enqueueAdEvent } from "../lib/queue";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

beforeEach(async () => {
  jest.clearAllMocks();
  await redis.flushdb();
});

afterAll(async () => {
  await redis.quit();
});

const candidateA = {
  objectID: "cmp_a",
  productName: "Whey Protein 1kg",
  headline: "Fuel your workouts",
  bodyCopy: "25g protein per serving.",
  destinationUrl: "https://shop.example.com/whey",
  frequencyCap: 1,
};
const candidateB = {
  objectID: "cmp_b",
  productName: "Creatine 500g",
  headline: "Build strength steadily",
  bodyCopy: "5g creatine monohydrate daily.",
  destinationUrl: "https://shop.example.com/creatine",
  frequencyCap: 5,
};

describe("GET /serve", () => {
  it("rejects a request missing required query params", async () => {
    const app = createApp();
    const res = await request(app).get("/serve").query({ category: "sports-nutrition" });
    expect(res.status).toBe(422);
  });

  it("serves the top-ranked candidate and enqueues an impression event", async () => {
    (findCandidates as jest.Mock).mockResolvedValue([candidateA, candidateB]);
    const app = createApp();

    const res = await request(app)
      .get("/serve")
      .query({ category: "sports-nutrition", placement: "pdp", userId: "user_1" });

    expect(res.status).toBe(200);
    expect(res.body.campaignId).toBe("cmp_a");
    expect(enqueueAdEvent).toHaveBeenCalledWith(
      "impression",
      expect.objectContaining({ campaignId: "cmp_a", userId: "user_1", placement: "pdp" })
    );
  });

  it("falls through to the next candidate once the top one hits its frequency cap", async () => {
    (findCandidates as jest.Mock).mockResolvedValue([candidateA, candidateB]);
    const app = createApp();
    const query = { category: "sports-nutrition", placement: "pdp", userId: "user_2" };

    const first = await request(app).get("/serve").query(query);
    expect(first.body.campaignId).toBe("cmp_a"); // cap is 1, now exhausted for user_2

    const second = await request(app).get("/serve").query(query);
    expect(second.body.campaignId).toBe("cmp_b"); // falls through to the next candidate
  });

  it("returns 204 when every candidate is frequency-capped for this user", async () => {
    (findCandidates as jest.Mock).mockResolvedValue([candidateA]);
    const app = createApp();
    const query = { category: "sports-nutrition", placement: "pdp", userId: "user_3" };

    await request(app).get("/serve").query(query); // consumes the only slot (cap: 1)
    const res = await request(app).get("/serve").query(query);

    expect(res.status).toBe(204);
  });
});

describe("POST /serve/click", () => {
  it("records a click event", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/serve/click")
      .send({ campaignId: "cmp_a", userId: "user_1", placement: "pdp" });

    expect(res.status).toBe(202);
    expect(enqueueAdEvent).toHaveBeenCalledWith("click", expect.objectContaining({ campaignId: "cmp_a" }));
  });
});
