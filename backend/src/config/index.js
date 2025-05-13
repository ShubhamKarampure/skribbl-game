import dotenv from 'dotenv';
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/scribble_game_v3',
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL, // e.g., 'amqp://localhost'
    gameEventsExchange: 'game_events_exchange_v3',
    queueName: 'scribble_analytics_processor_queue_v1', // Specific queue for this consumer
    routingKey: 'analytics.#', // Listen to all analytics events
  },
  jwtSecret: process.env.JWT_SECRET || 'your-very-strong-secret-key-v3',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  grpc: {
    enabled: process.env.GRPC_ENABLED === 'true' || false,
    port: process.env.GRPC_PORT || 50051,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  electionConfig: { // For Bully Algorithm simulation
    timeoutDuration: parseInt(process.env.ELECTION_TIMEOUT_MS || '3000', 10), // Time to wait for OKs
    messageChannel: null, // Placeholder if actual message passing simulation is enhanced
  },
  gameplay: {
    minPlayersToStart: 2,
    maxPlayersPerRoom: 12,
  }
};

export default config;