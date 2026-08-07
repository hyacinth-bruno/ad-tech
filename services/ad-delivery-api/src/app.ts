import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import pino from "pino";
import { serveRouter } from "./routes/serve";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export function createApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/serve", serveRouter);

  return app;
}
