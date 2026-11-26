import express, { Router } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const assetDirectory = path.resolve(process.env.ASSET_DIRECTORY ?? "data/assets");
export const assetsRouter = Router();

// Raw bytes avoid multipart parsing and keep uploads bounded. SVG is deliberately excluded.
assetsRouter.post("/", express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "5mb" }), async (req, res, next) => {
  const bytes: unknown = req.body;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return res.status(415).json({ error: "supported_image_required" });
  }
  const type = req.get("content-type")?.split(";")[0];
  const extension = type === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "png"
    : type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "jpg"
    : type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : null;
  if (!extension) return res.status(415).json({ error: "image_signature_mismatch" });
  try {
    await mkdir(assetDirectory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(assetDirectory, filename), bytes, { flag: "wx" });
    return res.status(201).json({ path: `/assets/${filename}` });
  } catch (error) {
    return next(error);
  }
});
