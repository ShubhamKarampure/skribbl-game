// analytics_consumer_service/db.js
import mongoose from 'mongoose';
import config from './config.js';
import logger from './logger.js';

const connectAnalyticsDB = async () => {
  try {
    await mongoose.connect(config.mongodb.url);
    logger.info(`Analytics MongoDB connected successfully to: ${config.mongodb.url}`);

    mongoose.connection.on('error', (err) => {
      logger.error('Analytics MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('Analytics MongoDB disconnected.');
    });
  } catch (error) {
    logger.error(`Analytics MongoDB connection failed: ${error.message}`, error);
    // Consider a retry mechanism or exit if critical
    process.exit(1); // Or implement robust retry
  }
};

export default connectAnalyticsDB;