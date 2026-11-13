import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import ApiResponse from '../utils/ApiResponse.js';
import validate from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import {
  registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator, changePasswordValidator,
} from '../validators/authValidators.js';
import * as auth from '../controllers/authController.js';
import * as members from '../controllers/memberController.js';
import * as meds from '../controllers/medicineController.js';
import * as vitals from '../controllers/vitalController.js';
import * as records from '../controllers/recordController.js';
import * as reminders from '../controllers/reminderController.js';
import * as vaccines from '../controllers/vaccineController.js';
import * as expenses from '../controllers/expenseController.js';
import * as insights from '../controllers/insightController.js';
import * as share from '../controllers/shareController.js';
import * as pub from '../controllers/publicController.js';
import * as predict from '../controllers/predictController.js';

const router = Router();

const limiter = (max, minutes = 15) => rateLimit({ windowMs: minutes * 60000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Too many requests, please slow down.' } });

router.get('/health', (_req, res) => ApiResponse.success(res, 'ok', { uptime: Math.round(process.uptime()) }));
router.get('/config', insights.config);

// ---- Public (no sign-in) -----------------------------------------------------
const publicRouter = Router();
publicRouter.use(limiter(120));
publicRouter.get('/emergency/:token', pub.emergency);
publicRouter.get('/share/:token', pub.sharedBrief);
publicRouter.get('/share/:token/records/:recordId/file', pub.sharedFile);
publicRouter.get('/calendar/:token', pub.calendar);
router.use('/public', publicRouter);

// ---- Auth --------------------------------------------------------------------
const a = Router();
a.post('/register', limiter(20), validate(registerValidator), auth.register);
a.post('/login', limiter(30), validate(loginValidator), auth.login);
a.post('/demo', limiter(10, 60), auth.demo);
a.post('/google', limiter(30), auth.googleAuth);
a.post('/refresh', limiter(120), auth.refresh);
a.get('/verify-email/:token', auth.verifyEmail);
a.post('/forgot-password', limiter(5), validate(forgotPasswordValidator), auth.forgotPassword);
a.post('/reset-password/:token', limiter(10), validate(resetPasswordValidator), auth.resetPassword);
a.use(authenticate);
a.post('/logout', auth.logout);
a.get('/me', auth.me);
a.patch('/me', auth.updateMe);
a.delete('/me', auth.removeAccount);
a.post('/change-password', validate(changePasswordValidator), auth.changePassword);
a.post('/resend-verification', limiter(5), auth.resendVerification);
a.get('/export', auth.exportData);
a.post('/calendar', auth.calendarLink);
router.use('/auth', a);

// ---- Everything below requires sign-in --------------------------------------
router.use(authenticate);

router.get('/today', insights.today);
router.get('/scores', insights.scores);
router.get('/readiness', insights.readiness);

router.get('/predict', predict.household);
router.get('/predict/:id', predict.member);
router.post('/predict/:id/simulate', limiter(120), predict.simulate);
router.post('/assistant', limiter(60), insights.assistant);
router.get('/kit', insights.kit);
router.put('/kit', insights.updateKit);

router.get('/members', members.listMembers);
router.post('/members', members.createMember);
router.get('/members/:id', members.getMember);
router.patch('/members/:id', members.updateMember);
router.delete('/members/:id', members.deleteMember);
router.get('/members/:id/score', members.memberScore);
router.get('/members/:id/brief', members.memberBrief);
router.post('/members/:id/emergency-token', members.rotateEmergencyToken);

router.get('/medicines', meds.listMedicines);
router.post('/medicines', meds.createMedicine);
router.post('/medicines/check', meds.checkSafety);
router.get('/medicines/safety', meds.safetyOverview);
router.get('/medicines/doses', meds.doses);
router.post('/medicines/doses', meds.logDose);
router.get('/medicines/adherence', meds.adherenceReport);
router.get('/medicines/:id', meds.getMedicine);
router.patch('/medicines/:id', meds.updateMedicine);
router.delete('/medicines/:id', meds.deleteMedicine);
router.post('/medicines/:id/refill', meds.refill);

router.get('/vitals/types', vitals.catalog);
router.get('/vitals/latest', vitals.latest);
router.get('/vitals', vitals.listVitals);
router.post('/vitals', vitals.createVital);
router.patch('/vitals/:id', vitals.updateVital);
router.delete('/vitals/:id', vitals.deleteVital);

router.get('/records', records.listRecords);
router.post('/records', uploadSingle('file'), records.createRecord);
router.get('/records/:id', records.getRecord);
router.patch('/records/:id', records.updateRecord);
router.delete('/records/:id', records.deleteRecord);
router.get('/records/:id/file', records.downloadFile);
router.post('/records/:id/extract', limiter(20), records.extract);
router.post('/records/:id/values', records.importValues);

router.get('/reminders', reminders.listReminders);
router.post('/reminders', reminders.createReminder);
router.patch('/reminders/:id', reminders.updateReminder);
router.delete('/reminders/:id', reminders.deleteReminder);
router.post('/reminders/:id/complete', reminders.completeReminder);

router.get('/vaccines', vaccines.listVaccines);
router.post('/vaccines', vaccines.createVaccine);
router.post('/vaccines/generate/:memberId', vaccines.generate);
router.patch('/vaccines/:id', vaccines.updateVaccine);
router.delete('/vaccines/:id', vaccines.deleteVaccine);

router.get('/expenses/summary', expenses.summary);
router.get('/expenses', expenses.listExpenses);
router.post('/expenses', expenses.createExpense);
router.patch('/expenses/:id', expenses.updateExpense);
router.delete('/expenses/:id', expenses.deleteExpense);

router.get('/share', share.listLinks);
router.post('/share', share.createLink);
router.post('/share/:id/revoke', share.revokeLink);

export default router;
