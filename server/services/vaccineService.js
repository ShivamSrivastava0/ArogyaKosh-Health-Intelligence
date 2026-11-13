import Vaccination from '../models/Vaccination.js';
import { CHILD_SCHEDULE, ADULT_SCHEDULE, addOffset } from '../data/vaccines.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create the recommended schedule for a member from their date of birth.
 * Existing entries (same name + dose) are never duplicated, so it is safe to
 * run again after editing DOB. Past-due childhood doses are created as due
 * (not given) — parents tick off the ones already done.
 */
export const generateSchedule = async (ownerId, member) => {
  if (!member.dob) throw ApiError.badRequest('Add a date of birth first to build the schedule');
  const age = member.age ?? 0;
  const existing = await Vaccination.find({ member: member._id }).select('name dose');
  const has = new Set(existing.map((v) => `${v.name}|${v.dose}`.toLowerCase()));

  const docs = [];
  if (age < 18) {
    for (const item of CHILD_SCHEDULE) {
      if (has.has(`${item.name}|${item.dose}`.toLowerCase())) continue;
      docs.push({ owner: ownerId, member: member._id, name: item.name, dose: item.dose, dueDate: addOffset(member.dob, item.at), notes: item.note || '', source: 'SCHEDULE' });
    }
  } else {
    const now = new Date();
    for (const item of ADULT_SCHEDULE) {
      if (age < item.minAge || (item.maxAge && age > item.maxAge)) continue;
      if (has.has(`${item.name}|${item.dose}`.toLowerCase())) continue;
      docs.push({ owner: ownerId, member: member._id, name: item.name, dose: item.dose, dueDate: now, notes: item.note, source: 'SCHEDULE' });
    }
  }
  if (docs.length) await Vaccination.insertMany(docs);
  return docs.length;
};

/** When a recurring adult vaccine is marked given, schedule the next one. */
export const scheduleNextIfRecurring = async (vacc, member) => {
  const def = ADULT_SCHEDULE.find((a) => a.name === vacc.name && a.everyYears);
  if (!def || !vacc.givenDate) return null;
  const next = addOffset(vacc.givenDate, { years: def.everyYears });
  const exists = await Vaccination.findOne({ member: member._id, name: vacc.name, givenDate: null, dueDate: { $gte: vacc.givenDate } });
  if (exists) return null;
  return Vaccination.create({ owner: vacc.owner, member: member._id, name: vacc.name, dose: vacc.dose, dueDate: next, notes: def.note, source: 'SCHEDULE' });
};
