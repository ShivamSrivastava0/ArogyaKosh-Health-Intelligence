import Member, { AVATAR_COLORS } from '../models/Member.js';
import ApiError from '../utils/ApiError.js';
import { assertObjectId } from '../utils/helpers.js';

/** Load a member and make sure it belongs to the caller. */
export const getOwnedMember = async (ownerId, memberId) => {
  assertObjectId(memberId, 'member');
  const member = await Member.findOne({ _id: memberId, owner: ownerId });
  if (!member) throw ApiError.notFound('Family member not found');
  return member;
};

/** Throws unless every given member id belongs to the owner. */
export const assertMembersOwned = async (ownerId, ids = []) => {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return;
  unique.forEach((id) => assertObjectId(id, 'member'));
  const count = await Member.countDocuments({ owner: ownerId, _id: { $in: unique } });
  if (count !== unique.length) throw ApiError.notFound('Family member not found');
};

/** Every account has exactly one "self" member — create it on first use. */
export const ensureSelfMember = async (user) => {
  const existing = await Member.findOne({ owner: user._id, isSelf: true });
  if (existing) return existing;
  return Member.create({ owner: user._id, isSelf: true, name: user.name, relation: 'SELF', color: 'lime' });
};

export const nextColor = async (ownerId) => {
  const count = await Member.countDocuments({ owner: ownerId });
  return AVATAR_COLORS[count % AVATAR_COLORS.length];
};

export const memberLite = (m) => (m ? { _id: m._id, name: m.name, color: m.color, relation: m.relation, isSelf: m.isSelf } : null);
