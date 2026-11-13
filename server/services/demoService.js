import crypto from 'crypto';
import User from '../models/User.js';
import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import DoseLog from '../models/DoseLog.js';
import Vital from '../models/Vital.js';
import Record from '../models/Record.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';
import Expense from '../models/Expense.js';
import { generateSchedule } from './vaccineService.js';
import { isScheduledOn } from './medicineService.js';
import { addDays, toDateKey } from '../utils/helpers.js';

/** Small deterministic PRNG so demo data looks organic but stable. */
const rng = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const ago = (days, h = 9, m = 0) => {
  const d = addDays(new Date(), -days);
  d.setHours(h, m, 0, 0);
  return d;
};
const ahead = (days, h = 10, m = 30) => ago(-days, h, m);
const yearsAgo = (y, extraDays = 0) => addDays(new Date(new Date().setFullYear(new Date().getFullYear() - y)), -extraDays);

/**
 * Creates a fully-populated sandbox household so people can try every
 * feature in one click. Demo accounts are purged automatically after 24h.
 */
export const createDemoAccount = async () => {
  const rand = rng(Date.now() % 100000 + 7);
  const user = await User.create({
    name: 'Aarav Sharma',
    email: `demo-${crypto.randomBytes(5).toString('hex')}@demo.arogyakosh.app`,
    password: crypto.randomBytes(24).toString('hex'),
    isEmailVerified: true,
    isDemo: true,
    city: 'Pune',
    prefs: { emailDigest: false, onboarded: true },
    firstAidKit: ['bandages', 'gauze', 'antiseptic', 'thermometer', 'paracetamol', 'scissors', 'ors', 'bp_monitor', 'glucometer']
      .map((key) => ({ key, have: true, expiry: key === 'ors' ? ahead(20) : null })),
  });
  const owner = user._id;

  const [self, spouse, father, mother, daughter] = await Member.create([
    {
      owner, isSelf: true, name: 'Aarav Sharma', relation: 'SELF', dob: yearsAgo(34, 40), gender: 'MALE', bloodGroup: 'B+',
      heightCm: 176, weightKg: 79, waistCm: 94, phone: '+91 98200 11223', noKnownAllergies: true, color: 'lime',
      lifestyle: { smoking: 'NEVER', alcohol: 'OCCASIONAL', activity: 'LIGHT', diet: 'EGGETARIAN', sleepHours: 6.5 },
      doctor: { name: 'Dr. Kavita Rao', specialty: 'General Physician', phone: '+91 20 2567 8899', clinic: 'Rao Family Clinic, Baner' },
      insurance: [{ provider: 'HDFC ERGO Optima Secure', policyNumber: 'HE-55102931', sumInsured: 1000000, validTill: ahead(210), helpline: '1800 2666 400' }],
      emergencyContacts: [{ name: 'Meera Sharma', relation: 'Wife', phone: '+91 98200 44556' }],
    },
    {
      owner, name: 'Meera Sharma', relation: 'SPOUSE', dob: yearsAgo(31, 120), gender: 'FEMALE', bloodGroup: 'O+', heightCm: 162, weightKg: 58, waistCm: 76, color: 'peach',
      allergies: [{ name: 'Penicillin', severity: 'SEVERE', reaction: 'Hives, throat swelling' }],
      lifestyle: { smoking: 'NEVER', alcohol: 'NEVER', activity: 'MODERATE', diet: 'VEGETARIAN', sleepHours: 7 },
      doctor: { name: 'Dr. Kavita Rao', specialty: 'General Physician', phone: '+91 20 2567 8899' },
      insurance: [{ provider: 'HDFC ERGO Optima Secure', policyNumber: 'HE-55102931', sumInsured: 1000000, validTill: ahead(210) }],
      emergencyContacts: [{ name: 'Aarav Sharma', relation: 'Husband', phone: '+91 98200 11223' }],
    },
    {
      owner, name: 'Rajesh Sharma', relation: 'FATHER', dob: yearsAgo(66, 200), gender: 'MALE', bloodGroup: 'B+', heightCm: 170, weightKg: 81, waistCm: 101, color: 'sky',
      noKnownAllergies: true,
      conditions: [{ name: 'Type 2 diabetes', since: yearsAgo(9), status: 'MANAGED' }, { name: 'Hypertension', since: yearsAgo(6), status: 'ACTIVE' }],
      lifestyle: { smoking: 'FORMER', alcohol: 'NEVER', activity: 'LIGHT', diet: 'VEGETARIAN', sleepHours: 6 },
      doctor: { name: 'Dr. Suresh Menon', specialty: 'Cardiologist', phone: '+91 20 6645 1200', clinic: 'Jehangir Hospital' },
      insurance: [{ provider: 'Star Health Senior Citizens Red Carpet', policyNumber: 'SH-88213410', sumInsured: 500000, validTill: ahead(18), helpline: '1800 425 2255' }],
      emergencyContacts: [{ name: 'Aarav Sharma', relation: 'Son', phone: '+91 98200 11223' }, { name: 'Sunita Sharma', relation: 'Wife', phone: '+91 98200 77881' }],
      notes: 'Uses a walking stick on stairs. Prefers Hindi.',
    },
    {
      owner, name: 'Sunita Sharma', relation: 'MOTHER', dob: yearsAgo(61, 30), gender: 'FEMALE', bloodGroup: 'A+', heightCm: 155, weightKg: 64, waistCm: 86, color: 'lilac',
      allergies: [{ name: 'Sulfa drugs', severity: 'MODERATE', reaction: 'Skin rash' }],
      conditions: [{ name: 'Hypothyroidism', since: yearsAgo(12), status: 'MANAGED' }],
      lifestyle: { smoking: 'NEVER', alcohol: 'NEVER', activity: 'MODERATE', diet: 'VEGETARIAN', sleepHours: 7.5 },
      emergencyContacts: [{ name: 'Aarav Sharma', relation: 'Son', phone: '+91 98200 11223' }],
    },
    {
      owner, name: 'Anaya Sharma', relation: 'DAUGHTER', dob: addDays(new Date(), -425), gender: 'FEMALE', bloodGroup: 'O+', heightCm: 76, weightKg: 9.6, color: 'mint',
      noKnownAllergies: true,
      doctor: { name: 'Dr. Neha Kulkarni', specialty: 'Paediatrician', phone: '+91 20 2588 4411', clinic: 'Little Steps Child Clinic' },
      emergencyContacts: [{ name: 'Meera Sharma', relation: 'Mother', phone: '+91 98200 44556' }],
    },
  ]);

  const meds = await Medicine.create([
    { owner, member: father._id, name: 'Glycomet', strength: '500 mg', form: 'TABLET', times: ['08:30', '20:30'], mealTiming: 'AFTER_FOOD', stock: 9, refillAt: 10, startDate: ago(400), prescribedBy: 'Dr. Suresh Menon', reason: 'Diabetes', expiryDate: ahead(240) },
    { owner, member: father._id, name: 'Telma', strength: '40 mg', form: 'TABLET', times: ['08:30'], mealTiming: 'ANY', stock: 24, startDate: ago(300), prescribedBy: 'Dr. Suresh Menon', reason: 'Blood pressure', expiryDate: ahead(300) },
    { owner, member: father._id, name: 'Atorva', strength: '10 mg', form: 'TABLET', times: ['21:30'], mealTiming: 'AFTER_FOOD', stock: 18, startDate: ago(300), prescribedBy: 'Dr. Suresh Menon', reason: 'Cholesterol', expiryDate: ahead(25) },
    { owner, member: father._id, name: 'Ecosprin', strength: '75 mg', form: 'TABLET', times: ['14:00'], mealTiming: 'AFTER_FOOD', stock: 40, startDate: ago(300), prescribedBy: 'Dr. Suresh Menon', reason: 'Heart protection' },
    { owner, member: mother._id, name: 'Thyronorm', strength: '50 mcg', form: 'TABLET', times: ['06:30'], mealTiming: 'EMPTY_STOMACH', stock: 52, startDate: ago(900), reason: 'Thyroid', expiryDate: ahead(400) },
    { owner, member: mother._id, name: 'Shelcal', strength: '500 mg', form: 'TABLET', times: ['14:00'], mealTiming: 'AFTER_FOOD', stock: 4, refillAt: 5, startDate: ago(200), reason: 'Bone health' },
    { owner, member: spouse._id, name: 'Livogen', strength: '', form: 'TABLET', times: ['13:30'], mealTiming: 'AFTER_FOOD', stock: 20, startDate: ago(60), endDate: ahead(30), reason: 'Iron supplement' },
    { owner, member: self._id, name: 'Vitamin D3 60K', strength: '60000 IU', form: 'CAPSULE', times: ['09:00'], daysOfWeek: [0], mealTiming: 'WITH_FOOD', stock: 3, refillAt: 1, startDate: ago(50), endDate: ahead(30), reason: 'Low vitamin D' },
  ]);

  // Dose history for the last 60 days with realistic adherence.
  const logs = [];
  const nowKey = toDateKey(new Date());
  const nowHm = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  for (let d = 60; d >= 0; d -= 1) {
    const day = addDays(new Date(), -d);
    const key = toDateKey(day);
    for (const med of meds) {
      if (!isScheduledOn(med, day)) continue;
      for (const t of med.times) {
        if (key === nowKey && t > nowHm) continue;
        if (key === nowKey && rand() < 0.5) continue;
        const r = rand();
        // Papa's evening Glycomet is the realistic weak spot: often forgotten, worst on weekends.
        const weekend = [0, 6].includes(day.getDay());
        const eveningGlycomet = med.name === 'Glycomet' && t === '20:30';
        const takenRate = eveningGlycomet ? (weekend ? 0.4 : 0.68) : med.member.equals(father._id) ? 0.9 : 0.94;
        if (r < takenRate) logs.push({ owner, member: med.member, medicine: med._id, date: key, time: t, status: 'TAKEN' });
        else if (r < takenRate + 0.04) logs.push({ owner, member: med.member, medicine: med._id, date: key, time: t, status: 'SKIPPED' });
      }
    }
  }
  await DoseLog.insertMany(logs);

  const vitals = [];
  for (let i = 0; i < 12; i += 1) {
    const day = 60 - i * 5;
    vitals.push({ owner, member: father._id, type: 'BP', value: Math.round(152 - i * 1.3 + rand() * 6), value2: Math.round(94 - i * 0.6 + rand() * 4), at: ago(day, 8, 10) });
    if (i % 2 === 0) vitals.push({ owner, member: father._id, type: 'SUGAR_FASTING', value: Math.round(146 - i * 2 + rand() * 8), at: ago(day, 7, 30) });
    if (i % 3 === 0) vitals.push({ owner, member: father._id, type: 'WEIGHT', value: Math.round((83 - i * 0.2 + rand()) * 10) / 10, at: ago(day, 7, 0) });
  }
  vitals.push(
    { owner, member: father._id, type: 'BP', value: 146, value2: 92, at: ago(1, 8, 5), note: 'Felt slightly dizzy in the morning' },
    { owner, member: father._id, type: 'HBA1C', value: 7.4, at: ago(75) },
    { owner, member: father._id, type: 'HBA1C', value: 7.1, at: ago(12) },
    { owner, member: father._id, type: 'LDL', value: 128, at: ago(12) },
    { owner, member: father._id, type: 'CHOLESTEROL_TOTAL', value: 212, at: ago(12) },
    { owner, member: father._id, type: 'CREATININE', value: 1.1, at: ago(12) },
    { owner, member: father._id, type: 'HDL', value: 38, at: ago(12) },
    { owner, member: father._id, type: 'TRIGLYCERIDES', value: 182, at: ago(12) },
    { owner, member: mother._id, type: 'TSH', value: 6.4, at: ago(330) },
    { owner, member: mother._id, type: 'TSH', value: 4.6, at: ago(90) },
    { owner, member: mother._id, type: 'TSH', value: 5.2, at: ago(150) },
    { owner, member: mother._id, type: 'TSH', value: 3.1, at: ago(20) },
    { owner, member: mother._id, type: 'BP', value: 124, value2: 80, at: ago(6) },
    { owner, member: mother._id, type: 'VITAMIN_D', value: 24, at: ago(20) },
    { owner, member: self._id, type: 'BP', value: 118, value2: 78, at: ago(30) },
    { owner, member: self._id, type: 'BP', value: 122, value2: 79, at: ago(4) },
    ...[[175, 76.2], [140, 77.0], [110, 77.6], [80, 78.3], [50, 78.9], [20, 79.4], [3, 79.8]].map(([d, v]) => ({ owner, member: self._id, type: 'WEIGHT', value: v, at: ago(d, 7, 15) })),
    ...[[170, 91], [140, 93], [112, 95], [84, 97], [56, 99], [28, 101], [6, 103]].map(([d, v]) => ({ owner, member: self._id, type: 'SUGAR_FASTING', value: v, at: ago(d, 7, 40) })),
    { owner, member: self._id, type: 'HDL', value: 42, at: ago(120) },
    { owner, member: self._id, type: 'CHOLESTEROL_TOTAL', value: 196, at: ago(120) },
    { owner, member: self._id, type: 'VITAMIN_D', value: 17, at: ago(55) },
    { owner, member: self._id, type: 'LDL', value: 112, at: ago(120) },
    { owner, member: spouse._id, type: 'HEMOGLOBIN', value: 10.8, at: ago(62) },
    { owner, member: spouse._id, type: 'HEMOGLOBIN', value: 11.9, at: ago(8) },
    { owner, member: daughter._id, type: 'WEIGHT', value: 9.6, at: ago(10) },
    { owner, member: daughter._id, type: 'TEMPERATURE', value: 99.1, at: ago(2) },
  );
  await Vital.create(vitals);

  await Record.create([
    { owner, member: father._id, title: 'Lipid profile & HbA1c', category: 'LAB_REPORT', date: ago(12), facility: 'Metropolis Labs', doctor: 'Dr. Suresh Menon', tags: ['diabetes', 'cholesterol'], summary: 'HbA1c 7.1% (improved from 7.4%). LDL 128 mg/dL is above target for a diabetic; total cholesterol 212 mg/dL borderline. Creatinine normal.' },
    { owner, member: father._id, title: 'Cardiology prescription', category: 'PRESCRIPTION', date: ago(40), doctor: 'Dr. Suresh Menon', facility: 'Jehangir Hospital', tags: ['bp'], summary: 'Continue Telma 40, Glycomet 500 BD, Atorva 10 at night, Ecosprin 75. Review in 6 weeks with BP log.' },
    { owner, member: father._id, title: 'ECG report', category: 'IMAGING', date: ago(40), facility: 'Jehangir Hospital', summary: 'Normal sinus rhythm. No acute changes.' },
    { owner, member: mother._id, title: 'Thyroid profile', category: 'LAB_REPORT', date: ago(20), facility: 'Thyrocare', tags: ['thyroid'], summary: 'TSH 3.1 mIU/L — back in range on current dose. Vitamin D 24 ng/mL (insufficient).' },
    { owner, member: spouse._id, title: 'CBC — haemoglobin follow-up', category: 'LAB_REPORT', date: ago(8), facility: 'Dr Lal PathLabs', summary: 'Haemoglobin 11.9 g/dL, improving from 10.8 after iron supplementation.' },
    { owner, member: daughter._id, title: 'Vaccination card (photo)', category: 'VACCINATION', date: ago(60), facility: 'Little Steps Child Clinic' },
    { owner, member: self._id, title: 'Annual health checkup', category: 'LAB_REPORT', date: ago(120), facility: 'Apollo Clinic', tags: ['annual'], summary: 'All parameters normal except Vitamin D (17 ng/mL, deficient) and LDL 112 (borderline).' },
    { owner, member: self._id, title: 'Health insurance policy', category: 'INSURANCE', date: ago(155), tags: ['policy'] },
  ]);

  await Reminder.create([
    { owner, member: father._id, type: 'APPOINTMENT', title: 'Cardiology follow-up', dueAt: ahead(5, 11, 0), doctor: 'Dr. Suresh Menon', location: 'Jehangir Hospital, OPD 3', notes: 'Carry BP log and latest lipid report.' },
    { owner, member: father._id, type: 'EYE', title: 'Diabetic eye (retina) check', dueAt: ago(3, 16, 0), doctor: 'Dr. Anil Joshi', location: 'Vision Eye Centre', repeat: 'YEARLY' },
    { owner, member: mother._id, type: 'LAB_TEST', title: 'Thyroid profile (TSH)', dueAt: ahead(12, 8, 0), location: 'Thyrocare home collection', repeat: 'HALF_YEARLY' },
    { owner, member: spouse._id, type: 'DENTAL', title: 'Dental cleaning', dueAt: ahead(19, 17, 30), location: 'Smile Studio, Aundh', repeat: 'HALF_YEARLY' },
    { owner, member: daughter._id, type: 'CHECKUP', title: 'Paediatric growth check', dueAt: ahead(9, 10, 0), doctor: 'Dr. Neha Kulkarni', location: 'Little Steps Child Clinic' },
    { owner, member: self._id, type: 'CHECKUP', title: 'Annual health checkup', dueAt: ago(120, 8, 0), status: 'DONE', completedAt: ago(120), repeat: 'NONE' },
    { owner, member: self._id, type: 'CHECKUP', title: 'Annual health checkup', dueAt: ahead(245, 8, 0), repeat: 'YEARLY' },
    { owner, member: father._id, type: 'LAB_TEST', title: 'HbA1c + lipid profile', dueAt: ago(12, 8, 0), status: 'DONE', completedAt: ago(12), repeat: 'QUARTERLY' },
  ]);

  // Vaccines: full schedule for the toddler, mark the past ones as given except one.
  const kid = await Member.findById(daughter._id);
  await generateSchedule(owner, kid);
  const kidVaccines = await Vaccination.find({ member: daughter._id });
  const today = new Date();
  await Promise.all(kidVaccines.map((v) => {
    const overdueOnPurpose = v.name === 'Hepatitis A' && v.dose === 'Dose 1';
    if (v.dueDate < today && !overdueOnPurpose) {
      v.givenDate = addDays(v.dueDate, Math.floor(rand() * 4));
      v.provider = 'Little Steps Child Clinic';
      return v.save();
    }
    return null;
  }));
  await Vaccination.create([
    { owner, member: father._id, name: 'Influenza', dose: 'Annual', dueDate: ahead(14), notes: 'Yearly, before winter', source: 'SCHEDULE' },
    { owner, member: father._id, name: 'Pneumococcal (PCV20)', dose: 'Single dose', givenDate: ago(300), dueDate: ago(300), source: 'SCHEDULE' },
    { owner, member: mother._id, name: 'Influenza', dose: 'Annual', dueDate: ahead(14), source: 'SCHEDULE' },
    { owner, member: self._id, name: 'Td / Tdap', dose: 'Booster', givenDate: yearsAgo(4), dueDate: yearsAgo(4), source: 'SCHEDULE' },
  ]);

  const expenses = [
    ['CONSULTATION', 1200, 40, 'Dr. Suresh Menon', father._id, 'UPI', true],
    ['LAB_TESTS', 2350, 12, 'Metropolis Labs', father._id, 'CARD', true],
    ['MEDICINES', 1840, 35, 'Apollo Pharmacy', father._id, 'UPI', false],
    ['MEDICINES', 1790, 5, 'Apollo Pharmacy', father._id, 'UPI', false],
    ['LAB_TESTS', 890, 20, 'Thyrocare', mother._id, 'UPI', true],
    ['MEDICINES', 420, 22, 'MedPlus', mother._id, 'CASH', false],
    ['CONSULTATION', 800, 60, 'Little Steps Child Clinic', daughter._id, 'UPI', false],
    ['CONSULTATION', 2100, 60, 'Vaccine — Hep B + PCV', daughter._id, 'CARD', false],
    ['LAB_TESTS', 650, 8, 'Dr Lal PathLabs', spouse._id, 'UPI', false],
    ['INSURANCE_PREMIUM', 32400, 155, 'HDFC ERGO', self._id, 'NET_BANKING', true],
    ['INSURANCE_PREMIUM', 41800, 95, 'Star Health', father._id, 'NET_BANKING', true],
    ['LAB_TESTS', 3499, 120, 'Apollo Clinic — annual checkup', self._id, 'CARD', true],
    ['DENTAL', 1500, 80, 'Smile Studio', spouse._id, 'UPI', false],
    ['EQUIPMENT', 2299, 70, 'Omron BP monitor', father._id, 'CARD', false],
    ['MEDICINES', 1650, 66, 'Apollo Pharmacy', father._id, 'UPI', false],
  ];
  await Expense.insertMany(expenses.map(([category, amount, d, vendor, member, paymentMode, taxDeductible]) => ({
    owner, category, amount, date: ago(d), vendor, member, paymentMode, taxDeductible,
  })));

  return user;
};
