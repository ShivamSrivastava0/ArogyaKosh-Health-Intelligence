import { Router } from 'express';
import ApiResponse from '../utils/ApiResponse.js';
import { env } from '../config/env.js';
import authRoutes from './authRoutes.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  return ApiResponse.success(res, 'ArogyaKosh API is running', {
    version: '1.0.0',
    environment: env.server.nodeEnv,
  });
});

/**
 * @route   /api/auth
 * @desc    Authentication routes
 */
router.use('/auth', authRoutes);

export default router;

