import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient as createRedisClient } from 'redis';

import app from './src/app.js';
import config from './src/config/index.js';
import connectDB from './src/config/db.js';
import logger from './src/utils/logger.js';
import { initSocketIO } from './src/socket/socketManager.js';
import { connectRabbitMQ, setupRabbitMQ, closeRabbitMQConnection } from './src/queue/queueManager.js';
// import { startGrpcServer } from './src/grpc/server.js'; // Optional

const PORT = config.port || 5000;
const server = http.createServer(app);

let pubClient;
let subClient;

async function startServer() {
  try {
    await connectDB();

    if (config.redis.url) {
      pubClient = createRedisClient({ url: config.redis.url });
      subClient = pubClient.duplicate();
      pubClient.on('error', (err) => logger.error('Redis PubClient Error', err));
      subClient.on('error', (err) => logger.error('Redis SubClient Error', err));
      await Promise.all([pubClient.connect(), subClient.connect()]);
      logger.info('Redis clients connected for Socket.IO adapter.');
    } else {
      logger.warn('Redis URL not configured. Socket.IO using default in-memory adapter.');
    }

    const io = new SocketIOServer(server, {
      cors: { origin:"*", methods: ["GET", "POST"] },
      ...(pubClient && subClient && { adapter: createAdapter(pubClient, subClient) })
    });
    initSocketIO(io);

    if (config.rabbitmq.url) {
      await connectRabbitMQ();
      await setupRabbitMQ();
      logger.info('RabbitMQ connected and setup.');
    } else {
      logger.warn('RabbitMQ URL not configured. Queue layer will be non-functional.');
    }

    // if (config.grpc.enabled) startGrpcServer();

    console.log(`Starting server on port ${PORT}...`);
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.env} mode.`);
  if (pubClient && subClient) logger.info('Socket.IO using Redis adapter.');
});

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    if (pubClient && pubClient.isOpen) await pubClient.quit();
    if (subClient && subClient.isOpen) await subClient.quit();
    if (pubClient || subClient) logger.info('Redis clients disconnected.');
    await closeRabbitMQConnection();
    logger.info('Graceful shutdown complete.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);