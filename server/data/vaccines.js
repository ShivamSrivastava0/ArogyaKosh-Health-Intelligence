/**
 * Immunization templates.
 * Children: based on the Indian Academy of Pediatrics (IAP) recommended
 * schedule. Adults: common adult recommendations. Offsets are from date of
 * birth. Families must confirm with their paediatrician / physician — the app
 * says this wherever the schedule is shown.
 */

const W = (n) => ({ weeks: n });
const M = (n) => ({ months: n });
const Y = (n) => ({ years: n });

export const CHILD_SCHEDULE = [
  { name: 'BCG', dose: 'Single dose', at: W(0) },
  { name: 'OPV', dose: 'Birth dose', at: W(0) },
  { name: 'Hepatitis B', dose: 'Dose 1', at: W(0) },

  { name: 'DTaP / DTwP', dose: 'Dose 1', at: W(6) },
  { name: 'IPV', dose: 'Dose 1', at: W(6) },
  { name: 'Hepatitis B', dose: 'Dose 2', at: W(6) },
  { name: 'Hib', dose: 'Dose 1', at: W(6) },
  { name: 'Rotavirus', dose: 'Dose 1', at: W(6) },
  { name: 'PCV (Pneumococcal)', dose: 'Dose 1', at: W(6) },

  { name: 'DTaP / DTwP', dose: 'Dose 2', at: W(10) },
  { name: 'IPV', dose: 'Dose 2', at: W(10) },
  { name: 'Hib', dose: 'Dose 2', at: W(10) },
  { name: 'Rotavirus', dose: 'Dose 2', at: W(10) },
  { name: 'PCV (Pneumococcal)', dose: 'Dose 2', at: W(10) },

  { name: 'DTaP / DTwP', dose: 'Dose 3', at: W(14) },
  { name: 'IPV', dose: 'Dose 3', at: W(14) },
  { name: 'Hib', dose: 'Dose 3', at: W(14) },
  { name: 'Rotavirus', dose: 'Dose 3', at: W(14) },
  { name: 'PCV (Pneumococcal)', dose: 'Dose 3', at: W(14) },

  { name: 'Hepatitis B', dose: 'Dose 3', at: M(6) },
  { name: 'Influenza', dose: 'Dose 1', at: M(6) },
  { name: 'Influenza', dose: 'Dose 2', at: M(7) },
  { name: 'Typhoid Conjugate (TCV)', dose: 'Single dose', at: M(9) },
  { name: 'MMR', dose: 'Dose 1', at: M(9) },
  { name: 'Hepatitis A', dose: 'Dose 1', at: M(12) },
  { name: 'MMR', dose: 'Dose 2', at: M(15) },
  { name: 'Varicella (Chickenpox)', dose: 'Dose 1', at: M(15) },
  { name: 'PCV (Pneumococcal)', dose: 'Booster', at: M(15) },
  { name: 'DTaP / DTwP', dose: 'Booster 1', at: M(16) },
  { name: 'IPV', dose: 'Booster 1', at: M(16) },
  { name: 'Hib', dose: 'Booster 1', at: M(16) },
  { name: 'Hepatitis A', dose: 'Dose 2', at: M(18) },
  { name: 'Varicella (Chickenpox)', dose: 'Dose 2', at: M(18) },
  { name: 'DTaP / DTwP', dose: 'Booster 2', at: Y(4) },
  { name: 'IPV', dose: 'Booster 2', at: Y(4) },
  { name: 'MMR', dose: 'Dose 3', at: Y(4) },
  { name: 'Tdap', dose: 'Adolescent booster', at: Y(10) },
  { name: 'HPV', dose: 'Dose 1', at: Y(9) },
  { name: 'HPV', dose: 'Dose 2', at: { years: 9, months: 6 } },
];

/** Adult items are generated relative to "now" when the member is eligible. */
export const ADULT_SCHEDULE = [
  { name: 'Influenza', dose: 'Annual', minAge: 18, everyYears: 1, note: 'Yearly, ideally before monsoon/winter' },
  { name: 'Td / Tdap', dose: 'Booster', minAge: 18, everyYears: 10, note: 'Every 10 years' },
  { name: 'Pneumococcal (PCV20)', dose: 'Single dose', minAge: 65, note: 'Recommended at 65+' },
  { name: 'Shingles (Recombinant Zoster)', dose: 'Dose 1', minAge: 50, note: 'Two doses, 2–6 months apart' },
  { name: 'Hepatitis B', dose: 'Series', minAge: 18, maxAge: 59, note: 'If not vaccinated earlier' },
];

export const addOffset = (date, { weeks = 0, months = 0, years = 0 }) => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  d.setMonth(d.getMonth() + months);
  d.setFullYear(d.getFullYear() + years);
  return d;
};
