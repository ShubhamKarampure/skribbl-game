import { getRabbitMQChannel } from './queueManager.js'; // Assuming you have this from previous steps
import config from '../config/index.js';
import logger from '../utils/logger.js';

const exchangeName = config.rabbitmq.gameEventsExchange;

/**
 * Publishes an analytics event to RabbitMQ.
 * @param {string} eventName - The name of the event (e.g., 'player_joined_room').
 * @param {object} payload - The data associated with the event.
 */
export const publishAnalyticsEvent = async (eventName, payload) => {
  const channel = getRabbitMQChannel();
  if (!channel) {
    logger.error('[AnalyticsProducer] RabbitMQ channel not available. Cannot publish event:', eventName);
    return;
  }

  const routingKey = `analytics.${eventName}`; // e.g., analytics.player_joined_room
  const eventData = {
    eventName,
    payload,
    timestamp: new Date().toISOString(),
  };

  try {
    // Ensure exchange exists (idempotent)
    await channel.assertExchange(exchangeName, 'topic', { durable: true });
    
    channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(eventData)), {
      persistent: true, // Store message until a consumer acknowledges it
      contentType: 'application/json',
    });
    logger.debug(`[AnalyticsProducer] Event '${eventName}' published with routing key '${routingKey}'.`);
  } catch (error) {
    logger.error(`[AnalyticsProducer] Error publishing event '${eventName}': ${error.message}`, { error, eventData });
  }
};