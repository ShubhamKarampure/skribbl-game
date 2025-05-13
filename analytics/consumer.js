// analytics_consumer_service/consumer.js
import amqp from 'amqplib';
import express from 'express'; // Added
import config from './config.js';
import logger from './logger.js';
import connectAnalyticsDB from './db.js';
import RawEvent from './models/RawEventModel.js';
import DailyGameStats from './models/DailyGameStatsModel.js';
import apiRoutes from './routes/api.js'; // Added: Import API routes
import cors from 'cors'; 

// --- processEvent function remains the same as you provided ---
async function processEvent(eventData) {
  if (!eventData || !eventData.eventName || !eventData.payload) {
    logger.warn('Received malformed event data:', eventData);
    return;
  }

  const { eventName, payload, timestamp: eventTimestamp, routingKey } = eventData;
  logger.debug(`Processing event: ${eventName}`, payload);

  // 1. Store Raw Event
  try {
    const rawEvent = new RawEvent({
      eventName,
      payload,
      eventTimestamp: new Date(eventTimestamp),
      routingKey,
      roomId: payload.roomId,
      userId: payload.userId,
    });
    await rawEvent.save();
    logger.debug(`Raw event '${eventName}' saved with ID: ${rawEvent._id}`);
  } catch (error) {
    logger.error(`Error saving raw event '${eventName}': ${error.message}`, { error, payload });
  }

  // 2. Process and Aggregate Statistics
  const today = new Date(eventTimestamp).toISOString().split('T')[0];

  try {
    let dailyUpdate = { $inc: {} };
    let dailySetOnInsert = {};

    switch (eventName) {
      case 'room_created':
        // dailyUpdate.$inc.roomsCreated = 1;
        break;
      case 'player_joined_room':
        dailyUpdate.$inc.totalPlayersJoinedRooms = 1;
        if (payload.userId) {
          dailyUpdate.$addToSet = { uniquePlayersActive: payload.userId };
        }
        break;
      case 'game_started':
        dailyUpdate.$inc.gamesStarted = 1;
        if (payload.playerIds && Array.isArray(payload.playerIds)) {
            dailyUpdate.$addToSet = { ...dailyUpdate.$addToSet, uniquePlayersActive: { $each: payload.playerIds } };
        }
        break;
      case 'round_started':
        // dailyUpdate.$inc.roundsStarted = 1;
        break;
      case 'word_chosen':
        // Could track word popularity here
        break;
      case 'guess_made':
        dailyUpdate.$inc.totalGuessesMade = 1;
        if (payload.isCorrect) {
          dailyUpdate.$inc.totalCorrectGuesses = 1;
        }
        break;
      case 'score_updated':
        if (payload.points && typeof payload.points === 'number') {
          dailyUpdate.$inc.totalScorePointsAwarded = payload.points;
        }
        break;
      case 'round_ended':
        dailyUpdate.$inc.roundsPlayed = 1;
        break;
      case 'game_finished':
        dailyUpdate.$inc.gamesFinished = 1;
        break;
      case 'chat_message_sent':
        dailyUpdate.$inc.chatMessagesSent = 1;
        break;
    }

    if (Object.keys(dailyUpdate.$inc).length > 0 || dailyUpdate.$addToSet) {
      const updateQuery = {};
      if(Object.keys(dailyUpdate.$inc).length > 0) updateQuery.$inc = dailyUpdate.$inc;
      if(dailyUpdate.$addToSet) updateQuery.$addToSet = dailyUpdate.$addToSet;

      await DailyGameStats.updateOne(
        { date: today },
        updateQuery,
        { upsert: true }
      );
      logger.debug(`Daily stats for ${today} updated for event '${eventName}'.`);
    }
  } catch (error) {
    logger.error(`Error updating daily_stats for event '${eventName}' on ${today}: ${error.message}`, { error, payload });
  }
}

// --- startConsumer function = ---
async function startRabbitMQConsumer() {
  let channel = null;
  const connectRabbit = async () => {
    try {
      const connection = await amqp.connect(config.rabbitmq.url);
      channel = await connection.createChannel();

      await channel.assertExchange(config.rabbitmq.exchangeName, 'topic', { durable: true });
      await channel.assertQueue(config.rabbitmq.queueName, { durable: true });
      await channel.bindQueue(config.rabbitmq.queueName, config.rabbitmq.exchangeName, config.rabbitmq.routingKey);

      logger.info(`Analytics consumer connected to RabbitMQ. Waiting for messages on queue '${config.rabbitmq.queueName}'.`);

      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err.message);
        channel = null;
        setTimeout(connectRabbit, 5000);
      });
      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed. Reconnecting...');
        channel = null;
        setTimeout(connectRabbit, 5000);
      });

      channel.prefetch(10);
      channel.consume(config.rabbitmq.queueName, async (msg) => {
        if (msg !== null) {
          let eventData;
          try {
            eventData = JSON.parse(msg.content.toString());
            await processEvent(eventData); // Your existing processing logic
            channel.ack(msg);
          } catch (error) {
            logger.error('Error processing or parsing message:', {
                message: error.message,
                content: msg.content.toString(),
                errorStack: error.stack
            });
            channel.nack(msg, false, false);
          }
        }
      });
    } catch (error) {
      logger.error('Analytics Consumer failed to connect to RabbitMQ:', {
          message: error.message,
          errorStack: error.stack
      });
      setTimeout(connectRabbit, 5000);
    }
  };
  await connectRabbit();
}

// --- Main function to start everything ---
async function main() {
  // 1. Connect to Analytics MongoDB
  await connectAnalyticsDB();

  // 2. Start RabbitMQ Consumer
  await startRabbitMQConsumer(); // This will run in the background, consuming messages

  // 3. Setup and Start Express API Server
    const app = express();
    const corsOptions = {
        origin: 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      };
      
      app.use(cors(corsOptions));
  app.use(express.json()); // Middleware to parse JSON bodies

  // Basic request logging middleware (optional but good for seeing API calls)
  app.use((req, res, next) => {
    logger.info(`HTTP Request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // Mount API routes under a base path (e.g., /api/analytics)
  app.use('/api/analytics', apiRoutes);

  // Simple health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Analytics service is running.' });
  });

  
  // Global error handler for Express (catches errors from route handlers)
  app.use((err, req, res, next) => {
    logger.error('Unhandled Express error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });
    res.status(err.status || 500).json({
      message: err.message || 'An unexpected server error occurred.',
      // ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}) // Optionally include stack in dev
    });
  });

  const apiPort = config.api.port;
  app.listen(apiPort, () => {
    logger.info(`Analytics API server started and listening on http://localhost:${apiPort}`);
  });
}

// Start the application
main().catch(error => {
  logger.error('Unhandled error starting the analytics service:', {
      message: error.message,
      errorStack: error.stack
  });
  process.exit(1);
});