import fs from 'fs';
import path from 'path';
import Record from '../models/Record.js';
import Vital from '../models/Vital.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crud } from './crudFactory.js';
import { assertMembersOwned } from '../services/memberService.js';
import { removeUpload, resolveUpload, UPLOAD_ROOT } from '../middleware/upload.js';
import { escapeRegex, pick } from '../utils/helpers.js';
import { logActivity } from '../services/circleService.js';
import { extractLabReport, isAiEnabled } from '../services/aiService.js';
import { VITALS, validateReading } from '../data/vitals.js';

const FIELDS = ['member', 'title', 'category', 'date', 'doctor', 'facility', 'tags', 'notes', 'summary'];

const normaliseTags = (tags) => {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12);
  return undefined;
};

const base = crud({
  Model: Record,
  name: 'Record',
  fields: FIELDS,
  sort: { date: -1 },
  populate: { path: 'member', select: 'name color' },
  filter: (req) => {
    const f = {};
    if (req.query.category) f.category = String(req.query.category);
    if (req.query.q) {
      const re = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
      f.$or = [{ title: re }, { doctor: re }, { facility: re }, { tags: re }, { summary: re }];
    }
    return f;
  },
  hooks: {
    beforeSave(doc, req) {
      const tags = normaliseTags(req.body.tags);
      if (tags) doc.tags = tags;
      if (doc.isModified('summary')) doc.summarySource = 'USER';
    },
  },
});

export const { list: listRecords, get: getRecord, update: updateRecord } = base;

export const createRecord = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.tags = normaliseTags(req.body.tags) || [];
  try {
    if (!data.member) throw ApiError.badRequest('Choose a family member');
    if (!data.title) throw ApiError.badRequest('Give the record a title');
    await assertMembersOwned(req.ownerId, [data.member]);
    if (req.file) {
      data.file = {
        key: path.relative(UPLOAD_ROOT, req.file.path).split(path.sep).join('/'),
        name: req.file.originalname.slice(0, 160),
        mime: req.file.mimetype,
        size: req.file.size,
      };
    }
    const record = await Record.create({ ...data, owner: req.ownerId });
    await record.populate('member', 'name color');
    await logActivity(req, { type: 'RECORD_ADDED', member: record.member._id, link: '/app/records', text: `${req.user.name} added "${record.title}" to ${record.member.name.split(' ')[0]}'s records` });
    return ApiResponse.created(res, 'Saved to locker', { record });
  } catch (err) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    throw err;
  }
});

export const deleteRecord = asyncHandler(async (req, res) => {
  const record = await base.findOwned(req);
  await removeUpload(record.file?.key);
  await Vital.updateMany({ record: record._id }, { $set: { record: null } });
  await record.deleteOne();
  return ApiResponse.success(res, 'Record deleted', { _id: record._id });
});

export const sendRecordFile = async (record, res, download) => {
  if (!record.file?.key) throw ApiError.notFound('No file attached to this record');
  const abs = resolveUpload(record.file.key);
  if (!fs.existsSync(abs)) throw ApiError.notFound('File is missing from storage');
  res.setHeader('Content-Type', record.file.mime);
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(record.file.name || 'record')}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.sendFile(abs);
};

export const downloadFile = asyncHandler(async (req, res) => {
  const record = await base.findOwned(req);
  return sendRecordFile(record, res, req.query.download === '1');
});

/** Use AI to read the attached report; returns values for the user to confirm. */
export const extract = asyncHandler(async (req, res) => {
  if (!isAiEnabled()) throw ApiError.unavailable('Report reading needs AI, which is not enabled on this server');
  const record = await base.findOwned(req);
  if (!record.file?.key) throw ApiError.badRequest('Attach a PDF or photo of the report first');
  const buffer = await fs.promises.readFile(resolveUpload(record.file.key));
  let result;
  try {
    result = await extractLabReport(buffer, record.file.mime);
  } catch (e) {
    throw ApiError.unavailable(`Could not read this report (${e.message})`);
  }
  if (result?.summary && (!record.summary || record.summarySource === 'AI')) {
    record.summary = result.summary;
    record.summarySource = 'AI';
    if (!record.facility && result.facility) record.facility = result.facility;
    if (!record.doctor && result.doctor) record.doctor = result.doctor;
    await record.save();
  }
  // Second layer: every AI-read value must pass the same plausibility and unit
  // checks as a hand-typed reading. Failures are shown, never pre-selected.
  const values = (result?.values || []).map((v) => {
    const known = Boolean(VITALS[v.type]);
    const check = known ? validateReading(v.type, v.value, v.value2 ?? undefined) : { ok: true };
    return { ...v, known, plausible: check.ok, issue: check.ok ? null : check.message };
  });
  const reportDate = result?.reportDate && !Number.isNaN(Date.parse(result.reportDate)) && Date.parse(result.reportDate) <= Date.now() + 86400000 ? result.reportDate : null;
  return ApiResponse.success(res, 'Report read', { ...result, reportDate, values, record });
});

/** Save confirmed extracted values as readings linked to the record. */
export const importValues = asyncHandler(async (req, res) => {
  const record = await base.findOwned(req);
  const values = Array.isArray(req.body.values) ? req.body.values : [];
  const at = req.body.date ? new Date(req.body.date) : record.date;
  const docs = [];
  const skipped = [];
  for (const v of values) {
    const check = VITALS[v.type] ? validateReading(v.type, v.value, v.value2 ?? undefined) : { ok: false, message: 'Not a tracked measurement' };
    if (!check.ok) { skipped.push({ name: v.name || v.type, reason: check.message }); continue; }
    docs.push({
      owner: req.ownerId, member: record.member, type: v.type, value: Number(v.value), value2: v.value2 != null ? Number(v.value2) : null,
      at, record: record._id, note: `From ${record.title}`, source: req.body.source === 'REPORT_MANUAL' ? 'REPORT_MANUAL' : 'REPORT_AI',
    });
  }
  const saved = docs.length ? await Vital.create(docs) : [];
  return ApiResponse.created(res, `${saved.length} reading(s) added to trends${skipped.length ? `, ${skipped.length} skipped` : ''}`, { count: saved.length, skipped });
});
