import { bmiStatus } from '../data/vitals.js';
import { FIRST_AID_ITEMS } from '../data/firstAid.js';

const RECENT_DAYS = 180;
const isRecent = (d) => d && (Date.now() - new Date(d)) / 86400000 <= RECENT_DAYS;

const STATUS_POINTS = { NORMAL: 1, BORDERLINE: 0.65, LOW: 0.5, HIGH: 0.25, CRITICAL: 0 };
const toState = (ratio) => (ratio === null ? 'unknown' : ratio >= 0.9 ? 'good' : ratio >= 0.6 ? 'ok' : 'bad');

/**
 * Explainable health score (0–100) for one member.
 * Every factor reports points/max so the UI can show exactly why the score is
 * what it is. Unknown factors are excluded, and `coverage` tells the user how
 * much of the picture we have.
 */
export const healthScore = (member, { vitals = {}, adherencePct = null, overdueVaccines = 0, lastCheckupAt = null } = {}) => {
  const factors = [];
  const add = (key, label, max, ratio, detail, tip) => {
    factors.push({ key, label, max, points: ratio === null ? null : Math.round(max * ratio * 10) / 10, state: toState(ratio), detail, tip });
  };

  const fromVital = (types) => {
    for (const t of types) {
      const v = vitals[t];
      if (v && isRecent(v.latest.at)) return v;
    }
    return null;
  };

  if (member.age !== null && member.age !== undefined && member.age < 18) {
    return childScore(member, { factors, add, adherencePct, overdueVaccines, lastCheckupAt });
  }

  const bp = fromVital(['BP']);
  add('bp', 'Blood pressure', 15, bp ? STATUS_POINTS[bp.latest.status] : null,
    bp ? `${bp.latest.value}/${bp.latest.value2} mmHg (${bp.latest.status.toLowerCase()})` : 'No reading in the last 6 months',
    bp && bp.latest.status !== 'NORMAL' ? 'Recheck BP at rest for 3 days and share the log with your doctor.' : !bp ? 'Log a BP reading — takes 2 minutes with a home monitor.' : null);

  const sugar = fromVital(['HBA1C', 'SUGAR_FASTING', 'SUGAR_RANDOM', 'SUGAR_PP']);
  add('sugar', 'Blood sugar', 15, sugar ? STATUS_POINTS[sugar.latest.status] : null,
    sugar ? `${sugar.label}: ${sugar.latest.value} ${sugar.latest.unit} (${sugar.latest.status.toLowerCase()})` : 'No sugar test in the last 6 months',
    sugar && sugar.latest.status !== 'NORMAL'
      ? (sugar.type === 'HBA1C' ? 'Review sugar control with your doctor — most HbA1c targets are below 7%.' : 'Ask your doctor about an HbA1c test and a diet plan.')
      : !sugar ? 'A fasting sugar or HbA1c once a year is recommended after 30.' : null);

  const bmi = member.bmi;
  const bStat = bmiStatus(bmi);
  add('bmi', 'Body mass index', 10, bStat ? (bmi >= 30 ? 0.1 : STATUS_POINTS[bStat]) : null,
    bmi ? `BMI ${bmi} (Asian cut-offs)` : 'Add height and weight',
    bStat === 'HIGH' || bStat === 'BORDERLINE' ? 'Even a 5% weight loss measurably lowers BP and sugar.' : null);

  const lipid = fromVital(['LDL', 'CHOLESTEROL_TOTAL']);
  add('lipids', 'Cholesterol', 10, lipid ? STATUS_POINTS[lipid.latest.status] : null,
    lipid ? `${lipid.label}: ${lipid.latest.value} ${lipid.latest.unit}` : 'No lipid profile in the last 6 months',
    lipid && lipid.latest.status !== 'NORMAL' ? 'Cut fried foods and trans fats; recheck in 3 months.' : null);

  const ls = member.lifestyle || {};
  const smokeMap = { NEVER: 1, FORMER: 0.7, CURRENT: 0 };
  add('smoking', 'Tobacco', 10, ls.smoking ? smokeMap[ls.smoking] : null,
    ls.smoking ? ls.smoking.toLowerCase().replace('_', ' ') : 'Not recorded',
    ls.smoking === 'CURRENT' ? 'Quitline 1800-112-356 (free, national tobacco quitline).' : null);

  const alcoholMap = { NEVER: 1, OCCASIONAL: 0.8, REGULAR: 0.2 };
  add('alcohol', 'Alcohol', 5, ls.alcohol ? alcoholMap[ls.alcohol] : null, ls.alcohol ? ls.alcohol.toLowerCase() : 'Not recorded', null);

  const actMap = { ACTIVE: 1, MODERATE: 0.8, LIGHT: 0.5, SEDENTARY: 0.2 };
  add('activity', 'Physical activity', 10, ls.activity ? actMap[ls.activity] : null,
    ls.activity ? ls.activity.toLowerCase() : 'Not recorded',
    ls.activity === 'SEDENTARY' || ls.activity === 'LIGHT' ? 'Aim for 150 minutes of brisk walking a week.' : null);

  const sleep = ls.sleepHours;
  const sleepRatio = sleep === null || sleep === undefined ? null : sleep >= 7 && sleep <= 9 ? 1 : sleep >= 6 && sleep <= 10 ? 0.6 : 0.2;
  add('sleep', 'Sleep', 5, sleepRatio, sleep ? `${sleep} h / night` : 'Not recorded', sleepRatio !== null && sleepRatio < 1 ? 'Adults need 7–9 hours.' : null);

  add('adherence', 'Medicine adherence', 10, adherencePct === null ? null : adherencePct / 100,
    adherencePct === null ? 'No scheduled medicines' : `${adherencePct}% of doses taken (14 days)`,
    adherencePct !== null && adherencePct < 80 ? 'Turn on reminders and keep medicines where you see them daily.' : null);

  const checkup = isRecent(lastCheckupAt) || (lastCheckupAt && (Date.now() - new Date(lastCheckupAt)) / 86400000 <= 365);
  const prevRatio = (overdueVaccines === 0 ? 0.5 : 0) + (checkup ? 0.5 : 0);
  add('preventive', 'Preventive care', 10, prevRatio,
    `${checkup ? 'Checkup in the last year' : 'No checkup in the last year'} · ${overdueVaccines ? `${overdueVaccines} vaccine(s) overdue` : 'vaccines up to date'}`,
    !checkup ? 'Book an annual health checkup.' : overdueVaccines ? 'Catch up on overdue vaccines.' : null);

  return summarise(factors);
};

/** Children: vaccines, checkups, sleep and medicines — adult lab cut-offs don't apply. */
function childScore(member, { factors, add, adherencePct, overdueVaccines, lastCheckupAt }) {
  add('vaccines', 'Vaccinations', 20, Math.max(0, 1 - overdueVaccines * 0.34),
    overdueVaccines ? `${overdueVaccines} overdue` : 'Up to date',
    overdueVaccines ? 'Visit the paediatrician to catch up, or tick off doses already given.' : null);
  const checkup = lastCheckupAt && (Date.now() - new Date(lastCheckupAt)) / 86400000 <= 365;
  add('checkup', 'Growth & development check', 10, checkup ? 1 : 0, checkup ? 'Seen in the last year' : 'No check-up logged this year', !checkup ? 'Book a routine paediatric visit.' : null);
  const sleep = member.lifestyle?.sleepHours;
  add('sleep', 'Sleep', 5, sleep ? (sleep >= 9 ? 1 : sleep >= 8 ? 0.6 : 0.3) : null, sleep ? `${sleep} h / night` : 'Not recorded', null);
  add('adherence', 'Medicine adherence', 10, adherencePct === null ? null : adherencePct / 100,
    adherencePct === null ? 'No scheduled medicines' : `${adherencePct}% of doses taken`, null);
  return summarise(factors, 0.4);
}

function summarise(factors, minCoverage = 0.3) {
  const known = factors.filter((f) => f.points !== null);
  const totalMax = factors.reduce((s, f) => s + f.max, 0);
  const knownMax = known.reduce((s, f) => s + f.max, 0);
  const points = known.reduce((s, f) => s + f.points, 0);
  const coverage = Math.round((knownMax / totalMax) * 100);
  const score = knownMax && knownMax / totalMax >= minCoverage ? Math.round((points / knownMax) * 100) : null;
  return {
    score,
    grade: score === null ? 'Not enough data' : score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'Fair' : 'Needs attention',
    coverage,
    confidence: coverage >= 70 ? 'high' : coverage >= 40 ? 'medium' : 'low',
    factors,
  };
}

/**
 * Household emergency-readiness checklist. Each unmet item carries the
 * screen that fixes it, so the score is directly actionable.
 */
export const readiness = (members, { vaccinesOverdueByMember = new Map(), kit = [] } = {}) => {
  const items = [];
  for (const m of members) {
    const ref = { _id: m._id, name: m.name, color: m.color };
    const to = `/app/family/${m._id}`;
    items.push({ member: ref, key: 'blood', label: 'Blood group recorded', done: Boolean(m.bloodGroup), to: `${to}?edit=basics` });
    items.push({ member: ref, key: 'allergies', label: 'Allergies reviewed', done: m.allergies.length > 0 || m.noKnownAllergies, to: `${to}?edit=medical` });
    items.push({ member: ref, key: 'contact', label: 'Emergency contact added', done: m.emergencyContacts.length > 0, to: `${to}?edit=contacts` });
    items.push({ member: ref, key: 'doctor', label: 'Family doctor on file', done: Boolean(m.doctor?.name), to: `${to}?edit=care` });
    items.push({ member: ref, key: 'insurance', label: 'Insurance details saved', done: m.insurance.length > 0, to: `${to}?edit=care` });
    items.push({ member: ref, key: 'vaccines', label: 'No overdue vaccines', done: !(vaccinesOverdueByMember.get(String(m._id)) > 0), to: `/app/vaccines?member=${m._id}` });
  }

  const essentials = FIRST_AID_ITEMS.filter((i) => i.essential);
  const have = new Map(kit.map((k) => [k.key, k]));
  const kitDone = essentials.filter((i) => have.get(i.key)?.have).length;
  const kitRatio = essentials.length ? kitDone / essentials.length : 1;
  items.push({ member: null, key: 'kit', label: `First-aid kit essentials (${kitDone}/${essentials.length})`, done: kitRatio >= 0.8, to: '/app/emergency#kit' });

  const done = items.filter((i) => i.done).length;
  return { score: items.length ? Math.round((done / items.length) * 100) : 0, done, total: items.length, items };
};
