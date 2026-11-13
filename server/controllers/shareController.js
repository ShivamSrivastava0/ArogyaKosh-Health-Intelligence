import ShareLink from '../models/ShareLink.js';
import Record from '../models/Record.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getOwnedMember } from '../services/memberService.js';
import { assertObjectId } from '../utils/helpers.js';

const DURATIONS = { '1h': 1, '24h': 24, '3d': 72, '7d': 168, '30d': 720 };

export const listLinks = asyncHandler(async (req, res) => {
  const q = { owner: req.ownerId };
  if (req.query.member) q.member = assertObjectId(req.query.member, 'member');
  const items = await ShareLink.find(q).sort({ createdAt: -1 }).limit(50).populate('member', 'name color');
  return ApiResponse.success(res, 'Share links', { items });
});

export const createLink = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.body.member);
  const hours = DURATIONS[req.body.duration] || 24;
  const recordIds = Array.isArray(req.body.records) ? req.body.records.filter(Boolean).map(String) : [];
  if (recordIds.length) {
    recordIds.forEach((id) => assertObjectId(id, 'record'));
    const count = await Record.countDocuments({ _id: { $in: recordIds }, owner: req.ownerId, member: member._id });
    if (count !== recordIds.length) throw ApiError.badRequest('Some selected records do not belong to this member');
  }
  const link = await ShareLink.create({
    owner: req.ownerId,
    member: member._id,
    label: req.body.label || '',
    records: recordIds,
    expiresAt: new Date(Date.now() + hours * 3600000),
  });
  await link.populate('member', 'name color');
  return ApiResponse.created(res, 'Share link created', { link });
});

export const revokeLink = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'link');
  const link = await ShareLink.findOneAndUpdate({ _id: req.params.id, owner: req.ownerId }, { revoked: true }, { new: true });
  if (!link) throw ApiError.notFound('Link not found');
  return ApiResponse.success(res, 'Link revoked', { link });
});
