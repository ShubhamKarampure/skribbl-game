import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} ${level}: ${stack || message}`;
  const metaString = JSON.stringify(metadata);
  if (metaString !== '{}') {
    log += ` ${metaString}`;
  }
  return log;
});

const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [new winston.transports.Console()],
  exceptionHandlers: [new winston.transports.Console({ format: combine(colorize(), errors({ stack: true }), logFormat) })],
  rejectionHandlers: [new winston.transports.Console({ format: combine(colorize(), errors({ stack: true }), logFormat) })],
});

export default logger;