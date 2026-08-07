import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { campaignsRouter } from "./routes/campaigns";

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/campaigns", campaignsRouter);

  return app;
}
