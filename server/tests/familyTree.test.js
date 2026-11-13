/** Kinship graph + hereditary screening rules. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bloodRelatives, planFor } from '../services/familyTreeService.js';

const node = (id, pos, sex, conditions = [], extra = {}) => ({ id, name: id, pos, sex, conditions, kind: 'member', ...extra });
const family = [
  node('Aarav', 'SELF', 'MALE', [], { age: 34 }),
  node('Meera', 'SPOUSE', 'FEMALE', [], { age: 31 }),
  node('Rajesh', 'FATHER', 'MALE', [{ name: 'Type 2 diabetes', onset: 57 }, { name: 'Heart attack', onset: 52 }]),
  node('Sunita', 'MOTHER', 'FEMALE', [{ name: 'Breast cancer', onset: 44 }]),
  node('Dadaji', 'P_GF', 'MALE', [{ name: 'Diabetes', onset: 60 }]),
  node('Nani', 'M_GM', 'FEMALE', [{ name: 'Diabetes', onset: 58 }]),
  node('Anaya', 'CHILD', 'FEMALE', [], { age: 1 }),
  node('Kavya', 'SIBLING', 'FEMALE', [], { age: 29 }),
  node('Sasur', 'FATHER_IN_LAW', 'MALE', [{ name: 'Glaucoma', onset: 62 }]),
];
const get = (id) => family.find((n) => n.id === id);
const ids = (list) => list.map((n) => n.id).sort();

test('kinship: first and second degree for the account holder', () => {
  const { first, second } = bloodRelatives(get('Aarav'), family);
  assert.deepEqual(ids(first), ['Anaya', 'Kavya', 'Rajesh', 'Sunita']);
  assert.deepEqual(ids(second), ['Dadaji', 'Nani']);
});

test('kinship: in-laws and spouses are never blood relatives', () => {
  const { first, second } = bloodRelatives(get('Aarav'), family);
  assert.ok(!ids([...first, ...second]).includes('Meera'));
  assert.ok(!ids([...first, ...second]).includes('Sasur'));
  // …but the father-in-law IS Anaya's grandfather.
  assert.ok(ids(bloodRelatives(get('Anaya'), family).second).includes('Sasur'));
});

test('kinship: relationships are labelled from the target\'s point of view', () => {
  const { second } = bloodRelatives(get('Anaya'), family);
  assert.equal(second.find((n) => n.id === 'Rajesh').rel, 'grandfather');
  assert.equal(bloodRelatives(get('Kavya'), family).first.find((n) => n.id === 'Aarav').rel, 'brother');
});

test('diabetes: father affected + BMI ≥23 → start now; otherwise from 30', () => {
  const now = planFor({ ...get('Aarav'), bmi: 25.5 }, family).items.find((i) => i.key === 'diabetes');
  assert.equal(now.status, 'START_NOW');
  const lean = planFor({ ...get('Aarav'), bmi: 21 }, family).items.find((i) => i.key === 'diabetes');
  assert.equal(lean.startAge, 30);
});

test('diabetes: grandparents only (second degree) → screen from 30 (user example)', () => {
  const fam = family.filter((n) => !['Rajesh'].includes(n.id));
  const item = planFor({ ...get('Aarav'), age: 25, bmi: 21 }, fam).items.find((i) => i.key === 'diabetes');
  assert.equal(item.startAge, 30);
  assert.equal(item.status, 'FUTURE');
  assert.equal(item.startsInYears, 5);
  assert.match(item.why, /second-degree/);
});

test('premature heart disease: father at 52 (<55) triggers; child gets paediatric lipid plan', () => {
  assert.equal(planFor({ ...get('Aarav'), bmi: 22 }, family).items.find((i) => i.key === 'cvd').startAge, 20);
  const fam = family.map((n) => (n.id === 'Rajesh' ? { ...n, conditions: [{ name: 'Heart attack', onset: 60 }] } : n));
  assert.equal(planFor({ ...get('Aarav'), bmi: 22 }, fam).items.find((i) => i.key === 'cvd'), undefined, 'onset 60 is not premature for a man');
});

test('breast cancer: mother at 44 → daughter starts at 34, with genetic counselling', () => {
  const item = planFor({ ...get('Kavya'), bmi: 22 }, family).items.find((i) => i.key === 'breastCancer');
  assert.equal(item.startAge, 34);
  assert.match(item.why, /counselling/);
  assert.equal(planFor({ ...get('Aarav'), bmi: 22 }, family).items.find((i) => i.key === 'breastCancer'), undefined, 'not for men');
});

test('no plan item for a condition the person already has', () => {
  const plan = planFor({ ...get('Rajesh'), age: 66, bmi: 28 }, family);
  assert.equal(plan.items.find((i) => i.key === 'diabetes'), undefined);
});
