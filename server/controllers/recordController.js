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
import { extractLabReport, isAiEnabled } from '../services/aiService.js';
import { VITALS } from '../data/vitals.js';

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
    await assertMembersOwned(req.user._id, [data.member]);
    if (req.file) {
      data.file = {
        key: path.relative(UPLOAD_ROOT, req.file.path).split(path.sep).join('/'),
        name: req.file.originalname.slice(0, 160),
        mime: req.file.mimetype,
        size: req.file.size,
      };
    }
    const record = await Record.create({ ...data, owner: req.user._id });
    await record.populate('member', 'name color');
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
  if (result?.summary && !record.summary) {
    record.summary = result.summary;
    if (!record.facility && result.facility) record.facility = result.facility;
    if (!record.doctor && result.doctor) record.doctor = result.doctor;
    await record.save();
  }
  const values = (result?.values || []).map((v) => ({ ...v, known: Boolean(VITALS[v.type]) }));
  return ApiResponse.success(res, 'Report read', { ...result, values, record });
});

/** Save confirmed extracted values as readings linked to the record. */
export const importValues = asyncHandler(async (req, res) => {
  const record = await base.findOwned(req);
  const values = Array.isArray(req.body.values) ? req.body.values : [];
  const at = req.body.date ? new Date(req.body.date) : record.date;
  const docs = values
    .filter((v) => VITALS[v.type] && Number.isFinite(Number(v.value)))
    .map((v) => ({ owner: req.user._id, member: record.member, type: v.type, value: Number(v.value), value2: v.value2 != null ? Number(v.value2) : null, at, record: record._id, note: `From ${record.title}` }));
  const saved = await Vital.create(docs);
  return ApiResponse.created(res, `${saved.length} reading(s) added to trends`, { count: saved.length });
});
