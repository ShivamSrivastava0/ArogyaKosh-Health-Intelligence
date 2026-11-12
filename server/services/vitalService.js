import mongoose from 'mongoose';
import Vital from '../models/Vital.js';
import { VITALS } from '../data/vitals.js';

const toIds = (ids) => ids.map((id) => new mongoose.Types.ObjectId(String(id)));

/**
 * Latest two readings per (member, type) so callers can show value + trend.
 * @returns Map<memberId, { [type]: { latest, previous, trend } }>
 */
export const latestVitals = async (ownerId, memberIds) => {
  const match = { owner: new mongoose.Types.ObjectId(String(ownerId)) };
  if (memberIds?.length) match.member = { $in: toIds(memberIds) };

  const rows = await Vital.aggregate([
    { $match: match },
    { $sort: { at: -1 } },
    { $group: { _id: { member: '$member', type: '$type' }, readings: { $push: { _id: '$_id', value: '$value', value2: '$value2', unit: '$unit', status: '$status', at: '$at' } } } },
    { $project: { readings: { $slice: ['$readings', 6] } } },
  ]);

  const out = new Map();
  for (const row of rows) {
    const mid = String(row._id.member);
    const [latest, previous] = row.readings;
    // Trend compares the latest reading with the average of up to 5 before it,
    // so one noisy reading doesn't flip the arrow.
    let trend = null;
    const earlier = row.readings.slice(1);
    if (earlier.length) {
      const base = earlier.reduce((s, r) => s + r.value, 0) / earlier.length;
      const diff = latest.value - base;
      const pct = base ? Math.abs(diff / base) : 0;
      trend = pct < 0.02 ? 'FLAT' : diff > 0 ? 'UP' : 'DOWN';
    }
    if (!out.has(mid)) out.set(mid, {});
    out.get(mid)[row._id.type] = { type: row._id.type, label: VITALS[row._id.type]?.label, latest, previous: previous || null, trend };
  }
  return out;
};

export const isAbnormal = (status) => ['HIGH', 'LOW', 'CRITICAL'].includes(status);
