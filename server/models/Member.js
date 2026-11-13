import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  BLOOD_GROUPS, GENDERS, RELATIONS, SEVERITIES, CONDITION_STATUS, LIFESTYLE,
} from '../constants/index.js';

const { Schema } = mongoose;
const opt = (values) => ({ type: String, enum: [...values, ''], default: '' });

const AVATAR_COLORS = ['lime', 'sky', 'peach', 'lilac', 'mint', 'sun', 'rose', 'sand'];

/**
 * A person whose health the account holder manages. The account holder is
 * themselves a member (isSelf=true). Every health record references a member.
 */
const memberSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isSelf: { type: Boolean, default: false },
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 1, maxlength: 60 },
    relation: { type: String, enum: RELATIONS, required: true, default: 'OTHER' },
    dob: { type: Date, default: null },
    gender: opt(GENDERS),
    bloodGroup: opt(BLOOD_GROUPS),
    heightCm: { type: Number, min: 30, max: 260, default: null },
    weightKg: { type: Number, min: 1, max: 400, default: null },
    waistCm: { type: Number, min: 30, max: 250, default: null },
    phone: { type: String, trim: true, default: '' },

    allergies: [{ name: { type: String, required: true, trim: true }, severity: { type: String, enum: SEVERITIES, default: 'MODERATE' }, reaction: { type: String, trim: true, default: '' } }],
    noKnownAllergies: { type: Boolean, default: false },
    conditions: [{ name: { type: String, required: true, trim: true }, since: { type: Date, default: null }, status: { type: String, enum: CONDITION_STATUS, default: 'ACTIVE' } }],
    emergencyContacts: [{ name: { type: String, required: true, trim: true }, relation: { type: String, trim: true, default: '' }, phone: { type: String, required: true, trim: true } }],
    doctor: {
      name: { type: String, trim: true, default: '' },
      specialty: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      clinic: { type: String, trim: true, default: '' },
    },
    insurance: [{
      provider: { type: String, required: true, trim: true },
      policyNumber: { type: String, trim: true, default: '' },
      sumInsured: { type: Number, default: null },
      validTill: { type: Date, default: null },
      helpline: { type: String, trim: true, default: '' },
    }],
    lifestyle: {
      smoking: opt(LIFESTYLE.smoking),
      alcohol: opt(LIFESTYLE.alcohol),
      activity: opt(LIFESTYLE.activity),
      diet: opt(LIFESTYLE.diet),
      sleepHours: { type: Number, min: 0, max: 24, default: null },
    },
    organDonor: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    color: { type: String, enum: AVATAR_COLORS, default: 'lime' },

    emergencyToken: { type: String, unique: true, index: true },
    emergencyEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

memberSchema.index({ owner: 1, isSelf: 1 });

memberSchema.pre('validate', function assignToken(next) {
  if (!this.emergencyToken) this.emergencyToken = crypto.randomBytes(9).toString('base64url');
  next();
});

memberSchema.virtual('age').get(function age() {
  if (!this.dob) return null;
  const now = new Date();
  const dob = new Date(this.dob);
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return Math.max(years, 0);
});

memberSchema.virtual('bmi').get(function bmi() {
  if (!this.heightCm || !this.weightKg) return null;
  const h = this.heightCm / 100;
  return Math.round((this.weightKg / (h * h)) * 10) / 10;
});

memberSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) { delete ret.__v; delete ret.id; return ret; },
});

export { AVATAR_COLORS };
export default mongoose.model('Member', memberSchema);
