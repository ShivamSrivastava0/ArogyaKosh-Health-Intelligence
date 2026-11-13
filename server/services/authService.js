import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import User, { sha256 } from '../models/User.js';
import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import DoseLog from '../models/DoseLog.js';
import Vital from '../models/Vital.js';
import Record from '../models/Record.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';
import Expense from '../models/Expense.js';
import ShareLink from '../models/ShareLink.js';
import Relative from '../models/Relative.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import { CircleMember, CircleInvite, Activity, Notification } from '../models/Circle.js';
import { env } from '../config/env.js';
import { sendMail } from '../config/mail.js';
import { UPLOAD_ROOT } from '../middleware/upload.js';

const MAX_SESSIONS = 10;

/** Issue an access + refresh pair and remember the (hashed) refresh token. */
export const issueTokens = async (userId) => {
  const user = await User.findById(userId).select('+refreshTokens');
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  const { exp } = jwt.decode(refreshToken);
  const now = new Date();
  user.refreshTokens = [
    ...user.refreshTokens.filter((t) => t.expiresAt > now),
    { token: sha256(refreshToken), expiresAt: new Date(exp * 1000) },
  ].slice(-MAX_SESSIONS);
  user.lastLogin = now;
  await user.save();
  return { accessToken, refreshToken };
};

/** Rotate a refresh token. Reuse of an old token revokes every session. */
export const rotateRefreshToken = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    return null;
  }
  const hashed = sha256(refreshToken);
  const user = await User.findById(payload.id).select('+refreshTokens');
  if (!user) return null;
  if (!user.refreshTokens.some((t) => t.token === hashed)) {
    user.refreshTokens = [];
    await user.save();
    return null;
  }
  user.refreshTokens = user.refreshTokens.filter((t) => t.token !== hashed);
  await user.save();
  return { user, tokens: await issueTokens(user._id) };
};

export const revokeRefreshToken = async (userId, refreshToken) => {
  const update = refreshToken
    ? { $pull: { refreshTokens: { token: sha256(refreshToken) } } }
    : { $set: { refreshTokens: [] } };
  await User.updateOne({ _id: userId }, update);
};

const emailShell = (title, body, cta, url) => `<!doctype html><html><body style="margin:0;background:#f3f7f9;font-family:-apple-system,Segoe UI,Inter,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:40px 20px">
<div style="font-weight:700;font-size:18px;color:#0b2239;margin-bottom:24px">arogya<span style="background:#2dd4bf;padding:0 4px;border-radius:4px">kosh</span></div>
<div style="background:#fff;border:1px solid #e1e8ee;border-radius:16px;padding:32px">
<h1 style="font-size:22px;margin:0 0 12px;color:#0b2239">${title}</h1>
<div style="color:#2e4459;font-size:15px;line-height:1.6">${body}</div>
${cta ? `<a href="${url}" style="display:inline-block;margin-top:24px;background:#0b2239;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${cta}</a>
<p style="color:#7c93a6;font-size:12px;margin-top:24px;word-break:break-all">Or paste this link: ${url}</p>` : ''}
</div><p style="color:#7c93a6;font-size:12px;text-align:center;margin-top:20px">ArogyaKosh · Family health, organised.</p></div></body></html>`;

export const sendVerificationEmail = (user, raw) => {
  const url = `${env.client.url}/verify-email/${raw}`;
  return sendMail(user.email, 'Verify your ArogyaKosh email',
    emailShell('Confirm your email', `Hi ${user.name.split(' ')[0]}, confirm your email so we can send you refill and appointment reminders. The link is valid for 24 hours.`, 'Verify email', url));
};

export const sendPasswordResetEmail = (user, raw) => {
  const url = `${env.client.url}/reset-password/${raw}`;
  return sendMail(user.email, 'Reset your ArogyaKosh password',
    emailShell('Reset your password', `We received a request to reset your password. The link is valid for 1 hour. If this wasn't you, you can ignore this email.`, 'Choose a new password', url));
};

export { emailShell };

/** Everything the user has stored, as one JSON document. */
export const exportAccount = async (userId) => {
  const q = { owner: userId };
  const [user, members, medicines, doseLogs, vitals, records, reminders, vaccinations, expenses] = await Promise.all([
    User.findById(userId),
    Member.find(q), Medicine.find(q), DoseLog.find(q), Vital.find(q), Record.find(q),
    Reminder.find(q), Vaccination.find(q), Expense.find(q),
  ]);
  return { exportedAt: new Date(), format: 'arogyakosh/v1', user, members, medicines, doseLogs, vitals, records, reminders, vaccinations, expenses };
};

/** Permanently remove the account, all records and uploaded files. */
export const deleteAccount = async (userId) => {
  const q = { owner: userId };
  await Promise.all([
    Member.deleteMany(q), Medicine.deleteMany(q), DoseLog.deleteMany(q), Vital.deleteMany(q),
    Record.deleteMany(q), Reminder.deleteMany(q), Vaccination.deleteMany(q), Expense.deleteMany(q),
    ShareLink.deleteMany(q),
    Relative.deleteMany(q), WhatsAppMessage.deleteMany(q),
    // Care circle: this household's circle, and this user's seats in other circles.
    CircleMember.deleteMany({ $or: [{ owner: userId }, { user: userId }] }),
    CircleInvite.deleteMany(q),
    Activity.deleteMany(q),
    Notification.deleteMany({ $or: [{ owner: userId }, { user: userId }] }),
  ]);
  await User.deleteOne({ _id: userId });
  await fs.promises.rm(path.join(UPLOAD_ROOT, String(userId)), { recursive: true, force: true });
};
