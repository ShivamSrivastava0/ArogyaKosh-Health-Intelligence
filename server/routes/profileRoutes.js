import { Router } from 'express';
import {
  getProfile,
  createProfile,
  updateProfile,
} from '../controllers/profileController.js';
import {
  createProfileValidator,
  updateProfileValidator,
} from '../validators/profileValidators.js';
import validate from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

router.get('/', getProfile);
router.post('/', validate(createProfileValidator), createProfile);
router.patch('/', validate(updateProfileValidator), updateProfile);

export default router;
