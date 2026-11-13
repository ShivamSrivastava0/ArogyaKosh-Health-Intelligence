import cron from 'node-cron';
import User from '../models/User.js';
import { deleteAccount, emailShell } from '../services/authService.js';
import { todayFeed } from '../services/insightService.js';
import { scanMissedDoses, sendWeeklyReports } from '../services/circleService.js';
import { runReminders } from '../services/whatsappService.js';
import { sendMail, isMailConfigured } from '../config/mail.js';
import { env } from '../config/env.js';
import { toDateKey } from '../utils/helpers.js';

/** Remove demo households older than 24 hours. */
export const purgeDemoAccounts = async () => {
  const cutoff = new Date(Date.now() - 24 * 3600000);
  const old = await User.find({ isDemo: true, createdAt: { $lt: cutoff } }).select('_id');
  for (const u of old) await deleteAccount(u._id);
  if (old.length) console.log(`[jobs] purged ${old.length} demo account(s)`);
};

/** Morning email: today's doses, alerts and what is coming up. */
export const sendDailyDigests = async () => {
  if (!isMailConfigured) return;
  const users = await User.find({ isDemo: false, isEmailVerified: true, 'prefs.emailDigest': true });
  for (const user of users) {
    try {
      const feed = await todayFeed(user, toDateKey(new Date()));
      if (!feed.doses.length && !feed.alerts.length && !feed.upcoming.length) continue;
      const li = (s) => `<li style="margin:4px 0">${s}</li>`;
      const body = [
        feed.doses.length ? `<p><b>${feed.doses.length} doses today</b></p><ul>${feed.doses.slice(0, 12).map((d) => li(`${d.time} — ${d.medicine.name} (${d.member.name})`)).join('')}</ul>` : '',
        feed.alerts.length ? `<p><b>Needs attention</b></p><ul>${feed.alerts.slice(0, 6).map((a) => li(`${a.title}${a.member ? ` — ${a.member.name}` : ''}`)).join('')}</ul>` : '',
        feed.upcoming.length ? `<p><b>Coming up</b></p><ul>${feed.upcoming.slice(0, 5).map((u) => li(`${new Date(u.at).toDateString()} — ${u.title} (${u.member?.name || ''})`)).join('')}</ul>` : '',
      ].join('');
      await sendMail(user.email, 'Your family health plan for today', emailShell(`Good morning, ${user.name.split(' ')[0]}`, body, 'Open ArogyaKosh', `${env.client.url}/app`));
    } catch (e) {
      console.error(`[jobs] digest failed for ${user._id}:`, e.message);
    }
  }
};

export const startJobs = () => {
  const timezone = process.env.TZ || 'Asia/Kolkata';
  cron.schedule('17 * * * *', () => purgeDemoAccounts().catch((e) => console.error('[jobs] purge', e)));
  cron.schedule('30 7 * * *', () => sendDailyDigests().catch((e) => console.error('[jobs] digest', e)), { timezone });
  // Care circle: doses unmarked an hour after their time alert the family (deduplicated).
  cron.schedule('*/10 * * * *', () => scanMissedDoses().catch((e) => console.error('[jobs] missed-dose', e)), { timezone });
  cron.schedule('* * * * *', () => runReminders().catch((e) => console.error('[jobs] whatsapp', e)), { timezone });
  cron.schedule('0 18 * * 0', () => sendWeeklyReports().catch((e) => console.error('[jobs] weekly', e)), { timezone });
  console.log('[jobs] scheduled: demo purge (hourly), daily digest (07:30), missed-dose scan (every 10 min), weekly report (Sun 18:00)');
};
