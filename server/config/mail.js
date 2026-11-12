import nodemailer from 'nodemailer';
import { env } from './env.js';

const smtpReady = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
  : null;

/**
 * Send an email. Without SMTP configured, the message is logged instead
 * so local development never fails on mail.
 */
export const sendMail = async (to, subject, html) => {
  if (!transporter) {
    console.log(`[mail:dev] to=${to} subject="${subject}"`);
    const link = html.match(/href="([^"]+)"/);
    if (link) console.log(`[mail:dev] link: ${link[1]}`);
    return { messageId: 'dev-log' };
  }
  return transporter.sendMail({
    from: env.smtp.from || `"ArogyaKosh" <${env.smtp.user}>`,
    to,
    subject,
    html,
  });
};

export const isMailConfigured = smtpReady;
