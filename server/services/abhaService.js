import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Vital from '../models/Vital.js';
import Record from '../models/Record.js';
import Vaccination from '../models/Vaccination.js';
import ApiError from '../utils/ApiError.js';
import { UPLOAD_ROOT } from '../middleware/upload.js';
import { VITALS, validateReading } from '../data/vitals.js';

/**
 * ABHA (Ayushman Bharat Health Account) support.
 *
 * Hospitals and apps on India's ABDM network exchange records as FHIR R4
 * "document" bundles (NRCeS implementation guide): a Composition (Prescription,
 * DiagnosticReport, DischargeSummary, OPConsultation, ImmunizationRecord, …)
 * plus Observations, Conditions, Medications, Immunizations and attached PDFs.
 * This module reads those bundles into the locker with a preview step and
 * duplicate detection. Every imported item is tagged with where it came from.
 */

/* ------------------------------ identifiers ------------------------------ */

/** 14-digit ABHA number, shown as XX-XXXX-XXXX-XXXX. */
export const normalizeAbhaNumber = (raw = '') => {
  const d = String(raw).replace(/[\s-]/g, '');
  if (!d) return '';
  if (!/^\d{14}$/.test(d)) return null;
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}-${d.slice(10)}`;
};

/** ABHA address, e.g. rajesh.sharma@abdm (production) or name@sbx (sandbox). */
export const normalizeAbhaAddress = (raw = '') => {
  const s = String(raw).trim().toLowerCase();
  if (!s) return '';
  const full = s.includes('@') ? s : `${s}@abdm`;
  return /^[a-z0-9](?:[a-z0-9]|[._](?=[a-z0-9])){2,31}@(abdm|sbx)$/.test(full) ? full : null;
};

/* ------------------------------ FHIR parsing ----------------------------- */

const LOINC = 'http://loinc.org';
const codes = (cc) => (cc?.coding || []).map((c) => ({ system: c.system || '', code: String(c.code || ''), display: c.display || '' }));
const textOf = (cc) => cc?.text || cc?.coding?.find((c) => c.display)?.display || '';
const loincOf = (cc) => codes(cc).filter((c) => !c.system || c.system.includes('loinc')).map((c) => c.code);
const dateOf = (...vals) => { for (const v of vals) { const d = v && new Date(v); if (d && !Number.isNaN(d.getTime())) return d; } return null; };
const round = (v, p = 1) => Math.round(v * 10 ** p) / 10 ** p;

/** UCUM-aware unit conversion into the units ArogyaKosh stores. */
const CONVERT = {
  glucose: (v, u) => (/mmol/i.test(u) ? round(v * 18.016, 0) : v),
  chol: (v, u) => (/mmol/i.test(u) ? round(v * 38.67, 0) : v),
  tg: (v, u) => (/mmol/i.test(u) ? round(v * 88.57, 0) : v),
  creat: (v, u) => (/umol|µmol/i.test(u) ? round(v / 88.4, 2) : v),
  hb: (v, u) => (/^g\/L$/i.test(u) ? round(v / 10, 1) : v),
  temp: (v, u) => (/cel|°c|^c$/i.test(u) || (v >= 30 && v <= 45) ? round(v * 9 / 5 + 32, 1) : v),
  weight: (v, u) => (/lb/i.test(u) ? round(v * 0.45359237, 1) : /^g$/i.test(u) ? round(v / 1000, 2) : v),
  vitd: (v, u) => (/nmol/i.test(u) ? round(v / 2.496, 1) : v),
  same: (v) => v,
};

/** LOINC → vital type. Codes from loinc.org. */
const LOINC_MAP = {
  '8867-4': ['HEART_RATE', 'same'],
  '59408-5': ['SPO2', 'same'], '2708-6': ['SPO2', 'same'], '20564-1': ['SPO2', 'same'],
  '1558-6': ['SUGAR_FASTING', 'glucose'], '76629-5': ['SUGAR_FASTING', 'glucose'],
  '1521-4': ['SUGAR_PP', 'glucose'], '87422-2': ['SUGAR_PP', 'glucose'],
  '2339-0': ['SUGAR_RANDOM', 'glucose'], '2345-7': ['SUGAR_RANDOM', 'glucose'], '15074-8': ['SUGAR_RANDOM', 'glucose'],
  '4548-4': ['HBA1C', 'same'], '17856-6': ['HBA1C', 'same'], '4549-2': ['HBA1C', 'same'],
  '29463-7': ['WEIGHT', 'weight'], '3141-9': ['WEIGHT', 'weight'],
  '8310-5': ['TEMPERATURE', 'temp'], '8331-1': ['TEMPERATURE', 'temp'],
  '2093-3': ['CHOLESTEROL_TOTAL', 'chol'],
  '13457-7': ['LDL', 'chol'], '18262-6': ['LDL', 'chol'], '2089-1': ['LDL', 'chol'],
  '2085-9': ['HDL', 'chol'],
  '2571-8': ['TRIGLYCERIDES', 'tg'],
  '718-7': ['HEMOGLOBIN', 'hb'],
  '1989-3': ['VITAMIN_D', 'vitd'], '62292-8': ['VITAMIN_D', 'vitd'],
  '2132-9': ['VITAMIN_B12', 'same'],
  '3016-3': ['TSH', 'same'], '11580-8': ['TSH', 'same'],
  '2160-0': ['CREATININE', 'creat'], '38483-4': ['CREATININE', 'creat'],
};
const BP_PANEL = ['85354-9', '55284-4', '35094-2'];
const SYS = '8480-6';
const DIA = '8462-4';

/** ABDM Composition (SNOMED) types → locker category. */
const COMPOSITION_CATEGORY = {
  440545006: 'PRESCRIPTION',
  721981007: 'LAB_REPORT',
  373942005: 'DISCHARGE_SUMMARY',
  41000179103: 'VACCINATION',
  371530004: 'OTHER', // OP consultation
  419891008: 'OTHER', // health document record
};
const COMPOSITION_LABEL = { 440545006: 'Prescription', 721981007: 'Diagnostic report', 373942005: 'Discharge summary', 41000179103: 'Immunization record', 371530004: 'OP consultation', 419891008: 'Health document' };

const MIME_EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const quantity = (o) => (o?.valueQuantity && typeof o.valueQuantity.value === 'number' ? { value: o.valueQuantity.value, unit: o.valueQuantity.code || o.valueQuantity.unit || '' } : null);

export const parseBundle = (bundle) => {
  if (!bundle || bundle.resourceType !== 'Bundle' || !Array.isArray(bundle.entry)) throw ApiError.badRequest('This is not a FHIR Bundle. Choose the .json health record file shared by the hospital or your ABHA app.');
  const resources = bundle.entry.map((e) => e?.resource).filter((r) => r?.resourceType);
  const byRef = new Map();
  bundle.entry.forEach((e) => { if (e?.resource?.resourceType) { if (e.fullUrl) byRef.set(e.fullUrl, e.resource); if (e.resource.id) byRef.set(`${e.resource.resourceType}/${e.resource.id}`, e.resource); } });
  const resolve = (ref) => (ref?.reference ? byRef.get(ref.reference) || byRef.get(ref.reference.replace(/^.*\/(\w+\/[^/]+)$/, '$1')) : null);
  const of = (type) => resources.filter((r) => r.resourceType === type);

  const patientRes = of('Patient')[0];
  const nameOf = (n) => n?.text || [...(n?.given || []), n?.family].filter(Boolean).join(' ');
  const patient = patientRes ? {
    name: nameOf(patientRes.name?.[0]),
    gender: (patientRes.gender || '').toUpperCase(),
    birthDate: patientRes.birthDate || null,
    abha: (patientRes.identifier || []).map((i) => i.value).filter((v) => v && (/^\d{2}-?\d{4}-?\d{4}-?\d{4}$/.test(v) || /@(abdm|sbx)$/i.test(v))),
  } : null;

  const composition = of('Composition')[0];
  const compCode = composition && codes(composition.type).find((c) => COMPOSITION_CATEGORY[c.code])?.code;
  const facility = resolve(composition?.custodian)?.name || of('Organization')[0]?.name || '';
  const kind = compCode ? COMPOSITION_LABEL[compCode] : textOf(composition?.type) || 'Health record';
  const docDate = dateOf(composition?.date, bundle.timestamp);

  /* vitals */
  const vitals = [];
  const pendingBp = new Map(); // at → {sys, dia}
  for (const o of of('Observation')) {
    if (o.status && ['entered-in-error', 'cancelled'].includes(o.status)) continue;
    const at = dateOf(o.effectiveDateTime, o.effectivePeriod?.start, o.issued) || docDate;
    const lc = loincOf(o.code);
    if (lc.some((c) => BP_PANEL.includes(c))) {
      const comp = (code) => quantity((o.component || []).find((c) => loincOf(c.code).includes(code)));
      const s = comp(SYS); const d = comp(DIA);
      if (s && d) vitals.push({ type: 'BP', value: round(s.value, 0), value2: round(d.value, 0), at, label: textOf(o.code) || 'Blood pressure' });
      continue;
    }
    if (lc.includes(SYS) || lc.includes(DIA)) {
      const q = quantity(o); if (!q) continue;
      const k = at?.toISOString() || 'x';
      const e = pendingBp.get(k) || {};
      e[lc.includes(SYS) ? 'sys' : 'dia'] = q.value; e.at = at;
      pendingBp.set(k, e);
      continue;
    }
    const hit = lc.map((c) => LOINC_MAP[c]).find(Boolean);
    const q = quantity(o);
    if (!hit || !q) continue;
    const [type, conv] = hit;
    vitals.push({ type, value: CONVERT[conv](q.value, q.unit), at, label: textOf(o.code) || VITALS[type].label, originalUnit: q.unit });
  }
  for (const e of pendingBp.values()) if (e.sys && e.dia) vitals.push({ type: 'BP', value: round(e.sys, 0), value2: round(e.dia, 0), at: e.at, label: 'Blood pressure' });
  vitals.forEach((v) => {
    const check = validateReading(v.type, v.value, v.value2 ?? undefined);
    v.valid = check.ok; if (!check.ok) v.problem = check.message;
    if (!v.at) { v.valid = false; v.problem = 'No date on this reading'; }
  });

  /* conditions, allergies */
  const conditions = of('Condition').map((c) => ({
    name: textOf(c.code), since: dateOf(c.onsetDateTime, c.onsetPeriod?.start, c.recordedDate),
    status: (c.clinicalStatus?.coding?.[0]?.code || 'active') === 'resolved' ? 'RESOLVED' : 'ACTIVE',
  })).filter((c) => c.name);
  const allergies = of('AllergyIntolerance').map((a) => ({
    name: textOf(a.code), severity: a.criticality === 'high' ? 'SEVERE' : a.criticality === 'low' ? 'MILD' : 'MODERATE',
    reaction: (a.reaction || []).flatMap((r) => (r.manifestation || []).map(textOf)).filter(Boolean).join(', '),
  })).filter((a) => a.name);

  /* immunizations */
  const immunizations = of('Immunization').filter((i) => !i.status || i.status === 'completed').map((i) => {
    const n = i.protocolApplied?.[0]?.doseNumberPositiveInt ?? i.protocolApplied?.[0]?.doseNumberString;
    return { name: textOf(i.vaccineCode), dose: n ? `Dose ${n}` : '', date: dateOf(i.occurrenceDateTime, i.recorded), lot: i.lotNumber || '' };
  }).filter((i) => i.name && i.date);

  /* medications */
  const medications = [...of('MedicationRequest'), ...of('MedicationStatement')].map((m) => {
    const med = m.medicationCodeableConcept || resolve(m.medicationReference)?.code;
    return {
      name: textOf(med), instructions: (m.dosageInstruction || m.dosage || []).map((d) => d.text).filter(Boolean).join('; '),
      date: dateOf(m.authoredOn, m.effectiveDateTime, m.dateAsserted), prescriber: m.requester?.display || resolve(m.requester)?.name?.[0]?.text || '',
    };
  }).filter((m) => m.name);

  /* attached documents */
  const docs = [];
  const addAttachment = (att, title, category, date) => {
    if (!att?.data || !MIME_EXT[att.contentType]) return;
    const size = Math.floor((att.data.length * 3) / 4);
    if (size > 15 * 1024 * 1024) return;
    docs.push({ title: (att.title || title || kind).slice(0, 150), category, date: date || docDate, contentType: att.contentType, size, data: att.data });
  };
  const fallbackCat = compCode ? COMPOSITION_CATEGORY[compCode] : 'OTHER';
  for (const r of of('DiagnosticReport')) {
    const imaging = codes(r.category).some((c) => ['RAD', 'LP29684-5', 'IMG'].includes(c.code));
    (r.presentedForm || []).forEach((a) => addAttachment(a, textOf(r.code) || 'Diagnostic report', imaging ? 'IMAGING' : 'LAB_REPORT', dateOf(r.effectiveDateTime, r.issued)));
  }
  for (const d of of('DocumentReference')) {
    const t = textOf(d.type).toLowerCase();
    const cat = /discharge/.test(t) ? 'DISCHARGE_SUMMARY' : /prescription/.test(t) ? 'PRESCRIPTION' : /lab|report|diagnos/.test(t) ? 'LAB_REPORT' : /immuni|vaccin/.test(t) ? 'VACCINATION' : fallbackCat;
    (d.content || []).forEach((c) => addAttachment(c.attachment, d.description || textOf(d.type), cat, dateOf(d.date)));
  }
  for (const b of of('Binary')) addAttachment({ data: b.data, contentType: b.contentType }, kind, fallbackCat, docDate);

  return { patient, facility, kind, date: docDate, category: fallbackCat, vitals, conditions, allergies, immunizations, medications, documents: docs };
};

/* ------------------------------ preview/import --------------------------- */

const lower = (s) => String(s || '').trim().toLowerCase();
const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();

/** Compare bundle patient to the member so the wrong person's records aren't imported by mistake. */
const identityWarnings = (patient, member) => {
  if (!patient) return ['The file has no patient details — make sure it belongs to this person.'];
  const w = [];
  const pn = lower(patient.name).split(/\s+/)[0];
  if (pn && !lower(member.name).includes(pn)) w.push(`The record is for "${patient.name}", not ${member.name}.`);
  if (patient.gender && member.gender && !['UNKNOWN', 'OTHER'].includes(patient.gender) && patient.gender !== member.gender) w.push(`Gender in the record (${patient.gender.toLowerCase()}) differs from the profile.`);
  if (patient.birthDate && member.dob && !sameDay(patient.birthDate, member.dob) && new Date(patient.birthDate).getFullYear() !== new Date(member.dob).getFullYear()) w.push(`Date of birth in the record (${patient.birthDate}) differs from the profile.`);
  const abhas = patient.abha.map((a) => normalizeAbhaNumber(a) || normalizeAbhaAddress(a)).filter(Boolean);
  const mine = [member.abha?.number, member.abha?.address].filter(Boolean);
  if (abhas.length && mine.length && !abhas.some((a) => mine.includes(a))) w.push('The ABHA in the record does not match the one saved on this profile.');
  return w;
};

export const previewBundle = async (ownerId, member, bundle) => {
  const p = parseBundle(bundle);
  const [vitals, records, vaccines] = await Promise.all([
    Vital.find({ owner: ownerId, member: member._id, type: { $in: [...new Set(p.vitals.map((v) => v.type))] } }).select('type value value2 at'),
    Record.find({ owner: ownerId, member: member._id }).select('title date'),
    Vaccination.find({ owner: ownerId, member: member._id }).select('name dose givenDate'),
  ]);
  const vDup = (v) => vitals.some((x) => x.type === v.type && x.value === v.value && (x.value2 ?? null) === (v.value2 ?? null) && Math.abs(new Date(x.at) - new Date(v.at)) < 36e5 * 12);
  const conds = new Set(member.conditions.map((c) => lower(c.name)));
  const alls = new Set(member.allergies.map((a) => lower(a.name)));
  return {
    source: { kind: p.kind, facility: p.facility, date: p.date, patient: p.patient },
    warnings: identityWarnings(p.patient, member),
    vitals: p.vitals.map((v) => ({ ...v, unit: VITALS[v.type].unit, duplicate: vDup(v) })),
    conditions: p.conditions.map((c) => ({ ...c, duplicate: conds.has(lower(c.name)) })),
    allergies: p.allergies.map((a) => ({ ...a, duplicate: alls.has(lower(a.name)) })),
    immunizations: p.immunizations.map((i) => ({ ...i, duplicate: vaccines.some((x) => x.givenDate && sameDay(x.givenDate, i.date) && lower(x.name).includes(lower(i.name).split(/\s+/)[0])) })),
    medications: p.medications,
    documents: p.documents.map(({ data, ...d }) => ({ ...d, duplicate: records.some((r) => lower(r.title) === lower(d.title) && sameDay(r.date, d.date)) })),
  };
};

/**
 * Write the chosen parts of the bundle. Duplicates are skipped; nothing in the
 * profile is overwritten — only added.
 */
export const importBundle = async (ownerId, member, bundle, include = {}) => {
  const p = parseBundle(bundle);
  const preview = await previewBundle(ownerId, member, bundle);
  const want = (k) => include[k] !== false;
  const from = [p.kind, p.facility].filter(Boolean).join(' · ');
  const note = `Imported from ABDM health record${from ? ` (${from})` : ''}`;
  const out = { vitals: 0, conditions: 0, allergies: 0, immunizations: 0, documents: 0, medications: 0, skipped: 0 };

  if (want('vitals')) {
    for (const [i, v] of p.vitals.entries()) {
      if (!v.valid || preview.vitals[i].duplicate) { out.skipped += 1; continue; }
      await Vital.create({ owner: ownerId, member: member._id, type: v.type, value: v.value, value2: v.value2 ?? null, at: v.at, source: 'ABDM', note: note.slice(0, 300) });
      out.vitals += 1;
    }
  }
  let profileChanged = false;
  if (want('conditions')) {
    preview.conditions.filter((c) => !c.duplicate).forEach((c) => { member.conditions.push({ name: c.name, since: c.since && c.since <= new Date() ? c.since : null, status: c.status === 'RESOLVED' ? 'RESOLVED' : 'ACTIVE' }); out.conditions += 1; profileChanged = true; });
  }
  if (want('allergies')) {
    preview.allergies.filter((a) => !a.duplicate).forEach((a) => { member.allergies.push({ name: a.name, severity: a.severity, reaction: a.reaction }); out.allergies += 1; profileChanged = true; });
    if (out.allergies) member.noKnownAllergies = false;
  }
  if (profileChanged) await member.save();
  if (want('immunizations')) {
    for (const i of preview.immunizations) {
      if (i.duplicate || i.date > new Date()) { out.skipped += 1; continue; }
      const scheduled = await Vaccination.findOne({ owner: ownerId, member: member._id, givenDate: null, name: new RegExp(`^${i.name.split(/\s+/)[0].replace(/[^\w]/g, '')}`, 'i'), ...(i.dose ? { dose: i.dose } : {}) });
      if (scheduled) { scheduled.givenDate = i.date; scheduled.notes = [scheduled.notes, note].filter(Boolean).join(' — '); await scheduled.save(); } else {
        await Vaccination.create({ owner: ownerId, member: member._id, name: i.name, dose: i.dose, givenDate: i.date, dueDate: i.date, batch: i.lot, provider: p.facility, notes: note, source: 'CUSTOM' });
      }
      out.immunizations += 1;
    }
  }
  if (want('documents')) {
    const dir = path.join(UPLOAD_ROOT, String(ownerId));
    await fs.promises.mkdir(dir, { recursive: true });
    for (const [i, d] of p.documents.entries()) {
      if (preview.documents[i].duplicate) { out.skipped += 1; continue; }
      const file = path.join(dir, `${crypto.randomUUID()}${MIME_EXT[d.contentType]}`);
      const buf = Buffer.from(d.data, 'base64');
      await fs.promises.writeFile(file, buf);
      await Record.create({
        owner: ownerId, member: member._id, title: d.title, category: d.category, date: d.date && d.date <= new Date() ? d.date : new Date(),
        facility: p.facility, tags: ['ABHA'], notes: note,
        file: { key: path.relative(UPLOAD_ROOT, file).split(path.sep).join('/'), name: `${d.title.replace(/[^\w ]+/g, '').slice(0, 60) || 'record'}${MIME_EXT[d.contentType]}`, mime: d.contentType, size: buf.length },
      });
      out.documents += 1;
    }
  }
  // Medicines need a schedule the family confirms, so they arrive as a prescription note, not live reminders.
  if (want('medications') && p.medications.length) {
    const summary = p.medications.map((m) => `• ${m.name}${m.instructions ? ` — ${m.instructions}` : ''}`).join('\n');
    const title = `Medicines from ${p.facility || 'ABDM record'}`.slice(0, 150);
    if (!(await Record.exists({ owner: ownerId, member: member._id, title, date: p.date }))) {
      await Record.create({ owner: ownerId, member: member._id, title, category: 'PRESCRIPTION', date: p.date && p.date <= new Date() ? p.date : new Date(), facility: p.facility, doctor: p.medications[0].prescriber, tags: ['ABHA'], notes: note, summary, summarySource: 'USER' });
      out.medications = p.medications.length;
    }
  }
  return out;
};
