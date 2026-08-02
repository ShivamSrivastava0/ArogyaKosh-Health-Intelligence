import { Router } from 'express';
import {
  parseReport,
  chat,
  getInsights,
  getDoctorBrief,
} from '../controllers/intelligenceController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.post('/parse', uploadSingle('file'), parseReport);
router.post('/chat', chat);
router.get('/insights', getInsights);
router.get('/brief', getDoctorBrief);

export default router;
