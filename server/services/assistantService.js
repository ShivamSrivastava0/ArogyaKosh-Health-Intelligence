import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';
import { latestVitals } from './vitalService.js';
import { scheduleText, stockInfo } from './medicineService.js';
import { chat, isAiEnabled, SAFETY_RULES } from './aiService.js';
import { VITALS, formatVital } from '../data/vitals.js';

const EMERGENCY_RE = /(chest pain|can'?t breathe|cannot breathe|breathless|unconscious|fainted|stroke|face droop|slurred|heavy bleeding|seizure|suicid|kill myself|overdose|poison)/i;
const EMERGENCY_REPLY = `**This could be an emergency.** Please call **112** (national emergency) or **108** (ambulance) right now.

While you wait:
- Keep the person still and comfortable; loosen tight clothing.
- Do not give food or water if they are drowsy or vomiting.
- Keep their Emergency Card open — it lists allergies and medicines for the paramedics.`;

const RELATION_WORDS = {
  SELF: ['me', 'my', 'i '], SPOUSE: ['wife', 'husband', 'spouse'], FATHER: ['dad', 'father', 'papa', 'pitaji'],
  MOTHER: ['mom', 'mother', 'mummy', 'maa', 'mataji'], SON: ['son'], DAUGHTER: ['daughter'],
  GRANDFATHER: ['grandpa', 'grandfather', 'dadaji', 'nanaji'], GRANDMOTHER: ['grandma', 'grandmother', 'dadi', 'nani'],
};

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Snapshot of the household used both for AI context and offline answers. */
const loadContext = async (ownerId) => {
  const in60 = new Date(Date.now() + 60 * 86400000);
  const [members, meds, reminders, vaccines, vitals] = await Promise.all([
    Member.find({ owner: ownerId }).sort({ isSelf: -1, createdAt: 1 }),
    Medicine.find({ owner: ownerId, active: true }),
    Reminder.find({ owner: ownerId, status: 'UPCOMING', dueAt: { $lte: in60 } }).sort({ dueAt: 1 }),
    Vaccination.find({ owner: ownerId, givenDate: null, dueDate: { $lte: in60 } }).sort({ dueDate: 1 }),
    latestVitals(ownerId),
  ]);
  return { members, meds, reminders, vaccines, vitals };
};

const contextText = ({ members, meds, reminders, vaccines, vitals }) => members.map((m) => {
  const mid = String(m._id);
  const mv = Object.values(vitals.get(mid) || {}).map((v) => {
    const prev = v.previous ? `; previous ${formatVital(v.type, v.previous.value, v.previous.value2)} on ${fmt(v.previous.at)}, trend ${v.trend.toLowerCase()}` : '';
    return `${v.label} ${formatVital(v.type, v.latest.value, v.latest.value2)} (${v.latest.status}, ${fmt(v.latest.at)}${prev})`;
  });
  return [
    `## ${m.name} — ${m.isSelf ? 'the user' : m.relation.toLowerCase()}, ${m.age ?? '?'}y, ${m.gender || ''} blood ${m.bloodGroup || 'n/a'}`,
    `Allergies: ${m.allergies.map((a) => a.name).join(', ') || (m.noKnownAllergies ? 'none known' : 'not recorded')}`,
    `Conditions: ${m.conditions.map((c) => `${c.name} (${c.status.toLowerCase()})`).join(', ') || 'none recorded'}`,
    `Medicines: ${meds.filter((x) => String(x.member) === mid).map((x) => `${x.name} ${x.strength} — ${scheduleText(x)}`).join('; ') || 'none'}`,
    `Latest vitals: ${mv.join('; ') || 'none'}`,
    `Upcoming: ${reminders.filter((r) => String(r.member) === mid).map((r) => `${r.title} on ${fmt(r.dueAt)}`).join('; ') || 'none'}`,
    `Vaccines due: ${vaccines.filter((v) => String(v.member) === mid).map((v) => `${v.name} ${v.dose} (${fmt(v.dueDate)})`).join('; ') || 'none'}`,
  ].join('\n');
}).join('\n\n');

const findMembers = (text, members) => {
  const t = ` ${text.toLowerCase()} `;
  const byName = members.filter((m) => t.includes(` ${m.name.split(' ')[0].toLowerCase()}`));
  if (byName.length) return byName;
  const byRel = members.filter((m) => (RELATION_WORDS[m.relation] || []).some((w) => t.includes(` ${w}`)));
  return byRel;
};

/** Deterministic answers from the family's own data when AI is unavailable. */
const offlineAnswer = (message, ctx) => {
  const q = message.toLowerCase();
  const targets = findMembers(q, ctx.members);
  const scope = targets.length ? targets : ctx.members;
  const who = (m) => (m.isSelf ? 'You' : m.name);

  if (/(medicine|tablet|pill|dose|medication|dawai|capsule)/.test(q)) {
    const lines = scope.map((m) => {
      const list = ctx.meds.filter((x) => String(x.member) === String(m._id));
      return list.length ? `**${who(m)}**\n${list.map((x) => `- ${x.name} ${x.strength} — ${scheduleText(x)}`).join('\n')}` : `**${who(m)}** — no active medicines.`;
    });
    return lines.join('\n\n');
  }
  if (/(refill|stock|run out|running out|finish)/.test(q)) {
    const low = ctx.meds.filter((x) => stockInfo(x)?.low && scope.some((m) => String(m._id) === String(x.member)));
    return low.length ? `These need a refill soon:\n${low.map((x) => `- ${x.name} — ${x.stock} left`).join('\n')}` : 'No medicines are running low right now.';
  }
  if (/(appointment|checkup|check-up|visit|doctor|next)/.test(q)) {
    const list = ctx.reminders.filter((r) => scope.some((m) => String(m._id) === String(r.member)));
    return list.length ? `Coming up:\n${list.slice(0, 6).map((r) => `- ${fmt(r.dueAt)} — ${r.title}${r.doctor ? ` with ${r.doctor}` : ''}`).join('\n')}` : 'Nothing scheduled in the next 60 days.';
  }
  if (/(vaccin|shot|immuni)/.test(q)) {
    const list = ctx.vaccines.filter((v) => scope.some((m) => String(m._id) === String(v.member)));
    return list.length ? `Vaccines due:\n${list.map((v) => `- ${v.name} (${v.dose}) — ${fmt(v.dueDate)}`).join('\n')}` : 'No vaccines due in the next 60 days.';
  }
  if (/(allerg)/.test(q)) {
    return scope.map((m) => `- **${who(m)}**: ${m.allergies.map((a) => `${a.name} (${a.severity.toLowerCase()})`).join(', ') || (m.noKnownAllergies ? 'no known allergies' : 'not recorded yet')}`).join('\n');
  }
  if (/(blood group|blood type)/.test(q)) {
    return scope.map((m) => `- **${who(m)}**: ${m.bloodGroup || 'not recorded'}`).join('\n');
  }
  const vitalHit = Object.entries({ BP: /(bp|blood pressure)/, SUGAR_FASTING: /(sugar|glucose|diabet)/, HBA1C: /hba1c/, WEIGHT: /weight/, CHOLESTEROL_TOTAL: /cholesterol|lipid/, HEART_RATE: /pulse|heart rate/, SPO2: /spo2|oxygen/ })
    .find(([, re]) => re.test(q));
  if (vitalHit || /(vital|reading|report|latest)/.test(q)) {
    const types = vitalHit ? (vitalHit[0] === 'SUGAR_FASTING' ? ['SUGAR_FASTING', 'SUGAR_RANDOM', 'SUGAR_PP', 'HBA1C'] : [vitalHit[0]]) : null;
    const lines = scope.map((m) => {
      const mv = Object.values(ctx.vitals.get(String(m._id)) || {}).filter((v) => !types || types.includes(v.type));
      return mv.length ? `**${who(m)}**\n${mv.map((v) => `- ${v.label}: ${formatVital(v.type, v.latest.value, v.latest.value2)} — ${v.latest.status.toLowerCase()} (${fmt(v.latest.at)}). Normal: ${VITALS[v.type].normalText}`).join('\n')}` : `**${who(m)}** — no readings logged.`;
    });
    return lines.join('\n\n');
  }
  return `I can answer questions about your family's records — for example:
- "What medicines does Papa take?"
- "When is the next appointment?"
- "What was Mom's latest BP?"
- "Which vaccines are due?"
- "Any medicines running low?"

_Smart (AI) answers are turned off on this server, so I can only answer from your saved records._`;
};

export const answer = async (ownerId, { message, history = [] }) => {
  if (EMERGENCY_RE.test(message)) return { reply: EMERGENCY_REPLY, mode: 'safety' };
  const ctx = await loadContext(ownerId);

  if (isAiEnabled()) {
    try {
      const system = `You are Kosh, the assistant inside ArogyaKosh, a family health organiser app.\n${SAFETY_RULES}\n\nToday is ${new Date().toDateString()}.\nFamily records:\n${contextText(ctx)}`;
      const reply = await chat({ system, history, message });
      if (reply) return { reply, mode: 'ai' };
    } catch (err) {
      console.warn('[assistant] AI unavailable, falling back:', err.message);
    }
  }
  return { reply: offlineAnswer(message, ctx), mode: 'records' };
};
