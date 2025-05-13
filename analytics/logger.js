// analytics_consumer_service/logger.js
import config from './config.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel = LOG_LEVELS[config.logLevel] ?? LOG_LEVELS.info;

const log = (level, message, ...args) => {
  if (LOG_LEVELS[level] <= currentLogLevel) {
    console[level](`[${new Date().toISOString()}] [AnalyticsConsumer] [${level.toUpperCase()}] ${message}`, ...args);
  }
};

export default {
  error: (message, ...args) => log('error', message, ...args),
  warn: (message, ...args) => log('warn', message, ...args),
  info: (message, ...args) => log('info', message, ...args),
  debug: (message, ...args) => log('debug', message, ...args),
};