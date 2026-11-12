import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

const kitItemSchema = new mongoose.Schema(
  { key: { type: String, required: true }, have: { type: Boolean, default: false }, expiry: { type: Date, default: null } },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 60 },
    email: {
      type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required() { return !this.googleId; },
      minlength: 8,
      select: false,
    },
    googleId: { type: String, default: null },
    avatar: { type: String, default: null },
    phone: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },

    refreshTokens: {
      type: [{ token: String, expiresAt: Date, _id: false }],
      default: [],
      select: false,
    },

    prefs: {
      emailDigest: { type: Boolean, default: true },
      onboarded: { type: Boolean, default: false },
    },
    firstAidKit: { type: [kitItemSchema], default: [] },
    calendarToken: { type: String, default: undefined, index: { unique: true, sparse: true }, select: false },

    isDemo: { type: Boolean, default: false, index: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateAccessToken = function generateAccessToken() {
  return jwt.sign({ id: this._id }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiry });
};

userSchema.methods.generateRefreshToken = function generateRefreshToken() {
  return jwt.sign({ id: this._id, jti: crypto.randomUUID() }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiry });
};

userSchema.methods.createEmailVerificationToken = function createEmailVerificationToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = sha256(raw);
  this.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000;
  return raw;
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = sha256(raw);
  this.passwordResetExpiry = Date.now() + 60 * 60 * 1000;
  return raw;
};

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpiry;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiry;
    delete ret.__v;
    return ret;
  },
});

export { sha256 };
export default mongoose.model('User', userSchema);
