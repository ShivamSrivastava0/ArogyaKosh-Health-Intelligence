import { Router } from 'express';
import {
  getFamilyMembers,
  addFamilyMember,
  getFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from '../controllers/familyController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getFamilyMembers);
router.post('/', addFamilyMember);
router.get('/:id', getFamilyMember);
router.patch('/:id', updateFamilyMember);
router.delete('/:id', deleteFamilyMember);

export default router;
