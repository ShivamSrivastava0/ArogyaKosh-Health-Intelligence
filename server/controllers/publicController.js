import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import ShareLink from '../models/ShareLink.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildBrief } from '../services/briefService.js';
import { buildCalendar } from '../services/calendarService.js';
import { sendRecordFile } from './recordController.js';
import { assertObjectId } from '../utils/helpers.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;
const checkToken = (t) => {
  if (!TOKEN_RE.test(t || '')) throw ApiError.notFound('Link not found');
  return t;
};

/**
 * Emergency card — the page a paramedic sees after scanning the QR.
 * Shows only what helps in an emergency; nothing else leaves the vault.
 */
export const emergency = asyncHandler(async (req, res) => {
  const member = await Member.findOne({ emergencyToken: checkToken(req.params.token) });
  if (!member || !member.emergencyEnabled) throw ApiError.notFound('This emergency card is not active');
  const meds = await Medicine.find({ member: member._id, active: true }).select('name strength');
  res.setHeader('Cache-Control', 'no-store');
  return ApiResponse.success(res, 'Emergency card', {
    card: {
      name: member.name,
      age: member.age,
      gender: member.gender,
      bloodGroup: member.bloodGroup,
      allergies: member.allergies.map((a) => ({ name: a.name, severity: a.severity, reaction: a.reaction })),
      noKnownAllergies: member.noKnownAllergies,
      conditions: member.conditions.filter((c) => c.status !== 'RESOLVED').map((c) => c.name),
      medicines: meds.map((m) => [m.name, m.strength].filter(Boolean).join(' ')),
      emergencyContacts: member.emergencyContacts.map((c) => ({ name: c.name, relation: c.relation, phone: c.phone })),
      doctor: member.doctor?.name ? { name: member.doctor.name, phone: member.doctor.phone } : null,
      insurance: member.insurance.slice(0, 2).map((i) => ({ provider: i.provider, policyNumber: i.policyNumber, helpline: i.helpline })),
      organDonor: member.organDonor,
      notes: member.notes,
      updatedAt: member.updatedAt,
    },
  });
});

const activeLink = async (token) => {
  const link = await ShareLink.findOne({ token: checkToken(token) });
  if (!link) throw ApiError.notFound('Link not found');
  if (link.revoked) throw ApiError.gone('This link was revoked by the patient');
  if (link.expiresAt < new Date()) throw ApiError.gone('This link has expired');
  return link;
};

export const sharedBrief = asyncHandler(async (req, res) => {
  const link = await activeLink(req.params.token);
  const member = await Member.findById(link.member);
  if (!member) throw ApiError.notFound('Link not found');
  const brief = await buildBrief(member, { recordIds: link.records.length ? link.records : [] });
  link.views += 1;
  link.lastViewedAt = new Date();
  await link.save();
  delete brief.emergencyContacts;
  res.setHeader('Cache-Control', 'no-store');
  return ApiResponse.success(res, 'Shared health summary', { brief, expiresAt: link.expiresAt, label: link.label });
});

export const sharedFile = asyncHandler(async (req, res) => {
  const link = await activeLink(req.params.token);
  assertObjectId(req.params.recordId, 'record');
  if (!link.records.some((r) => String(r) === req.params.recordId)) throw ApiError.notFound('File not shared');
  const record = await Record.findOne({ _id: req.params.recordId, member: link.member });
  if (!record) throw ApiError.notFound('File not found');
  return sendRecordFile(record, res, false);
});

export const calendar = asyncHandler(async (req, res) => {
  const token = checkToken(String(req.params.token).replace(/\.ics$/, ''));
  const user = await User.findOne({ calendarToken: token });
  if (!user) throw ApiError.notFound('Calendar not found');
  const ics = await buildCalendar(user._id);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="arogyakosh.ics"');
  return res.send(ics);
});
