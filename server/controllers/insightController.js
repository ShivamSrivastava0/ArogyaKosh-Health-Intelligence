import Member from '../models/Member.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { todayFeed, scoresFor, readinessFor } from '../services/insightService.js';
import { answer } from '../services/assistantService.js';
import { isAiEnabled } from '../services/aiService.js';
import { parseDateKey, toDateKey } from '../utils/helpers.js';
import { FIRST_AID_ITEMS, EMERGENCY_NUMBERS } from '../data/firstAid.js';
import { isMailConfigured } from '../config/mail.js';
import { env } from '../config/env.js';

export const today = asyncHandler(async (req, res) => {
  const date = parseDateKey(req.query.date) ? req.query.date : toDateKey(new Date());
  const feed = await todayFeed(req.household, date);
  return ApiResponse.success(res, 'Today', feed);
});

export const scores = asyncHandler(async (req, res) => {
  const members = await Member.find({ owner: req.ownerId }).sort({ isSelf: -1, createdAt: 1 });
  const result = await scoresFor(req.ownerId, members);
  return ApiResponse.success(res, 'Health scores', { items: members.map((m) => ({ member: { _id: m._id, name: m.name, color: m.color }, ...result[m._id] })) });
});

export const readiness = asyncHandler(async (req, res) => {
  const result = await readinessFor(req.household);
  return ApiResponse.success(res, 'Emergency readiness', result);
});

export const assistant = asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) throw ApiError.badRequest('Type a question');
  if (message.length > 2000) throw ApiError.badRequest('Please keep questions under 2000 characters');
  const history = Array.isArray(req.body.history) ? req.body.history.filter((h) => h && typeof h.content === 'string') : [];
  const result = await answer(req.ownerId, { message, history });
  return ApiResponse.success(res, 'Reply', result);
});

export const kit = asyncHandler(async (req, res) => {
  const have = new Map(req.household.firstAidKit.map((k) => [k.key, k]));
  const items = FIRST_AID_ITEMS.map((i) => ({ ...i, have: Boolean(have.get(i.key)?.have), expiry: have.get(i.key)?.expiry || null }));
  return ApiResponse.success(res, 'First-aid kit', { items, numbers: EMERGENCY_NUMBERS });
});

export const updateKit = asyncHandler(async (req, res) => {
  const valid = new Set(FIRST_AID_ITEMS.map((i) => i.key));
  const incoming = Array.isArray(req.body.items) ? req.body.items : [];
  const map = new Map(req.household.firstAidKit.map((k) => [k.key, k.toObject ? k.toObject() : k]));
  for (const it of incoming) {
    if (!valid.has(it.key)) continue;
    map.set(it.key, { key: it.key, have: Boolean(it.have), expiry: it.expiry || null });
  }
  req.household.firstAidKit = [...map.values()];
  await req.household.save();
  return kit(req, res);
});

/** Feature flags the client needs to render honestly. */
export const config = (_req, res) => ApiResponse.success(res, 'Config', {
  ai: isAiEnabled(),
  mail: isMailConfigured,
  googleSignIn: Boolean(env.google.clientId),
});
