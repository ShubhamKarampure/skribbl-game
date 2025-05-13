import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('MongoDB connected successfully.');
    mongoose.connection.on('error', (err) => logger.error('MongoDB connection error:', err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected.'));
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
export default connectDB;