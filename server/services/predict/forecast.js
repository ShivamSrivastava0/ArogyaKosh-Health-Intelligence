/**
 * Learning from a person's own readings.
 *
 * - Robust trend: Theil–Sen estimator (median of pairwise slopes) — resistant
 *   to the odd bad reading, works well with 4–40 home measurements.
 * - Forecast band from the median absolute deviation of residuals.
 * - Anomaly: robust z-score of the latest reading against the personal baseline.
 */

const DAY = 86400000;
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mad = (xs) => {
  const m = median(xs);
  return median(xs.map((x) => Math.abs(x - m)));
};

/**
 * @param points [{ t: Date|number, y: number }] (any order)
 * @returns { slopePerDay, intercept, t0, residualMad, n, spanDays, predict(t) } | null
 */
export const fitTrend = (points) => {
  const pts = points.map((p) => ({ x: (new Date(p.t).getTime()), y: p.y })).sort((a, b) => a.x - b.x);
  if (pts.length < 4) return null;
  const t0 = pts[0].x;
  const xs = pts.map((p) => (p.x - t0) / DAY);
  const spanDays = xs[xs.length - 1] - xs[0];
  if (spanDays < 7) return null;

  const slopes = [];
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      if (xs[j] - xs[i] > 0.5) slopes.push((pts[j].y - pts[i].y) / (xs[j] - xs[i]));
    }
  }
  const slope = median(slopes) ?? 0;
  const intercept = median(pts.map((p, i) => p.y - slope * xs[i]));
  const residuals = pts.map((p, i) => p.y - (intercept + slope * xs[i]));
  const residualMad = mad(residuals) || 0;

  const predict = (t) => intercept + slope * ((new Date(t).getTime() - t0) / DAY);
  const tLast = pts[pts.length - 1].x;
  const ys = pts.map((p) => p.y);
  const observedRange = Math.max(...ys) - Math.min(...ys);
  const PHI = 0.99; // daily damping: momentum fades, ~59 effective days over a 90-day horizon

  /**
   * Damped-trend projection beyond the last reading. Real physiology plateaus,
   * so the slope decays geometrically and the total change is capped at the
   * range actually observed.
   */
  const project = (t) => {
    const ms = new Date(t).getTime();
    if (ms <= tLast) return predict(ms);
    const d = (ms - tLast) / DAY;
    const effectiveDays = (PHI * (1 - PHI ** d)) / (1 - PHI);
    const delta = Math.max(-observedRange, Math.min(observedRange, slope * effectiveDays));
    return predict(tLast) + delta;
  };

  return {
    n: pts.length,
    spanDays: Math.round(spanDays),
    slopePerDay: slope,
    intercept,
    t0,
    residualMad,
    predict,
    project,
  };
};

/**
 * Is the trend real? Compares the change implied over the observed span with
 * the reading-to-reading noise. Returns 'HIGH' | 'MEDIUM' | 'LOW'.
 */
export const trendConfidence = (fit) => {
  if (!fit) return 'LOW';
  const signal = Math.abs(fit.slopePerDay * fit.spanDays);
  const noise = 1.4826 * fit.residualMad || 1e-6;
  const ratio = signal / noise;
  if (fit.n >= 8 && ratio >= 2) return 'HIGH';
  if (fit.n >= 5 && ratio >= 1.2) return 'MEDIUM';
  return 'LOW';
};

/**
 * First day (within horizon) on which predicted values classify into a worse
 * status than today. classify(y1, y2) -> status. Returns { date, status } | null.
 */
export const firstCrossing = ({ fit, fit2, classify, from = Date.now(), horizonDays = 180, rank }) => {
  if (!fit) return null;
  const start = classify(fit.project(from), fit2?.project(from));
  for (let d = 7; d <= horizonDays; d += 1) {
    const t = from + d * DAY;
    const st = classify(fit.project(t), fit2?.project(t));
    if (rank[st] > rank[start]) return { date: new Date(t), status: st, days: d };
  }
  return null;
};

/** Robust z of the newest value against earlier ones. Needs ≥5 earlier readings. */
export const anomaly = (values) => {
  if (values.length < 6) return null;
  const [latest, ...earlier] = values;
  const m = median(earlier);
  const spread = 1.4826 * mad(earlier);
  if (!spread) return null;
  const z = (latest - m) / spread;
  return { z: Math.round(z * 10) / 10, baseline: Math.round(m * 10) / 10, unusual: Math.abs(z) >= 2.5 };
};

export { median };
