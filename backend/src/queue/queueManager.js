import amqp from 'amqplib';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let connection = null;
let channel = null;

export const connectRabbitMQ = async () => {
  if (!config.rabbitmq.url) return; // Disabled
  try {
    if (!connection || connection.connection === null) { // check if connection object itself is null after close
        connection = await amqp.connect(config.rabbitmq.url);
        connection.on('error', (err) => { logger.error('RabbitMQ connection error:', err); connection = null; });
        connection.on('close', () => { logger.warn('RabbitMQ connection closed.'); connection = null; });
        logger.info('RabbitMQ connected successfully.');
    }
    if (connection && (!channel || channel.connection === null)) { // check if channel object is null
        channel = await connection.createChannel();
        channel.on('error', (err) => { logger.error('RabbitMQ channel error:', err); channel = null; });
        channel.on('close', () => { logger.warn('RabbitMQ channel closed.'); channel = null; });
        logger.info('RabbitMQ channel created.');
    }
  } catch (error) {
    logger.error('Failed to connect/create channel for RabbitMQ:', error);
    connection = null; channel = null;
  }
};

export const getRabbitMQChannel = () => {
  if (!config.rabbitmq.url) return null;
  if (!channel) {
    logger.warn('RabbitMQ channel not available. Attempting to reconnect/recreate...');
    // Enqueue this operation or handle retry carefully to avoid loops
    connectRabbitMQ().then(setupRabbitMQ).catch(e => logger.error('Error during getChannel reconnect attempt:', e));
  }
  return channel;
};

export const setupRabbitMQ = async () => {
  if (!config.rabbitmq.url) return;
  const ch = getRabbitMQChannel(); // This might attempt to recreate if null
  if (!ch) { logger.error('Cannot setup RabbitMQ: channel not available after get attempt.'); return; }

  try {
    await ch.assertExchange(config.rabbitmq.gameEventsExchange, 'topic', { durable: true });
    logger.info(`Exchange '${config.rabbitmq.gameEventsExchange}' asserted.`);

    await ch.assertQueue(config.rabbitmq.queueName, { durable: true });
    await ch.bindQueue(config.rabbitmq.queueName, config.rabbitmq.gameEventsExchange, config.rabbitmq.routingKey);
    
    logger.info('RabbitMQ setup complete (exchanges asserted). Add queue bindings and consumers as needed.');
  } catch (error) {
    logger.error('Error setting up RabbitMQ exchanges/queues:', error);
  }
};

export const closeRabbitMQConnection = async () => {
  if (!config.rabbitmq.url) return;
  try {
    if (channel) { await channel.close(); logger.info('RabbitMQ channel closed.'); channel = null; }
    if (connection) { await connection.close(); logger.info('RabbitMQ connection closed.'); connection = null; }
  } catch (error) { logger.error('Error closing RabbitMQ connection:', error); }
};