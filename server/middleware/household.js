import mongoose from 'mongoose';
import User from '../models/User.js';
import { CircleMember } from '../models/Circle.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Resolves which household a request acts on.
 * - No X-Household header (or the caller's own id) → the caller's own household, role OWNER.
 * - Another id → caller must be an active circle member of that household.
 * Sets req.ownerId (scopes every query), req.household (owner's User doc),
 * req.role ('OWNER' | 'CAREGIVER' | 'VIEWER').
 */
export const resolveHousehold = asyncHandler(async (req, _res, next) => {
  const requested = req.headers['x-household'];
  if (!requested || String(requested) === String(req.user._id)) {
    req.ownerId = req.user._id;
    req.household = req.user;
    req.role = 'OWNER';
    return next();
  }
  if (!mongoose.isValidObjectId(requested)) throw ApiError.badRequest('Invalid household');
  const membership = await CircleMember.findOne({ owner: requested, user: req.user._id });
  if (!membership) throw ApiError.forbidden('You are not part of this family\'s care circle');
  const household = await User.findById(requested);
  if (!household) throw ApiError.notFound('This household no longer exists');
  req.ownerId = household._id;
  req.household = household;
  req.role = membership.role;
  req.membership = membership;
  // Cheap presence signal for the circle page, at most once a minute.
  if (!membership.lastSeenAt || Date.now() - membership.lastSeenAt > 60000) {
    CircleMember.updateOne({ _id: membership._id }, { lastSeenAt: new Date() }).catch(() => {});
  }
  return next();
});

/** Viewers are read-only. */
export const requireWrite = (req, _res, next) => {
  if (req.method !== 'GET' && req.role === 'VIEWER') return next(ApiError.forbidden('You have view-only access to this family'));
  return next();
};

/** Actions only the household owner may take. */
export const ownerOnly = (req, _res, next) => {
  if (req.role !== 'OWNER') return next(ApiError.forbidden('Only the account owner can do this'));
  return next();
};
