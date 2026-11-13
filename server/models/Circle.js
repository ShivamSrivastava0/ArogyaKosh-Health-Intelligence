import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CIRCLE_ROLES = ['CAREGIVER', 'VIEWER'];

/**
 * A person (other than the owner) who helps look after a household.
 * owner = the household's account; user = the helper's own account.
 */
const circleMemberSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: CIRCLE_ROLES, default: 'CAREGIVER' },
    label: { type: String, trim: true, maxlength: 40, default: '' }, // e.g. "Brother", "Nurse"
    alerts: {
      missedDose: { type: Boolean, default: true },
      critical: { type: Boolean, default: true },
      weekly: { type: Boolean, default: true },
    },
    lastSeenAt: { type: Date, default: null },
  },
  { timestamps: true }
);
circleMemberSchema.index({ owner: 1, user: 1 }, { unique: true });
circleMemberSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; return ret; } });

const circleInviteSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: CIRCLE_ROLES, default: 'CAREGIVER' },
    label: { type: String, trim: true, maxlength: 40, default: '' },
    tokenHash: { type: String, required: true, unique: true, select: false },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REVOKED'], default: 'PENDING' },
    expiresAt: { type: Date, required: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);
circleInviteSchema.set('toJSON', { transform(_d, ret) { delete ret.__v; delete ret.tokenHash; return ret; } });

/** Who did what — the shared timeline that keeps a circle in sync. */
const activitySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null }, // null = system
    actorName: { type: String, default: 'ArogyaKosh' },
    member: { type: Schema.Types.ObjectId, ref: 'Member', default: null },
    type: { type: String, required: true },
    text: { type: String, required: true, maxlength: 300 },
    link: { type: String, default: '' },
    at: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);
activitySchema.index({ owner: 1, at: -1 });

/** In-app notification for one user (deduplicated by key). */
const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // household it is about
    type: { type: String, required: true },
    level: { type: String, enum: ['critical', 'warning', 'info'], default: 'info' },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 400 },
    link: { type: String, default: '' },
    key: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, key: 1 }, { unique: true });
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const CircleMember = mongoose.model('CircleMember', circleMemberSchema);
export const CircleInvite = mongoose.model('CircleInvite', circleInviteSchema);
export const Activity = mongoose.model('Activity', activitySchema);
export const Notification = mongoose.model('Notification', notificationSchema);
