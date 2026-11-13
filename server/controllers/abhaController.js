import multer from 'multer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getOwnedMember } from '../services/memberService.js';
import { previewBundle, importBundle } from '../services/abhaService.js';
import { logActivity } from '../services/circleService.js';

/** FHIR bundles carry base64 PDFs, so they can be larger than the JSON body limit. */
export const bundleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/json/i.test(file.mimetype) || /\.json$/i.test(file.originalname)) return cb(null, true);
    return cb(ApiError.badRequest('Choose the .json FHIR record file'));
  },
}).single('file');

const readBundle = (req) => {
  if (req.file) {
    try { return JSON.parse(req.file.buffer.toString('utf8')); } catch { throw ApiError.badRequest('The file is not valid JSON'); }
  }
  if (req.body?.bundle && typeof req.body.bundle === 'object') return req.body.bundle;
  throw ApiError.badRequest('Attach the FHIR record file');
};

export const preview = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.memberId);
  const result = await previewBundle(req.ownerId, member, readBundle(req));
  return ApiResponse.success(res, 'Preview', { preview: result });
});

export const importRecords = asyncHandler(async (req, res) => {
  const member = await getOwnedMember(req.ownerId, req.params.memberId);
  let include = {};
  try { include = JSON.parse(req.body?.include || '{}'); } catch { /* default: everything */ }
  const result = await importBundle(req.ownerId, member, readBundle(req), include);
  const total = result.vitals + result.conditions + result.allergies + result.immunizations + result.documents + (result.medications ? 1 : 0);
  await logActivity(req, { type: 'ABHA_IMPORT', member: member._id, link: `/app/family/${member._id}`, text: `${req.user.name} imported ${total} item${total === 1 ? '' : 's'} from an ABDM health record for ${member.name.split(' ')[0]}` });
  return ApiResponse.success(res, `Imported ${total} item${total === 1 ? '' : 's'}`, { result });
});

/* ------------------------------ sample bundle ----------------------------- */

const ago = (days) => new Date(Date.now() - days * 86400000).toISOString();

/**
 * A synthetic FHIR R4 diagnostic-report bundle in the ABDM (NRCeS) shape,
 * addressed to this member — so the import flow can be tried end to end.
 * Clearly marked SAMPLE everywhere; values are illustrative.
 */
export const sample = asyncHandler(async (req, res) => {
  const m = await getOwnedMember(req.ownerId, req.params.memberId);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText('SAMPLE - NOT A REAL REPORT', { x: 50, y: 790, size: 18, font: bold, color: rgb(0.8, 0.1, 0.1) });
  page.drawText('Sample Diagnostics Lab - Lipid profile, HbA1c, creatinine', { x: 50, y: 760, size: 12, font });
  page.drawText(`Patient: ${m.name.replace(/[^\x20-\x7E]/g, '')}`, { x: 50, y: 740, size: 11, font });
  [['HbA1c', '7.1 %'], ['Fasting glucose', '7.4 mmol/L'], ['LDL cholesterol', '3.1 mmol/L'], ['HDL cholesterol', '1.1 mmol/L'], ['Triglycerides', '1.9 mmol/L'], ['Creatinine', '97 umol/L']]
    .forEach(([k, v], i) => { page.drawText(k, { x: 50, y: 700 - i * 20, size: 11, font }); page.drawText(v, { x: 300, y: 700 - i * 20, size: 11, font: bold }); });
  const pdfB64 = Buffer.from(await pdf.save()).toString('base64');

  const at = ago(3);
  const loinc = (code, display) => ({ coding: [{ system: 'http://loinc.org', code, display }], text: display });
  const obs = (id, code, display, value, unit, ucum) => ({ fullUrl: `Observation/${id}`, resource: { resourceType: 'Observation', id, status: 'final', code: loinc(code, display), subject: { reference: 'Patient/p1' }, effectiveDateTime: at, valueQuantity: { value, unit, system: 'http://unitsofmeasure.org', code: ucum } } });
  const bundle = {
    resourceType: 'Bundle',
    id: `sample-${Date.now()}`,
    meta: { profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'] },
    identifier: { system: 'http://hip.in', value: 'SAMPLE' },
    type: 'document',
    timestamp: at,
    entry: [
      { fullUrl: 'Composition/c1', resource: { resourceType: 'Composition', id: 'c1', status: 'final', type: { coding: [{ system: 'http://snomed.info/sct', code: '721981007', display: 'Diagnostic studies report' }], text: 'Diagnostic Report' }, subject: { reference: 'Patient/p1' }, date: at, title: 'SAMPLE diagnostic report', custodian: { reference: 'Organization/o1' }, author: [{ reference: 'Organization/o1' }] } },
      { fullUrl: 'Patient/p1', resource: { resourceType: 'Patient', id: 'p1', name: [{ text: m.name }], gender: (m.gender || 'unknown').toLowerCase(), birthDate: m.dob ? new Date(m.dob).toISOString().slice(0, 10) : undefined, identifier: m.abha?.number ? [{ system: 'https://healthid.abdm.gov.in', value: m.abha.number }] : [] } },
      { fullUrl: 'Organization/o1', resource: { resourceType: 'Organization', id: 'o1', name: 'Sample Diagnostics Lab (demo)' } },
      obs('o-hba1c', '4548-4', 'Hemoglobin A1c/Hemoglobin.total in Blood', 7.1, '%', '%'),
      obs('o-fbs', '1558-6', 'Fasting glucose [Moles/volume] in Serum or Plasma', 7.4, 'mmol/L', 'mmol/L'),
      obs('o-ldl', '13457-7', 'Cholesterol in LDL [Mass/volume] in Serum or Plasma by calculation', 3.1, 'mmol/L', 'mmol/L'),
      obs('o-hdl', '2085-9', 'Cholesterol in HDL [Mass/volume] in Serum or Plasma', 1.1, 'mmol/L', 'mmol/L'),
      obs('o-tg', '2571-8', 'Triglyceride [Mass/volume] in Serum or Plasma', 1.9, 'mmol/L', 'mmol/L'),
      obs('o-cr', '2160-0', 'Creatinine [Mass/volume] in Serum or Plasma', 97, 'umol/L', 'umol/L'),
      { fullUrl: 'Observation/o-bp', resource: { resourceType: 'Observation', id: 'o-bp', status: 'final', code: loinc('85354-9', 'Blood pressure panel'), effectiveDateTime: at, component: [
        { code: loinc('8480-6', 'Systolic blood pressure'), valueQuantity: { value: 138, unit: 'mmHg', code: 'mm[Hg]' } },
        { code: loinc('8462-4', 'Diastolic blood pressure'), valueQuantity: { value: 86, unit: 'mmHg', code: 'mm[Hg]' } },
      ] } },
      { fullUrl: 'Condition/cn1', resource: { resourceType: 'Condition', id: 'cn1', clinicalStatus: { coding: [{ code: 'active' }] }, code: { text: 'Dyslipidaemia' }, onsetDateTime: at, subject: { reference: 'Patient/p1' } } },
      { fullUrl: 'Immunization/i1', resource: { resourceType: 'Immunization', id: 'i1', status: 'completed', vaccineCode: { text: 'Influenza vaccine' }, occurrenceDateTime: ago(40), lotNumber: 'SAMPLE-001', patient: { reference: 'Patient/p1' } } },
      { fullUrl: 'MedicationRequest/mr1', resource: { resourceType: 'MedicationRequest', id: 'mr1', status: 'active', intent: 'order', medicationCodeableConcept: { text: 'Rosuvastatin 10 mg tablet' }, dosageInstruction: [{ text: 'One tablet at night after food' }], authoredOn: at, requester: { display: 'Dr. Sample Physician' } } },
      { fullUrl: 'DiagnosticReport/dr1', resource: { resourceType: 'DiagnosticReport', id: 'dr1', status: 'final', code: { text: 'SAMPLE lipid profile and HbA1c' }, effectiveDateTime: at, presentedForm: [{ contentType: 'application/pdf', title: 'SAMPLE lipid profile and HbA1c', data: pdfB64 }] } },
    ],
  };
  res.setHeader('Content-Disposition', `attachment; filename="sample-abdm-record-${m.name.split(' ')[0].toLowerCase()}.json"`);
  return res.json(bundle);
});
