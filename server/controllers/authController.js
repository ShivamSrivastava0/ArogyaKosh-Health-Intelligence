import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/index.js';
import {
  generateTokenPair,
  sendVerificationEmail,
  sendPasswordResetEmail,
  hashToken,
} from '../services/authService.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(ApiError.conflict('An account with this email already exists'));
  }

  // Create user
  const user = new User({
    name,
    email,
    password,
    role: role || undefined,
  });

  // Generate verification token
  const rawVerificationToken = user.generateEmailVerificationToken();
  await user.save();

  // Send verification email asynchronously
  sendVerificationEmail(user, rawVerificationToken).catch((err) =>
    console.error('Failed to send verification email:', err)
  );

  // Generate auth tokens
  const tokens = await generateTokenPair(user);

  return ApiResponse.created(res, 'User registered successfully. Verification email sent.', {
    user: user.toJSON(),
    tokens,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findByCredentials(email, password);
  if (!user) {
    return next(ApiError.unauthorized('Invalid email or password'));
  }

  if (!user.isActive) {
    return next(ApiError.forbidden('Your account has been deactivated'));
  }

  // Update last login
  user.lastLogin = new Date();

  // Generate auth tokens
  const tokens = await generateTokenPair(user);

  return ApiResponse.success(res, 'Login successful', {
    user: user.toJSON(),
    tokens,
  });
});

/**
 * @desc    Logout user (revokes refresh token)
 * @route   POST /api/auth/logout
 * @access  Public / Private
 */
export const logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken && req.user) {
    const hashed = hashToken(refreshToken);
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { refreshTokens: { token: hashed } },
    });
  } else if (req.user) {
    // Revoke all refresh tokens if no specific token provided
    await User.findByIdAndUpdate(req.user.id, {
      $set: { refreshTokens: [] },
    });
  }

  return ApiResponse.success(res, 'Logged out successfully');
});

/**
 * @desc    Refresh access token using refresh token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refresh = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(ApiError.badRequest('Refresh token is required'));
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired refresh token'));
  }

  const hashed = hashToken(refreshToken);
  const user = await User.findOne({
    _id: decoded.id,
    'refreshTokens.token': hashed,
  });

  if (!user) {
    return next(ApiError.unauthorized('Refresh token is invalid or has been revoked'));
  }

  // Token rotation: remove old refresh token
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== hashed);

  // Generate new token pair
  const tokens = await generateTokenPair(user);

  return ApiResponse.success(res, 'Token refreshed successfully', {
    tokens,
  });
});

/**
 * @desc    Verify email address
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return next(ApiError.badRequest('Verification token is required'));
  }

  const hashed = hashToken(token);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpiry: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpiry');

  if (!user) {
    return next(ApiError.badRequest('Invalid or expired verification token'));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  await user.save();

  return ApiResponse.success(res, 'Email verified successfully');
});

/**
 * @desc    Request password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Generic response to prevent account enumeration
  if (!user) {
    return ApiResponse.success(
      res,
      'If an account exists with that email, a password reset link has been sent'
    );
  }

  const rawResetToken = user.generatePasswordResetToken();
  await user.save();

  sendPasswordResetEmail(user, rawResetToken).catch((err) =>
    console.error('Failed to send password reset email:', err)
  );

  return ApiResponse.success(
    res,
    'If an account exists with that email, a password reset link has been sent'
  );
});

/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    return next(ApiError.badRequest('Reset token is required'));
  }

  const hashed = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiry: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) {
    return next(ApiError.badRequest('Invalid or expired reset token'));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  // Clear all refresh tokens to force re-login everywhere
  user.refreshTokens = [];

  await user.save();

  return ApiResponse.success(res, 'Password reset successful. Please login with your new password.');
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(ApiError.notFound('User not found'));
  }

  return ApiResponse.success(res, 'Current user retrieved successfully', {
    user: user.toJSON(),
  });
});
