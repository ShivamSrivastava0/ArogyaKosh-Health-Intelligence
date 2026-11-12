import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User, { sha256 } from '../models/User.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { pick } from '../utils/helpers.js';
import {
  issueTokens, rotateRefreshToken, revokeRefreshToken,
  sendVerificationEmail, sendPasswordResetEmail, exportAccount, deleteAccount,
} from '../services/authService.js';
import { ensureSelfMember } from '../services/memberService.js';
import { createDemoAccount } from '../services/demoService.js';

const session = async (res, user, message, status = 200) => {
  const tokens = await issueTokens(user._id);
  const fresh = await User.findById(user._id);
  return ApiResponse.success(res, message, { user: fresh, tokens }, status);
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  const user = new User({ name, email, password });
  const raw = user.createEmailVerificationToken();
  await user.save();
  await ensureSelfMember(user);
  sendVerificationEmail(user, raw).catch((e) => console.error('[mail]', e.message));
  return session(res, user, 'Account created', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized('Incorrect email or password');
  await ensureSelfMember(user);
  return session(res, user, 'Signed in');
});

export const demo = asyncHandler(async (_req, res) => {
  const user = await createDemoAccount();
  return session(res, user, 'Demo household ready', 201);
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!env.google.clientId) throw ApiError.unavailable('Google sign-in is not configured on this server');
  if (!credential) throw ApiError.badRequest('Missing Google credential');
  const client = new OAuth2Client(env.google.clientId);
  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.google.clientId });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Google sign-in failed');
  }
  if (!payload?.email_verified) throw ApiError.unauthorized('Google account email is not verified');

  let user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    user = await User.create({ name: payload.name || payload.email.split('@')[0], email: payload.email, googleId: payload.sub, avatar: payload.picture, isEmailVerified: true });
  } else if (!user.googleId) {
    user.googleId = payload.sub;
    user.isEmailVerified = true;
    if (!user.avatar) user.avatar = payload.picture;
    await user.save();
  }
  await ensureSelfMember(user);
  return session(res, user, 'Signed in with Google');
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('Refresh token is required');
  const result = await rotateRefreshToken(refreshToken);
  if (!result) throw ApiError.unauthorized('Session expired, please sign in again');
  return ApiResponse.success(res, 'Session refreshed', { tokens: result.tokens });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefreshToken(req.user._id, req.body.refreshToken);
  return ApiResponse.success(res, 'Signed out');
});

export const me = asyncHandler(async (req, res) => ApiResponse.success(res, 'Current user', { user: req.user }));

export const updateMe = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['name', 'phone', 'city']);
  if (req.body.prefs) {
    for (const k of ['emailDigest', 'onboarded']) {
      if (typeof req.body.prefs[k] === 'boolean') req.user.prefs[k] = req.body.prefs[k];
    }
  }
  req.user.set(data);
  await req.user.save();
  return ApiResponse.success(res, 'Account updated', { user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (user.password && !(await user.comparePassword(currentPassword || ''))) throw ApiError.badRequest('Current password is incorrect');
  user.password = newPassword;
  await user.save();
  await revokeRefreshToken(user._id);
  return session(res, user, 'Password updated');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ emailVerificationToken: sha256(req.params.token), emailVerificationExpiry: { $gt: new Date() } });
  if (!user) throw ApiError.badRequest('This verification link is invalid or has expired');
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  await user.save();
  return ApiResponse.success(res, 'Email verified');
});

export const resendVerification = asyncHandler(async (req, res) => {
  if (req.user.isEmailVerified) return ApiResponse.success(res, 'Email already verified');
  const raw = req.user.createEmailVerificationToken();
  await req.user.save();
  await sendVerificationEmail(req.user, raw);
  return ApiResponse.success(res, 'Verification email sent');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && !user.isDemo) {
    const raw = user.createPasswordResetToken();
    await user.save();
    sendPasswordResetEmail(user, raw).catch((e) => console.error('[mail]', e.message));
  }
  return ApiResponse.success(res, 'If that email is registered, a reset link is on its way');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ passwordResetToken: sha256(req.params.token), passwordResetExpiry: { $gt: new Date() } });
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired');
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();
  await revokeRefreshToken(user._id);
  return ApiResponse.success(res, 'Password reset. Please sign in.');
});

export const exportData = asyncHandler(async (req, res) => {
  const data = await exportAccount(req.user._id);
  res.setHeader('Content-Disposition', `attachment; filename="arogyakosh-export-${new Date().toISOString().slice(0, 10)}.json"`);
  return res.json(data);
});

export const removeAccount = asyncHandler(async (req, res) => {
  if (req.body.confirm !== 'DELETE') throw ApiError.badRequest('Type DELETE to confirm');
  await deleteAccount(req.user._id);
  return ApiResponse.success(res, 'Account and all data deleted');
});

export const calendarLink = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+calendarToken');
  if (!user.calendarToken || req.body?.rotate) {
    user.calendarToken = crypto.randomBytes(20).toString('base64url');
    await user.save();
  }
  return ApiResponse.success(res, 'Calendar feed', { url: `${env.server.publicApiUrl}/public/calendar/${user.calendarToken}.ics` });
});
