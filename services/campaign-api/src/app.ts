import express, { type Express } from "express";
import { CAMPAIGN_JSON_SCHEMA } from "@retail-media/shared";
import { assetDirectory, assetsRouter } from "./routes/assets";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { campaignsRouter } from "./routes/campaigns";
import { productsRouter } from "./routes/products";
import { storefrontRouter } from "./routes/storefront";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/campaign-schema", (_req, res) => res.json(CAMPAIGN_JSON_SCHEMA));
  app.use("/assets", assetsRouter);
  app.use("/assets", express.static(assetDirectory, { dotfiles: "deny", index: false, setHeaders: (res) => { res.setHeader("X-Content-Type-Options", "nosniff"); } }));
  app.use("/campaigns", campaignsRouter);
  app.use("/products", productsRouter);
  app.use("/store", storefrontRouter);

  return app;
}
