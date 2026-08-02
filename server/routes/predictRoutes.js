import { Router } from 'express';
import {
  predictHeartDisease,
  predictDiabetes,
  predictHypertension,
} from '../controllers/predictController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/heart', predictHeartDisease);
router.post('/diabetes', predictDiabetes);
router.post('/hypertension', predictHypertension);

export default router;
