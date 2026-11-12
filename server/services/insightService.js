import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';
import Record from '../models/Record.js';
import { latestVitals, isAbnormal } from './vitalService.js';
import { adherence, dosesForDay, stockInfo } from './medicineService.js';
import { checkMedicines } from './safetyService.js';
import { healthScore, readiness } from './scoreService.js';
import { memberLite } from './memberService.js';
import { VITALS, formatVital } from '../data/vitals.js';
import { addDays, daysBetween, toDateKey } from '../utils/helpers.js';

const overdueVaccineCounts = async (ownerId) => {
  const rows = await Vaccination.aggregate([
    { $match: { owner: ownerId, givenDate: null, dueDate: { $lt: addDays(new Date(), -1) } } },
    { $group: { _id: '$member', n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
};

const lastCheckups = async (ownerId) => {
  const [reminders, labs] = await Promise.all([
    Reminder.aggregate([
      { $match: { owner: ownerId, status: 'DONE', type: { $in: ['CHECKUP', 'LAB_TEST'] } } },
      { $group: { _id: '$member', at: { $max: '$completedAt' } } },
    ]),
    Record.aggregate([
      { $match: { owner: ownerId, category: 'LAB_REPORT' } },
      { $group: { _id: '$member', at: { $max: '$date' } } },
    ]),
  ]);
  const map = new Map();
  for (const r of [...reminders, ...labs]) {
    const k = String(r._id);
    if (!map.has(k) || map.get(k) < r.at) map.set(k, r.at);
  }
  return map;
};

/** Health score for every member (or one) in the household. */
export const scoresFor = async (ownerId, members) => {
  const ids = members.map((m) => m._id);
  const [vitalsMap, overdue, checkups] = await Promise.all([
    latestVitals(ownerId, ids),
    overdueVaccineCounts(ownerId),
    lastCheckups(ownerId),
  ]);
  const result = {};
  for (const m of members) {
    const adh = await adherence(ownerId, { memberId: m._id, days: 14 });
    result[m._id] = healthScore(m, {
      vitals: vitalsMap.get(String(m._id)) || {},
      adherencePct: adh.pct,
      overdueVaccines: overdue.get(String(m._id)) || 0,
      lastCheckupAt: checkups.get(String(m._id)) || null,
    });
  }
  return result;
};

export const readinessFor = async (user) => {
  const members = await Member.find({ owner: user._id }).sort({ isSelf: -1, createdAt: 1 });
  const overdue = await overdueVaccineCounts(user._id);
  return readiness(members, { vaccinesOverdueByMember: overdue, kit: user.firstAidKit });
};

/**
 * The "Today" feed: everything that needs attention for the household,
 * ordered so the most urgent things are first.
 */
export const todayFeed = async (user, dateKey) => {
  const ownerId = user._id;
  const today = new Date();
  const in30 = addDays(today, 30);

  const [members, doses, meds, reminders, vaccines, vitalsMap, ready, adh] = await Promise.all([
    Member.find({ owner: ownerId }).sort({ isSelf: -1, createdAt: 1 }),
    dosesForDay(ownerId, dateKey),
    Medicine.find({ owner: ownerId, active: true }),
    Reminder.find({ owner: ownerId, status: 'UPCOMING', dueAt: { $lte: in30 } }).sort({ dueAt: 1 }).limit(30),
    Vaccination.find({ owner: ownerId, givenDate: null, dueDate: { $ne: null, $lte: in30 } }).sort({ dueDate: 1 }),
    latestVitals(ownerId),
    readinessFor(user),
    adherence(ownerId, { days: 7, endKey: dateKey }),
  ]);
  const memberById = new Map(members.map((m) => [String(m._id), m]));
  const lite = (id) => memberLite(memberById.get(String(id)));

  const alerts = [];
  const push = (level, key, title, detail, member, to) => alerts.push({ id: key, level, title, detail, member, to });

  for (const r of reminders) {
    if (r.dueAt < startToday()) push('warning', `rem-${r._id}`, `Overdue: ${r.title}`, `Was due ${fmtDate(r.dueAt)}. Mark it done or reschedule.`, lite(r.member), '/app/appointments');
  }
  const overdueByMember = new Map();
  for (const v of vaccines) {
    if (v.dueDate < addDays(today, -1)) {
      const k = String(v.member);
      overdueByMember.set(k, [...(overdueByMember.get(k) || []), v]);
    }
  }
  for (const [mid, list] of overdueByMember) {
    const title = list.length === 1 ? `${list[0].name} (${list[0].dose}) is overdue` : `${list.length} vaccines overdue`;
    const detail = list.length === 1 ? `Due ${fmtDate(list[0].dueDate)}.` : `${list.slice(0, 3).map((v) => v.name).join(', ')}${list.length > 3 ? '…' : ''}. Tick off any already given.`;
    push('warning', `vac-${mid}`, title, detail, lite(mid), `/app/vaccines?member=${mid}`);
  }
  for (const med of meds) {
    const s = stockInfo(med);
    if (s?.low) {
      push(s.stock === 0 ? 'critical' : 'warning', `stock-${med._id}`, `Refill ${med.name}`,
        s.stock === 0 ? 'Out of stock.' : `${s.stock} left${s.daysLeft !== null ? ` · runs out in ~${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}` : ''}.`,
        lite(med.member), '/app/medicines');
    }
    if (med.expiryDate) {
      const d = daysBetween(today, med.expiryDate);
      if (d < 0) push('critical', `exp-${med._id}`, `${med.name} has expired`, `Expired on ${fmtDate(med.expiryDate)}. Replace this strip.`, lite(med.member), '/app/medicines');
      else if (d <= 30) push('info', `exp-${med._id}`, `${med.name} expires soon`, `Expires ${fmtDate(med.expiryDate)}.`, lite(med.member), '/app/medicines');
    }
  }
  for (const [mid, types] of vitalsMap) {
    for (const v of Object.values(types)) {
      if (isAbnormal(v.latest.status) && daysBetween(v.latest.at, today) <= 30) {
        push(v.latest.status === 'CRITICAL' ? 'critical' : 'warning', `vit-${mid}-${v.type}`,
          `${VITALS[v.type]?.label} is ${v.latest.status.toLowerCase()}`,
          `${formatVital(v.type, v.latest.value, v.latest.value2)} on ${fmtDate(v.latest.at)}. Normal: ${VITALS[v.type]?.normalText}.`,
          lite(mid), `/app/vitals?member=${mid}&type=${v.type}`);
      }
    }
  }
  for (const m of members) {
    for (const ins of m.insurance || []) {
      if (!ins.validTill) continue;
      const d = daysBetween(today, ins.validTill);
      if (d >= -30 && d <= 45) push(d < 0 ? 'critical' : 'warning', `ins-${ins._id}`, `${ins.provider} policy ${d < 0 ? 'has lapsed' : 'renews soon'}`, `Valid till ${fmtDate(ins.validTill)}.`, memberLite(m), `/app/family/${m._id}`);
    }
    const memberMeds = meds.filter((x) => String(x.member) === String(m._id));
    const warnings = checkMedicines(memberMeds.map((x) => ({ name: x.name })), m.allergies);
    for (const w of warnings.filter((x) => x.severity === 'HIGH')) {
      push('critical', `safety-${m._id}-${w.title}`, w.title, `${w.effect} ${w.advice}`, memberLite(m), '/app/medicines');
    }
  }

  const rank = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => rank[a.level] - rank[b.level]);

  const upcoming = [
    ...reminders.filter((r) => r.dueAt >= startToday()).map((r) => ({
      kind: 'REMINDER', id: r._id, type: r.type, title: r.title, at: r.dueAt, member: lite(r.member), detail: [r.doctor, r.location].filter(Boolean).join(' · '),
    })),
    ...vaccines.filter((v) => v.dueDate >= addDays(today, -1)).map((v) => ({
      kind: 'VACCINE', id: v._id, type: 'VACCINE', title: `${v.name} — ${v.dose}`, at: v.dueDate, member: lite(v.member), detail: 'Vaccination due',
    })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at)).slice(0, 8);

  const taken = doses.filter((d) => d.status === 'TAKEN').length;

  return {
    date: dateKey,
    members: members.map((m) => ({ ...memberLite(m), age: m.age })),
    doses,
    doseSummary: { total: doses.length, taken, skipped: doses.filter((d) => d.status === 'SKIPPED').length },
    alerts,
    upcoming,
    readiness: { score: ready.score, done: ready.done, total: ready.total, next: ready.items.filter((i) => !i.done).slice(0, 4) },
    adherence: { pct: adh.pct, byDay: adh.byDay },
  };
};

function startToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export { toDateKey };
