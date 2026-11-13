/**
 * Prints the demo household's ArogyaPredict output on an in-memory DB.
 * Run: node scripts/predict-demo.js
 */
process.env.MONGODB_URI = 'inmemory';
process.env.JWT_ACCESS_SECRET ||= 'x';
process.env.JWT_REFRESH_SECRET ||= 'y';

const { default: connectDB, disconnectDB } = await import('../config/db.js');
const { createDemoAccount } = await import('../services/demoService.js');
const { predictHousehold, simulateCardio } = await import('../services/predictService.js');
const { default: Member } = await import('../models/Member.js');

await connectDB();
const user = await createDemoAccount();
const h = await predictHousehold(user._id);

for (const r of h.members) {
  console.log([
    r.member.name.padEnd(14),
    `cvd=${r.cardio ? `${r.cardio.risk}% ${r.cardio.band} heartAge=${r.cardio.heartAge}` : '—'}`,
    r.glycaemic?.label || '—',
    `eGFR ${r.kidney?.egfr ?? '—'}`,
    `IDRS ${r.diabetesRisk ? `${r.diabetesRisk.score} ${r.diabetesRisk.band}` : '—'}`,
    `worse: ${r.worsening.join(', ') || '—'}`,
    `better: ${r.improving.join(', ') || '—'}`,
  ].join(' | '));
}
console.log('\nTop insights:');
h.insights.slice(0, 14).forEach((i) => console.log(` [${i.level}] ${i.member.name.split(' ')[0]}: ${i.title}`));
console.log('\nDoses at risk today:', h.dosesAtRisk.map((d) => `${d.medicine.name}@${d.time} ${Math.round(d.missToday * 100)}%`).join(', ') || 'none');

const papa = await Member.findOne({ owner: user._id, relation: 'FATHER' });
const sim = await simulateCardio(papa, { sbp: 120 });
console.log('\nWhat-if Papa SBP 120:', sim.baseline, '→', `${sim.risk}%`, 'heart age', sim.heartAge);

await disconnectDB();
process.exit(0);
