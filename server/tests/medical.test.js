/**
 * Medical correctness suite. Every expectation here comes from a published
 * source (cited inline). Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { framinghamRisk, heartAge, egfr, ckdStage, glycaemicStatus, metabolicSyndrome, cvdBand } from '../services/predict/riskModels.js';
import { classifyVital, validateReading, bmiStatus } from '../data/vitals.js';
import { CHILD_SCHEDULE, addOffset } from '../data/vaccines.js';
import { ingredientsOf, checkMedicines } from '../services/safetyService.js';

const close = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg}: expected ${expected}±${tol}, got ${actual}`);

// --- Framingham general CVD (D'Agostino et al., Circulation 2008, worked examples) ---
test('Framingham: published female example = 10.48%', () => {
  const r = framinghamRisk({ sex: 'FEMALE', age: 61, tc: 180, hdl: 47, sbp: 124, treated: false, smoker: true, diabetic: false });
  close(r * 100, 10.48, 0.01, 'female 10-yr risk');
});

test('Framingham: published male example = 15.62%', () => {
  const r = framinghamRisk({ sex: 'MALE', age: 53, tc: 161, hdl: 55, sbp: 125, treated: true, smoker: false, diabetic: true });
  close(r * 100, 15.62, 0.01, 'male 10-yr risk');
});

test('Framingham: risk rises with each adverse factor and never exceeds bounds', () => {
  const base = { sex: 'MALE', age: 50, tc: 200, hdl: 45, sbp: 130, treated: false, smoker: false, diabetic: false };
  const r0 = framinghamRisk(base);
  for (const patch of [{ smoker: true }, { diabetic: true }, { sbp: 160 }, { tc: 260 }, { hdl: 30 }, { age: 65 }]) {
    assert.ok(framinghamRisk({ ...base, ...patch }) > r0, `risk should rise with ${JSON.stringify(patch)}`);
  }
  assert.ok(r0 > 0 && r0 < 1);
});

test('Framingham: refuses to compute without required inputs', () => {
  assert.equal(framinghamRisk({ sex: 'MALE', age: 50, sbp: 130 }), null);
});

test('Heart age: optimal profile has heart age ≈ real age; worse profile is older', () => {
  const ideal = { sex: 'MALE', age: 50, tc: 180, hdl: 45, sbp: 125, treated: false, smoker: false, diabetic: false };
  close(heartAge(ideal, framinghamRisk(ideal)), 50, 1, 'ideal heart age');
  const smoker = { ...ideal, smoker: true };
  assert.ok(heartAge(smoker, framinghamRisk(smoker)) > 55);
});

test('CVD bands follow the 10% / 20% cut-offs', () => {
  assert.equal(cvdBand(0.099), 'LOW');
  assert.equal(cvdBand(0.1), 'MODERATE');
  assert.equal(cvdBand(0.2), 'HIGH');
});

// --- CKD-EPI 2021 (Inker et al., NEJM 2021): 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.2 × 0.9938^age × 1.012[F] ---
test('eGFR CKD-EPI 2021 matches the equation', () => {
  close(egfr({ creatinine: 1.1, age: 60, sex: 'MALE' }), 77, 1, 'male 60y Scr 1.1');
  close(egfr({ creatinine: 0.7, age: 40, sex: 'FEMALE' }), 112, 1, 'female 40y Scr 0.7'); // 142 × 0.9938^40 × 1.012
  close(egfr({ creatinine: 2.0, age: 70, sex: 'MALE' }), 35, 1, 'male 70y Scr 2.0');
});

test('KDIGO stages', () => {
  assert.equal(ckdStage(95).stage, 'G1');
  assert.equal(ckdStage(60).stage, 'G2');
  assert.equal(ckdStage(59).stage, 'G3a');
  assert.equal(ckdStage(44).stage, 'G3b');
  assert.equal(ckdStage(29).stage, 'G4');
  assert.equal(ckdStage(14).stage, 'G5');
});

// --- ADA Standards of Care: HbA1c 5.7–6.4 prediabetes, ≥6.5 diabetes; fasting 100–125, ≥126 ---
test('ADA glycaemic thresholds', () => {
  assert.equal(glycaemicStatus({ hba1c: 5.6 }).status, 'NORMAL');
  assert.equal(glycaemicStatus({ hba1c: 5.7 }).status, 'PREDIABETES');
  assert.equal(glycaemicStatus({ hba1c: 6.5 }).status, 'DIABETES_RANGE');
  assert.equal(glycaemicStatus({ fasting: 99 }).status, 'NORMAL');
  assert.equal(glycaemicStatus({ fasting: 100 }).status, 'PREDIABETES');
  assert.equal(glycaemicStatus({ fasting: 126 }).status, 'DIABETES_RANGE');
  assert.equal(glycaemicStatus({ hba1c: 6.8, knownDiabetic: true }).status, 'CONTROLLED');
  assert.equal(glycaemicStatus({}), null);
});

test('Metabolic syndrome: 3 of 5 harmonised criteria (Asian waist cut-offs)', () => {
  assert.equal(metabolicSyndrome({ sex: 'MALE', waist: 92, tg: 160, hdl: 38 }).present, true);
  assert.equal(metabolicSyndrome({ sex: 'FEMALE', waist: 79, tg: 120, hdl: 55, sbp: 118, dbp: 76, fasting: 90 }).met, 0);
});

// --- Vital classification: AHA/ACC 2017 BP categories, ADA sugar, WHO Asian BMI ---
test('BP categories (AHA/ACC 2017)', () => {
  assert.equal(classifyVital('BP', 119, 79), 'NORMAL');
  assert.equal(classifyVital('BP', 120, 79), 'BORDERLINE');
  assert.equal(classifyVital('BP', 135, 85), 'BORDERLINE');
  assert.equal(classifyVital('BP', 140, 85), 'HIGH');
  assert.equal(classifyVital('BP', 130, 90), 'HIGH');
  assert.equal(classifyVital('BP', 181, 100), 'CRITICAL');
  assert.equal(classifyVital('BP', 85, 55), 'LOW');
});

test('Fasting sugar and SpO2 categories', () => {
  assert.equal(classifyVital('SUGAR_FASTING', 99), 'NORMAL');
  assert.equal(classifyVital('SUGAR_FASTING', 100), 'BORDERLINE');
  assert.equal(classifyVital('SUGAR_FASTING', 126), 'HIGH');
  assert.equal(classifyVital('SUGAR_FASTING', 50), 'CRITICAL');
  assert.equal(classifyVital('SPO2', 96), 'NORMAL');
  assert.equal(classifyVital('SPO2', 92), 'LOW');
  assert.equal(classifyVital('SPO2', 88), 'CRITICAL');
});

test('BMI uses Asian cut-offs (WHO 2004)', () => {
  assert.equal(bmiStatus(22.9), 'NORMAL');
  assert.equal(bmiStatus(23), 'BORDERLINE');
  assert.equal(bmiStatus(25), 'HIGH');
});

// --- Plausibility & unit-mistake detection ---
test('rejects impossible readings and swapped BP', () => {
  assert.equal(validateReading('BP', 1400, 90).ok, false);
  assert.equal(validateReading('BP', 80, 120).ok, false);
  assert.match(validateReading('BP', 80, 120).message, /swapped/);
  assert.equal(validateReading('SPO2', 140).ok, false);
  assert.equal(validateReading('BP', 128, 84).ok, true);
});

test('detects common unit mix-ups with a conversion', () => {
  assert.match(validateReading('SUGAR_FASTING', 5.6).message, /mmol\/L.*101/);
  assert.match(validateReading('TEMPERATURE', 37).message, /°C.*98\.6/);
  assert.match(validateReading('HBA1C', 48).message, /mmol\/mol.*6\.5/);
  assert.match(validateReading('CHOLESTEROL_TOTAL', 5.2).message, /mmol\/L.*201/);
  assert.match(validateReading('CREATININE', 88.4).message, /µmol\/L.*1/);
});

// --- IAP-ACVIP 2023 schedule (Indian Pediatrics 2024;61:113) ---
test('IAP 2023: Hepatitis B at birth, 6, 10 and 14 weeks', () => {
  const dob = new Date('2026-01-01');
  const hb = CHILD_SCHEDULE.filter((v) => v.name === 'Hepatitis B');
  assert.deepEqual(hb.map((v) => v.dose), ['Dose 1', 'Dose 2', 'Dose 3', 'Dose 4']);
  assert.deepEqual(hb.map((v) => Math.round((addOffset(dob, v.at) - dob) / (7 * 86400000))), [0, 6, 10, 14]);
});

test('IAP 2023: key milestones', () => {
  const at = (name, dose) => CHILD_SCHEDULE.find((v) => v.name === name && v.dose === dose)?.at;
  assert.deepEqual(at('Typhoid Conjugate (TCV)', 'Single dose'), { months: 6 });
  assert.deepEqual(at('MMR', 'Dose 1'), { months: 9 });
  assert.deepEqual(at('MMR', 'Dose 3'), { years: 4 });
  assert.deepEqual(at('Tdap', 'Adolescent booster'), { years: 10 });
  assert.deepEqual(at('Td', 'Booster'), { years: 16 });
  assert.equal(CHILD_SCHEDULE.filter((v) => v.name === 'Influenza').length, 7, 'two primary + yearly to age 5');
});

// --- Medicine safety knowledge base ---
test('resolves common Indian brands to generics', () => {
  assert.deepEqual(ingredientsOf('Dolo 650'), ['paracetamol']);
  assert.ok(ingredientsOf('Combiflam').includes('ibuprofen'));
  assert.deepEqual(ingredientsOf('Taxim-O 200'), ['cefixime']);
  assert.deepEqual(ingredientsOf('Taxim 1g injection'), ['cefotaxime']);
  assert.deepEqual(ingredientsOf('Some unknown syrup'), []);
  // Names exactly as printed on strips, with hyphens
  assert.deepEqual(ingredientsOf('Ecosprin-AV 75').sort(), ['aspirin', 'atorvastatin']);
  assert.deepEqual(ingredientsOf('Telma-H').sort(), ['hydrochlorothiazide', 'telmisartan']);
  assert.deepEqual(ingredientsOf('Glycomet-GP 1').sort(), ['glimepiride', 'metformin']);
  assert.deepEqual(ingredientsOf('P-650'), ['paracetamol']);
});

test('flags warfarin + NSAID, paracetamol duplicates, and penicillin allergy', () => {
  const w = checkMedicines([{ name: 'Warf 5' }, { name: 'Combiflam' }], []);
  assert.ok(w.some((x) => x.kind === 'INTERACTION' && x.severity === 'HIGH'));
  const d = checkMedicines([{ name: 'Dolo 650' }, { name: 'Crocin' }], []);
  assert.ok(d.some((x) => x.kind === 'DUPLICATE' && x.severity === 'HIGH'));
  const a = checkMedicines([{ name: 'Augmentin 625' }], [{ name: 'Penicillin' }]);
  assert.ok(a.some((x) => x.kind === 'ALLERGY' && x.severity === 'HIGH'));
  assert.equal(checkMedicines([{ name: 'Telma 40' }, { name: 'Thyronorm' }], []).length, 0);
  // Ibuprofen blunts low-dose aspirin (FDA 2006 science paper)
  assert.ok(checkMedicines([{ name: 'Ecosprin 75' }, { name: 'Brufen 400' }], []).some((x) => x.kind === 'INTERACTION'));
});

/* ---- WhatsApp ---- */
import crypto from 'crypto';
import { normalizePhone, verifySignature } from '../services/whatsappService.js';
import { env as appEnv } from '../config/env.js';

test('WhatsApp: phone numbers normalise to wa_id format', () => {
  assert.equal(normalizePhone('98200 33114'), '919820033114');
  assert.equal(normalizePhone('+91 98200-33114'), '919820033114');
  assert.equal(normalizePhone('09820033114'), '919820033114');
  assert.equal(normalizePhone('0044 7700 900123'), '447700900123');
  assert.equal(normalizePhone('12345'), null);
});

test('WhatsApp: webhook signature must match the app secret', () => {
  const prev = appEnv.whatsapp.appSecret;
  appEnv.whatsapp.appSecret = 'test-secret';
  const body = Buffer.from('{"entry":[]}');
  const sig = `sha256=${crypto.createHmac('sha256', 'test-secret').update(body).digest('hex')}`;
  assert.equal(verifySignature(body, sig), true);
  assert.equal(verifySignature(Buffer.from('{"entry":[1]}'), sig), false);
  assert.equal(verifySignature(body, 'sha256=00'), false);
  appEnv.whatsapp.appSecret = prev;
});
