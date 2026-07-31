import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sendMail } from '../config/mail.js';

/**
 * Hash a plain-text token using SHA-256
 * Used for securely storing verification/reset tokens in the DB
 * @param {string} token - Plain text token
 * @returns {string} Hashed token
 */
export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a pair of access + refresh tokens for a user
 * Also stores the hashed refresh token in the user's refreshTokens array
 * @param {Object} user - Mongoose user document
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export const generateTokenPair = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Decode refresh token to get expiry
  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  // Store hashed refresh token (not plain text)
  user.refreshTokens.push({
    token: hashToken(refreshToken),
    expiresAt,
  });

  // Clean up expired tokens while we're at it
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.expiresAt > new Date()
  );

  await user.save();

  return { accessToken, refreshToken };
};

/**
 * Send email verification email
 * @param {Object} user - Mongoose user document
 * @param {string} rawToken - Plain text verification token
 */
export const sendVerificationEmail = async (user, rawToken) => {
  const verificationUrl = `${env.client.url}/verify-email/${rawToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #059669; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">A</div>
            <h1 style="color: #0f172a; font-size: 24px; margin: 16px 0 0;">Verify Your Email</h1>
          </div>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">Welcome to ArogyaKosh! Please verify your email address by clicking the button below.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">Verify Email Address</a>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <p style="color: #94a3b8; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
        </div>
        
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">&copy; ${new Date().getFullYear()} ArogyaKosh. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendMail(user.email, 'Verify your ArogyaKosh account', html);
};

/**
 * Send password reset email
 * @param {Object} user - Mongoose user document
 * @param {string} rawToken - Plain text reset token
 */
export const sendPasswordResetEmail = async (user, rawToken) => {
  const resetUrl = `${env.client.url}/reset-password/${rawToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #059669; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">A</div>
            <h1 style="color: #0f172a; font-size: 24px; margin: 16px 0 0;">Reset Your Password</h1>
          </div>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
          <p style="color: #475569; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px;">Reset Password</a>
          </div>
          
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          
          <p style="color: #94a3b8; font-size: 12px;">If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="color: #3b82f6; font-size: 12px; word-break: break-all;">${resetUrl}</p>
        </div>
        
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">&copy; ${new Date().getFullYear()} ArogyaKosh. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  await sendMail(user.email, 'Reset your ArogyaKosh password', html);
};
