import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { USER_ROLES } from '../constants/index.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.PATIENT,
    },
    avatar: {
      type: String,
      default: null,
    },

    // Email Verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },

    // Password Reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      select: false,
    },

    // Refresh Tokens (supports multiple devices)
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        _id: false,
      },
    ],

    // Account State
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// -----------------------------------------------------------------------
// Indexes
// -----------------------------------------------------------------------
userSchema.index({ email: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

// -----------------------------------------------------------------------
// Pre-save hook — hash password before saving
// -----------------------------------------------------------------------
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------
// Instance Methods
// -----------------------------------------------------------------------

/**
 * Compare a candidate password with the hashed password
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate a short-lived JWT access token
 * @returns {string} JWT token
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
};

/**
 * Generate a long-lived JWT refresh token
 * @returns {string} JWT token
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiry }
  );
};

/**
 * Generate email verification token
 * Sets token and expiry on the user document (does NOT save)
 * @returns {string} Plain text token (to be sent via email)
 */
userSchema.methods.generateEmailVerificationToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return rawToken;
};

/**
 * Generate password reset token
 * Sets token and expiry on the user document (does NOT save)
 * @returns {string} Plain text token (to be sent via email)
 */
userSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');
  this.passwordResetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  return rawToken;
};

// -----------------------------------------------------------------------
// Static Methods
// -----------------------------------------------------------------------

/**
 * Find user by email and verify password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object|null>} User document or null
 */
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');
  if (!user) return null;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return null;

  return user;
};

// -----------------------------------------------------------------------
// JSON transform — strip sensitive fields from API responses
// -----------------------------------------------------------------------
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpiry;
  delete user.passwordResetToken;
  delete user.passwordResetExpiry;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
