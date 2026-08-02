import { Router } from 'express';
import ApiResponse from '../utils/ApiResponse.js';
import { env } from '../config/env.js';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import familyRoutes from './familyRoutes.js';
import reportRoutes from './reportRoutes.js';
import intelligenceRoutes from './intelligenceRoutes.js';
import predictRoutes from './predictRoutes.js';

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

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/family', familyRoutes);
router.use('/reports', reportRoutes);

/**
 * @route   /api/intelligence
 * @desc    AI-powered health intelligence routes
 */
router.use('/intelligence', intelligenceRoutes);

/**
 * @route   /api/predict
 * @desc    ML prediction routes
 */
router.use('/predict', predictRoutes);

export default router;

