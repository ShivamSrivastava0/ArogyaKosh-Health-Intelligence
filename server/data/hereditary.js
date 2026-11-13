/**
 * Family-history screening rules. Each rule reads the target person's affected
 * first- and second-degree blood relatives and returns a screening item, or
 * null. Thresholds and intervals come from the cited guideline; wording stays
 * at "recommended / discuss with your doctor" — never a diagnosis.
 *
 * Sources
 *  ADA   — American Diabetes Association, Standards of Care 2024, §2 (screening)
 *  NPNCD — India National Programme for Prevention & Control of NCDs: population screening from 30
 *  ACC   — 2018 AHA/ACC Cholesterol Guideline (family history of premature ASCVD as risk enhancer)
 *  NHLBI — 2011 Expert Panel on Cardiovascular Health in Children (targeted lipid screening from age 2)
 *  ACR   — American College of Radiology breast screening recommendations, 2023
 *  NCCN  — Genetic/familial high-risk assessment: breast, ovarian, pancreatic
 *  USMSTF— US Multi-Society Task Force on Colorectal Cancer, 2017
 *  AAO   — American Academy of Ophthalmology, Primary Open-Angle Glaucoma PPP
 *  ACS   — American Cancer Society prostate cancer early detection
 *  NHM   — India NHM Guidelines on Hemoglobinopathies (thalassaemia carrier screening)
 */

export const CONDITION_PATTERNS = {
  diabetes: /diabet|\bt2d\b|\bdm\b|\bsugar\b/i,
  cvd: /heart attack|myocardial|\bmi\b|coronary|\bcad\b|angina|bypass|cabg|stent|angioplasty|stroke|cardiac arrest|heart disease/i,
  hypertension: /hypertens|high bp|blood pressure|\bhtn\b/i,
  breastCancer: /breast cancer|breast ca\b|carcinoma breast/i,
  colorectalCancer: /colon cancer|colorectal|bowel cancer|rectal cancer|colon ca\b/i,
  glaucoma: /glaucoma/i,
  prostateCancer: /prostate cancer|prostate ca\b/i,
  thalassaemia: /thalass/i,
  kidney: /kidney disease|\bckd\b|renal failure|kidney failure|dialysis|polycystic kidney/i,
};

// "Rajesh (father)" + onset 60 → "Rajesh (father, at 60)"
const names = (list) => list.map((r) => (r.onset && r.label.endsWith(')') ? `${r.label.slice(0, -1)}, at ${r.onset})` : `${r.label}${r.onset ? ` (at ${r.onset})` : ''}`)).join(', ');
const youngestOnset = (list) => Math.min(...list.map((r) => r.onset ?? 200));

/**
 * @param ctx { age, sex, bmi, has(conditionKey), first(key), second(key) }
 *        first/second return affected relatives [{ label, sex, onset }]
 */
export const RULES = [
  {
    key: 'diabetes',
    condition: 'Type 2 diabetes',
    evaluate(ctx) {
      if (ctx.has('diabetes')) return null;
      const f1 = ctx.first('diabetes');
      const s2 = ctx.second('diabetes');
      if (!f1.length && !s2.length) return null;
      if (ctx.age !== null && ctx.age < 18) {
        return {
          test: 'HbA1c or fasting sugar',
          startAge: 10,
          everyMonths: 36,
          frequency: 'every 3 years, from age 10 (or puberty) if overweight',
          why: `Diabetes in ${names([...f1, ...s2])}. In children, testing is advised when overweight with a first- or second-degree relative affected.`,
          source: 'ADA Standards of Care 2024 §2',
          conditional: 'only if overweight (BMI above the 85th percentile)',
        };
      }
      const overweight = ctx.bmi !== null && ctx.bmi >= 23;
      const startNow = f1.length > 0 && overweight;
      return {
        test: 'HbA1c or fasting blood sugar',
        startAge: startNow ? Math.max(18, ctx.age ?? 18) : 30,
        everyMonths: f1.length >= 2 ? 12 : 36,
        frequency: f1.length >= 2 ? 'every year (both parents affected)' : 'at least every 3 years; every year if prediabetes',
        why: f1.length
          ? `First-degree relative${f1.length > 1 ? 's' : ''} with diabetes: ${names(f1)}.${startNow ? ` With a BMI of ${ctx.bmi} (≥23, Asian cut-off) testing is advised now.` : ''}`
          : `Diabetes in second-degree relatives (${names(s2)}). It adds to risk; India screens everyone from 30.`,
        source: startNow ? 'ADA Standards of Care 2024 §2 (BMI ≥23 for Asian individuals)' : 'India NP-NCD screening from 30; ADA Standards of Care 2024 §2',
      };
    },
  },
  {
    key: 'cvd',
    condition: 'Early heart disease or stroke',
    evaluate(ctx) {
      // "Premature" = male first-degree relative before 55, female before 65.
      const premature = ctx.first('cvd').filter((r) => r.onset !== null && ((r.sex === 'MALE' && r.onset < 55) || (r.sex === 'FEMALE' && r.onset < 65)));
      if (!premature.length) return null;
      if (ctx.age !== null && ctx.age < 18) {
        return {
          test: 'Fasting lipid profile',
          startAge: 2,
          everyMonths: 36,
          frequency: 'from age 2; repeat every 3–5 years if normal',
          why: `Premature heart disease in ${names(premature)}.`,
          source: 'NHLBI Expert Panel 2011 (targeted paediatric lipid screening)',
        };
      }
      return {
        test: 'Lipid profile, BP and sugar (heart-risk check)',
        startAge: 20,
        everyMonths: 12,
        frequency: 'every year — tell the doctor about this family history',
        why: `Premature heart disease in ${names(premature)} (men before 55 / women before 65). This is a recognised "risk enhancer" that can change treatment thresholds.`,
        source: '2018 AHA/ACC Cholesterol Guideline',
      };
    },
  },
  {
    key: 'hypertension',
    condition: 'High blood pressure',
    evaluate(ctx) {
      if (ctx.has('hypertension')) return null;
      const f1 = ctx.first('hypertension');
      if (!f1.length || (ctx.age !== null && ctx.age < 18)) return null;
      return {
        test: 'Blood pressure check',
        startAge: 18,
        everyMonths: 12,
        frequency: 'at least once a year',
        why: `High BP in ${names(f1)} raises your own risk.`,
        source: 'AHA risk factors; India NP-NCD screening from 30',
      };
    },
  },
  {
    key: 'breastCancer',
    condition: 'Breast cancer',
    evaluate(ctx) {
      if (ctx.sex !== 'FEMALE') return null;
      const f1 = ctx.first('breastCancer');
      if (!f1.length) return null;
      const young = youngestOnset(f1);
      const start = Math.max(30, Math.min(40, young === 200 ? 40 : young - 10));
      const counsel = young < 50 || f1.length >= 2 || f1.some((r) => r.sex === 'MALE');
      return {
        test: 'Mammogram (with breast exam)',
        startAge: start,
        everyMonths: 12,
        frequency: 'every year',
        why: `Breast cancer in ${names(f1)}. Screening starts 10 years before the youngest diagnosis, not before 30.${counsel ? ' Genetic counselling is also recommended.' : ''}`,
        source: counsel ? 'ACR 2023; NCCN familial risk criteria' : 'ACR 2023',
      };
    },
  },
  {
    key: 'colorectalCancer',
    condition: 'Bowel (colorectal) cancer',
    evaluate(ctx) {
      const f1 = ctx.first('colorectalCancer');
      if (!f1.length) return null;
      const young = youngestOnset(f1);
      const high = f1.length >= 2 || young < 60;
      return {
        test: 'Colonoscopy',
        startAge: high ? Math.max(18, Math.min(40, young === 200 ? 40 : young - 10)) : 40,
        everyMonths: high ? 60 : 120,
        frequency: high ? 'every 5 years' : 'every 10 years',
        why: `Colorectal cancer in ${names(f1)}${high ? ' (before 60, or more than one relative)' : ''}.`,
        source: 'US Multi-Society Task Force on Colorectal Cancer, 2017',
      };
    },
  },
  {
    key: 'prostateCancer',
    condition: 'Prostate cancer',
    evaluate(ctx) {
      if (ctx.sex !== 'MALE') return null;
      const f1 = ctx.first('prostateCancer');
      if (!f1.length) return null;
      const multiple = f1.length >= 2 || youngestOnset(f1) < 65;
      return {
        test: 'Discuss PSA testing with a doctor',
        startAge: multiple ? 40 : 45,
        everyMonths: 24,
        frequency: 'every 1–2 years, after discussing pros and cons',
        why: `Prostate cancer in ${names(f1)}.`,
        source: 'American Cancer Society early-detection guidance',
      };
    },
  },
  {
    key: 'glaucoma',
    condition: 'Glaucoma',
    evaluate(ctx) {
      const f1 = ctx.first('glaucoma');
      if (!f1.length || (ctx.age !== null && ctx.age < 18)) return null;
      return {
        test: 'Full eye exam (eye pressure + optic nerve)',
        startAge: 40,
        everyMonths: 24,
        frequency: 'every 1–2 years',
        why: `Glaucoma in ${names(f1)} — it often runs in families and has no early symptoms.`,
        source: 'AAO Primary Open-Angle Glaucoma Preferred Practice Pattern',
      };
    },
  },
  {
    key: 'thalassaemia',
    condition: 'Thalassaemia',
    evaluate(ctx) {
      const any = [...ctx.first('thalassaemia'), ...ctx.second('thalassaemia')];
      if (!any.length || ctx.has('thalassaemia')) return null;
      return {
        test: 'Thalassaemia carrier test (HbA2 by HPLC)',
        startAge: 12,
        everyMonths: 0,
        frequency: 'once — ideally before marriage or pregnancy',
        why: `Thalassaemia in ${names(any)}. Knowing carrier status protects the next generation.`,
        source: 'NHM Guidelines on Hemoglobinopathies in India',
      };
    },
  },
  {
    key: 'kidney',
    condition: 'Kidney disease',
    evaluate(ctx) {
      const f1 = ctx.first('kidney');
      if (!f1.length || (ctx.age !== null && ctx.age < 18)) return null;
      return {
        test: 'Creatinine (eGFR) and urine albumin',
        startAge: 18,
        everyMonths: 12,
        frequency: 'every year if you also have diabetes or high BP; otherwise ask your doctor',
        why: `Kidney disease in ${names(f1)}.`,
        source: 'KDIGO CKD guideline (testing people at increased risk)',
      };
    },
  },
];
