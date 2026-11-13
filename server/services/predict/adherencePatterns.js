import DoseLog from '../../models/DoseLog.js';
import { isScheduledOn } from '../medicineService.js';
import { addDays, toDateKey } from '../../utils/helpers.js';

/**
 * Learns, per medicine and time slot, how often doses get missed — separately
 * for weekdays and weekends — and predicts the chance of missing upcoming doses.
 * Uses a Beta(1,4) prior (≈20% miss) so sparse history doesn't produce wild numbers.
 */
const PRIOR_MISS = 1;
const PRIOR_TAKEN = 4;

const smoothed = (missed, total) => (missed + PRIOR_MISS) / (total + PRIOR_MISS + PRIOR_TAKEN);

export const learnPatterns = async (ownerId, meds, { days = 60 } = {}) => {
  if (!meds.length) return [];
  const end = addDays(new Date(), -1); // only fully completed days
  const start = addDays(end, -(days - 1));
  const logs = await DoseLog.find({
    owner: ownerId,
    medicine: { $in: meds.map((m) => m._id) },
    date: { $gte: toDateKey(start), $lte: toDateKey(end) },
  }).select('medicine date time status');
  const taken = new Set(logs.filter((l) => l.status === 'TAKEN').map((l) => `${l.medicine}|${l.date}|${l.time}`));

  const out = [];
  for (const med of meds) {
    for (const time of med.times) {
      const stat = { weekday: { n: 0, miss: 0 }, weekend: { n: 0, miss: 0 } };
      for (let i = 0; i < days; i += 1) {
        const day = addDays(start, i);
        if (!isScheduledOn(med, day)) continue;
        const bucket = [0, 6].includes(day.getDay()) ? stat.weekend : stat.weekday;
        bucket.n += 1;
        if (!taken.has(`${med._id}|${toDateKey(day)}|${time}`)) bucket.miss += 1;
      }
      const total = stat.weekday.n + stat.weekend.n;
      if (total < 7) continue;
      out.push({
        medicine: { _id: med._id, name: med.name, strength: med.strength },
        member: med.member,
        time,
        observedDays: total,
        missRate: smoothed(stat.weekday.miss + stat.weekend.miss, total),
        weekdayMiss: stat.weekday.n ? smoothed(stat.weekday.miss, stat.weekday.n) : null,
        weekendMiss: stat.weekend.n ? smoothed(stat.weekend.miss, stat.weekend.n) : null,
      });
    }
  }
  return out;
};

/** Probability of missing a given slot today. */
export const missProbabilityToday = (pattern, date = new Date()) => {
  const weekend = [0, 6].includes(date.getDay());
  const p = weekend ? pattern.weekendMiss : pattern.weekdayMiss;
  return p ?? pattern.missRate;
};
