import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

import { env } from './config/env.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import sanitize from './middleware/sanitize.js';
import ApiError from './utils/ApiError.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, cb) {
    if (!origin || env.client.urls.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
}));
app.use(compression());
if (!env.server.isProd) app.use(morgan('dev'));

// Webhooks are signed over the exact bytes received, so keep them.
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { if (req.originalUrl.startsWith('/api/webhooks/')) req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(sanitize);

app.use('/api', routes);

app.use((req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)));
app.use(errorHandler);

export default app;
