import app from './app.js';
import connectDB from './config/db.js';
import { env } from './config/env.js';

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Start Server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    const server = app.listen(env.server.port, () => {
      console.log(`Server running in ${env.server.nodeEnv} mode on port ${env.server.port}`);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
