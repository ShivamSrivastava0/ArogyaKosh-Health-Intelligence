import crypto from 'crypto';
import User, { sha256 } from '../models/User.js';
import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import DoseLog from '../models/DoseLog.js';
import Vital from '../models/Vital.js';
import Reminder from '../models/Reminder.js';
import Record from '../models/Record.js';
import { CircleMember, CircleInvite, Activity, Notification } from '../models/Circle.js';
import ApiError from '../utils/ApiError.js';
import { sendMail, isMailConfigured } from '../config/mail.js';
import { emailShell } from './authService.js';
import { env } from '../config/env.js';
import { adherence, isScheduledOn } from './medicineService.js';
import { addDays, toDateKey } from '../utils/helpers.js';
import { VITALS, formatVital } from '../data/vitals.js';

const INVITE_DAYS = 7;
const MAX_CIRCLE = 10;
const firstName = (n = '') => n.split(' ')[0];

// --------------------------------------------------------------------------
// Activity & notifications
// --------------------------------------------------------------------------

/** Append to the household's shared timeline. Never throws (logging must not break the action). */
export const logActivity = async (req, { type, text, member = null, link = '' }) => {
  try {
    await Activity.create({ owner: req.ownerId, actor: req.user?._id || null, actorName: req.user?.name || 'ArogyaKosh', member, type, text, link });
  } catch (e) {
    console.error('[activity]', e.message);
  }
};

/** Everyone who should hear about a household: the owner and circle members, filtered by alert preference. */
export const circleRecipients = async (ownerId, pref) => {
  const owner = await User.findById(ownerId).select('name email isDemo prefs');
  const members = await CircleMember.find({ owner: ownerId, ...(pref ? { [`alerts.${pref}`]: true } : {}) }).populate('user', 'name email isDemo');
  return [owner, ...members.map((m) => m.user)].filter(Boolean);
};

/**
 * Notify the circle. `key` deduplicates (same alert never repeats for a user).
 * Email goes out only for critical/missed-dose alerts and only if SMTP is set.
 */
export const notifyCircle = async (ownerId, { type, level = 'info', title, body = '', link = '', key, pref, excludeUser, email = false }) => {
  const recipients = (await circleRecipients(ownerId, pref)).filter((u) => !excludeUser || String(u._id) !== String(excludeUser));
  let created = 0;
  for (const u of recipients) {
    try {
      await Notification.create({ user: u._id, owner: ownerId, type, level, title, body, link, key });
      created += 1;
      if (email && isMailConfigured && !u.isDemo) {
        sendMail(u.email, title, emailShell(title, body, 'Open ArogyaKosh', `${env.client.url}${link || '/app'}`)).catch(() => {});
      }
    } catch (e) {
      if (e.code !== 11000) console.error('[notify]', e.message); // 11000 = already notified
    }
  }
  return created;
};

// --------------------------------------------------------------------------
// Circle membership
// --------------------------------------------------------------------------

export const listCircle = async (ownerId) => {
  const [owner, members, invites] = await Promise.all([
    User.findById(ownerId).select('name email avatar lastLogin'),
    CircleMember.find({ owner: ownerId }).populate('user', 'name email avatar').sort({ createdAt: 1 }),
    CircleInvite.find({ owner: ownerId, status: 'PENDING', expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }),
  ]);
  return {
    owner: { _id: owner._id, name: owner.name, email: owner.email, role: 'OWNER', lastSeenAt: owner.lastLogin },
    members: members.filter((m) => m.user).map((m) => ({ _id: m._id, user: m.user, role: m.role, label: m.label, alerts: m.alerts, lastSeenAt: m.lastSeenAt, since: m.createdAt })),
    invites,
  };
};

/** Households the user can open: their own plus any circle they belong to. */
export const householdsFor = async (user) => {
  const memberships = await CircleMember.find({ user: user._id }).populate('owner', 'name');
  const counts = await Member.aggregate([
    { $match: { owner: { $in: [user._id, ...memberships.map((m) => m.owner?._id).filter(Boolean)] } } },
    { $group: { _id: '$owner', n: { $sum: 1 } } },
  ]);
  const n = new Map(counts.map((c) => [String(c._id), c.n]));
  return [
    { _id: user._id, name: `${firstName(user.name)}'s family`, role: 'OWNER', members: n.get(String(user._id)) || 0 },
    ...memberships.filter((m) => m.owner).map((m) => ({
      _id: m.owner._id, name: `${firstName(m.owner.name)}'s family`, ownerName: m.owner.name, role: m.role, label: m.label, members: n.get(String(m.owner._id)) || 0,
    })),
  ];
};

export const createInvite = async (owner, { email, role = 'CAREGIVER', label = '' }) => {
  const clean = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(clean)) throw ApiError.badRequest('Enter a valid email address');
  if (clean === owner.email) throw ApiError.badRequest('You are already the owner of this family');
  if (!['CAREGIVER', 'VIEWER'].includes(role)) throw ApiError.badRequest('Invalid role');
  const existingUser = await User.findOne({ email: clean }).select('_id');
  if (existingUser && await CircleMember.exists({ owner: owner._id, user: existingUser._id })) throw ApiError.conflict('This person is already in your care circle');
  if (await CircleMember.countDocuments({ owner: owner._id }) >= MAX_CIRCLE) throw ApiError.badRequest(`A care circle can have up to ${MAX_CIRCLE} people`);

  // One live invite per email: replace any older pending one.
  await CircleInvite.updateMany({ owner: owner._id, email: clean, status: 'PENDING' }, { status: 'REVOKED' });
  const raw = crypto.randomBytes(24).toString('base64url');
  const invite = await CircleInvite.create({
    owner: owner._id, invitedBy: owner._id, email: clean, role, label: String(label).slice(0, 40),
    tokenHash: sha256(raw), expiresAt: addDays(new Date(), INVITE_DAYS),
  });
  const url = `${env.client.url}/invite/${raw}`;
  sendMail(clean, `${owner.name} invited you to help care for their family`,
    emailShell(`Join ${firstName(owner.name)}'s care circle`, `${owner.name} wants you to help look after their family's health on ArogyaKosh — medicines, readings, appointments and alerts in one shared place. You'll join as a <b>${role === 'VIEWER' ? 'viewer' : 'caregiver'}</b>. The invite is valid for ${INVITE_DAYS} days.`, 'Accept invite', url))
    .catch(() => {});
  return { invite, url };
};

const findInviteByToken = async (raw) => {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(raw || '')) throw ApiError.notFound('Invite not found');
  const invite = await CircleInvite.findOne({ tokenHash: sha256(raw) }).populate('owner', 'name');
  if (!invite || !invite.owner) throw ApiError.notFound('Invite not found');
  if (invite.status === 'REVOKED') throw ApiError.gone('This invite was cancelled');
  if (invite.status === 'ACCEPTED') throw ApiError.gone('This invite has already been used');
  if (invite.expiresAt < new Date()) throw ApiError.gone('This invite has expired — ask for a new one');
  return invite;
};

export const previewInvite = async (raw) => {
  const invite = await findInviteByToken(raw);
  const members = await Member.countDocuments({ owner: invite.owner._id });
  return { ownerName: invite.owner.name, email: invite.email, role: invite.role, label: invite.label, members, expiresAt: invite.expiresAt };
};

export const acceptInvite = async (user, raw) => {
  const invite = await findInviteByToken(raw);
  // Invites are personal: only the invited address can accept, so a forwarded link is useless.
  if (invite.email !== user.email) throw ApiError.forbidden(`This invite was sent to ${invite.email}. Sign in with that email to accept it.`);
  if (String(invite.owner._id) === String(user._id)) throw ApiError.badRequest('You can\'t join your own family circle');
  await CircleMember.updateOne(
    { owner: invite.owner._id, user: user._id },
    { $setOnInsert: { role: invite.role, label: invite.label } },
    { upsert: true },
  );
  invite.status = 'ACCEPTED';
  invite.acceptedBy = user._id;
  await invite.save();
  await Activity.create({ owner: invite.owner._id, actor: user._id, actorName: user.name, type: 'CIRCLE_JOINED', text: `${user.name} joined the care circle as ${invite.role === 'VIEWER' ? 'a viewer' : 'a caregiver'}`, link: '/app/circle' });
  await notifyCircle(invite.owner._id, { type: 'CIRCLE_JOINED', title: `${firstName(user.name)} joined your care circle`, body: invite.label ? `As ${invite.label}` : '', link: '/app/circle', key: `joined-${user._id}`, excludeUser: user._id });
  return { householdId: invite.owner._id, ownerName: invite.owner.name };
};

// --------------------------------------------------------------------------
// Alerts
// --------------------------------------------------------------------------

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const clock = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };

/**
 * Doses still unmarked GRACE minutes after their time today → alert the circle once.
 * Runs on a schedule; dedup keys make it safe to run as often as needed.
 */
export const scanMissedDoses = async ({ now = new Date(), graceMinutes = 60 } = {}) => {
  const dateKey = toDateKey(now);
  const cutoff = hhmm(new Date(now.getTime() - graceMinutes * 60000));
  const startOfDayCut = '05:00'; // don't alert about pre-dawn doses at midnight
  const meds = await Medicine.find({ active: true, 'times.0': { $exists: true } }).populate('member', 'name');
  const logs = await DoseLog.find({ date: dateKey, medicine: { $in: meds.map((m) => m._id) } }).select('medicine time');
  const logged = new Set(logs.map((l) => `${l.medicine}|${l.time}`));
  let alerts = 0;
  for (const med of meds) {
    if (!med.member || !isScheduledOn(med, now)) continue;
    for (const t of med.times) {
      if (t > cutoff || t < startOfDayCut || logged.has(`${med._id}|${t}`)) continue;
      alerts += await notifyCircle(med.owner, {
        type: 'MISSED_DOSE', level: 'warning', pref: 'missedDose', email: true,
        title: `${firstName(med.member.name)} hasn't taken ${med.name} (${clock(t)})`,
        body: `The ${clock(t)} dose isn't marked yet. A quick call might help.`,
        link: '/app', key: `missed-${med._id}-${dateKey}-${t}`,
      });
    }
  }
  return alerts;
};

/** Called when a reading is saved: a critical value alerts everyone else in the circle immediately. */
export const alertIfCritical = async (req, vital, member) => {
  if (vital.status !== 'CRITICAL') return;
  const value = formatVital(vital.type, vital.value, vital.value2);
  await notifyCircle(req.ownerId, {
    type: 'CRITICAL_READING', level: 'critical', pref: 'critical', email: true, excludeUser: req.user._id,
    title: `${firstName(member?.name)}'s ${VITALS[vital.type].label.toLowerCase()} is in the critical range`,
    body: `${value}, logged by ${firstName(req.user.name)}. If this is accurate, seek medical help now.`,
    link: `/app/vitals?member=${vital.member}&type=${vital.type}`, key: `critical-${vital._id}`,
  });
};

// --------------------------------------------------------------------------
// Weekly report
// --------------------------------------------------------------------------

/** What happened in the household over the last `days` days, per person. */
export const familyReport = async (ownerId, { days = 7 } = {}) => {
  const since = addDays(new Date(), -days);
  const members = await Member.find({ owner: ownerId }).sort({ isSelf: -1, createdAt: 1 });
  const [vitals, visits, records, activity, upcoming] = await Promise.all([
    Vital.find({ owner: ownerId, at: { $gte: since } }).select('member type value value2 status at'),
    Reminder.find({ owner: ownerId, status: 'DONE', completedAt: { $gte: since } }).select('member title completedAt'),
    Record.countDocuments({ owner: ownerId, createdAt: { $gte: since } }),
    Activity.aggregate([{ $match: { owner: ownerId, at: { $gte: since }, actor: { $ne: null } } }, { $group: { _id: '$actorName', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    Reminder.find({ owner: ownerId, status: 'UPCOMING', dueAt: { $gte: new Date(), $lte: addDays(new Date(), 14) } }).sort({ dueAt: 1 }).select('member title dueAt'),
  ]);
  const people = [];
  for (const m of members) {
    const adh = await adherence(ownerId, { memberId: m._id, days });
    const mv = vitals.filter((v) => String(v.member) === String(m._id));
    const flagged = mv.filter((v) => ['HIGH', 'LOW', 'CRITICAL'].includes(v.status));
    people.push({
      member: { _id: m._id, name: m.name, color: m.color, isSelf: m.isSelf },
      adherence: adh.pct,
      dosesExpected: adh.expected,
      dosesMissed: adh.missed + adh.skipped,
      worstMedicine: adh.byMedicine.filter((x) => x.expected >= 3).sort((a, b) => a.pct - b.pct)[0] || null,
      readings: mv.length,
      flagged: flagged.slice(0, 3).map((v) => ({ label: VITALS[v.type].label, value: formatVital(v.type, v.value, v.value2), status: v.status, at: v.at })),
      visits: visits.filter((v) => String(v.member) === String(m._id)).map((v) => v.title),
      upcoming: upcoming.filter((u) => String(u.member) === String(m._id)).map((u) => ({ title: u.title, at: u.dueAt })),
    });
  }
  return { days, since, generatedAt: new Date(), people, recordsAdded: records, contributors: activity.map((a) => ({ name: a._id, actions: a.n })) };
};

export const sendWeeklyReports = async () => {
  if (!isMailConfigured) return 0;
  const owners = await User.find({ isDemo: false }).select('_id name');
  let sent = 0;
  for (const owner of owners) {
    const report = await familyReport(owner._id, { days: 7 });
    if (!report.people.some((p) => p.dosesExpected || p.readings)) continue;
    const rows = report.people.map((p) => `<li><b>${p.member.name}</b>: ${p.adherence !== null ? `${p.adherence}% of doses taken` : 'no scheduled doses'}${p.flagged.length ? ` · <span style="color:#d63a44">${p.flagged.map((f) => `${f.label} ${f.value}`).join(', ')}</span>` : ''}</li>`).join('');
    const recipients = await circleRecipients(owner._id, 'weekly');
    for (const u of recipients.filter((x) => !x.isDemo)) {
      await sendMail(u.email, `Weekly health report — ${firstName(owner.name)}'s family`, emailShell('This week at a glance', `<ul>${rows}</ul>`, 'See full report', `${env.client.url}/app/circle`)).catch(() => {});
      sent += 1;
    }
  }
  return sent;
};
