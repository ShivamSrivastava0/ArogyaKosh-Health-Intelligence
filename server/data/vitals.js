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

export const bmiStatus = (bmi) => {
  // Asian-Indian cut-offs (WHO expert consultation, 2004)
  if (!bmi) return null;
  if (bmi < 18.5) return 'LOW';
  if (bmi < 23) return 'NORMAL';
  if (bmi < 25) return 'BORDERLINE';
  return 'HIGH';
};
