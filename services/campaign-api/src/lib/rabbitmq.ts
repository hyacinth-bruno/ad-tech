import amqplib, { type Channel, type ChannelModel } from "amqplib";
import { RABBITMQ_EXCHANGE } from "@retail-media/shared";
import { logger } from "./logger";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

/**
 * Lazily connects to RabbitMQ and asserts a topic exchange that downstream
 * services (ad-delivery-api's indexer, the analytics worker) bind their own
 * durable queues to. campaign-api never needs to know who's listening -
 * that's the point of a fan-out exchange over a direct service call.
 */
export async function getChannel(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
  connection = await amqplib.connect(url);
  channel = await connection.createChannel();
  await channel.assertExchange(RABBITMQ_EXCHANGE, "topic", { durable: true });

  connection.on("error", (err) => logger.error({ err }, "RabbitMQ connection error"));
  connection.on("close", () => {
    logger.warn("RabbitMQ connection closed");
    channel = null;
    connection = null;
  });

  return channel;
}

export async function publishEvent(routingKey: string, payload: unknown): Promise<void> {
  const ch = await getChannel();
  const body = Buffer.from(JSON.stringify(payload));
  ch.publish(RABBITMQ_EXCHANGE, routingKey, body, {
    contentType: "application/json",
    persistent: true,
  });
  logger.info({ routingKey }, "published event");
}

export async function closeRabbit(): Promise<void> {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
}
