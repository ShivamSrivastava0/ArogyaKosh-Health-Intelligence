import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import Vital from '../models/Vital.js';
import Relative from '../models/Relative.js';
import { buildNodes, bloodRelatives } from './familyTreeService.js';
import { VITALS, classifyVital } from '../data/vitals.js';
import { ingredientsOf } from './safetyService.js';
import { memberLite } from './memberService.js';
import {
  framinghamRisk, heartAge, cvdBand, egfr, ckdStage, glycaemicStatus, metabolicSyndrome,
} from './predict/riskModels.js';
import { fitTrend, trendConfidence, firstCrossing, anomaly, median } from './predict/forecast.js';
import { learnPatterns, missProbabilityToday } from './predict/adherencePatterns.js';

const DAY = 86400000;
const RANK = { LOW: 1, NORMAL: 0, BORDERLINE: 2, HIGH: 3, CRITICAL: 4 };
const LOWER_IS_WORSE = new Set(['HDL', 'HEMOGLOBIN', 'SPO2', 'VITAMIN_D', 'VITAMIN_B12']);
const FORECAST_TYPES = ['BP', 'SUGAR_FASTING', 'SUGAR_PP', 'SUGAR_RANDOM', 'HBA1C', 'WEIGHT', 'LDL', 'CHOLESTEROL_TOTAL', 'TRIGLYCERIDES', 'TSH', 'HEMOGLOBIN', 'HEART_RATE', 'CREATININE'];
const LAB_TYPES = new Set(['HBA1C', 'LDL', 'CHOLESTEROL_TOTAL', 'TRIGLYCERIDES', 'TSH', 'HEMOGLOBIN', 'CREATININE', 'HDL', 'VITAMIN_D', 'VITAMIN_B12']);

const ANTIHYPERTENSIVE = ['telmisartan', 'losartan', 'olmesartan', 'amlodipine', 'enalapril', 'ramipril', 'lisinopril', 'hydrochlorothiazide', 'metoprolol', 'atenolol', 'chlorthalidone', 'cilnidipine'];
const ANTIDIABETIC = ['metformin', 'glimepiride', 'gliclazide', 'sitagliptin', 'vildagliptin', 'dapagliflozin', 'empagliflozin', 'insulin', 'pioglitazone', 'teneligliptin'];

const medTakes = (meds, generics, reasonRe) => meds.some((m) => ingredientsOf(m.name).some((g) => generics.includes(g)) || reasonRe.test(m.reason || '') || generics.some((g) => m.name.toLowerCase().includes(g)));
const pct = (x) => Math.round(x * 1000) / 10;
const clock = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
};
const ageLabel = (a) => (a >= 80 ? '80+' : String(a));
const round1 = (x) => Math.round(x * 10) / 10;

/** Collect everything the models need for one member. */
const gatherInputs = (member, readings, meds, household, relatives = []) => {
  const byType = {};
  for (const r of readings) (byType[r.type] ||= []).push(r);
  Object.values(byType).forEach((list) => list.sort((a, b) => b.at - a.at));

  const recent = (type, days = 365) => (byType[type] || []).filter((r) => Date.now() - r.at <= days * DAY);
  const latest = (type, days) => recent(type, days)[0]?.value ?? null;
  const bp = recent('BP', 180).slice(0, 3);
  const sbp = bp.length ? median(bp.map((r) => r.value)) : null;
  const dbp = bp.length ? median(bp.map((r) => r.value2)) : null;

  const knownDiabetic = member.conditions.some((c) => /diabet/i.test(c.name) && c.status !== 'RESOLVED')
    || medTakes(meds, ANTIDIABETIC, /sugar|diabet/i);
  const onBpMeds = medTakes(meds, ANTIHYPERTENSIVE, /\bbp\b|pressure|hypertens/i);
  const hba1c = latest('HBA1C');
  const fasting = latest('SUGAR_FASTING');
  const latestWeight = latest('WEIGHT', 180);
  const weight = latestWeight || member.weightKg;
  const bmi = member.heightCm && weight ? round1(weight / (member.heightCm / 100) ** 2) : null;

  // Family history for diabetes risk comes from the Family Health Tree graph:
  // household members AND relatives who aren't in the app.
  const nodes = buildNodes(household, relatives);
  const self = nodes.find((n) => n.memberId === String(member._id));
  const parents = self ? bloodRelatives(self, nodes).first.filter((n) => ['father', 'mother', 'parent'].includes(n.rel)) : [];
  const parentDiabetic = parents.filter((p) => p.conditions.some((c) => /diabet/i.test(c.name))).length;

  // Provenance for every model input: what value, from when, how many readings.
  const latestRow = (type, days) => recent(type, days)[0] || null;
  const ev = (row) => (row ? { value: row.value, at: row.at, source: row.source || 'MANUAL' } : null);
  const evidence = {
    bp: bp.length ? { value: `${Math.round(sbp)}/${Math.round(dbp)}`, n: bp.length, from: bp[bp.length - 1].at, to: bp[0].at, method: bp.length > 1 ? `median of last ${bp.length} readings` : 'single reading' } : null,
    tc: ev(latestRow('CHOLESTEROL_TOTAL')),
    hdl: ev(latestRow('HDL')),
    hba1c: ev(latestRow('HBA1C')),
    fasting: ev(latestRow('SUGAR_FASTING')),
    creatinine: ev(latestRow('CREATININE')),
    bmi: bmi ? { value: bmi, from: latestWeight ? `weight logged ${new Date(recent('WEIGHT', 180)[0].at).toDateString()}` : 'profile height & weight' } : null,
  };

  return {
    evidence,
    byType, sbp, dbp, bmi, hba1c, fasting, onBpMeds, knownDiabetic,
    tc: latest('CHOLESTEROL_TOTAL'), hdl: latest('HDL'), ldl: latest('LDL'), tg: latest('TRIGLYCERIDES'), creatinine: latest('CREATININE'),
    smoker: member.lifestyle?.smoking === 'CURRENT',
    smokingKnown: Boolean(member.lifestyle?.smoking),
    diabetic: knownDiabetic || (hba1c !== null && hba1c >= 6.5) || (fasting !== null && fasting >= 126),
    parentDiabetic: parents.length ? parentDiabetic : null,
  };
};

const cardioModel = (member, inp) => {
  const sex = member.gender;
  const age = member.age;
  const missing = [];
  if (!sex || sex === 'OTHER') missing.push('gender');
  if (!age) missing.push('date of birth');
  if (!inp.sbp) missing.push('a blood pressure reading');
  if (!(inp.tc && inp.hdl) && !inp.bmi) missing.push('height & weight (or a lipid profile)');
  if (age !== null && (age < 30 || age > 79)) {
    return { available: false, reason: age < 30 ? 'Heart risk models apply from age 30.' : 'This model is validated up to age 79.' };
  }
  if (missing.length) return { available: false, missing };

  const base = { sex, age, sbp: inp.sbp, treated: inp.onBpMeds, smoker: inp.smoker, diabetic: inp.diabetic, tc: inp.tc, hdl: inp.hdl, bmi: inp.bmi };
  const risk = framinghamRisk(base);
  const hAge = heartAge(base, risk);

  // What would change the number most? Recompute with each factor improved.
  const scenarios = [
    inp.sbp > 125 && { key: 'bp', label: 'Bring BP to 120 systolic', patch: { sbp: 120 } },
    inp.smoker && { key: 'smoke', label: 'Quit tobacco', patch: { smoker: false } },
    inp.tc && inp.tc > 180 && { key: 'chol', label: 'Lower total cholesterol to 180', patch: { tc: 180 } },
    inp.hdl && inp.hdl < 45 && { key: 'hdl', label: 'Raise HDL to 50 (activity, healthy fats)', patch: { hdl: 50 } },
    !inp.tc && inp.bmi > 24 && { key: 'bmi', label: 'Reach a BMI of 23', patch: { bmi: 23 } },
  ].filter(Boolean).map((s) => {
    const r = framinghamRisk({ ...base, ...s.patch });
    return { key: s.key, label: s.label, risk: pct(r), drop: round1(pct(risk) - pct(r)) };
  }).filter((s) => s.drop > 0.2).sort((a, b) => b.drop - a.drop);

  return {
    available: true,
    model: inp.tc && inp.hdl ? 'Framingham CVD (lipids)' : 'Framingham CVD (BMI, no lab test)',
    risk: pct(risk),
    band: cvdBand(risk),
    heartAge: hAge,
    ageGap: hAge !== null ? hAge - age : null,
    inputs: { age, sex, sbp: Math.round(inp.sbp), treatedBp: inp.onBpMeds, smoker: inp.smoker, diabetic: inp.diabetic, tc: inp.tc, hdl: inp.hdl, bmi: inp.bmi },
    levers: scenarios,
    evidence: {
      bp: inp.evidence.bp,
      tc: inp.tc && inp.hdl ? inp.evidence.tc : null,
      hdl: inp.tc && inp.hdl ? inp.evidence.hdl : null,
      bmi: inp.tc && inp.hdl ? null : inp.evidence.bmi,
      treatedBp: inp.onBpMeds ? 'On BP medicine (from medicine list)' : null,
      diabetes: inp.diabetic ? (inp.knownDiabetic ? 'Diabetes from conditions / medicines' : 'Sugar results in the diabetes range') : null,
      smoking: member.lifestyle?.smoking ? `Tobacco: ${member.lifestyle.smoking.toLowerCase()} (self-reported)` : null,
    },
    // Freshness warnings: old inputs are still used, but never silently.
    caveats: [
      inp.tc && inp.hdl && inp.evidence.tc && Date.now() - new Date(inp.evidence.tc.at) > 365 * DAY ? 'The cholesterol result is over a year old — a new lipid profile will make this more accurate.' : null,
      inp.evidence.bp && inp.evidence.bp.n < 2 ? 'Based on a single BP reading. Log 2–3 more on different days for a reliable estimate.' : null,
      !(inp.tc && inp.hdl) ? 'No lipid profile on file, so the BMI version of the model is used (less precise).' : null,
      member.lifestyle?.smoking ? null : 'Tobacco use not answered — assumed non-smoker.',
    ].filter(Boolean),
    note: 'Framingham can underestimate risk in South Asians — treat moderate results with extra care.',
  };
};

const forecastAll = (inp) => {
  const out = [];
  for (const type of FORECAST_TYPES) {
    const days = LAB_TYPES.has(type) ? 730 : 180;
    const list = (inp.byType[type] || []).filter((r) => Date.now() - r.at <= days * DAY);
    const fit = fitTrend(list.map((r) => ({ t: r.at, y: r.value })));
    if (!fit) continue;
    const fit2 = type === 'BP' ? fitTrend(list.filter((r) => r.value2 != null).map((r) => ({ t: r.at, y: r.value2 }))) : null;
    const confidence = trendConfidence(fit);
    const now = Date.now();
    const horizon = LAB_TYPES.has(type) ? 180 : 90;
    const classify = (a, b) => classifyVital(type, a, b);
    const current = classify(fit.project(now), fit2?.project(now));
    const crossing = confidence !== 'LOW' ? firstCrossing({ fit, fit2, classify, from: now, horizonDays: horizon, rank: RANK }) : null;
    const perMonth = fit.slopePerDay * 30;
    const better = LOWER_IS_WORSE.has(type) ? perMonth > 0 : perMonth < 0;
    const flat = Math.abs(perMonth * 3) < Math.max(1.4826 * fit.residualMad, Math.abs(fit.intercept) * 0.015);
    const band = 1.4826 * fit.residualMad;
    const step = horizon / 3;

    out.push({
      type,
      label: VITALS[type].label,
      unit: VITALS[type].unit,
      n: fit.n,
      confidence,
      direction: flat ? 'STABLE' : better ? 'IMPROVING' : 'WORSENING',
      changePerMonth: round1(perMonth),
      changePerMonth2: fit2 ? round1(fit2.slopePerDay * 30) : null,
      current: { value: round1(fit.project(now)), value2: fit2 ? round1(fit2.project(now)) : null, status: current },
      projected: { days: horizon, value: round1(fit.project(now + horizon * DAY)), value2: fit2 ? round1(fit2.project(now + horizon * DAY)) : null, status: classify(fit.project(now + horizon * DAY), fit2?.project(now + horizon * DAY)) },
      crossing: crossing && { date: crossing.date, days: crossing.days, status: crossing.status },
      history: [...list].reverse().map((r) => ({ t: r.at, y: r.value, y2: r.value2 ?? null })),
      forecast: [0, 1, 2, 3].map((k) => {
        const t = now + k * step * DAY;
        return { t: new Date(t), y: round1(fit.project(t)), lo: round1(fit.project(t) - band), hi: round1(fit.project(t) + band), y2: fit2 ? round1(fit2.project(t)) : null };
      }),
    });
  }
  return out;
};

const anomaliesFor = (inp) => {
  const out = [];
  for (const [type, list] of Object.entries(inp.byType)) {
    if (!list.length || Date.now() - list[0].at > 14 * DAY) continue;
    const a = anomaly(list.slice(0, 20).map((r) => r.value));
    if (!a?.unusual) continue;
    // Only flag moves in the harmful direction, or a reading that is itself low/critical.
    const worseDir = LOWER_IS_WORSE.has(type) ? a.z < 0 : a.z > 0;
    const st = classifyVital(type, list[0].value, list[0].value2);
    if (worseDir || ['LOW', 'CRITICAL'].includes(st)) out.push({ type, label: VITALS[type]?.label, value: list[0].value, value2: list[0].value2, at: list[0].at, unit: VITALS[type]?.unit, ...a });
  }
  return out;
};

const idrs = (member, inp) => {
  if (inp.diabetic || !member.age || member.age < 20) return null;
  const activityPts = { ACTIVE: 0, MODERATE: 10, LIGHT: 20, SEDENTARY: 30 }[member.lifestyle?.activity];
  const waist = member.waistCm;
  const male = member.gender === 'MALE';
  const parts = {
    age: member.age < 35 ? 0 : member.age < 50 ? 20 : 30,
    waist: waist ? (male ? (waist < 90 ? 0 : waist < 100 ? 10 : 20) : (waist < 80 ? 0 : waist < 90 ? 10 : 20)) : null,
    activity: activityPts ?? null,
    family: inp.parentDiabetic === null ? null : inp.parentDiabetic >= 2 ? 20 : inp.parentDiabetic === 1 ? 10 : 0,
  };
  const missing = [parts.waist === null && 'waist measurement', parts.activity === null && 'activity level', parts.family === null && 'parents\' diabetes history'].filter(Boolean);
  const known = Object.values(parts).filter((v) => v !== null);
  const score = known.reduce((s, v) => s + v, 0);
  return {
    score: missing.length ? null : score,
    partialScore: score,
    band: missing.length ? null : score >= 60 ? 'HIGH' : score >= 30 ? 'MODERATE' : 'LOW',
    parts,
    missing,
    familyFromHousehold: inp.parentDiabetic !== null,
  };
};

/** Turn model outputs into a ranked, plain-language list. */
const buildInsights = (member, m) => {
  const list = [];
  const add = (level, kind, key, title, detail, extra = {}) => list.push({ id: `${member._id}-${key}`, level, kind, title, detail, ...extra });
  const who = member.isSelf ? 'Your' : `${member.name.split(' ')[0]}'s`;

  if (m.cardio.available) {
    if (m.cardio.band === 'HIGH') add('critical', 'RISK', 'cvd', `${who} 10-year heart risk is high (${m.cardio.risk}%)`, `Heart age ${ageLabel(m.cardio.heartAge)} vs actual ${member.age}. ${m.cardio.levers[0] ? `Biggest lever — ${m.cardio.levers[0].label} (→ ${m.cardio.levers[0].risk}%).` : ''}`);
    else if (m.cardio.band === 'MODERATE') add('warning', 'RISK', 'cvd', `${who} 10-year heart risk is moderate (${m.cardio.risk}%)`, `Heart age ${ageLabel(m.cardio.heartAge)}. ${m.cardio.levers[0] ? `${m.cardio.levers[0].label} would bring it to ${m.cardio.levers[0].risk}%.` : ''}`);
    else if (m.cardio.ageGap >= 5) add('info', 'RISK', 'heartage', `${who} heart age is ${ageLabel(m.cardio.heartAge)} — ${m.cardio.ageGap} years older`, `10-year risk is low (${m.cardio.risk}%), but there's room to improve.`);
  }
  for (const f of m.forecasts) {
    if (f.crossing && f.direction === 'WORSENING') {
      const weeks = Math.round(f.crossing.days / 7);
      add(f.crossing.status === 'CRITICAL' || f.crossing.status === 'HIGH' ? 'warning' : 'info', 'FORECAST', `fc-${f.type}`,
        `${f.label} on track to turn ${f.crossing.status.toLowerCase()} in ~${weeks} week${weeks === 1 ? '' : 's'}`,
        `Trend ${f.changePerMonth > 0 ? '+' : ''}${f.changePerMonth} ${f.unit}/month over ${f.n} readings (${f.confidence.toLowerCase()} confidence). Acting now can change the curve.`, { type: f.type });
    } else if (f.direction === 'WORSENING' && f.confidence !== 'LOW' && ['HIGH', 'CRITICAL', 'BORDERLINE'].includes(f.current.status)) {
      add('warning', 'FORECAST', `fc-${f.type}`, `${f.label} is still climbing`, `${f.changePerMonth > 0 ? '+' : ''}${f.changePerMonth} ${f.unit}/month and already ${f.current.status.toLowerCase()} — projected ${f.projected.value} ${f.unit} in ${Math.round(f.projected.days / 30)} months. Share the trend with the doctor.`, { type: f.type });
    } else if (f.type === 'WEIGHT' && f.direction === 'WORSENING' && f.confidence !== 'LOW' && f.changePerMonth >= 0.3) {
      add('info', 'FORECAST', 'fc-WEIGHT', `Weight is creeping up (+${f.changePerMonth} kg/month)`, `At this pace that's about +${round1(f.changePerMonth * 6)} kg in 6 months — weight gain pushes up BP and sugar.`, { type: f.type });
    } else if (f.direction === 'IMPROVING' && f.confidence !== 'LOW') {
      add('good', 'FORECAST', `fc-${f.type}`, `${f.label} is improving`, `${f.changePerMonth > 0 ? '+' : ''}${f.changePerMonth} ${f.unit}/month across ${f.n} readings. Keep going.`, { type: f.type });
    }
  }
  for (const a of m.anomalies) {
    add('warning', 'ANOMALY', `an-${a.type}`, `Unusual ${a.label.toLowerCase()} reading`, `${a.value}${a.value2 ? `/${a.value2}` : ''} ${a.unit} is far from ${member.isSelf ? 'your' : 'their'} usual ${a.baseline}. Recheck — if it repeats, call the doctor.`, { type: a.type });
  }
  for (const p of m.patterns.filter((x) => x.missRate >= 0.25)) {
    const weekendHeavy = p.weekendMiss && p.weekdayMiss && p.weekendMiss > p.weekdayMiss * 1.5;
    add('warning', 'PATTERN', `pat-${p.medicine._id}-${p.time}`, `${p.medicine.name} at ${clock(p.time)} is often missed (${Math.round(p.missRate * 100)}%)`,
      `${weekendHeavy ? 'Mostly on weekends. ' : ''}Try moving it next to a fixed habit (tea, dinner) or set a phone alarm.`);
  }
  if (m.glycaemic && ['PREDIABETES', 'DIABETES_RANGE', 'POORLY_CONTROLLED', 'ABOVE_TARGET'].includes(m.glycaemic.status)) {
    add(m.glycaemic.tone === 'bad' ? 'critical' : 'warning', 'RISK', 'gly', m.glycaemic.label, m.glycaemic.status === 'PREDIABETES' ? 'About 5–7% weight loss and 150 min/week of activity can return sugar to normal.' : 'Review sugar control with the doctor at the next visit.');
  }
  if (m.diabetesRisk?.band === 'HIGH') add('warning', 'RISK', 'idrs', `High chance of developing diabetes (IDRS ${m.diabetesRisk.score})`, 'Get a fasting sugar or HbA1c test this month.');
  if (m.kidney && ['G3a', 'G3b', 'G4', 'G5'].includes(m.kidney.stage)) add('warning', 'RISK', 'kidney', `Kidney function: ${m.kidney.label} (eGFR ${m.kidney.egfr})`, 'Discuss with the doctor; some medicine doses depend on kidney function.');
  if (m.metabolic?.present) add('warning', 'RISK', 'mets', `Signs of metabolic syndrome (${m.metabolic.met} of 5)`, 'This cluster raises heart and diabetes risk. Weight, waist and activity are the levers.');

  const order = { critical: 0, warning: 1, good: 2, info: 3 };
  return list.sort((a, b) => order[a.level] - order[b.level]);
};

const dataNeeds = (member, inp, cardio) => {
  const needs = [];
  if (!member.dob) needs.push({ key: 'dob', label: 'Add date of birth', unlocks: 'all risk models', to: `/app/family/${member._id}?edit=basics` });
  if (!member.gender) needs.push({ key: 'gender', label: 'Add gender', unlocks: 'heart & kidney models', to: `/app/family/${member._id}?edit=basics` });
  if (!inp.sbp && member.age >= 18) needs.push({ key: 'bp', label: 'Log a BP reading', unlocks: 'heart risk & BP forecast', vital: 'BP' });
  if (!inp.bmi && member.age >= 18) needs.push({ key: 'hw', label: 'Add height & weight', unlocks: 'heart risk (no-lab model)', to: `/app/family/${member._id}?edit=basics` });
  if (cardio.available && !(inp.tc && inp.hdl)) needs.push({ key: 'lipids', label: 'Log total cholesterol & HDL', unlocks: 'the more accurate lab-based heart model', vital: 'CHOLESTEROL_TOTAL' });
  if (!member.waistCm && member.age >= 20) needs.push({ key: 'waist', label: 'Add waist size', unlocks: 'diabetes & metabolic risk', to: `/app/family/${member._id}?edit=basics` });
  if (!inp.creatinine && member.age >= 40) needs.push({ key: 'creat', label: 'Log a creatinine value', unlocks: 'kidney function (eGFR)', vital: 'CREATININE' });
  if (!inp.smokingKnown && member.age >= 18) needs.push({ key: 'smoke', label: 'Answer the tobacco question', unlocks: 'heart risk', to: `/app/family/${member._id}?edit=lifestyle` });
  return needs;
};

/** Full prediction report for one member. */
export const predictMember = async (member, { household } = {}) => {
  const ownerId = member.owner;
  const [readings, meds, family] = await Promise.all([
    Vital.find({ member: member._id, at: { $gte: new Date(Date.now() - 730 * DAY) } }).select('type value value2 at source').lean(),
    Medicine.find({ member: member._id, active: true }),
    household ? Promise.resolve(household) : Member.find({ owner: ownerId }),
  ]);
  const relatives = await Relative.find({ owner: member.owner });
  const inp = gatherInputs(member, readings, meds, family, relatives);
  const cardio = cardioModel(member, inp);
  const g = egfr({ creatinine: inp.creatinine, age: member.age, sex: member.gender === 'OTHER' ? null : member.gender });
  const stage = ckdStage(g);
  const models = {
    cardio,
    kidney: g !== null && member.age >= 18 ? { egfr: g, ...stage } : null,
    glycaemic: member.age >= 18 ? glycaemicStatus({ hba1c: inp.hba1c, fasting: inp.fasting, knownDiabetic: inp.knownDiabetic }) : null,
    metabolic: member.age >= 18 ? metabolicSyndrome({ sex: member.gender, waist: member.waistCm, tg: inp.tg, hdl: inp.hdl, sbp: inp.sbp, dbp: inp.dbp, fasting: inp.fasting, onBpMeds: inp.onBpMeds, onSugarMeds: inp.knownDiabetic }) : null,
    diabetesRisk: idrs(member, inp),
  };
  const forecasts = forecastAll(inp);
  const anomalies = anomaliesFor(inp);
  const patterns = await learnPatterns(ownerId, meds);
  const today = new Date();
  const dosesAtRisk = patterns
    .map((p) => ({ ...p, missToday: missProbabilityToday(p, today) }))
    .filter((p) => p.missToday >= 0.25)
    .sort((a, b) => b.missToday - a.missToday);

  const report = { ...models, forecasts, anomalies, patterns, dosesAtRisk };
  return {
    member: { ...memberLite(member), age: member.age },
    generatedAt: new Date(),
    ...report,
    insights: buildInsights(member, report),
    dataNeeds: dataNeeds(member, inp, cardio),
  };
};

/** Household overview: a compact "risk radar" row per member + top insights. */
export const predictHousehold = async (ownerId) => {
  const members = await Member.find({ owner: ownerId }).sort({ isSelf: -1, createdAt: 1 });
  const reports = await Promise.all(members.map((m) => predictMember(m, { household: members })));
  return {
    members: reports.map((r) => ({
      member: r.member,
      cardio: r.cardio.available ? { risk: r.cardio.risk, band: r.cardio.band, heartAge: r.cardio.heartAge, ageGap: r.cardio.ageGap } : null,
      glycaemic: r.glycaemic,
      kidney: r.kidney,
      diabetesRisk: r.diabetesRisk?.band ? { band: r.diabetesRisk.band, score: r.diabetesRisk.score } : null,
      worsening: r.forecasts.filter((f) => f.direction === 'WORSENING' && f.confidence !== 'LOW').map((f) => f.label),
      improving: r.forecasts.filter((f) => f.direction === 'IMPROVING' && f.confidence !== 'LOW').map((f) => f.label),
      alerts: r.insights.filter((i) => i.level === 'critical' || i.level === 'warning').length,
      dataNeeds: r.dataNeeds.length,
    })),
    insights: reports.flatMap((r) => r.insights.map((i) => ({ ...i, member: r.member }))).filter((i) => i.level !== 'info')
      .sort((a, b) => ({ critical: 0, warning: 1, good: 2 }[a.level] - { critical: 0, warning: 1, good: 2 }[b.level])),
    dosesAtRisk: reports.flatMap((r) => r.dosesAtRisk.map((d) => ({ ...d, member: r.member }))),
  };
};

/** What-if simulator for the heart model. */
export const simulateCardio = async (member, overrides = {}) => {
  const report = await predictMember(member);
  if (!report.cardio.available) return { available: false, reason: report.cardio.reason, missing: report.cardio.missing };
  const base = report.cardio.inputs;
  const p = {
    sex: base.sex, age: base.age,
    sbp: Number(overrides.sbp ?? base.sbp),
    treated: base.treatedBp,
    smoker: overrides.smoker ?? base.smoker,
    diabetic: base.diabetic,
    tc: base.tc ? Number(overrides.tc ?? base.tc) : null,
    hdl: base.hdl ? Number(overrides.hdl ?? base.hdl) : null,
    bmi: Number(overrides.bmi ?? base.bmi) || null,
  };
  const risk = framinghamRisk(p);
  return { available: true, baseline: { risk: report.cardio.risk, heartAge: report.cardio.heartAge }, risk: pct(risk), band: cvdBand(risk), heartAge: heartAge(p, risk), inputs: p };
};
