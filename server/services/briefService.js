import Medicine from '../models/Medicine.js';
import Record from '../models/Record.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';
import { latestVitals, isAbnormal } from './vitalService.js';
import { adherence, scheduleText } from './medicineService.js';
import { checkMedicines } from './safetyService.js';
import { VITALS, formatVital } from '../data/vitals.js';
import { predictMember } from './predictService.js';

const MEAL = {
  BEFORE_FOOD: 'before food', AFTER_FOOD: 'after food', WITH_FOOD: 'with food',
  EMPTY_STOMACH: 'empty stomach', BEDTIME: 'at bedtime', ANY: '',
};

/**
 * One-page clinical summary for a member, assembled entirely from their
 * records so it is accurate and works offline. An AI narrative can be added
 * on top by the caller.
 */
export const buildBrief = async (member, { recordIds } = {}) => {
  const ownerId = member.owner;
  const sixMonthsAgo = new Date(Date.now() - 183 * 86400000);

  const recordFilter = { owner: ownerId, member: member._id };
  if (recordIds) recordFilter._id = { $in: recordIds };

  const [meds, vitalsMap, records, visits, upcoming, vaccines, adh] = await Promise.all([
    Medicine.find({ owner: ownerId, member: member._id, active: true }).sort({ name: 1 }),
    latestVitals(ownerId, [member._id]),
    Record.find(recordFilter).sort({ date: -1 }).limit(recordIds ? 50 : 8),
    Reminder.find({ owner: ownerId, member: member._id, status: 'DONE', completedAt: { $gte: sixMonthsAgo } }).sort({ completedAt: -1 }).limit(6),
    Reminder.find({ owner: ownerId, member: member._id, status: 'UPCOMING' }).sort({ dueAt: 1 }).limit(3),
    Vaccination.find({ owner: ownerId, member: member._id }).sort({ dueDate: 1 }),
    adherence(ownerId, { memberId: member._id, days: 30 }),
  ]);

  const adhByMed = new Map(adh.byMedicine.map((m) => [String(m._id), m.pct]));
  const pred = await predictMember(member).catch(() => null);
  const outlook = pred && {
    cardio: pred.cardio.available ? { risk: pred.cardio.risk, band: pred.cardio.band, heartAge: pred.cardio.heartAge, model: pred.cardio.model } : null,
    kidney: pred.kidney,
    glycaemic: pred.glycaemic,
    trends: pred.forecasts.filter((f) => f.confidence !== 'LOW').map((f) => ({
      label: f.label, unit: f.unit, direction: f.direction, changePerMonth: f.changePerMonth, confidence: f.confidence,
      projected: f.projected, crossing: f.crossing,
    })),
    patterns: pred.patterns.filter((p) => p.missRate >= 0.25).map((p) => ({ medicine: p.medicine.name, time: p.time, missRate: Math.round(p.missRate * 100) })),
  };
  const vitals = Object.values(vitalsMap.get(String(member._id)) || {})
    .sort((a, b) => Object.keys(VITALS).indexOf(a.type) - Object.keys(VITALS).indexOf(b.type))
    .map((v) => ({
      type: v.type,
      label: VITALS[v.type].label,
      value: formatVital(v.type, v.latest.value, v.latest.value2),
      previous: v.previous ? formatVital(v.type, v.previous.value, v.previous.value2) : null,
      status: v.latest.status,
      trend: v.trend,
      at: v.latest.at,
      normal: VITALS[v.type].normalText,
    }));

  const safety = checkMedicines(meds.map((m) => ({ name: m.name })), member.allergies);
  const flags = [
    ...member.allergies.filter((a) => a.severity === 'SEVERE').map((a) => `Severe allergy: ${a.name}${a.reaction ? ` (${a.reaction})` : ''}`),
    ...vitals.filter((v) => isAbnormal(v.status)).map((v) => `${v.label} ${v.status.toLowerCase()}: ${v.value}`),
    ...safety.filter((s) => s.severity === 'HIGH').map((s) => s.title + ' — ' + s.effect),
  ];

  return {
    generatedAt: new Date(),
    patient: {
      _id: member._id,
      name: member.name,
      age: member.age,
      gender: member.gender,
      bloodGroup: member.bloodGroup,
      heightCm: member.heightCm,
      weightKg: member.weightKg,
      bmi: member.bmi,
      organDonor: member.organDonor,
    },
    flags,
    allergies: member.allergies,
    noKnownAllergies: member.noKnownAllergies,
    conditions: member.conditions,
    medicines: meds.map((m) => ({
      _id: m._id,
      name: [m.name, m.strength].filter(Boolean).join(' '),
      schedule: [scheduleText(m), MEAL[m.mealTiming]].filter(Boolean).join(' · '),
      reason: m.reason,
      prescribedBy: m.prescribedBy,
      since: m.startDate,
      adherence: adhByMed.get(String(m._id)) ?? null,
    })),
    adherence: adh.pct,
    vitals,
    records: records.map((r) => ({ _id: r._id, title: r.title, category: r.category, date: r.date, doctor: r.doctor, facility: r.facility, summary: r.summary, hasFile: Boolean(r.file?.key) })),
    recentVisits: visits.map((v) => ({ title: v.title, type: v.type, date: v.completedAt, doctor: v.doctor, notes: v.notes })),
    upcoming: upcoming.map((v) => ({ title: v.title, type: v.type, date: v.dueAt, doctor: v.doctor })),
    vaccinations: {
      given: vaccines.filter((v) => v.givenDate).slice(-6).map((v) => ({ name: v.name, dose: v.dose, date: v.givenDate })),
      pending: vaccines.filter((v) => !v.givenDate && v.status !== 'UPCOMING').map((v) => ({ name: v.name, dose: v.dose, dueDate: v.dueDate, status: v.status })),
    },
    lifestyle: member.lifestyle,
    doctor: member.doctor,
    emergencyContacts: member.emergencyContacts,
    safety,
    outlook,
    notes: member.notes,
  };
};

/** Compact text form of a brief, used as AI context. */
export const briefToText = (b) => {
  const lines = [
    `Patient: ${b.patient.name}, ${b.patient.age ?? '?'}y, ${b.patient.gender || 'gender n/a'}, blood ${b.patient.bloodGroup || 'n/a'}, BMI ${b.patient.bmi ?? 'n/a'}`,
    `Allergies: ${b.allergies.length ? b.allergies.map((a) => `${a.name} (${a.severity})`).join(', ') : b.noKnownAllergies ? 'none known' : 'not recorded'}`,
    `Conditions: ${b.conditions.map((c) => `${c.name} [${c.status}]`).join(', ') || 'none recorded'}`,
    `Medicines: ${b.medicines.map((m) => `${m.name} — ${m.schedule}${m.adherence !== null ? ` (adherence ${m.adherence}%)` : ''}`).join('; ') || 'none'}`,
    `Latest vitals: ${b.vitals.map((v) => `${v.label} ${v.value} [${v.status}${v.previous ? `, prev ${v.previous}` : ''}]`).join('; ') || 'none'}`,
    `Lifestyle: ${Object.entries(b.lifestyle || {}).filter(([, v]) => v !== '' && v !== null).map(([k, v]) => `${k}=${v}`).join(', ') || 'n/a'}`,
    `Recent records: ${b.records.map((r) => `${r.title} (${new Date(r.date).toISOString().slice(0, 10)})${r.summary ? `: ${r.summary}` : ''}`).join('; ') || 'none'}`,
    `Pending vaccinations: ${b.vaccinations.pending.map((v) => `${v.name} ${v.dose}`).join(', ') || 'none'}`,
    `Predicted outlook: ${b.outlook?.cardio ? `10-yr CVD risk ${b.outlook.cardio.risk}% (${b.outlook.cardio.band}), heart age ${b.outlook.cardio.heartAge}; ` : ''}${(b.outlook?.trends || []).map((t) => `${t.label} ${t.direction.toLowerCase()} ${t.changePerMonth}/mo`).join('; ') || 'no trends'}`,
  ];
  return lines.join('\n');
};
