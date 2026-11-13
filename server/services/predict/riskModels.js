/**
 * Validated clinical risk equations. Pure functions, no I/O.
 *
 * - General cardiovascular disease 10-year risk — D'Agostino et al.,
 *   Circulation 2008 (Framingham Heart Study), lipid and BMI versions.
 * - Heart age — same paper's method: the age at which a person with optimal
 *   risk factors has the same risk.
 * - eGFR — CKD-EPI 2021 creatinine equation (race-free), KDIGO stages.
 * - Glycaemic status — ADA thresholds for HbA1c / fasting glucose.
 */

const ln = Math.log;

const FRAMINGHAM = {
  lipid: {
    FEMALE: { age: 2.32888, tc: 1.20904, hdl: -0.70833, sbpU: 2.76157, sbpT: 2.82263, smoke: 0.52873, dm: 0.69154, s0: 0.95012, mean: 26.1931 },
    MALE: { age: 3.06117, tc: 1.1237, hdl: -0.93263, sbpU: 1.93303, sbpT: 1.99881, smoke: 0.65451, dm: 0.57367, s0: 0.88936, mean: 23.9802 },
  },
  bmi: {
    FEMALE: { age: 2.72107, bmi: 0.51125, sbpU: 2.81291, sbpT: 2.88267, smoke: 0.61868, dm: 0.77763, s0: 0.94833, mean: 26.0145 },
    MALE: { age: 3.11296, bmi: 0.79277, sbpU: 1.85508, sbpT: 1.92672, smoke: 0.70953, dm: 0.5316, s0: 0.88431, mean: 23.9388 },
  },
};

const OPTIMAL = { sbp: 125, treated: false, tc: 180, hdl: 45, bmi: 22, smoker: false, diabetic: false };

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * @param p { sex: 'MALE'|'FEMALE', age, sbp, treated, smoker, diabetic, tc?, hdl?, bmi? }
 * @returns risk as a fraction 0..1, or null if inputs are insufficient
 */
export const framinghamRisk = (p) => {
  const sex = p.sex === 'FEMALE' ? 'FEMALE' : 'MALE';
  const useLipid = p.tc && p.hdl;
  if (!p.age || !p.sbp || (!useLipid && !p.bmi)) return null;
  const c = FRAMINGHAM[useLipid ? 'lipid' : 'bmi'][sex];
  let sum = c.age * ln(clamp(p.age, 30, 79))
    + (p.treated ? c.sbpT : c.sbpU) * ln(clamp(p.sbp, 90, 220))
    + (p.smoker ? c.smoke : 0)
    + (p.diabetic ? c.dm : 0);
  sum += useLipid ? c.tc * ln(clamp(p.tc, 100, 405)) + c.hdl * ln(clamp(p.hdl, 20, 120)) : c.bmi * ln(clamp(p.bmi, 15, 50));
  return clamp(1 - c.s0 ** Math.exp(sum - c.mean), 0, 0.99);
};

/** Age at which an optimal-profile person has the same risk. */
export const heartAge = (p, risk) => {
  if (risk === null || risk === undefined) return null;
  const useLipid = Boolean(p.tc && p.hdl);
  const ideal = (age) => framinghamRisk({ ...OPTIMAL, sex: p.sex, age, tc: useLipid ? OPTIMAL.tc : null, hdl: useLipid ? OPTIMAL.hdl : null });
  let lo = 30; let hi = 79;
  if (ideal(lo) >= risk) return 30;
  if (ideal(hi) <= risk) return 80;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (ideal(mid) < risk) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
};

export const cvdBand = (risk) => (risk === null ? null : risk < 0.1 ? 'LOW' : risk < 0.2 ? 'MODERATE' : 'HIGH');

/** CKD-EPI 2021 (creatinine, race-free). */
export const egfr = ({ creatinine, age, sex }) => {
  if (!creatinine || !age || !sex) return null;
  const female = sex === 'FEMALE';
  const k = female ? 0.7 : 0.9;
  const a = female ? -0.241 : -0.302;
  const r = creatinine / k;
  const value = 142 * Math.min(r, 1) ** a * Math.max(r, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1);
  return Math.round(value);
};

export const ckdStage = (g) => {
  if (g === null || g === undefined) return null;
  if (g >= 90) return { stage: 'G1', label: 'Normal', tone: 'ok' };
  if (g >= 60) return { stage: 'G2', label: 'Mildly reduced', tone: 'ok' };
  if (g >= 45) return { stage: 'G3a', label: 'Mild–moderate reduction', tone: 'warn' };
  if (g >= 30) return { stage: 'G3b', label: 'Moderate–severe reduction', tone: 'bad' };
  if (g >= 15) return { stage: 'G4', label: 'Severely reduced', tone: 'bad' };
  return { stage: 'G5', label: 'Kidney failure range', tone: 'bad' };
};

/** ADA glycaemic categories. Known diabetics are graded on control instead. */
export const glycaemicStatus = ({ hba1c, fasting, knownDiabetic }) => {
  if (knownDiabetic) {
    if (hba1c === null || hba1c === undefined) return { status: 'DIABETES', label: 'Diabetes — add an HbA1c to track control', tone: 'warn' };
    if (hba1c < 7) return { status: 'CONTROLLED', label: `Diabetes, well controlled (HbA1c ${hba1c}%)`, tone: 'ok' };
    if (hba1c < 8) return { status: 'ABOVE_TARGET', label: `Diabetes, above target (HbA1c ${hba1c}%)`, tone: 'warn' };
    return { status: 'POORLY_CONTROLLED', label: `Diabetes, poorly controlled (HbA1c ${hba1c}%)`, tone: 'bad' };
  }
  const a = hba1c ?? null;
  const f = fasting ?? null;
  if (a === null && f === null) return null;
  if ((a !== null && a >= 6.5) || (f !== null && f >= 126)) return { status: 'DIABETES_RANGE', label: 'In the diabetes range — confirm with a doctor', tone: 'bad' };
  if ((a !== null && a >= 5.7) || (f !== null && f >= 100)) return { status: 'PREDIABETES', label: 'Prediabetes range — reversible with lifestyle change', tone: 'warn' };
  return { status: 'NORMAL', label: 'Normal blood sugar', tone: 'ok' };
};

/**
 * Metabolic syndrome (harmonised criteria, Asian waist cut-offs).
 * Returns how many of the 5 criteria are known to be met, and how many are known at all.
 */
export const metabolicSyndrome = ({ sex, waist, tg, hdl, sbp, dbp, fasting, onBpMeds, onSugarMeds }) => {
  const checks = [
    waist === null || waist === undefined ? null : waist >= (sex === 'FEMALE' ? 80 : 90),
    tg === null || tg === undefined ? null : tg >= 150,
    hdl === null || hdl === undefined ? null : hdl < (sex === 'FEMALE' ? 50 : 40),
    onBpMeds ? true : sbp === null || sbp === undefined ? null : sbp >= 130 || dbp >= 85,
    onSugarMeds ? true : fasting === null || fasting === undefined ? null : fasting >= 100,
  ];
  const known = checks.filter((c) => c !== null).length;
  const met = checks.filter(Boolean).length;
  return { met, known, present: met >= 3 };
};
