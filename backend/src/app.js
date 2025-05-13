import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import apiRoutes from './api/routes.js';
import { globalErrorHandler, routeNotFoundHandler } from './utils/errorHandler.js';
import logger from './utils/logger.js';

const app = express();

app.use(helmet());
const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.env !== 'test') {
  app.use(morgan('dev', { stream: { write: message => logger.info(message.trim()) } }));
}

app.get('/', (req, res) => res.send('Scribble Game Backend v2 is running!'));
app.use('/api/v1', apiRoutes);

app.use(routeNotFoundHandler);
app.use(globalErrorHandler);

export default app;