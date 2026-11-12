import mongoose from 'mongoose';
import { env } from './env.js';

// Operator injection is handled by middleware/sanitize.js on every request.
mongoose.set('strictQuery', true);

let memoryServer = null;

const connectDB = async () => {
  let uri = env.db.uri;

  if (uri === 'inmemory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('arogyakosh');
    console.log(`[db] in-memory MongoDB started`);
  }

  mongoose.connection.on('error', (err) => console.error(`[db] ${err.message}`));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`[db] connected to ${conn.connection.host}/${conn.connection.name}`);
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
};

export default connectDB;
