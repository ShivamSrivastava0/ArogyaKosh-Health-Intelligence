import Medicine from '../models/Medicine.js';
import DoseLog from '../models/DoseLog.js';
import Member from '../models/Member.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { crud } from './crudFactory.js';
import { stockInfo, scheduleText, dosesForDay, setDoseStatus, adherence } from '../services/medicineService.js';
import { checkMedicines, ingredientsOf, COVERAGE } from '../services/safetyService.js';
import { getOwnedMember } from '../services/memberService.js';
import { assertObjectId, toDateKey } from '../utils/helpers.js';
import { logActivity } from '../services/circleService.js';

const FIELDS = ['member', 'name', 'strength', 'form', 'dose', 'times', 'daysOfWeek', 'mealTiming', 'startDate', 'endDate', 'stock', 'refillAt', 'expiryDate', 'prescribedBy', 'reason', 'notes', 'active'];

const base = crud({
  Model: Medicine,
  name: 'Medicine',
  fields: FIELDS,
  sort: { active: -1, name: 1 },
  populate: { path: 'member', select: 'name color relation isSelf' },
  filter: (req) => (req.query.active === 'all' ? {} : { active: req.query.active !== 'false' }),
  hooks: {
    beforeSave(doc, _req, isNew) {
      // Stopping a medicine closes its schedule so history and adherence stay right.
      if (!isNew && doc.isModified('active') && !doc.active && !doc.endDate) doc.endDate = new Date();
      if (!isNew && doc.isModified('active') && doc.active && doc.endDate && doc.endDate < new Date()) doc.endDate = null;
      doc.$locals.wasActiveChange = !isNew && doc.isModified('active');
    },
    async afterSave(doc, req, isNew) {
      const who = await memberName(doc.member);
      const verb = isNew ? 'added' : doc.$locals.wasActiveChange ? (doc.active ? 'resumed' : 'stopped') : 'updated';
      await logActivity(req, { type: `MEDICINE_${verb.toUpperCase()}`, member: doc.member, link: '/app/medicines', text: `${req.user.name} ${verb} ${who}'s ${doc.name}${doc.strength ? ` ${doc.strength}` : ''}` });
    },
  },
});

const memberName = async (id) => (await Member.findById(id).select('name'))?.name?.split(' ')[0] || 'someone';

const decorate = (m) => ({ ...m.toJSON(), stockInfo: stockInfo(m), scheduleText: scheduleText(m) });

export const listMedicines = asyncHandler(async (req, res) => {
  const filter = { owner: req.ownerId };
  if (req.query.active !== 'all') filter.active = req.query.active !== 'false';
  if (req.query.member) filter.member = assertObjectId(req.query.member, 'member');
  const meds = await Medicine.find(filter).sort({ active: -1, name: 1 }).populate('member', 'name color relation isSelf');
  const items = meds.filter((m) => m.member).map(decorate);
  return ApiResponse.success(res, 'Medicines', { items });
});

export const getMedicine = base.get;
export const updateMedicine = base.update;

export const createMedicine = asyncHandler(async (req, res, next) => base.create(req, res, next));

export const deleteMedicine = asyncHandler(async (req, res) => {
  const med = await base.findOwned(req);
  await DoseLog.deleteMany({ medicine: med._id });
  await med.deleteOne();
  return ApiResponse.success(res, 'Medicine deleted', { _id: med._id });
});

export const refill = asyncHandler(async (req, res) => {
  const med = await base.findOwned(req);
  const qty = Number(req.body.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw ApiError.badRequest('Enter how many units you bought');
  med.stock = (med.stock || 0) + qty;
  if (req.body.expiryDate) med.expiryDate = req.body.expiryDate;
  await med.save();
  await med.populate('member', 'name color relation isSelf');
  await logActivity(req, { type: 'MEDICINE_REFILLED', member: med.member._id, link: '/app/medicines', text: `${req.user.name} restocked ${med.member.name.split(' ')[0]}'s ${med.name} (+${qty})` });
  return ApiResponse.success(res, `${med.name} restocked`, { medicine: decorate(med) });
});

/** Pre-save safety check for a medicine the user is about to add. */
export const checkSafety = asyncHandler(async (req, res) => {
  const { member: memberId, name, excludeId } = req.body;
  if (!name) return ApiResponse.success(res, 'Nothing to check', { warnings: [] });
  const member = await getOwnedMember(req.ownerId, memberId);
  const others = await Medicine.find({ owner: req.ownerId, member: member._id, active: true, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
  const warnings = checkMedicines([{ name }, ...others.map((o) => ({ name: o.name }))], member.allergies)
    .filter((w) => w.medicines.includes(name));
  const ingredients = ingredientsOf(name);
  return ApiResponse.success(res, 'Safety check', { warnings, recognised: ingredients.length > 0, ingredients, coverage: COVERAGE });
});

/** Safety review of every member's current medicine list. */
export const safetyOverview = asyncHandler(async (req, res) => {
  const [members, meds] = await Promise.all([
    Member.find({ owner: req.ownerId }),
    Medicine.find({ owner: req.ownerId, active: true }),
  ]);
  const items = members.map((m) => ({
    member: { _id: m._id, name: m.name, color: m.color },
    warnings: checkMedicines(meds.filter((x) => String(x.member) === String(m._id)).map((x) => ({ name: x.name })), m.allergies),
  })).filter((x) => x.warnings.length);
  const unrecognised = meds.filter((m) => !ingredientsOf(m.name).length).map((m) => ({ _id: m._id, name: m.name, member: m.member }));
  return ApiResponse.success(res, 'Safety overview', { items, unrecognised, checked: meds.length, coverage: COVERAGE });
});

export const doses = asyncHandler(async (req, res) => {
  const date = req.query.date || toDateKey(new Date());
  const items = await dosesForDay(req.ownerId, date, req.query.member);
  return ApiResponse.success(res, 'Doses', { date, items });
});

export const logDose = asyncHandler(async (req, res) => {
  const { medicine, date, time, status } = req.body;
  if (status && !['TAKEN', 'SKIPPED'].includes(status)) throw ApiError.badRequest('Invalid status');
  const result = await setDoseStatus(req.ownerId, { medicineId: medicine, date, time, status, actor: req.user });
  const who = await memberName(result.memberId);
  await logActivity(req, {
    type: status ? `DOSE_${status}` : 'DOSE_CLEARED',
    member: result.memberId,
    link: '/app',
    text: status === 'TAKEN' ? `${req.user.name} marked ${who}'s ${result.medicineName} (${time}) as taken`
      : status === 'SKIPPED' ? `${req.user.name} marked ${who}'s ${result.medicineName} (${time}) as skipped`
        : `${req.user.name} cleared ${who}'s ${result.medicineName} (${time})`,
  });
  return ApiResponse.success(res, status === 'TAKEN' ? 'Marked as taken' : status === 'SKIPPED' ? 'Marked as skipped' : 'Cleared', result);
});

export const adherenceReport = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
  const report = await adherence(req.ownerId, { memberId: req.query.member, days, endKey: req.query.date });
  return ApiResponse.success(res, 'Adherence', report);
});
