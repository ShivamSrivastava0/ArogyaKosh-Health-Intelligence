import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.client.url,
    credentials: true,
  })
);

// Payload compression
app.use(compression());

// Logging
if (env.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Body parsing with increased limit for potentially large payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for auth routes (basic configuration)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// API Routes
app.use('/api', routes);

// 404 handler for unknown routes
app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
});

// Global Error Handler
app.use(errorHandler);

export default app;
