import amqplib from "amqplib";
import pino from "pino";
import { RABBITMQ_EXCHANGE, RoutingKey } from "@retail-media/shared";

const logger = pino({ name: "campaign-events-consumer" });

/**
 * Binds a durable queue to the campaigns topic exchange and reacts to
 * lifecycle events published by campaign-api. This demo logs and could
 * easily be extended to, e.g., notify Slack when a high-budget campaign
 * goes live, or warm a cache - the point is campaign-api never has to know
 * this consumer exists.
 */
export async function startCampaignEventsConsumer(): Promise<void> {
  const url = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
  const connection = await amqplib.connect(url);
  const channel = await connection.createChannel();

  await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });
  const { queue } = await channel.assertQueue("worker.campaign_events", { durable: true });
  await channel.bindQueue(queue, RABBITMQ_EXCHANGE, `${RoutingKey.CampaignCreated}.#`);
  await channel.bindQueue(queue, RABBITMQ_EXCHANGE, RoutingKey.CampaignCreated);
  await channel.bindQueue(queue, RABBITMQ_EXCHANGE, RoutingKey.CampaignStatusChanged);

  channel.consume(queue, (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      logger.info({ event }, "received campaign event");
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, "failed to process campaign event, nacking without requeue");
      channel.nack(msg, false, false);
    }
  });

  logger.info("campaign events consumer listening");
}
