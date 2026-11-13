import crypto from 'crypto';
import Member from '../models/Member.js';
import User from '../models/User.js';
import WhatsAppMessage from '../models/WhatsAppMessage.js';
import { env } from '../config/env.js';
import { dosesForDay, setDoseStatus } from './medicineService.js';
import { logActivity } from './circleService.js';
import { toDateKey } from '../utils/helpers.js';
import ApiError from '../utils/ApiError.js';

/**
 * WhatsApp dose check-off.
 *
 * Parents get a WhatsApp message when a dose is due and reply "1" (taken) or
 * "2" (skip). No app, no login. Several family members on one phone (e.g. both
 * parents sharing a phone) get a single combined message, and one reply logs
 * all of it.
 *
 * Transport: Meta WhatsApp Business Cloud API when WHATSAPP_TOKEN and
 * WHATSAPP_PHONE_NUMBER_ID are set; otherwise messages are stored and shown in
 * the in-app simulator so the whole flow can be tried without a business number.
 */

export const isLive = () => Boolean(env.whatsapp.token && env.whatsapp.phoneNumberId);

/** Demo households (fictional phone numbers) always use the simulator. */
export const usesSimulator = async (ownerId) => !isLive() || Boolean(await User.exists({ _id: ownerId, isDemo: true }));

/** Normalise to WhatsApp's wa_id format: country code + number, digits only. Indian 10-digit numbers get 91. */
export const normalizePhone = (raw = '') => {
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 10 && /^[6-9]/.test(d)) d = `91${d}`;
  return /^\d{11,15}$/.test(d) ? d : null;
};

const first = (name = '') => name.trim().split(/\s+/)[0];
const clock = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`; };
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const addMin = (t, n) => { const [h, m] = t.split(':').map(Number); const x = (h * 60 + m + n + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

const MEAL = {
  en: { BEFORE_FOOD: 'before food', AFTER_FOOD: 'after food', WITH_FOOD: 'with food', EMPTY_STOMACH: 'empty stomach', BEDTIME: 'at bedtime' },
  hi: { BEFORE_FOOD: 'khane se pehle', AFTER_FOOD: 'khane ke baad', WITH_FOOD: 'khane ke saath', EMPTY_STOMACH: 'khali pet', BEDTIME: 'sone se pehle' },
};
const UNIT = {
  en: { TABLET: 'tablet', CAPSULE: 'capsule', SYRUP: 'ml', DROPS: 'drops', INHALER: 'puff', SACHET: 'sachet' },
  hi: { TABLET: 'goli', CAPSULE: 'capsule', SYRUP: 'ml', DROPS: 'boond', INHALER: 'puff', SACHET: 'sachet' },
};
const doseLine = (d, lang) => {
  const m = d.medicine;
  const qty = UNIT[lang][m.form] ? `${m.dose} ${UNIT[lang][m.form]}${lang === 'en' && m.dose !== 1 && !['ml', 'drops'].includes(UNIT.en[m.form]) ? 's' : ''}` : '';
  return [[m.name, m.strength].filter(Boolean).join(' '), [qty, MEAL[lang][m.mealTiming]].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
};

const T = {
  en: {
    optIn: (by, names) => `Namaste! ${by} has set up medicine reminders for ${names} on ArogyaKosh.\n\nYou'll get a message when it's time for a dose. Just reply *1* when you've taken it.\n\nReply *YES* to start. Reply *STOP* any time to stop.`,
    hello: (names) => `Namaste ${names}`,
    due: (time) => `It's time for your ${time} medicines:`,
    ask: 'Reply *1* when taken, *2* to skip.',
    nudge: (time) => `Gentle reminder — the ${time} medicines aren't marked yet.`,
    taken: (n) => `Done ✅ ${n} marked as taken. Your family can see it.`,
    skipped: (n) => `Okay, ${n} marked as skipped. If you're unwell, please tell your family or doctor.`,
    nothing: (next) => `Nothing is waiting right now.${next ? ` Next medicines at ${next}.` : ''}`,
    started: 'Reminders are on ✅ You will get a message at each dose time. Reply *STOP* any time to stop.',
    stopped: 'Reminders stopped. Reply *START* to turn them back on.',
    help: 'Reply *1* if you took the medicines, *2* to skip. *STOP* turns reminders off.',
    pendingHelp: 'Reply *YES* to start medicine reminders, or *STOP* to say no.',
  },
  hi: {
    optIn: (by, names) => `Namaste 🙏 ${by} ne ArogyaKosh par ${names} ke liye dawai ke reminder lagaye hain.\n\nDawai ke samay aapko message aayega. Dawai le lene par bas *1* bhejiye.\n\nShuru karne ke liye *YES* bhejiye. Band karne ke liye kabhi bhi *STOP* bhejiye.`,
    hello: (names) => `Namaste ${names} 🙏`,
    due: (time) => `${time} ki dawai ka samay ho gaya hai:`,
    ask: 'Le li ho to *1* bhejiye, nahi leni ho to *2*.',
    nudge: (time) => `Yaad dilana tha — ${time} ki dawai abhi mark nahi hui hai.`,
    taken: (n) => `Ho gaya ✅ ${n} li gayi — parivaar ko dikh jayega.`,
    skipped: (n) => `Theek hai, ${n} chhodi gayi. Tabiyat theek na ho to parivaar ya doctor ko batayein.`,
    nothing: (next) => `Abhi koi dawai baaki nahi hai.${next ? ` Agli dawai ${next} par.` : ''}`,
    started: 'Reminder shuru ho gaye ✅ Har dawai ke samay message aayega. Band karne ke liye *STOP* bhejiye.',
    stopped: 'Reminder band kar diye. Phir se shuru karne ke liye *START* bhejiye.',
    help: 'Dawai le li ho to *1*, chhodni ho to *2* bhejiye. *STOP* se reminder band honge.',
    pendingHelp: 'Dawai ke reminder shuru karne ke liye *YES* bhejiye, ya mana karne ke liye *STOP*.',
  },
};
const honor = (name, lang) => (lang === 'hi' ? `${first(name)} ji` : first(name));
const joinNames = (list, lang) => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} ${lang === 'hi' ? 'aur' : 'and'} ${list.at(-1)}`);
const countText = (n, lang) => (lang === 'hi' ? `${n} dawai` : `${n} medicine${n === 1 ? '' : 's'}`);

/* ------------------------------- transport -------------------------------- */

const graph = async (body) => {
  const res = await fetch(`https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...body }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `WhatsApp API ${res.status}`);
  return data?.messages?.[0]?.id || '';
};

// Template params may not contain newlines or tabs (Meta rule).
const flat = (s) => String(s).replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ').trim();

/**
 * Send and log. Business-initiated messages need an approved template when live;
 * replies inside the 24-hour window can be free text.
 */
const send = async ({ owner, phone, members, kind, body, doses = [], key, template, simulated = false }) => {
  const doc = { owner, phone, members, direction: 'OUT', kind, body, doses, key, simulated };
  if (key && await WhatsAppMessage.exists({ owner, key })) return null;
  if (simulated || await usesSimulator(owner)) return WhatsAppMessage.create({ ...doc, simulated: true, status: 'SIMULATED' });
  try {
    const providerId = template?.name
      ? await graph({ to: phone, type: 'template', template: { name: template.name, language: { code: env.whatsapp.templateLang }, components: [{ type: 'body', parameters: template.params.map((p) => ({ type: 'text', text: flat(p) })) }] } })
      : await graph({ to: phone, type: 'text', text: { preview_url: false, body } });
    return WhatsAppMessage.create({ ...doc, status: 'SENT', providerId });
  } catch (e) {
    console.error('[whatsapp] send failed:', e.message);
    return WhatsAppMessage.create({ ...doc, status: 'FAILED', error: e.message.slice(0, 300) });
  }
};

/* -------------------------------- opt-in --------------------------------- */

/** Turn reminders on/off for a member. Turning on sends the consent request. */
export const configure = async (req, member, { phone, lang, enabled }) => {
  if (!enabled) {
    member.whatsapp = { ...member.whatsapp?.toObject?.(), status: 'OFF' };
    await member.save();
    return member;
  }
  const norm = normalizePhone(phone || member.whatsapp?.phone || member.phone);
  if (!norm) throw ApiError.badRequest('Enter a WhatsApp number with country code, e.g. +91 98200 12345');
  const prev = member.whatsapp?.toObject?.() || {};
  const samePhoneActive = prev.status === 'ACTIVE' && prev.phone === norm;
  member.whatsapp = { phone: norm, lang: lang === 'en' ? 'en' : 'hi', status: samePhoneActive ? 'ACTIVE' : 'PENDING', optedInAt: samePhoneActive ? prev.optedInAt : null };
  await member.save();
  if (!samePhoneActive) {
    // If someone else on this phone already said YES, they've consented for this number.
    const sibling = await Member.findOne({ owner: member.owner, _id: { $ne: member._id }, 'whatsapp.phone': norm, 'whatsapp.status': 'ACTIVE' });
    if (sibling) {
      member.whatsapp.status = 'ACTIVE';
      member.whatsapp.optedInAt = new Date();
      await member.save();
      await send({ owner: member.owner, phone: norm, members: [member._id], kind: 'REPLY', body: `${T[member.whatsapp.lang].started} (${first(member.name)})` });
    } else if (await Member.exists({ owner: member.owner, _id: { $ne: member._id }, 'whatsapp.phone': norm, 'whatsapp.status': 'PENDING' })) {
      // A consent request is already waiting on this phone; one YES will turn on everyone on it.
    } else {
      const by = first(req.user?.name || 'Your family');
      const l = member.whatsapp.lang;
      await send({
        owner: member.owner, phone: norm, members: [member._id], kind: 'OPT_IN',
        body: T[l].optIn(by, honor(member.name, l)),
        template: env.whatsapp.templateOptIn ? { name: env.whatsapp.templateOptIn, params: [by, honor(member.name, l)] } : null,
      });
    }
  }
  await logActivity(req, { type: 'WHATSAPP_SETUP', member: member._id, text: `${req.user?.name || 'Someone'} set up WhatsApp reminders for ${member.name}` });
  return member;
};

/* ------------------------------ reminders -------------------------------- */

/** Group the given doses by WhatsApp phone and send one message per phone. */
const sendGroup = async (ownerId, phoneMembers, doses, { kind, key, time, simulated }) => {
  const lang = phoneMembers[0].whatsapp.lang || 'hi';
  const t = T[lang];
  const byMember = new Map();
  for (const d of doses) {
    const k = String(d.member._id);
    if (!byMember.has(k)) byMember.set(k, []);
    byMember.get(k).push(d);
  }
  const names = [...byMember.keys()].map((id) => honor(phoneMembers.find((m) => String(m._id) === id).name, lang));
  const multi = byMember.size > 1;
  const lines = [...byMember.entries()].map(([id, list]) => {
    const m = phoneMembers.find((x) => String(x._id) === id);
    const meds = list.map((d) => `• ${doseLine(d, lang)}`).join('\n');
    return multi ? `*${honor(m.name, lang)}*\n${meds}` : meds;
  }).join('\n\n');
  const head = kind === 'NUDGE' ? t.nudge(clock(time)) : `${t.hello(joinNames(names, lang))}\n${t.due(clock(time))}`;
  const body = `${head}\n\n${lines}\n\n${t.ask}`;
  return send({
    owner: ownerId, phone: phoneMembers[0].whatsapp.phone, members: phoneMembers.map((m) => m._id), kind, key, simulated, body,
    doses: doses.map((d) => ({ medicine: d.medicine._id, member: d.member._id, name: [d.medicine.name, d.medicine.strength].filter(Boolean).join(' '), date: d.date, time: d.time })),
    template: env.whatsapp.templateDose ? { name: env.whatsapp.templateDose, params: [joinNames(names, lang), clock(time), doses.map((d) => doseLine(d, lang)).join('; ')] } : null,
  });
};

/** Members with active WhatsApp, grouped by owner + phone. */
const activeGroups = async (filter = {}) => {
  const members = await Member.find({ 'whatsapp.status': 'ACTIVE', ...filter }).select('owner name whatsapp');
  const groups = new Map();
  for (const m of members) {
    const k = `${m.owner}|${m.whatsapp.phone}`;
    if (!groups.has(k)) groups.set(k, { owner: m.owner, members: [] });
    groups.get(k).members.push(m);
  }
  return [...groups.values()];
};

/**
 * Scheduled job (every minute). Sends each dose time once, and one gentle
 * nudge 30 minutes later if nothing has been marked. Doses more than 15 minutes
 * old are not sent (e.g. after a restart) — the missed-dose alert to the family covers those.
 */
export const runReminders = async (now = new Date()) => {
  const dateKey = toDateKey(now);
  const nowT = hhmm(now);
  let sent = 0;
  for (const g of await activeGroups()) {
    const ids = new Set(g.members.map((m) => String(m._id)));
    const doses = (await dosesForDay(g.owner, dateKey)).filter((d) => ids.has(String(d.member._id)) && d.status === 'PENDING');
    const times = [...new Set(doses.map((d) => d.time))];
    for (const time of times) {
      const due = doses.filter((d) => d.time === time);
      const phone = g.members[0].whatsapp.phone;
      if (time <= nowT && time >= addMin(nowT, -15)) {
        if (await sendGroup(g.owner, g.members, due, { kind: 'DOSE_REMINDER', key: `rem-${phone}-${dateKey}-${time}`, time })) sent += 1;
      } else if (time <= addMin(nowT, -30) && time >= addMin(nowT, -45)) {
        const original = await WhatsAppMessage.findOne({ owner: g.owner, key: `rem-${phone}-${dateKey}-${time}` });
        if (original && !original.answered && await sendGroup(g.owner, g.members, due, { kind: 'NUDGE', key: `nudge-${phone}-${dateKey}-${time}`, time })) sent += 1;
      }
    }
  }
  return sent;
};

/**
 * Send the reminder for the most recent due (or next upcoming) dose time right
 * now — used by "Send a test reminder" in the app.
 */
export const sendNow = async (ownerId, memberId, { simulated } = {}) => {
  const member = await Member.findOne({ _id: memberId, owner: ownerId });
  if (!member) throw ApiError.notFound('Member not found');
  if (member.whatsapp?.status !== 'ACTIVE') throw ApiError.badRequest('WhatsApp reminders are not active for this person yet');
  const group = (await activeGroups({ owner: ownerId, 'whatsapp.phone': member.whatsapp.phone }))[0];
  const ids = new Set(group.members.map((m) => String(m._id)));
  const now = new Date();
  const doses = (await dosesForDay(ownerId, toDateKey(now))).filter((d) => ids.has(String(d.member._id)) && d.status === 'PENDING');
  if (!doses.length) throw ApiError.badRequest('No pending doses left today for this phone');
  const nowT = hhmm(now);
  const past = doses.filter((d) => d.time <= nowT).map((d) => d.time);
  const time = past.length ? past.at(-1) : doses[0].time;
  return sendGroup(ownerId, group.members, doses.filter((d) => d.time === time), { kind: 'DOSE_REMINDER', time, simulated });
};

/* ------------------------------- inbound --------------------------------- */

const TAKEN = /^(1|1\.|one|✅|👍|☑️|✔️?|ok|okay|done|taken|took|yes|y|haan|haa|ha|han|hn|ji|ji haan|le li|le liya|li|kha li|kha liya|ho gaya|hogaya)[.!\s]*$/i;
const SKIP = /^(2|2\.|two|❌|skip|skipped|no|n|nahi|nahin|nhi|na|chhod|chod|nahi li|nahi liya)[.!\s]*$/i;
const YES = /^(yes|y|haan|ha|han|ji|ok|okay|start|shuru|1|👍)[.!\s]*$/i;
const STOP = /^(stop|band|unsubscribe|cancel)[.!\s]*$/i;
const START = /^(start|shuru|resume)[.!\s]*$/i;

/**
 * Handle a message from a phone. Returns the reply text (also sent and logged).
 * `simulated` marks messages typed in the in-app simulator.
 */
export const handleInbound = async (fromRaw, text, { simulated = false, providerId = '', ownerId } = {}) => {
  const phone = normalizePhone(fromRaw);
  if (!phone) return null;
  const filter = { 'whatsapp.phone': phone, 'whatsapp.status': { $ne: 'OFF' } };
  if (ownerId) filter.owner = ownerId;
  let members = await Member.find(filter).select('owner name whatsapp');
  if (!simulated && members.length) {
    // Real phones never reach demo households (their numbers are fictional).
    const demo = new Set((await User.find({ _id: { $in: members.map((m) => m.owner) }, isDemo: true }).distinct('_id')).map(String));
    members = members.filter((m) => !demo.has(String(m.owner)));
  }
  if (!members.length) return null;
  const msg = String(text || '').trim();

  // One phone can belong to more than one household; answer each.
  const owners = [...new Set(members.map((m) => String(m.owner)))];
  const replies = [];
  for (const owner of owners) {
    const ms = members.filter((m) => String(m.owner) === owner);
    const lang = ms[0].whatsapp.lang || 'hi';
    const t = T[lang];
    await WhatsAppMessage.create({ owner, phone, members: ms.map((m) => m._id), direction: 'IN', kind: 'INBOUND', body: msg.slice(0, 1000), status: 'RECEIVED', providerId, simulated });
    const reply = (body) => send({ owner, phone, members: ms.map((m) => m._id), kind: 'REPLY', body, simulated }).then(() => replies.push(body));
    const actorReq = (m) => ({ ownerId: m.owner, user: { name: `${first(m.name)} (WhatsApp)` } });
    const setStatus = async (status) => {
      for (const m of ms) {
        if (status === 'ACTIVE' && m.whatsapp.status !== 'ACTIVE') m.whatsapp.optedInAt = new Date();
        m.whatsapp.status = status;
        await m.save();
      }
    };

    if (STOP.test(msg)) { await setStatus('STOPPED'); await reply(t.stopped); continue; }
    const pending = ms.every((m) => m.whatsapp.status !== 'ACTIVE');
    if (pending) {
      if ((ms.some((m) => m.whatsapp.status === 'PENDING') && YES.test(msg)) || START.test(msg)) {
        await setStatus('ACTIVE');
        await reply(t.started);
        await logActivity(actorReq(ms[0]), { type: 'WHATSAPP_ACTIVE', member: ms[0]._id, text: `${joinNames(ms.map((m) => first(m.name)), 'en')} turned on WhatsApp medicine reminders` });
      } else await reply(t.pendingHelp);
      continue;
    }

    const isTaken = TAKEN.test(msg);
    const isSkip = !isTaken && SKIP.test(msg);
    if (!isTaken && !isSkip) { await reply(t.help); continue; }

    // The latest reminder in the last 12 hours that hasn't been answered.
    const since = new Date(Date.now() - 12 * 3600000);
    const reminder = await WhatsAppMessage.findOne({ owner, phone, direction: 'OUT', kind: { $in: ['DOSE_REMINDER', 'NUDGE'] }, answered: false, createdAt: { $gte: since } }).sort({ createdAt: -1 });
    if (!reminder) {
      const today = await dosesForDay(owner, toDateKey(new Date()));
      const ids = new Set(ms.map((m) => String(m._id)));
      const next = today.find((d) => ids.has(String(d.member._id)) && d.status === 'PENDING' && d.time > hhmm(new Date()));
      await reply(t.nothing(next ? clock(next.time) : ''));
      continue;
    }
    const status = isTaken ? 'TAKEN' : 'SKIPPED';
    let n = 0;
    for (const d of reminder.doses) {
      const m = ms.find((x) => String(x._id) === String(d.member));
      if (!m) continue;
      try {
        await setDoseStatus(owner, { medicineId: d.medicine, date: d.date, time: d.time, status, actor: { _id: null, name: `${first(m.name)} via WhatsApp` } });
        n += 1;
      } catch (e) { console.error('[whatsapp] dose', e.message); }
    }
    // Close this reminder and its nudge.
    await WhatsAppMessage.updateMany({ owner, phone, direction: 'OUT', answered: false, 'doses.time': reminder.doses[0]?.time, 'doses.date': reminder.doses[0]?.date }, { $set: { answered: true } });
    await reply(isTaken ? t.taken(countText(n, lang)) : t.skipped(countText(n, lang)));
    await logActivity(actorReq(ms[0]), {
      type: isTaken ? 'DOSE_TAKEN' : 'DOSE_SKIPPED', member: reminder.doses[0]?.member, link: '/app',
      text: `${joinNames([...new Set(reminder.doses.map((d) => first(ms.find((m) => String(m._id) === String(d.member))?.name || '')))].filter(Boolean), 'en')} ${isTaken ? 'took' : 'skipped'} the ${clock(reminder.doses[0].time)} medicines (replied on WhatsApp)`,
    });
  }
  return replies.join('\n');
};

/* ------------------------------- webhook --------------------------------- */

/** Meta signs the raw body with the app secret: X-Hub-Signature-256: sha256=<hex>. */
export const verifySignature = (rawBody, header = '') => {
  if (!env.whatsapp.appSecret) return !env.server.isProd; // allowed unsigned only outside production
  if (!rawBody || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', env.whatsapp.appSecret).update(rawBody).digest('hex'));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && crypto.timingSafeEqual(expected, got);
};

/** Extract inbound texts and delivery statuses from a Cloud API webhook payload. */
export const processWebhook = async (payload) => {
  const values = (payload?.entry || []).flatMap((e) => (e.changes || []).map((c) => c.value || {}));
  for (const v of values) {
    for (const s of v.statuses || []) {
      const map = { sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED' };
      if (map[s.status]) await WhatsAppMessage.updateOne({ providerId: s.id }, { $set: { status: map[s.status], ...(s.errors?.[0]?.title ? { error: s.errors[0].title } : {}) } });
    }
    for (const m of v.messages || []) {
      const text = m.text?.body ?? m.button?.text ?? m.button?.payload ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '';
      if (text) await handleInbound(m.from, text, { providerId: m.id }).catch((e) => console.error('[whatsapp] inbound', e.message));
    }
  }
};

export const conversation = async (ownerId, phone, limit = 60) => (
  WhatsAppMessage.find({ owner: ownerId, phone }).sort({ createdAt: -1 }).limit(limit).lean()
).then((list) => list.reverse());
