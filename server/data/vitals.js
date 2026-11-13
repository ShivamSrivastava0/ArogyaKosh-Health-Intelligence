/**
 * Vital / lab parameter catalog with adult reference ranges.
 * Ranges are general screening thresholds (ADA, AHA/ACC, WHO, common lab
 * references) and are deliberately conservative. They classify a reading,
 * they do not diagnose.
 *
 * classify(value, value2) -> 'NORMAL' | 'BORDERLINE' | 'HIGH' | 'LOW' | 'CRITICAL'
 */

const band = (v, { low, normalMax, borderlineMax, criticalLow, criticalHigh }) => {
  if (criticalLow !== undefined && v < criticalLow) return 'CRITICAL';
  if (criticalHigh !== undefined && v >= criticalHigh) return 'CRITICAL';
  if (low !== undefined && v < low) return 'LOW';
  if (v <= normalMax) return 'NORMAL';
  if (borderlineMax !== undefined && v <= borderlineMax) return 'BORDERLINE';
  return 'HIGH';
};

export const VITALS = {
  BP: {
    label: 'Blood pressure',
    unit: 'mmHg',
    dual: true,
    group: 'heart',
    hint: 'Systolic / diastolic',
    normalText: 'Below 120/80',
    classify(sys, dia) {
      if (sys >= 180 || dia >= 120) return 'CRITICAL';
      if (sys < 90 || dia < 60) return 'LOW';
      if (sys >= 140 || dia >= 90) return 'HIGH';
      if (sys >= 120 || dia >= 80) return 'BORDERLINE';
      return 'NORMAL';
    },
  },
  HEART_RATE: {
    label: 'Heart rate', unit: 'bpm', group: 'heart', normalText: '60–100 bpm',
    classify: (v) => band(v, { low: 50, normalMax: 100, borderlineMax: 110, criticalLow: 40, criticalHigh: 140 }),
  },
  SPO2: {
    label: 'SpO₂', unit: '%', group: 'heart', normalText: '95% or above',
    classify: (v) => (v < 90 ? 'CRITICAL' : v < 95 ? 'LOW' : 'NORMAL'),
  },
  SUGAR_FASTING: {
    label: 'Fasting sugar', unit: 'mg/dL', group: 'sugar', normalText: '70–99 mg/dL',
    classify: (v) => band(v, { low: 70, normalMax: 99, borderlineMax: 125, criticalLow: 54, criticalHigh: 300 }),
  },
  SUGAR_PP: {
    label: 'Post-meal sugar', unit: 'mg/dL', group: 'sugar', normalText: 'Below 140 mg/dL',
    classify: (v) => band(v, { low: 70, normalMax: 139, borderlineMax: 199, criticalLow: 54, criticalHigh: 350 }),
  },
  SUGAR_RANDOM: {
    label: 'Random sugar', unit: 'mg/dL', group: 'sugar', normalText: 'Below 140 mg/dL',
    classify: (v) => band(v, { low: 70, normalMax: 139, borderlineMax: 199, criticalLow: 54, criticalHigh: 350 }),
  },
  HBA1C: {
    label: 'HbA1c', unit: '%', group: 'sugar', normalText: 'Below 5.7%',
    classify: (v) => band(v, { normalMax: 5.6, borderlineMax: 6.4 }),
  },
  WEIGHT: {
    label: 'Weight', unit: 'kg', group: 'body', normalText: 'Depends on height (see BMI)',
    classify: () => 'NORMAL',
  },
  TEMPERATURE: {
    label: 'Temperature', unit: '°F', group: 'body', normalText: '97–99 °F',
    classify: (v) => band(v, { low: 95, normalMax: 99.0, borderlineMax: 100.3, criticalHigh: 103 }),
  },
  CHOLESTEROL_TOTAL: {
    label: 'Total cholesterol', unit: 'mg/dL', group: 'lipids', normalText: 'Below 200 mg/dL',
    classify: (v) => band(v, { normalMax: 199, borderlineMax: 239 }),
  },
  LDL: {
    label: 'LDL cholesterol', unit: 'mg/dL', group: 'lipids', normalText: 'Below 100 mg/dL',
    classify: (v) => band(v, { normalMax: 99, borderlineMax: 159 }),
  },
  HDL: {
    label: 'HDL cholesterol', unit: 'mg/dL', group: 'lipids', normalText: '40 mg/dL or above',
    classify: (v) => (v < 40 ? 'LOW' : 'NORMAL'),
  },
  TRIGLYCERIDES: {
    label: 'Triglycerides', unit: 'mg/dL', group: 'lipids', normalText: 'Below 150 mg/dL',
    classify: (v) => band(v, { normalMax: 149, borderlineMax: 199, criticalHigh: 500 }),
  },
  HEMOGLOBIN: {
    label: 'Haemoglobin', unit: 'g/dL', group: 'blood', normalText: '12–17 g/dL',
    classify: (v) => band(v, { low: 12, normalMax: 17.5, criticalLow: 7 }),
  },
  VITAMIN_D: {
    label: 'Vitamin D', unit: 'ng/mL', group: 'blood', normalText: '30–100 ng/mL',
    classify: (v) => (v < 20 ? 'LOW' : v < 30 ? 'BORDERLINE' : v > 100 ? 'HIGH' : 'NORMAL'),
  },
  VITAMIN_B12: {
    label: 'Vitamin B12', unit: 'pg/mL', group: 'blood', normalText: '200–900 pg/mL',
    classify: (v) => (v < 200 ? 'LOW' : v < 300 ? 'BORDERLINE' : 'NORMAL'),
  },
  TSH: {
    label: 'TSH', unit: 'mIU/L', group: 'thyroid', normalText: '0.4–4.0 mIU/L',
    classify: (v) => band(v, { low: 0.4, normalMax: 4.0, borderlineMax: 10 }),
  },
  CREATININE: {
    label: 'Creatinine', unit: 'mg/dL', group: 'kidney', normalText: '0.6–1.3 mg/dL',
    classify: (v) => band(v, { low: 0.5, normalMax: 1.3, borderlineMax: 1.6 }),
  },
};

export const VITAL_TYPES = Object.keys(VITALS);

export const classifyVital = (type, value, value2) => {
  const def = VITALS[type];
  if (!def || value === undefined || value === null) return 'NORMAL';
  return def.classify(Number(value), value2 !== undefined && value2 !== null ? Number(value2) : undefined);
};

export const formatVital = (type, value, value2) => {
  const def = VITALS[type];
  if (!def) return String(value);
  return def.dual ? `${value}/${value2} ${def.unit}` : `${value} ${def.unit}`;
};

/**
 * Plausibility limits: values outside [min, max] are physiologically
 * impossible (or a typo) and are rejected. `unit` catches the most common
 * unit mix-ups and tells the user how to convert instead of silently storing
 * a wrong number. Limits are deliberately wide — they block nonsense, not
 * genuinely extreme (critical) readings.
 */
const mmolGlucose = (v) => (v > 1 && v < 35 ? `That looks like mmol/L. In mg/dL it is about ${Math.round(v * 18)}.` : null);
const mmolChol = (factor) => (v) => (v > 0.5 && v < 20 ? `That looks like mmol/L. In mg/dL it is about ${Math.round(v * factor)}.` : null);
export const LIMITS = {
  BP: { min: 50, max: 260, min2: 30, max2: 160 },
  HEART_RATE: { min: 25, max: 250 },
  SPO2: { min: 50, max: 100 },
  SUGAR_FASTING: { min: 20, max: 800, unit: mmolGlucose },
  SUGAR_PP: { min: 20, max: 800, unit: mmolGlucose },
  SUGAR_RANDOM: { min: 20, max: 800, unit: mmolGlucose },
  HBA1C: { min: 3, max: 20, unit: (v) => (v > 20 && v < 200 ? `That looks like mmol/mol. In % it is about ${Math.round((v / 10.929 + 2.15) * 10) / 10}.` : null) },
  WEIGHT: { min: 0.5, max: 400 },
  TEMPERATURE: { min: 90, max: 110, unit: (v) => (v >= 30 && v <= 45 ? `That looks like °C. In °F it is ${Math.round((v * 9 / 5 + 32) * 10) / 10}.` : null) },
  CHOLESTEROL_TOTAL: { min: 50, max: 1000, unit: mmolChol(38.67) },
  LDL: { min: 10, max: 800, unit: mmolChol(38.67) },
  HDL: { min: 5, max: 200, unit: mmolChol(38.67) },
  TRIGLYCERIDES: { min: 10, max: 5000, unit: mmolChol(88.57) },
  HEMOGLOBIN: { min: 2, max: 25, unit: (v) => (v > 25 && v < 250 ? `That looks like g/L. In g/dL it is ${Math.round(v) / 10}.` : null) },
  VITAMIN_D: { min: 1, max: 300 },
  VITAMIN_B12: { min: 20, max: 5000 },
  TSH: { min: 0.001, max: 150 },
  CREATININE: { min: 0.1, max: 25, unit: (v) => (v > 25 && v < 2000 ? `That looks like µmol/L. In mg/dL it is ${Math.round((v / 88.4) * 100) / 100}.` : null) },
};

/** @returns { ok: true } | { ok: false, message } */
export const validateReading = (type, value, value2) => {
  const def = VITALS[type];
  const lim = LIMITS[type];
  if (!def || !lim) return { ok: false, message: 'Unknown measurement type' };
  const v = Number(value);
  if (!Number.isFinite(v)) return { ok: false, message: `Enter a number for ${def.label.toLowerCase()}` };
  if (v < lim.min || v > lim.max) {
    const hint = lim.unit?.(v);
    return { ok: false, message: hint ? `${def.label} of ${v} ${def.unit} isn't possible. ${hint}` : `${def.label} must be between ${lim.min} and ${lim.max} ${def.unit} — please check the reading.` };
  }
  if (def.dual) {
    const d = Number(value2);
    if (!Number.isFinite(d)) return { ok: false, message: 'Enter the diastolic (lower) number' };
    if (d < lim.min2 || d > lim.max2) return { ok: false, message: `Diastolic must be between ${lim.min2} and ${lim.max2} mmHg — please check.` };
    if (d >= v) return { ok: false, message: 'The top number (systolic) must be higher than the bottom number (diastolic). Were they swapped?' };
  }
  return { ok: true };
};

export const bmiStatus = (bmi) => {
  // Asian-Indian cut-offs (WHO expert consultation, 2004)
  if (!bmi) return null;
  if (bmi < 18.5) return 'LOW';
  if (bmi < 23) return 'NORMAL';
  if (bmi < 25) return 'BORDERLINE';
  return 'HIGH';
};
