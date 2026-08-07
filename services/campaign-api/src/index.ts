import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app";
import { logger } from "./lib/logger";

const PORT = Number(process.env.PORT ?? 4001);
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/retail_media";

async function main() {
  await mongoose.connect(MONGODB_URI);
  logger.info("connected to MongoDB");

  const app = createApp();
  app.listen(PORT, () => logger.info({ port: PORT }, "campaign-api listening"));
}

main().catch((err) => {
  logger.error({ err }, "campaign-api failed to start");
  process.exit(1);
});
