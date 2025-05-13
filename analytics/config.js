// analytics_consumer_service/config.js
import dotenv from 'dotenv';
dotenv.config(); // If you use a .env file

export default {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost',
    exchangeName: process.env.RABBITMQ_EXCHANGE_NAME || 'game_events_exchange',
    queueName: process.env.RABBITMQ_ANALYTICS_QUEUE_NAME || 'scribble_analytics_processor_queue_v1',
    routingKey: process.env.RABBITMQ_ANALYTICS_ROUTING_KEY || 'events.game.*', // Or your specific key
  },
  mongodb: {
    url: "mongodb://localhost:27017/game_analytics_db",
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  api: { // NEW SECTION
    port: process.env.ANALYTICS_API_PORT || 3001, // Port for this service's API
  }
};