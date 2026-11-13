/**
 * ABHA identifiers and ABDM FHIR bundle parsing. Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAbhaNumber, normalizeAbhaAddress, parseBundle } from '../services/abhaService.js';

test('ABHA number: 14 digits, formatted XX-XXXX-XXXX-XXXX', () => {
  assert.equal(normalizeAbhaNumber('91 1234 5678 9012'), '91-1234-5678-9012');
  assert.equal(normalizeAbhaNumber('91-1234-5678-9012'), '91-1234-5678-9012');
  assert.equal(normalizeAbhaNumber(''), '');
  assert.equal(normalizeAbhaNumber('1234'), null);
  assert.equal(normalizeAbhaNumber('91-1234-5678-901A'), null);
});

test('ABHA address: name@abdm or name@sbx', () => {
  assert.equal(normalizeAbhaAddress('Rajesh.Sharma@abdm'), 'rajesh.sharma@abdm');
  assert.equal(normalizeAbhaAddress('rajesh_66'), 'rajesh_66@abdm');
  assert.equal(normalizeAbhaAddress('test@sbx'), 'test@sbx');
  assert.equal(normalizeAbhaAddress('.rajesh@abdm'), null);
  assert.equal(normalizeAbhaAddress('raj..esh@abdm'), null);
  assert.equal(normalizeAbhaAddress('rajesh@gmail.com'), null);
});

const at = '2026-10-01T09:00:00+05:30';
const obs = (code, value, unit) => ({ resource: { resourceType: 'Observation', status: 'final', code: { coding: [{ system: 'http://loinc.org', code }] }, effectiveDateTime: at, valueQuantity: { value, code: unit } } });

test('FHIR: SI units are converted (glucose ×18.016, LDL ×38.67, TG ×88.57, creatinine ÷88.4)', () => {
  const p = parseBundle({ resourceType: 'Bundle', entry: [obs('1558-6', 7.4, 'mmol/L'), obs('13457-7', 3.1, 'mmol/L'), obs('2571-8', 1.9, 'mmol/L'), obs('2160-0', 97, 'umol/L'), obs('4548-4', 7.1, '%')] });
  const v = Object.fromEntries(p.vitals.map((x) => [x.type, x.value]));
  assert.equal(v.SUGAR_FASTING, 133);
  assert.equal(v.LDL, 120);
  assert.equal(v.TRIGLYCERIDES, 168);
  assert.equal(v.CREATININE, 1.1);
  assert.equal(v.HBA1C, 7.1);
  assert.ok(p.vitals.every((x) => x.valid));
});

test('FHIR: blood pressure from a panel and from separate systolic/diastolic observations', () => {
  const panel = { resource: { resourceType: 'Observation', code: { coding: [{ system: 'http://loinc.org', code: '85354-9' }] }, effectiveDateTime: at, component: [
    { code: { coding: [{ code: '8480-6' }] }, valueQuantity: { value: 138 } }, { code: { coding: [{ code: '8462-4' }] }, valueQuantity: { value: 86 } }] } };
  const a = parseBundle({ resourceType: 'Bundle', entry: [panel] });
  assert.deepEqual([a.vitals[0].type, a.vitals[0].value, a.vitals[0].value2], ['BP', 138, 86]);
  const b = parseBundle({ resourceType: 'Bundle', entry: [obs('8480-6', 142, 'mm[Hg]'), obs('8462-4', 90, 'mm[Hg]')] });
  assert.deepEqual([b.vitals[0].type, b.vitals[0].value, b.vitals[0].value2], ['BP', 142, 90]);
});

test('FHIR: implausible values are flagged, not imported', () => {
  const p = parseBundle({ resourceType: 'Bundle', entry: [obs('8867-4', 900, '/min')] });
  assert.equal(p.vitals[0].valid, false);
});

test('FHIR: composition type sets the category; attachments, conditions, vaccines and medicines are read', () => {
  const p = parseBundle({ resourceType: 'Bundle', timestamp: at, entry: [
    { resource: { resourceType: 'Composition', type: { coding: [{ system: 'http://snomed.info/sct', code: '373942005' }] }, date: at, custodian: { reference: 'Organization/o1' } } },
    { fullUrl: 'Organization/o1', resource: { resourceType: 'Organization', id: 'o1', name: 'City Hospital' } },
    { resource: { resourceType: 'DocumentReference', type: { text: 'Discharge summary' }, content: [{ attachment: { contentType: 'application/pdf', data: 'JVBERi0xLjQK', title: 'Discharge summary' } }] } },
    { resource: { resourceType: 'Condition', code: { text: 'Type 2 diabetes' }, clinicalStatus: { coding: [{ code: 'active' }] } } },
    { resource: { resourceType: 'Immunization', status: 'completed', vaccineCode: { text: 'Tdap' }, occurrenceDateTime: at } },
    { resource: { resourceType: 'MedicationRequest', medicationCodeableConcept: { text: 'Metformin 500 mg' }, dosageInstruction: [{ text: '1-0-1 after food' }] } },
  ] });
  assert.equal(p.kind, 'Discharge summary');
  assert.equal(p.facility, 'City Hospital');
  assert.equal(p.documents[0].category, 'DISCHARGE_SUMMARY');
  assert.equal(p.conditions[0].name, 'Type 2 diabetes');
  assert.equal(p.immunizations[0].name, 'Tdap');
  assert.equal(p.medications[0].instructions, '1-0-1 after food');
});

test('FHIR: rejects files that are not bundles', () => {
  assert.throws(() => parseBundle({ resourceType: 'Patient' }), /not a FHIR Bundle/);
});
