import createError from 'http-errors';
import logger from './logger.js';
import config from '../config/index.js';

export const routeNotFoundHandler = (req, res, next) => {
  next(createError(404, 'The requested resource was not found on this server.'));
};

export const globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  logger.error(message, { error: { message: err.message, status: statusCode, stack: err.stack, path: req.path, method: req.method }});
  res.status(statusCode).json({
    success: false, status: statusCode, message: message,
    ...(config.env === 'development' && { stack: err.stack }),
  });
};