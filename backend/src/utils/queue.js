// src/config/queue.js
import amqp from 'amqplib';
import { createLogger } from './logger.js';

const logger = createLogger('rabbitmq');

class QueueManager {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectTimeout = null;
    this.subscriberCallbacks = new Map();
  }

  async connect() {
    try {
      const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
      logger.info(`Connecting to RabbitMQ at ${amqpUrl}`);
      
      this.connection = await amqp.connect(amqpUrl);
      
      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error(`RabbitMQ connection error: ${err.message}`);
        this.scheduleReconnect();
      });
      
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });
      
      // Create a channel
      this.channel = await this.connection.createChannel();
      logger.info('RabbitMQ channel created');
      
      // Configure channel
      this.channel.on('error', (err) => {
        logger.error(`RabbitMQ channel error: ${err.message}`);
      });
      
      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
      });
      
      // Declare exchanges
      await this.channel.assertExchange('drawing_updates', 'fanout', { durable: false });
      await this.channel.assertExchange('game_events', 'topic', { durable: true });
      
      this.isConnected = true;
      logger.info('Successfully connected to RabbitMQ');
      
      // Reestablish subscriptions if any
      if (this.subscriberCallbacks.size > 0) {
        for (const [queue, callback] of this.subscriberCallbacks.entries()) {
          await this.subscribe(queue, callback);
        }
      }
      
      return this.channel;
    } catch (error) {
      logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      this.scheduleReconnect();
      throw error;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ...');
      this.connect().catch(() => {
        logger.warn('Reconnection attempt failed');
      });
    }, 5000); // Reconnect after 5 seconds
  }

  async publish(exchange, routingKey, message) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      const messageBuffer = Buffer.from(JSON.stringify(message));
      const published = this.channel.publish(exchange, routingKey, messageBuffer, {
        persistent: exchange === 'game_events', // Make game events persistent
        contentType: 'application/json'
      });
      
      if (published) {
        logger.debug(`Message published to ${exchange} with key ${routingKey}`);
      } else {
        logger.warn(`Failed to publish message to ${exchange} with key ${routingKey}`);
      }
      
      return published;
    } catch (error) {
      logger.error(`Error publishing message: ${error.message}`);
      throw error;
    }
  }

  async subscribe(queue, callback) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Store callback for reconnect scenarios
      this.subscriberCallbacks.set(queue, callback);
      
      // Ensure queue exists
      await this.channel.assertQueue(queue, { durable: true });
      
      // Consume messages
      await this.channel.consume(queue, (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            callback(content, msg);
            this.channel.ack(msg);
          } catch (error) {
            logger.error(`Error processing message: ${error.message}`);
            // Reject the message and requeue
            this.channel.nack(msg, false, true);
          }
        }
      });
      
      logger.info(`Subscribed to queue: ${queue}`);
      return true;
    } catch (error) {
      logger.error(`Error subscribing to queue ${queue}: ${error.message}`);
      throw error;
    }
  }

  async bindQueue(queue, exchange, routingKey) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Ensure queue exists
      await this.channel.assertQueue(queue, { durable: true });
      
      // Bind the queue to the exchange
      await this.channel.bindQueue(queue, exchange, routingKey);
      
      logger.info(`Queue ${queue} bound to exchange ${exchange} with key ${routingKey}`);
      return true;
    } catch (error) {
      logger.error(`Error binding queue: ${error.message}`);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      
      if (this.connection) {
        await this.connection.close();
      }
      
      this.isConnected = false;
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error(`Error closing RabbitMQ connection: ${error.message}`);
    }
  }
}

const queueManager = new QueueManager();

export default queueManager;