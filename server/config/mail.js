import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter;

if (env.smtp.host && env.smtp.user && env.smtp.pass) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port == 465, // true for 465, false for other ports
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
} else {
  // Development mode fallback
  transporter = {
    sendMail: async (mailOptions) => {
      console.log('--- MOCK EMAIL SENT ---');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Html length:', mailOptions.html ? mailOptions.html.length : 0);
      console.log('-----------------------');
      return { messageId: 'mock-id' };
    },
  };
}

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<any>}
 */
export const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: `"ArogyaKosh" <${env.smtp.user || 'noreply@arogyakosh.com'}>`,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
};

export default transporter;
