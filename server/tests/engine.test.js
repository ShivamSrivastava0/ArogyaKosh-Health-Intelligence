/** Forecasting, anomaly, adherence-learning and AI-grounding checks. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitTrend, trendConfidence, anomaly } from '../services/predict/forecast.js';
import { missProbabilityToday } from '../services/predict/adherencePatterns.js';
import { verifyNumbers } from '../services/assistantService.js';

const DAY = 86400000;
const series = (fn, n = 10, every = 6) => Array.from({ length: n }, (_, i) => ({ t: Date.now() - (n - 1 - i) * every * DAY, y: fn(i) }));

test('trend: recovers the slope of a clean line', () => {
  const fit = fitTrend(series((i) => 150 - i * 3)); // −3 per 6 days = −15/month
  assert.ok(Math.abs(fit.slopePerDay * 30 - -15) < 0.01);
  assert.equal(trendConfidence(fit), 'HIGH');
});

test('trend: one wild reading does not hijack the slope (Theil–Sen robustness)', () => {
  const fit = fitTrend(series((i) => (i === 5 ? 220 : 140)));
  assert.ok(Math.abs(fit.slopePerDay * 30) < 1, 'flat series stays ~flat');
});

test('trend: needs at least 4 readings over a week', () => {
  assert.equal(fitTrend(series((i) => i, 3)), null);
  assert.equal(fitTrend(series((i) => i, 5, 1)), null);
});

test('forecast: damped projection never runs past the observed range', () => {
  const fit = fitTrend(series((i) => 150 - i * 4)); // range 36
  const in90 = fit.project(Date.now() + 90 * DAY);
  const now = fit.project(Date.now());
  assert.ok(now - in90 <= 36 + 1e-9, 'capped by observed range');
  assert.ok(now - in90 < 4 / 6 * 90, 'damped below straight-line extrapolation');
});

test('anomaly: flags a reading far from the personal baseline only', () => {
  assert.equal(anomaly([175, 140, 142, 138, 141, 139, 143]).unusual, true);
  assert.equal(anomaly([146, 140, 142, 138, 141, 139, 143]).unusual, false);
  assert.equal(anomaly([175, 140, 142]), null, 'too little history');
});

test('dose-miss learning uses weekday/weekend split', () => {
  const p = { missRate: 0.3, weekdayMiss: 0.2, weekendMiss: 0.6 };
  assert.equal(missProbabilityToday(p, new Date('2026-11-14T10:00:00')), 0.6); // Saturday
  assert.equal(missProbabilityToday(p, new Date('2026-11-12T10:00:00')), 0.2); // Thursday
});

test('AI grounding: values found in records pass, invented ones are caught', () => {
  const ctx = 'Rajesh: Blood pressure 146/92 mmHg; HbA1c 7.1 %';
  assert.deepEqual(verifyNumbers('His BP was 146/92 mmHg and HbA1c 7.1%.', ctx).unverified, []);
  assert.deepEqual(verifyNumbers('His BP was 158/96 mmHg.', ctx).unverified, ['158/96 mmHg']);
  // textbook thresholds are allowed only when phrased as a target…
  assert.deepEqual(verifyNumbers('Aim for below 120/80 mmHg.', ctx).unverified, []);
  // …not when presented as the person's own reading
  assert.deepEqual(verifyNumbers('His BP is 140/90 mmHg.', ctx).unverified, ['140/90 mmHg']);
});
