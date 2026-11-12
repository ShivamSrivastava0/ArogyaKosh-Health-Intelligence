import fs from 'fs';
import app from './app.js';
import connectDB, { disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { UPLOAD_ROOT } from './middleware/upload.js';
import { startJobs } from './jobs/index.js';

const start = async () => {
  await connectDB();
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

  const server = app.listen(env.server.port, () => {
    console.log(`[api] ArogyaKosh API on http://localhost:${env.server.port}/api (${env.server.nodeEnv})`);
  });
  if (env.jobs.enabled) startJobs();

  const shutdown = (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => console.error('[api] unhandled rejection', err));
};

start().catch((err) => {
  console.error('[api] failed to start:', err);
  process.exit(1);
});
