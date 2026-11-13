/**
 * Curated, intentionally small medicine-safety knowledge base.
 * - BRANDS maps common Indian brand names to generic ingredients.
 * - INTERACTIONS lists well-documented clinically significant pairs.
 * - ALLERGY_CLASSES maps an allergy to the ingredients it cross-reacts with.
 * It is a safety net that prompts a conversation with a pharmacist, never a
 * replacement for one.
 */

export const BRANDS = {
  crocin: ['paracetamol'], dolo: ['paracetamol'], calpol: ['paracetamol'], 'p-650': ['paracetamol'],
  combiflam: ['ibuprofen', 'paracetamol'], brufen: ['ibuprofen'], voveran: ['diclofenac'],
  ecosprin: ['aspirin'], 'ecosprin av': ['aspirin', 'atorvastatin'], disprin: ['aspirin'],
  augmentin: ['amoxicillin', 'clavulanate'], moxikind: ['amoxicillin'], mox: ['amoxicillin'],
  azithral: ['azithromycin'], azee: ['azithromycin'], 'taxim o': ['cefixime'], taxim: ['cefotaxime'], zifi: ['cefixime'],
  ciplox: ['ciprofloxacin'], septran: ['sulfamethoxazole', 'trimethoprim'],
  pan: ['pantoprazole'], pantocid: ['pantoprazole'], omez: ['omeprazole'], nexpro: ['esomeprazole'],
  glycomet: ['metformin'], 'glycomet gp': ['metformin', 'glimepiride'], amaryl: ['glimepiride'],
  januvia: ['sitagliptin'], 'janumet': ['sitagliptin', 'metformin'],
  thyronorm: ['levothyroxine'], eltroxin: ['levothyroxine'],
  telma: ['telmisartan'], 'telma h': ['telmisartan', 'hydrochlorothiazide'], amlong: ['amlodipine'],
  amlodac: ['amlodipine'], stamlo: ['amlodipine'], envas: ['enalapril'], cardace: ['ramipril'],
  atorva: ['atorvastatin'], lipitor: ['atorvastatin'], rosuvas: ['rosuvastatin'], crestor: ['rosuvastatin'],
  clopilet: ['clopidogrel'], plavix: ['clopidogrel'], warf: ['warfarin'], acitrom: ['acenocoumarol'],
  shelcal: ['calcium', 'vitamin d3'], calcimax: ['calcium'], 'livogen': ['iron'], 'autrin': ['iron'],
  sorbitrate: ['isosorbide'], 'manforce': ['sildenafil'], viagra: ['sildenafil'],
  ultracet: ['tramadol', 'paracetamol'], contramal: ['tramadol'],
  'nexito': ['escitalopram'], 'cipralex': ['escitalopram'], 'fluvoxin': ['fluvoxamine'], 'daxid': ['sertraline'],
  'aldactone': ['spironolactone'], lasix: ['furosemide'], digoxin: ['digoxin'], cordarone: ['amiodarone'],
  forcan: ['fluconazole'], 'zocon': ['fluconazole'], 'claribid': ['clarithromycin'],
  folitrax: ['methotrexate'], 'montair': ['montelukast'], 'allegra': ['fexofenadine'], cetzine: ['cetirizine'],
};

const NSAIDS = ['ibuprofen', 'diclofenac', 'naproxen', 'aceclofenac', 'ketorolac', 'aspirin', 'etoricoxib', 'mefenamic acid'];
const ANTICOAG = ['warfarin', 'acenocoumarol', 'apixaban', 'rivaroxaban', 'dabigatran'];
const ACE_ARB = ['enalapril', 'ramipril', 'lisinopril', 'telmisartan', 'losartan', 'olmesartan'];
const SSRI = ['sertraline', 'fluoxetine', 'escitalopram', 'paroxetine', 'fluvoxamine'];
const STATIN_3A4 = ['simvastatin', 'atorvastatin', 'lovastatin'];
const SULFONYLUREA = ['glimepiride', 'gliclazide', 'glibenclamide', 'glipizide'];
const NITRATES = ['isosorbide', 'nitroglycerin', 'glyceryl trinitrate'];
const PDE5 = ['sildenafil', 'tadalafil'];
const PPI = ['omeprazole', 'esomeprazole'];
const MACROLIDE = ['clarithromycin', 'erythromycin'];
const MINERALS = ['calcium', 'iron', 'antacid', 'magnesium', 'zinc'];

export const INTERACTIONS = [
  { a: ANTICOAG, b: NSAIDS, severity: 'HIGH', effect: 'Raises the risk of serious bleeding.', advice: 'Avoid together unless a doctor has specifically approved it.' },
  { a: ['aspirin'], b: NSAIDS.filter((n) => n !== 'aspirin'), severity: 'MODERATE', effect: 'Ibuprofen-type painkillers can block the heart-protective effect of low-dose aspirin and raise stomach-bleeding risk (FDA advisory).', advice: 'If a painkiller is needed, ask about paracetamol, or timing it after the aspirin dose.' },
  { a: ['clopidogrel'], b: ['aspirin'], severity: 'MODERATE', effect: 'Dual antiplatelet therapy increases bleeding risk.', advice: 'Usually intentional after a cardiac event — confirm duration with the cardiologist.' },
  { a: ['clopidogrel'], b: PPI, severity: 'MODERATE', effect: 'Omeprazole/esomeprazole can reduce how well clopidogrel works.', advice: 'Ask whether pantoprazole is a suitable alternative.' },
  { a: PDE5, b: NITRATES, severity: 'HIGH', effect: 'Can cause a dangerous drop in blood pressure.', advice: 'Do not combine.' },
  { a: STATIN_3A4, b: MACROLIDE, severity: 'MODERATE', effect: 'Raises statin levels; risk of muscle damage.', advice: 'Doctor may pause the statin during the antibiotic course.' },
  { a: ACE_ARB, b: ['spironolactone', 'potassium'], severity: 'MODERATE', effect: 'Can push potassium to unsafe levels.', advice: 'Needs periodic potassium blood tests.' },
  { a: ACE_ARB, b: NSAIDS.filter((n) => n !== 'aspirin'), severity: 'MODERATE', effect: 'Painkillers can blunt BP control and strain the kidneys.', advice: 'Prefer paracetamol for routine pain; ask your doctor.' },
  { a: SSRI, b: ['tramadol'], severity: 'HIGH', effect: 'Risk of serotonin syndrome and seizures.', advice: 'Talk to the prescriber before combining.' },
  { a: ['levothyroxine'], b: MINERALS, severity: 'LOW', effect: 'Calcium/iron reduce thyroid tablet absorption.', advice: 'Keep a 4-hour gap; take thyroid tablet on an empty stomach.' },
  { a: ['ciprofloxacin', 'levofloxacin'], b: MINERALS, severity: 'LOW', effect: 'Minerals block antibiotic absorption.', advice: 'Take the antibiotic 2 hours before or 6 hours after.' },
  { a: ['methotrexate'], b: ['trimethoprim', 'sulfamethoxazole'], severity: 'HIGH', effect: 'Can cause severe bone-marrow toxicity.', advice: 'Avoid together.' },
  { a: ['digoxin'], b: ['amiodarone', 'clarithromycin'], severity: 'HIGH', effect: 'Raises digoxin to toxic levels.', advice: 'Dose adjustment and monitoring needed.' },
  { a: SULFONYLUREA, b: ['fluconazole', 'clarithromycin'], severity: 'MODERATE', effect: 'May cause low blood sugar.', advice: 'Check sugar more often during the course.' },
  { a: ['amlodipine'], b: ['simvastatin'], severity: 'MODERATE', effect: 'Raises simvastatin levels.', advice: 'Simvastatin dose usually capped at 20 mg.' },
];

export const ALLERGY_CLASSES = [
  { match: ['penicillin', 'amoxicillin', 'ampicillin'], ingredients: ['amoxicillin', 'ampicillin', 'penicillin', 'cloxacillin', 'piperacillin', 'clavulanate'], severity: 'HIGH', label: 'penicillin-class antibiotic' },
  { match: ['penicillin'], ingredients: ['cefixime', 'cefotaxime', 'cefuroxime', 'cephalexin', 'ceftriaxone', 'cefpodoxime'], severity: 'LOW', label: 'cephalosporin (small cross-reaction risk with penicillin allergy)' },
  { match: ['sulfa', 'sulpha', 'sulfonamide'], ingredients: ['sulfamethoxazole', 'sulfasalazine'], severity: 'HIGH', label: 'sulfonamide' },
  { match: ['nsaid', 'aspirin', 'ibuprofen', 'diclofenac', 'painkiller'], ingredients: NSAIDS, severity: 'HIGH', label: 'NSAID painkiller' },
  { match: ['codeine', 'opioid', 'morphine', 'tramadol'], ingredients: ['codeine', 'tramadol', 'morphine'], severity: 'MODERATE', label: 'opioid' },
  { match: ['macrolide', 'azithromycin', 'erythromycin'], ingredients: ['azithromycin', 'erythromycin', 'clarithromycin'], severity: 'HIGH', label: 'macrolide antibiotic' },
  { match: ['quinolone', 'ciprofloxacin'], ingredients: ['ciprofloxacin', 'levofloxacin', 'ofloxacin', 'norfloxacin'], severity: 'HIGH', label: 'fluoroquinolone antibiotic' },
];
