import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Record from '../models/Record.js';
import { getOwnedMember } from './memberService.js';
import { buildBrief } from './briefService.js';
import { resolveUpload } from '../middleware/upload.js';

/**
 * Cashless hospital-admission kit.
 *
 * At admission, the hospital's insurance (TPA) desk fills the IRDAI standard
 * pre-authorisation request. The patient side needs: patient identity and
 * contact, the insurer / TPA and insured card ID, policy number, photo ID,
 * and supporting medical documents. This service checks what the family has
 * on file and produces one merged PDF in that order.
 */

const ID_LABEL = { AADHAAR: 'Aadhaar', PAN: 'PAN', PASSPORT: 'Passport', VOTER_ID: 'Voter ID', DRIVING_LICENCE: 'Driving licence' };
const DAY = 86400000;

const activePolicy = (member) => {
  const now = Date.now();
  const list = (member.insurance || []).map((p) => (p.toObject ? p.toObject() : p));
  return list.find((p) => !p.validTill || new Date(p.validTill).getTime() >= now - DAY) || list[0] || null;
};

const latest = (records, cat) => records.find((r) => r.category === cat) || null;

/** Pick the documents an insurance desk normally asks for. */
const suggestDocs = (records) => {
  const sixMonths = Date.now() - 183 * DAY;
  const picks = [
    latest(records, 'INSURANCE'),
    latest(records, 'ID_PROOF'),
    latest(records, 'DISCHARGE_SUMMARY'),
    latest(records, 'PRESCRIPTION'),
    ...records.filter((r) => ['LAB_REPORT', 'IMAGING'].includes(r.category) && new Date(r.date).getTime() >= sixMonths).slice(0, 4),
  ].filter(Boolean);
  return new Set(picks.map((r) => String(r._id)));
};

export const admissionKit = async (ownerId, memberId) => {
  const member = await getOwnedMember(ownerId, memberId);
  const records = await Record.find({ owner: ownerId, member: member._id, 'file.key': { $ne: null } }).sort({ date: -1 }).limit(60);
  const policy = activePolicy(member);
  const suggested = suggestDocs(records);
  const has = (cat) => records.some((r) => r.category === cat);
  const policyValid = policy && (!policy.validTill || new Date(policy.validTill).getTime() >= Date.now() - DAY);
  const recentReports = records.filter((r) => ['LAB_REPORT', 'IMAGING', 'DISCHARGE_SUMMARY'].includes(r.category) && new Date(r.date).getTime() >= Date.now() - 183 * DAY).length;

  const checklist = [
    { key: 'policy', label: 'Insurer and policy number', ok: Boolean(policy?.provider && policy?.policyNumber), fix: 'profile:care', hint: 'Add the policy under Insurance in the profile.' },
    { key: 'cardId', label: 'Insured / member ID from the e-card', ok: Boolean(policy?.cardId), fix: 'profile:care', hint: 'The ID printed on the health card — the TPA desk looks the patient up with it.' },
    { key: 'tpa', label: 'TPA name (if the insurer uses one)', ok: Boolean(policy?.tpa), optional: true, fix: 'profile:care', hint: 'e.g. Medi Assist, Paramount, Vidal. Skip if the insurer settles claims in-house.' },
    { key: 'valid', label: 'Policy is in force', ok: Boolean(policyValid), fix: 'profile:care', hint: policy?.validTill ? 'The policy end date has passed — renew or update it.' : 'Add the policy end date.' },
    { key: 'ecard', label: 'Copy of the insurance e-card / policy', ok: has('INSURANCE'), fix: 'upload:INSURANCE', hint: 'Upload a photo or PDF of the health card to the locker.' },
    { key: 'idProof', label: 'Photo ID proof', ok: has('ID_PROOF'), fix: 'upload:ID_PROOF', hint: 'Upload Aadhaar, PAN, passport or another government photo ID.' },
    { key: 'contact', label: 'Patient phone and address', ok: Boolean(member.phone && member.address), fix: 'profile:basics', hint: 'Needed on the pre-authorisation form.' },
    { key: 'dob', label: 'Date of birth', ok: Boolean(member.dob), fix: 'profile:basics' },
    { key: 'reports', label: 'Recent reports (last 6 months)', ok: recentReports > 0, optional: true, fix: 'upload:LAB_REPORT', hint: 'Lab results, scans or discharge summaries support the claim.' },
  ];

  return {
    member: { _id: member._id, name: member.name, color: member.color, age: member.age },
    policy,
    idProof: member.idProof?.type ? { type: member.idProof.type, label: ID_LABEL[member.idProof.type], last4: member.idProof.last4 } : null,
    checklist,
    ready: checklist.filter((c) => !c.optional).every((c) => c.ok),
    documents: records.map((r) => ({
      _id: r._id, title: r.title, category: r.category, date: r.date, mime: r.file.mime, size: r.file.size,
      suggested: suggested.has(String(r._id)),
      embeddable: /pdf|jpe?g|png/i.test(r.file.mime || ''),
    })),
  };
};

/* ---------------------------------- PDF ---------------------------------- */

// Standard PDF fonts only cover Latin-1; map common symbols and drop the rest.
const SAFE = { '₹': 'Rs.', '—': '-', '–': '-', '·': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '≥': '>=', '≤': '<=', '•': '-', '…': '...', '→': '->', '×': 'x' };
const clean = (s) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, (c) => SAFE[c] ?? '');
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const inr = (n) => (n ? `Rs. ${Number(n).toLocaleString('en-IN')}` : '');

class Writer {
  constructor(pdf, fonts) {
    this.pdf = pdf; this.f = fonts; this.page = null; this.y = 0;
    this.W = 595.28; this.H = 841.89; this.M = 44;
  }
  newPage() { this.page = this.pdf.addPage([this.W, this.H]); this.y = this.H - this.M; }
  ensure(h) { if (!this.page || this.y - h < this.M + 20) this.newPage(); }
  wrap(text, size, font, width) {
    const words = clean(text).split(/\s+/); const lines = []; let line = '';
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
  text(str, { size = 10, bold = false, color = rgb(0.1, 0.13, 0.2), x = this.M, width = this.W - 2 * this.M, gap = 3 } = {}) {
    const font = bold ? this.f.bold : this.f.reg;
    for (const l of this.wrap(str, size, font, width)) {
      this.ensure(size + gap);
      this.page.drawText(l, { x, y: this.y - size, size, font, color });
      this.y -= size + gap;
    }
  }
  heading(str) {
    this.ensure(34); this.y -= 10;
    this.page.drawRectangle({ x: this.M, y: this.y - 18, width: this.W - 2 * this.M, height: 20, color: rgb(0.93, 0.96, 0.97) });
    this.page.drawText(clean(str).toUpperCase(), { x: this.M + 8, y: this.y - 13, size: 9, font: this.f.bold, color: rgb(0.04, 0.13, 0.22) });
    this.y -= 26;
  }
  /** Two-column label/value grid like a paper form. */
  fields(rows) {
    const colW = (this.W - 2 * this.M) / 2;
    for (let i = 0; i < rows.length; i += 2) {
      const pair = rows.slice(i, i + 2);
      const heights = pair.map(([, v]) => this.wrap(v || '—', 10, this.f.reg, colW - 12).length);
      const h = 12 + Math.max(...heights) * 13;
      this.ensure(h + 4);
      pair.forEach(([label, value], j) => {
        const x = this.M + j * colW;
        this.page.drawText(clean(label), { x, y: this.y - 8, size: 7.5, font: this.f.bold, color: rgb(0.45, 0.52, 0.6) });
        this.wrap(value || '—', 10, this.f.reg, colW - 12).forEach((l, k) => {
          this.page.drawText(l, { x, y: this.y - 21 - k * 13, size: 10, font: this.f.reg, color: value ? rgb(0.1, 0.13, 0.2) : rgb(0.7, 0.72, 0.75) });
        });
      });
      this.y -= h + 4;
    }
  }
  bullets(items, empty = 'None recorded') {
    if (!items.length) return this.text(empty, { color: rgb(0.45, 0.5, 0.55) });
    items.forEach((t) => this.text(`- ${t}`, { x: this.M + 4, width: this.W - 2 * this.M - 4 }));
  }
}

export const admissionPdf = async (ownerId, memberId, recordIds = []) => {
  const member = await getOwnedMember(ownerId, memberId);
  const [brief, kit] = await Promise.all([buildBrief(member), admissionKit(ownerId, memberId)]);
  const policy = kit.policy || {};
  const ids = recordIds.length ? recordIds.map(String) : kit.documents.filter((d) => d.suggested).map((d) => String(d._id));
  const records = ids.length ? await Record.find({ owner: ownerId, member: member._id, _id: { $in: ids } }) : [];
  const ordered = ids.map((id) => records.find((r) => String(r._id) === id)).filter(Boolean);

  const pdf = await PDFDocument.create();
  pdf.setTitle(clean(`Admission kit - ${member.name}`));
  pdf.setCreator('ArogyaKosh');
  const w = new Writer(pdf, { reg: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) });

  w.newPage();
  w.text('CASHLESS HOSPITALISATION - PATIENT DETAILS', { size: 15, bold: true });
  w.text(`Prepared ${date(new Date())} from records kept by the family in ArogyaKosh. Laid out to match the patient section of the IRDAI standard pre-authorisation request; the hospital completes the treatment and cost sections.`, { size: 8.5, color: rgb(0.4, 0.46, 0.52) });

  w.heading('Patient');
  const id = kit.idProof ? `${kit.idProof.label}${kit.idProof.last4 ? ` ending ${kit.idProof.last4}` : ''} (copy attached if available)` : '';
  w.fields([
    ['NAME', member.name], ['GENDER', member.gender ? member.gender[0] + member.gender.slice(1).toLowerCase() : ''],
    ['DATE OF BIRTH', date(member.dob)], ['AGE', member.age !== null && member.age !== undefined ? `${member.age} years` : ''],
    ['CONTACT NUMBER', member.phone], ['OCCUPATION', member.occupation],
    ['ADDRESS', member.address], ['PHOTO ID', id],
  ]);

  w.heading('Insurance');
  w.fields([
    ['INSURER / PLAN', policy.provider], ['POLICY NUMBER', policy.policyNumber],
    ['INSURED / MEMBER ID (E-CARD)', policy.cardId], ['TPA', policy.tpa],
    ['POLICY HOLDER', policy.policyHolder], ['EMPLOYEE ID (CORPORATE)', policy.employeeId],
    ['SUM INSURED', inr(policy.sumInsured)], ['VALID TILL', date(policy.validTill)],
    ['CLAIMS HELPLINE', policy.helpline], ['OTHER POLICIES', (member.insurance || []).length > 1 ? member.insurance.filter((p) => p.policyNumber !== policy.policyNumber).map((p) => `${p.provider} ${p.policyNumber}`).join('; ') : 'None'],
  ]);

  w.heading('Family physician and emergency contact');
  const ec = member.emergencyContacts?.[0];
  w.fields([
    ['FAMILY PHYSICIAN', [member.doctor?.name, member.doctor?.specialty].filter(Boolean).join(', ')],
    ['PHYSICIAN CONTACT', [member.doctor?.phone, member.doctor?.clinic].filter(Boolean).join(', ')],
    ['EMERGENCY CONTACT', ec ? `${ec.name}${ec.relation ? ` (${ec.relation})` : ''}` : ''], ['CONTACT NUMBER', ec?.phone],
  ]);

  w.heading('Medical summary for the treating doctor');
  w.fields([['BLOOD GROUP', member.bloodGroup], ['HEIGHT / WEIGHT', [member.heightCm && `${member.heightCm} cm`, member.weightKg && `${member.weightKg} kg`].filter(Boolean).join(' / ')]]);
  w.text('Allergies', { bold: true, size: 9.5 });
  w.bullets(brief.allergies.map((a) => `${a.name} (${a.severity.toLowerCase()})${a.reaction ? ` - ${a.reaction}` : ''}`), brief.noKnownAllergies ? 'No known allergies' : 'Not recorded');
  w.text('Known conditions (relevant to pre-existing disease disclosure)', { bold: true, size: 9.5 });
  w.bullets(brief.conditions.map((c) => `${c.name}${c.since ? ` - since ${date(c.since)}` : ''}${c.status && c.status !== 'ACTIVE' ? ` (${c.status.toLowerCase()})` : ''}`));
  w.text('Current medicines', { bold: true, size: 9.5 });
  w.bullets(brief.medicines.map((m) => `${m.name} - ${m.schedule}${m.reason ? ` (for ${m.reason})` : ''}`));
  if (brief.vitals.length) {
    w.text('Latest readings', { bold: true, size: 9.5 });
    w.bullets(brief.vitals.map((v) => `${v.label}: ${v.value} on ${date(v.at)}`));
  }
  if (brief.flags.length) {
    w.text('Flags', { bold: true, size: 9.5, color: rgb(0.7, 0.13, 0.12) });
    w.bullets(brief.flags);
  }

  w.heading('Documents attached');
  w.bullets(ordered.map((r, i) => `${i + 1}. ${r.title} - ${date(r.date)}`), 'No documents attached');
  w.y -= 6;
  w.text('Information is entered by the patient\'s family and is not a medical certificate. Verify against original documents.', { size: 7.5, color: rgb(0.5, 0.55, 0.6) });

  // Attach documents.
  const skipped = [];
  for (const r of ordered) {
    let bytes;
    try { bytes = await fs.promises.readFile(resolveUpload(r.file.key)); } catch { skipped.push(r.title); continue; }
    const mime = r.file.mime || '';
    try {
      if (/pdf/i.test(mime)) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await pdf.copyPages(src, src.getPageIndices());
        pages.forEach((p) => pdf.addPage(p));
      } else if (/jpe?g|png/i.test(mime)) {
        const img = /png/i.test(mime) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const page = pdf.addPage([w.W, w.H]);
        page.drawText(clean(`${r.title} - ${date(r.date)}`), { x: w.M, y: w.H - w.M, size: 10, font: w.f.bold });
        const maxW = w.W - 2 * w.M; const maxH = w.H - 2 * w.M - 24;
        const s = Math.min(maxW / img.width, maxH / img.height, 1.5);
        page.drawImage(img, { x: w.M + (maxW - img.width * s) / 2, y: w.H - w.M - 20 - img.height * s, width: img.width * s, height: img.height * s });
      } else skipped.push(r.title);
    } catch { skipped.push(r.title); }
  }

  const bytes = await pdf.save();
  return { bytes: Buffer.from(bytes), skipped, filename: `admission-kit-${member.name.split(' ')[0].toLowerCase()}.pdf` };
};
