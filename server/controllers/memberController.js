import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import DoseLog from '../models/DoseLog.js';
import Vital from '../models/Vital.js';
import Record from '../models/Record.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';
import Expense from '../models/Expense.js';
import ShareLink from '../models/ShareLink.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pick } from '../utils/helpers.js';
import { getOwnedMember, nextColor } from '../services/memberService.js';
import { scoresFor } from '../services/insightService.js';
import { buildBrief, briefToText } from '../services/briefService.js';
import { generate, isAiEnabled, SAFETY_RULES } from '../services/aiService.js';
import { generateSchedule } from '../services/vaccineService.js';
import { removeUpload } from '../middleware/upload.js';
import { logActivity } from '../services/circleService.js';
import { admissionKit, admissionPdf } from '../services/admissionService.js';
import { normalizeAbhaNumber, normalizeAbhaAddress } from '../services/abhaService.js';

/** Validate + format ABHA identifiers before they reach the model. */
const cleanAbha = (data) => {
  if (!data.abha) return;
  const number = normalizeAbhaNumber(data.abha.number);
  const address = normalizeAbhaAddress(data.abha.address);
  if (number === null) throw ApiError.badRequest('ABHA number must be 14 digits, like 91-1234-5678-9012');
  if (address === null) throw ApiError.badRequest('ABHA address should look like name@abdm');
  data.abha = { number, address };
};

const FIELDS = [
  'name', 'relation', 'lineage', 'dob', 'gender', 'bloodGroup', 'heightCm', 'weightKg', 'waistCm', 'phone',
  'allergies', 'noKnownAllergies', 'conditions', 'emergencyContacts', 'doctor', 'insurance',
  'lifestyle', 'organDonor', 'idProof', 'address', 'occupation', 'abha', 'notes', 'color', 'emergencyEnabled',
];

export const listMembers = asyncHandler(async (req, res) => {
  const members = await Member.find({ owner: req.ownerId }).sort({ isSelf: -1, createdAt: 1 });
  const [medCounts, scores] = await Promise.all([
    Medicine.aggregate([{ $match: { owner: req.ownerId, active: true } }, { $group: { _id: '$member', n: { $sum: 1 } } }]),
    req.query.withScores ? scoresFor(req.ownerId, members) : {},
  ]);
  const medMap = new Map(medCounts.map((m) => [String(m._id), m.n]));
  const items = members.map((m) => ({
    ...m.toJSON(),
    activeMedicines: medMap.get(String(m._id)) || 0,
    checks: scores[m._id] ? { onTrack: scores[m._id].onTrack, assessed: scores[m._id].assessed, total: scores[m._id].total } : undefined,
  }));
  return ApiResponse.success(res, 'Family members', { items });
});

export const getMember = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.id);
  return ApiResponse.success(res, 'Member', { member });
});

export const createMember = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  cleanAbha(data);
  if (data.relation === 'SELF') throw ApiError.badRequest('You are already in the family as "Self"');
  const count = await Member.countDocuments({ owner: req.ownerId });
  if (count >= 20) throw ApiError.badRequest('A household can have up to 20 members');
  const member = await Member.create({ ...data, color: data.color || (await nextColor(req.ownerId)), owner: req.ownerId });
  let scheduled = 0;
  if (member.dob && req.body.autoVaccines !== false) {
    scheduled = await generateSchedule(req.ownerId, member).catch(() => 0);
  }
  await logActivity(req, { type: 'MEMBER_ADDED', member: member._id, link: `/app/family/${member._id}`, text: `${req.user.name} added ${member.name} to the family` });
  return ApiResponse.created(res, `${member.name} added to your family`, { member, vaccinesScheduled: scheduled });
});

export const updateMember = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.id);
  const data = pick(req.body, FIELDS);
  cleanAbha(data);
  if (member.isSelf) delete data.relation;
  else if (data.relation === 'SELF') throw ApiError.badRequest('Only one member can be "Self"');
  if (data.lifestyle) data.lifestyle = { ...member.lifestyle?.toObject?.(), ...data.lifestyle };
  if (data.doctor) data.doctor = { ...member.doctor?.toObject?.(), ...data.doctor };
  member.set(data);
  await member.save();
  await logActivity(req, { type: 'PROFILE_UPDATED', member: member._id, link: `/app/family/${member._id}`, text: `${req.user.name} updated ${member.name.split(' ')[0]}'s health profile` });
  return ApiResponse.success(res, 'Saved', { member });
});

export const deleteMember = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.id);
  if (member.isSelf) throw ApiError.badRequest('You cannot remove yourself. Delete your account from Settings instead.');
  const q = { owner: req.ownerId, member: member._id };
  const records = await Record.find(q).select('file');
  await Promise.all(records.map((r) => removeUpload(r.file?.key)));
  await Promise.all([
    Medicine.deleteMany(q), DoseLog.deleteMany(q), Vital.deleteMany(q), Record.deleteMany(q),
    Reminder.deleteMany(q), Vaccination.deleteMany(q), ShareLink.deleteMany(q),
    Expense.updateMany(q, { $set: { member: null } }),
  ]);
  await member.deleteOne();
  return ApiResponse.success(res, `${member.name} removed`, { _id: member._id });
});

export const memberScore = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.id);
  const scores = await scoresFor(req.ownerId, [member]);
  return ApiResponse.success(res, 'Health score', { score: scores[member._id] });
});

export const memberBrief = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.id);
  const brief = await buildBrief(member);
  if (req.query.ai === '1') {
    if (!isAiEnabled()) {
      brief.aiSummary = null;
      brief.aiNote = 'AI summary is not enabled on this server.';
    } else {
      try {
        brief.aiSummary = await generate(
          `Write a concise clinical handover for a doctor (max 120 words, 3 short paragraphs: current status, what changed recently, suggested points to discuss). Use only these records:\n${briefToText(brief)}`,
          SAFETY_RULES,
        );
      } catch (e) {
        brief.aiNote = `AI summary unavailable right now (${e.message}).`;
      }
    }
  }
  return ApiResponse.success(res, 'Doctor brief', { brief });
});

export const rotateEmergencyToken = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.id);
  member.emergencyToken = undefined;
  await member.save();
  return ApiResponse.success(res, 'New emergency link created. Old QR codes no longer work.', { member });
});

/** What the hospital insurance desk needs, and what is still missing. */
export const admissionKitInfo = asyncHandler(async (req, res) => {
  const kit = await admissionKit(req.ownerId, req.params.id);
  return ApiResponse.success(res, 'Admission kit', { kit });
});

/** One merged PDF: patient + insurance cover sheet, medical summary, then the chosen documents. */
export const admissionKitPdf = asyncHandler(async (req, res) => {
  const ids = String(req.query.records || '').split(',').filter((s) => /^[a-f0-9]{24}$/i.test(s)).slice(0, 20);
  const { bytes, filename, skipped } = await admissionPdf(req.ownerId, req.params.id, ids);
  await logActivity(req, { type: 'ADMISSION_KIT', member: req.params.id, link: `/app/admission/${req.params.id}`, text: `${req.user.name} prepared a hospital admission kit` }).catch(() => {});
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (skipped.length) res.setHeader('X-Skipped-Documents', String(skipped.length));
  res.setHeader('Cache-Control', 'no-store');
  return res.send(bytes);
});
