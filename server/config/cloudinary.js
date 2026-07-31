import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';

/**
 * Configure Cloudinary SDK
 * Note: Real credentials to be connected in Phase 4
 */
cloudinary.config({
  cloud_name: env.cloudinary.cloudName || 'mock_cloud_name',
  api_key: env.cloudinary.apiKey || 'mock_api_key',
  api_secret: env.cloudinary.apiSecret || 'mock_api_secret',
});

export default cloudinary;
