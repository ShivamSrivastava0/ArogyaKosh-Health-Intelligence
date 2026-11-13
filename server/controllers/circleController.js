import { CircleMember, CircleInvite, Activity, Notification } from '../models/Circle.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { assertObjectId } from '../utils/helpers.js';
import {
  listCircle, householdsFor, createInvite, previewInvite, acceptInvite, familyReport,
} from '../services/circleService.js';

export const households = asyncHandler(async (req, res) => ApiResponse.success(res, 'Households', { items: await householdsFor(req.user) }));

export const circle = asyncHandler(async (req, res) => {
  const data = await listCircle(req.ownerId);
  return ApiResponse.success(res, 'Care circle', { ...data, myRole: req.role, myMembership: req.membership || null });
});

export const invite = asyncHandler(async (req, res) => {
  const { invite: inv, url } = await createInvite(req.household, req.body || {});
  return ApiResponse.created(res, `Invite sent to ${inv.email}`, { invite: inv, url });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'invite');
  const inv = await CircleInvite.findOneAndUpdate({ _id: req.params.id, owner: req.ownerId, status: 'PENDING' }, { status: 'REVOKED' }, { new: true });
  if (!inv) throw ApiError.notFound('Invite not found');
  return ApiResponse.success(res, 'Invite cancelled', { invite: inv });
});

export const updateMember = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'member');
  const m = await CircleMember.findOne({ _id: req.params.id, owner: req.ownerId });
  if (!m) throw ApiError.notFound('Not in your circle');
  if (req.body.role && ['CAREGIVER', 'VIEWER'].includes(req.body.role)) m.role = req.body.role;
  if (typeof req.body.label === 'string') m.label = req.body.label.slice(0, 40);
  await m.save();
  return ApiResponse.success(res, 'Updated', { member: m });
});

export const removeMember = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'member');
  const m = await CircleMember.findOneAndDelete({ _id: req.params.id, owner: req.ownerId }).populate('user', 'name');
  if (!m) throw ApiError.notFound('Not in your circle');
  await Activity.create({ owner: req.ownerId, actor: req.user._id, actorName: req.user.name, type: 'CIRCLE_REMOVED', text: `${req.user.name} removed ${m.user?.name || 'a member'} from the care circle` });
  return ApiResponse.success(res, 'Removed from circle');
});

/** A caregiver/viewer leaves the household they're currently viewing. */
export const leave = asyncHandler(async (req, res) => {
  if (req.role === 'OWNER') throw ApiError.badRequest('Owners can\'t leave their own family');
  await CircleMember.deleteOne({ owner: req.ownerId, user: req.user._id });
  await Activity.create({ owner: req.ownerId, actor: req.user._id, actorName: req.user.name, type: 'CIRCLE_LEFT', text: `${req.user.name} left the care circle` });
  return ApiResponse.success(res, 'You left the care circle');
});

/** Each circle member controls their own alerts. */
export const myAlerts = asyncHandler(async (req, res) => {
  if (req.role === 'OWNER') throw ApiError.badRequest('Owners always receive alerts for their family');
  const update = {};
  for (const k of ['missedDose', 'critical', 'weekly']) if (typeof req.body?.[k] === 'boolean') update[`alerts.${k}`] = req.body[k];
  const m = await CircleMember.findOneAndUpdate({ owner: req.ownerId, user: req.user._id }, { $set: update }, { new: true });
  return ApiResponse.success(res, 'Alert preferences saved', { membership: m });
});

export const activity = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 40, 200);
  const q = { owner: req.ownerId };
  if (req.query.member) q.member = assertObjectId(req.query.member, 'member');
  const items = await Activity.find(q).sort({ at: -1 }).limit(limit).populate('member', 'name color');
  return ApiResponse.success(res, 'Activity', { items });
});

export const report = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 31);
  return ApiResponse.success(res, 'Family report', await familyReport(req.ownerId, { days }));
});

export const preview = asyncHandler(async (req, res) => ApiResponse.success(res, 'Invite', await previewInvite(req.params.token)));

export const accept = asyncHandler(async (req, res) => ApiResponse.success(res, 'Welcome to the care circle', await acceptInvite(req.user, req.params.token)));

// ---- Notifications (per user, across every household they belong to) ----

export const notifications = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(40).populate('owner', 'name'),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  return ApiResponse.success(res, 'Notifications', { items, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => /^[a-f0-9]{24}$/i.test(id)) : null;
  const q = { user: req.user._id, read: false, ...(ids ? { _id: { $in: ids } } : {}) };
  await Notification.updateMany(q, { read: true });
  return ApiResponse.success(res, 'Marked as read');
});
