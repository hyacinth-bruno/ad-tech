import request from "supertest";
import express from "express";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let directory: string;
let app: express.Express;
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "retail-assets-"));
  process.env.ASSET_DIRECTORY = directory;
  const { assetsRouter, assetDirectory } = await import("../routes/assets");
  app = express();
  app.use("/assets", assetsRouter);
  app.use("/assets", express.static(assetDirectory));
});
afterAll(async () => { delete process.env.ASSET_DIRECTORY; await rm(directory, { recursive: true, force: true }); });

it("stores uploaded photos under generated names and serves them", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  const result = await request(app).post("/assets").set("Content-Type", "image/png").send(png);
  expect(result.status).toBe(201);
  expect(result.body.path).toMatch(/^\/assets\/[a-f0-9-]+\.png$/);
  const photo = await request(app).get(result.body.path);
  expect(photo.status).toBe(200);
  expect(photo.body).toEqual(png);
});
it("rejects active content disguised as an image", async () => {
  const result = await request(app).post("/assets").set("Content-Type", "image/png").send(Buffer.from('<svg onload="alert(1)"/>'));
  expect(result.status).toBe(415);
});
it("rejects images over the upload limit", async () => {
  const result = await request(app).post("/assets").set("Content-Type", "image/jpeg").send(Buffer.alloc(5 * 1024 * 1024 + 1));
  expect(result.status).toBe(413);
});
