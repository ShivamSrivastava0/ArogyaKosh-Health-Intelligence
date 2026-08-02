import { Router } from 'express';
import {
  getReports,
  uploadReport,
  getReport,
  updateReport,
  deleteReport,
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', getReports);
router.post('/', uploadSingle('file'), uploadReport);
router.get('/:id', getReport);
router.patch('/:id', updateReport);
router.delete('/:id', deleteReport);

export default router;
