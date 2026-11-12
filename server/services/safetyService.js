import { BRANDS, INTERACTIONS, ALLERGY_CLASSES } from '../data/interactions.js';

const KNOWN_GENERICS = new Set([
  ...Object.values(BRANDS).flat(),
  ...INTERACTIONS.flatMap((i) => [...i.a, ...i.b]),
  ...ALLERGY_CLASSES.flatMap((c) => c.ingredients),
]);
const BRAND_KEYS = Object.keys(BRANDS).sort((a, b) => b.length - a.length);

const norm = (s = '') => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Resolve a free-text medicine name (brand or generic) to generic ingredients. */
export const ingredientsOf = (name) => {
  const n = norm(name);
  const found = new Set();
  for (const brand of BRAND_KEYS) {
    const re = new RegExp(`(^|\\s)${brand.replace(/[-]/g, '\\-')}(\\s|$|\\d)`);
    if (re.test(n)) {
      BRANDS[brand].forEach((g) => found.add(g));
      break;
    }
  }
  for (const generic of KNOWN_GENERICS) {
    if (n.includes(generic)) found.add(generic);
  }
  return [...found];
};

const SEV_RANK = { HIGH: 3, MODERATE: 2, LOW: 1 };

/**
 * Check a set of medicines (and optional allergy list) for:
 *  - known interactions between any two medicines
 *  - the same ingredient appearing in two medicines (double dosing)
 *  - a medicine that matches a recorded allergy class
 * @param meds [{ _id?, name }]
 * @param allergies [{ name }]
 */
export const checkMedicines = (meds = [], allergies = []) => {
  const resolved = meds.map((m) => ({ ...m, ingredients: ingredientsOf(m.name) }));
  const warnings = [];

  for (let i = 0; i < resolved.length; i += 1) {
    for (let j = i + 1; j < resolved.length; j += 1) {
      const A = resolved[i];
      const B = resolved[j];
      for (const rule of INTERACTIONS) {
        const hit = (A.ingredients.some((g) => rule.a.includes(g)) && B.ingredients.some((g) => rule.b.includes(g)))
          || (B.ingredients.some((g) => rule.a.includes(g)) && A.ingredients.some((g) => rule.b.includes(g)));
        if (hit) {
          warnings.push({
            kind: 'INTERACTION', severity: rule.severity, medicines: [A.name, B.name],
            title: `${A.name} + ${B.name}`, effect: rule.effect, advice: rule.advice,
          });
        }
      }
      const shared = A.ingredients.filter((g) => B.ingredients.includes(g));
      if (shared.length) {
        warnings.push({
          kind: 'DUPLICATE', severity: shared.includes('paracetamol') ? 'HIGH' : 'MODERATE', medicines: [A.name, B.name],
          title: `Same ingredient in ${A.name} and ${B.name}`,
          effect: `Both contain ${shared.join(', ')} — taking both can mean a double dose.`,
          advice: 'Check with your pharmacist whether both are needed.',
        });
      }
    }
  }

  for (const med of resolved) {
    for (const allergy of allergies) {
      const a = norm(allergy.name);
      for (const cls of ALLERGY_CLASSES) {
        if (cls.match.some((m) => a.includes(m)) && med.ingredients.some((g) => cls.ingredients.includes(g))) {
          warnings.push({
            kind: 'ALLERGY', severity: cls.severity, medicines: [med.name],
            title: `${med.name} vs ${allergy.name} allergy`,
            effect: `${med.name} is a ${cls.label}, which can trigger a ${allergy.name} allergy.`,
            advice: 'Confirm with the prescribing doctor before taking it.',
          });
        }
      }
    }
  }

  const seen = new Set();
  return warnings
    .filter((w) => {
      const k = `${w.kind}|${[...w.medicines].sort().join('|')}|${w.effect}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
};
