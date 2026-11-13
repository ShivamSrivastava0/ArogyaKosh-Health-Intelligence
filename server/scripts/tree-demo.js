/** Prints the demo household's Family Health Tree plans (in-memory DB). Run: node scripts/tree-demo.js */
process.env.MONGODB_URI = 'inmemory';
process.env.JWT_ACCESS_SECRET ||= 'x';
process.env.JWT_REFRESH_SECRET ||= 'y';
const { default: connectDB, disconnectDB } = await import('../config/db.js');
const { createDemoAccount } = await import('../services/demoService.js');
const { familyTree } = await import('../services/familyTreeService.js');
await connectDB();
const user = await createDemoAccount();
const t = await familyTree(user._id);
for (const p of t.plans) {
  console.log(`\n${p.member.name} (${p.member.age}) — ${p.relativesConsidered.first} first-degree, ${p.relativesConsidered.second} second-degree relatives`);
  for (const i of p.items) console.log(`  [${i.status}${i.status === 'FUTURE' ? ` in ${i.startsInYears}y` : ''}] ${i.test} — ${i.frequency}\n      ${i.why} (${i.source})`);
}
await disconnectDB();
process.exit(0);
