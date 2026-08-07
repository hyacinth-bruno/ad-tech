import "dotenv/config";
import mongoose from "mongoose";
import pino from "pino";
import { startAdEventsWorker } from "./adEventsWorker";
import { startCampaignEventsConsumer } from "./campaignEventsConsumer";

const logger = pino({ name: "worker" });
const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/retail_media";

async function main() {
  await mongoose.connect(MONGODB_URI);
  logger.info("connected to MongoDB");

  startAdEventsWorker();
  logger.info("BullMQ ad-events worker started");

  await startCampaignEventsConsumer();
}

main().catch((err) => {
  logger.error({ err }, "worker failed to start");
  process.exit(1);
});
