import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB using Mongoose
 */
const connectDB = async () => {
  try {
    let dbUri = env.db.uri;

    if (dbUri === 'inmemory' || !dbUri) {
      console.log('Starting in-memory MongoDB server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      dbUri = mongoServer.getUri();
      console.log(`In-memory MongoDB server started at: ${dbUri}`);

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        process.exit(0);
      });
      process.on('SIGTERM', async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        process.exit(0);
      });
    }

    const conn = await mongoose.connect(dbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
