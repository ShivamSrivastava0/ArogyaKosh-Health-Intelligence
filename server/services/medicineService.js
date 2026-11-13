import Medicine from '../models/Medicine.js';
import DoseLog from '../models/DoseLog.js';
import ApiError from '../utils/ApiError.js';
import { addDays, parseDateKey, startOfDay, toDateKey, assertObjectId } from '../utils/helpers.js';

/** Is the medicine scheduled on this calendar day (date window + weekday)? */
export const isScheduledOn = (med, date) => {
  const day = startOfDay(date);
  if (med.startDate && startOfDay(med.startDate) > day) return false;
  if (med.endDate && startOfDay(med.endDate) < day) return false;
  if (med.daysOfWeek?.length && !med.daysOfWeek.includes(day.getDay())) return false;
  return true;
};

export const dailyUnits = (med) => {
  const perDay = (med.times?.length || 0) * (med.dose || 1);
  const weekFactor = med.daysOfWeek?.length ? med.daysOfWeek.length / 7 : 1;
  return perDay * weekFactor;
};

/** Stock forecast: how many days of medicine remain and when it runs out. */
export const stockInfo = (med, today = new Date()) => {
  if (med.stock === null || med.stock === undefined) return null;
  const perDay = dailyUnits(med);
  const daysLeft = perDay > 0 ? Math.floor(med.stock / perDay) : null;
  return {
    stock: med.stock,
    daysLeft,
    runsOutOn: daysLeft !== null ? toDateKey(addDays(today, daysLeft)) : null,
    low: med.stock <= (med.refillAt ?? 5) || (daysLeft !== null && daysLeft <= 5),
  };
};

const clock = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};
const FREQ = { 1: 'Once', 2: 'Twice', 3: 'Three times', 4: 'Four times' };

/** "Twice daily · 8:30 am, 8:30 pm" / "2 units once a week (Sun) · 9:00 am" */
export const scheduleText = (med) => {
  if (!med.times?.length) return 'As needed';
  const n = med.times.length;
  const units = med.dose && med.dose !== 1 ? `${med.dose} units ` : '';
  const weekly = med.daysOfWeek?.length && med.daysOfWeek.length < 7;
  const freq = `${FREQ[n] || `${n} times`} ${weekly ? `on ${med.daysOfWeek.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}` : 'daily'}`;
  const text = `${units}${units ? freq.toLowerCase() : freq}`;
  return `${text} · ${med.times.map(clock).join(', ')}`;
};

const nowHHmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Dose slots for one day with their status.
 * @returns [{ medicine, member, time, status: TAKEN|SKIPPED|PENDING, at }]
 */
export const dosesForDay = async (ownerId, dateKey, memberId) => {
  const date = parseDateKey(dateKey);
  if (!date) throw ApiError.badRequest('date must be YYYY-MM-DD');
  const filter = { owner: ownerId, active: true };
  if (memberId) filter.member = memberId;
  const meds = (await Medicine.find(filter).populate('member', 'name color relation isSelf')).filter((m) => m.member);
  const scheduled = meds.filter((m) => m.times.length && isScheduledOn(m, date));
  const logs = await DoseLog.find({ owner: ownerId, date: dateKey, medicine: { $in: scheduled.map((m) => m._id) } });
  const byKey = new Map(logs.map((l) => [`${l.medicine}|${l.time}`, l]));

  const doses = [];
  for (const med of scheduled) {
    for (const time of med.times) {
      const log = byKey.get(`${med._id}|${time}`);
      doses.push({
        id: `${med._id}|${dateKey}|${time}`,
        medicine: {
          _id: med._id, name: med.name, strength: med.strength, form: med.form,
          dose: med.dose, mealTiming: med.mealTiming, stock: stockInfo(med),
        },
        member: { _id: med.member._id, name: med.member.name, color: med.member.color },
        date: dateKey,
        time,
        status: log?.status || 'PENDING',
        at: log?.at || null,
        byName: log?.byName || '',
      });
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.member.name.localeCompare(b.member.name));
};

/**
 * Record a dose as TAKEN / SKIPPED (or clear it with status=null).
 * Keeps medicine stock consistent with the log.
 */
export const setDoseStatus = async (ownerId, { medicineId, date, time, status, actor }) => {
  assertObjectId(medicineId, 'medicine');
  if (!parseDateKey(date)) throw ApiError.badRequest('date must be YYYY-MM-DD');
  const med = await Medicine.findOne({ _id: medicineId, owner: ownerId });
  if (!med) throw ApiError.notFound('Medicine not found');
  if (!med.times.includes(time)) throw ApiError.badRequest('That time is not part of the schedule');
  // Doses can't be logged ahead of time — that would corrupt adherence and stock.
  // (14h tolerance covers users whose local date is ahead of the server's.)
  if (status && date > toDateKey(new Date(Date.now() + 14 * 3600000))) throw ApiError.badRequest('You can only mark doses for today or earlier');
  if (status && !isScheduledOn(med, parseDateKey(date))) throw ApiError.badRequest('This medicine was not scheduled on that day');

  const existing = await DoseLog.findOne({ medicine: med._id, date, time });
  const wasTaken = existing?.status === 'TAKEN';
  const nowTaken = status === 'TAKEN';

  if (!status) {
    if (existing) await existing.deleteOne();
  } else if (existing) {
    existing.status = status;
    existing.at = new Date();
    existing.by = actor?._id || null;
    existing.byName = actor?.name || '';
    await existing.save();
  } else {
    await DoseLog.create({ owner: ownerId, member: med.member, medicine: med._id, date, time, status, by: actor?._id || null, byName: actor?.name || '' });
  }

  if (med.stock !== null && med.stock !== undefined && wasTaken !== nowTaken) {
    med.stock = Math.max(0, med.stock + (nowTaken ? -med.dose : med.dose));
    await med.save();
  }
  return { status: status || 'PENDING', stock: stockInfo(med), medicineName: med.name, memberId: med.member };
};

/**
 * Adherence over the last `days` days (today counts only for slots already due).
 */
export const adherence = async (ownerId, { memberId, days = 7, endKey } = {}) => {
  const end = parseDateKey(endKey) || startOfDay(new Date());
  const start = addDays(end, -(days - 1));
  const filter = { owner: ownerId, $or: [{ active: true }, { endDate: { $gte: start } }] };
  if (memberId) filter.member = memberId;
  const meds = await Medicine.find(filter).select('name member times dose daysOfWeek startDate endDate active');
  const logs = await DoseLog.find({
    owner: ownerId,
    medicine: { $in: meds.map((m) => m._id) },
    date: { $gte: toDateKey(start), $lte: toDateKey(end) },
  });
  const logMap = new Map(logs.map((l) => [`${l.medicine}|${l.date}|${l.time}`, l.status]));
  const todayKey = toDateKey(new Date());
  const cutoff = nowHHmm();

  const byDay = [];
  const perMed = new Map();
  let expected = 0; let taken = 0; let skipped = 0;

  for (let i = 0; i < days; i += 1) {
    const day = addDays(start, i);
    const key = toDateKey(day);
    let dayExpected = 0; let dayTaken = 0;
    for (const med of meds) {
      if (!med.times.length || !isScheduledOn(med, day)) continue;
      for (const t of med.times) {
        if (key === todayKey && t > cutoff) continue;
        if (key > todayKey) continue;
        const st = logMap.get(`${med._id}|${key}|${t}`);
        dayExpected += 1;
        const pm = perMed.get(String(med._id)) || { _id: med._id, name: med.name, member: med.member, expected: 0, taken: 0 };
        pm.expected += 1;
        if (st === 'TAKEN') { dayTaken += 1; pm.taken += 1; }
        if (st === 'SKIPPED') skipped += 1;
        perMed.set(String(med._id), pm);
      }
    }
    expected += dayExpected;
    taken += dayTaken;
    byDay.push({ date: key, expected: dayExpected, taken: dayTaken, pct: dayExpected ? Math.round((dayTaken / dayExpected) * 100) : null });
  }

  return {
    days,
    expected,
    taken,
    skipped,
    missed: Math.max(expected - taken - skipped, 0),
    pct: expected ? Math.round((taken / expected) * 100) : null,
    byDay,
    byMedicine: [...perMed.values()].map((m) => ({ ...m, pct: m.expected ? Math.round((m.taken / m.expected) * 100) : null })),
  };
};
