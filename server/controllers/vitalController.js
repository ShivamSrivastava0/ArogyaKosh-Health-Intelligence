import Vital from '../models/Vital.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { crud } from './crudFactory.js';
import { VITALS } from '../data/vitals.js';
import { latestVitals } from '../services/vitalService.js';
import { assertObjectId } from '../utils/helpers.js';

const base = crud({
  Model: Vital,
  name: 'Reading',
  fields: ['member', 'type', 'value', 'value2', 'at', 'note'],
  sort: { at: -1 },
  populate: { path: 'member', select: 'name color' },
  filter: (req) => {
    const f = {};
    if (req.query.type) f.type = String(req.query.type);
    if (req.query.from) f.at = { $gte: new Date(req.query.from) };
    return f;
  },
  maxLimit: 1000,
});

export const { list: listVitals, create: createVital, update: updateVital, remove: deleteVital } = base;

export const catalog = (_req, res) => ApiResponse.success(res, 'Vital types', {
  types: Object.entries(VITALS).map(([type, v]) => ({ type, label: v.label, unit: v.unit, dual: Boolean(v.dual), group: v.group, normal: v.normalText })),
});

export const latest = asyncHandler(async (req, res) => {
  const ids = req.query.member ? [assertObjectId(req.query.member, 'member')] : undefined;
  const map = await latestVitals(req.user._id, ids);
  const items = {};
  for (const [mid, types] of map) items[mid] = types;
  return ApiResponse.success(res, 'Latest vitals', { items });
});
