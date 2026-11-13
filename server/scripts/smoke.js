/**
 * End-to-end smoke test against an in-memory MongoDB.
 * Run: npm run smoke
 * Exercises every route group the client depends on and fails loudly.
 */
process.env.MONGODB_URI = 'inmemory';
process.env.JWT_ACCESS_SECRET ||= 'smoke-access';
process.env.JWT_REFRESH_SECRET ||= 'smoke-refresh';
process.env.UPLOAD_DIR = 'uploads-smoke';
process.env.GEMINI_API_KEY = '';

const { default: connectDB, disconnectDB } = await import('../config/db.js');
const { default: app } = await import('../app.js');
const fs = await import('fs');

await connectDB();
const server = app.listen(0);
const base = `http://localhost:${server.address().port}/api`;
let token = '';
let failures = 0;

const call = async (method, path, body, { form, expect = [200, 201], household } = {}) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (household) headers['X-Household'] = household;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(base + path, { method, headers, body: payload });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  const ok = expect.includes(res.status);
  if (!ok) failures += 1;
  console.log(`${ok ? '✓' : '✗'} ${method} ${path} → ${res.status}${ok ? '' : ` ${JSON.stringify(data).slice(0, 300)}`}`);
  return data;
};

const today = new Date();
const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

try {
  await call('GET', '/health');
  await call('GET', '/today', null, { expect: [401] });
  await call('POST', '/auth/register', { name: 'Test', email: 'bad', password: 'x' }, { expect: [400] });
  const reg = await call('POST', '/auth/register', { name: 'Priya Test', email: 'Priya@Example.com', password: 'secret123' });
  token = reg.data.tokens.accessToken;
  await call('POST', '/auth/login', { email: 'priya@example.com', password: 'wrong' }, { expect: [401] });
  await call('POST', '/auth/login', { email: { $gt: '' }, password: 'secret123' }, { expect: [400] });
  const login = await call('POST', '/auth/login', { email: 'priya@example.com', password: 'secret123' });
  const refreshed = await call('POST', '/auth/refresh', { refreshToken: login.data.tokens.refreshToken });
  await call('POST', '/auth/refresh', { refreshToken: login.data.tokens.refreshToken }, { expect: [401] }); // reuse detection
  token = (await call('POST', '/auth/login', { email: 'priya@example.com', password: 'secret123' })).data.tokens.accessToken;
  void refreshed;

  const members = await call('GET', '/members');
  const self = members.data.items[0];
  const papa = (await call('POST', '/members', { name: 'Ramesh', relation: 'FATHER', dob: '1958-03-02', bloodGroup: 'O+', allergies: [{ name: 'Penicillin', severity: 'SEVERE' }] })).data.member;
  const baby = await call('POST', '/members', { name: 'Kiara', relation: 'DAUGHTER', dob: new Date(Date.now() - 200 * 86400000).toISOString() });
  console.log(`  baby vaccines auto-scheduled: ${baby.data.vaccinesScheduled}`);
  await call('PATCH', `/members/${self._id}`, { bloodGroup: 'B+', heightCm: 165, weightKg: 70, lifestyle: { smoking: 'NEVER', activity: 'MODERATE', sleepHours: 7 } });

  const safety = await call('POST', '/medicines/check', { member: papa._id, name: 'Augmentin 625' });
  console.log(`  allergy warnings for Augmentin: ${safety.data.warnings.map((w) => w.kind + ':' + w.severity).join(', ')}`);
  const med = (await call('POST', '/medicines', { member: papa._id, name: 'Glycomet', strength: '500 mg', times: ['20:00', '08:00'], stock: 6, refillAt: 4 })).data.medicine;
  await call('POST', '/medicines', { member: papa._id, name: 'Warf 5', times: ['21:00'] });
  await call('POST', '/medicines', { member: papa._id, name: 'Combiflam', times: ['14:00'] });
  await call('POST', '/medicines/doses', { medicine: med._id, date: key, time: '08:00', status: 'TAKEN' });
  await call('POST', '/medicines/doses', { medicine: med._id, date: key, time: '09:00', status: 'TAKEN' }, { expect: [400] });
  const meds = await call('GET', '/medicines');
  console.log(`  stock after dose: ${meds.data.items.find((m) => m._id === med._id).stockInfo.stock}`);
  await call('GET', `/medicines/doses?date=${key}`);
  await call('GET', '/medicines/adherence?days=7');
  const so = await call('GET', '/medicines/safety');
  console.log(`  household safety warnings: ${so.data.items.flatMap((i) => i.warnings.map((w) => w.title)).join(' | ')}`);
  await call('POST', `/medicines/${med._id}/refill`, { quantity: 30 });

  await call('POST', '/vitals', { member: papa._id, type: 'BP', value: 150, value2: 95 });
  await call('POST', '/vitals', { member: papa._id, type: 'BP', value: 150 }, { expect: [400] });
  await call('POST', '/vitals', { member: papa._id, type: 'SUGAR_FASTING', value: 132 });
  // Trust layers: impossible values, unit mistakes and future dates are refused.
  const bad = await call('POST', '/vitals', { member: papa._id, type: 'BP', value: 1400, value2: 90 }, { expect: [400] });
  console.log(`  rejects BP 1400/90: ${bad.message}`);
  const unit = await call('POST', '/vitals', { member: papa._id, type: 'SUGAR_FASTING', value: 5.6 }, { expect: [400] });
  console.log(`  unit hint: ${unit.message}`);
  await call('POST', '/vitals', { member: papa._id, type: 'BP', value: 120, value2: 80, at: new Date(Date.now() + 3 * 86400000) }, { expect: [400] });
  const tomorrow = new Date(Date.now() + 3 * 86400000);
  const futureKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await call('POST', '/medicines/doses', { medicine: med._id, date: futureKey, time: '08:00', status: 'TAKEN' }, { expect: [400] });
  await call('PATCH', `/members/${papa._id}`, { dob: '2099-01-01' }, { expect: [400] });
  await call('POST', '/medicines', { member: papa._id, name: 'Test', times: ['09:00'], startDate: '2026-05-10', endDate: '2026-05-01' }, { expect: [400] });
  await call('GET', `/vitals?member=${papa._id}&type=BP`);
  await call('GET', '/vitals/latest');
  await call('GET', '/vitals/types');

  const fd = new FormData();
  fd.append('member', papa._id);
  fd.append('title', 'Blood test');
  fd.append('category', 'LAB_REPORT');
  fd.append('tags', 'sugar, annual');
  fd.append('file', new Blob(['%PDF-1.4 smoke'], { type: 'application/pdf' }), 'report.pdf');
  const rec = (await call('POST', '/records', null, { form: fd })).data.record;
  await call('GET', '/records?q=blood');
  await call('GET', `/records/${rec._id}/file`);
  await call('POST', `/records/${rec._id}/extract`, {}, { expect: [503] });
  await call('POST', `/records/${rec._id}/values`, { values: [{ type: 'HBA1C', value: 7.2 }] });

  const rem = (await call('POST', '/reminders', { member: papa._id, title: 'Cardio follow-up', dueAt: new Date(Date.now() + 3 * 86400000), repeat: 'QUARTERLY' })).data.reminder;
  const done = await call('POST', `/reminders/${rem._id}/complete`, {});
  console.log(`  next reminder rolled to: ${done.data.next?.dueAt}`);
  await call('GET', '/vaccines');
  await call('POST', `/vaccines/generate/${papa._id}`);
  await call('POST', '/expenses', { member: papa._id, category: 'MEDICINES', amount: 540, taxDeductible: true });
  await call('POST', '/expenses', { category: 'OTHER', amount: -5 }, { expect: [400] });
  await call('GET', '/expenses/summary');

  const feed = await call('GET', `/today?date=${key}`);
  console.log(`  today: ${feed.data.doses.length} doses, ${feed.data.alerts.length} alerts, readiness ${feed.data.readiness.score}%`);
  const scores = await call('GET', '/scores');
  console.log(`  health checks: ${scores.data.items.map((s) => `${s.member.name}=${s.onTrack}/${s.assessed}`).join(', ')}`);
  await call('GET', '/readiness');
  const brief = await call('GET', `/members/${papa._id}/brief?ai=1`);
  console.log(`  brief flags: ${brief.data.brief.flags.join(' | ')}`);
  const asst = await call('POST', '/assistant', { message: 'What medicines does Ramesh take?' });
  console.log(`  assistant (${asst.data.mode}): ${asst.data.reply.split('\n')[0]}`);
  const sos = await call('POST', '/assistant', { message: 'papa has chest pain' });
  console.log(`  assistant emergency mode: ${sos.data.mode}`);
  await call('GET', '/kit');
  await call('PUT', '/kit', { items: [{ key: 'bandages', have: true }, { key: 'nope', have: true }] });

  const papaFull = (await call('GET', `/members/${papa._id}`)).data.member;
  const tokenBackup = token; token = '';
  const card = await call('GET', `/public/emergency/${papaFull.emergencyToken}`);
  console.log(`  emergency card: ${card.data.card.name}, ${card.data.card.bloodGroup}, allergies ${card.data.card.allergies.map((x) => x.name)}`);
  await call('GET', '/public/emergency/notarealtoken', null, { expect: [404] });
  token = tokenBackup;

  const link = (await call('POST', '/share', { member: papa._id, duration: '24h', records: [rec._id] })).data.link;
  token = '';
  await call('GET', `/public/share/${link.token}`);
  await call('GET', `/public/share/${link.token}/records/${rec._id}/file`);
  token = tokenBackup;
  await call('POST', `/share/${link._id}/revoke`);
  token = '';
  await call('GET', `/public/share/${link.token}`, null, { expect: [410] });
  token = tokenBackup;

  const cal = await call('POST', '/auth/calendar', {});
  const icsPath = new URL(cal.data.url).pathname.replace(/^\/api/, '');
  token = '';
  const ics = await call('GET', icsPath);
  console.log(`  ics events: ${(ics.match(/BEGIN:VEVENT/g) || []).length}`);
  token = tokenBackup;

  // ---- Care Circle -----------------------------------------------------------
  const ownerToken = token;
  const ownerId = (await call('GET', '/auth/me')).data.user._id;
  const inv = await call('POST', '/circle/invites', { email: 'sibling@example.com', role: 'CAREGIVER', label: 'Sister' });
  const inviteToken = inv.data.url.split('/invite/')[1];
  const viewInv = await call('POST', '/circle/invites', { email: 'viewer@example.com', role: 'VIEWER' });
  token = '';
  const prev = await call('GET', `/public/invites/${inviteToken}`);
  console.log(`  invite preview: ${prev.data.ownerName}, role ${prev.data.role}`);
  // Someone else holding the forwarded link cannot use it.
  token = (await call('POST', '/auth/register', { name: 'Wrong Person', email: 'wrong@example.com', password: 'secret123' })).data.tokens.accessToken;
  await call('POST', `/invites/${inviteToken}/accept`, {}, { expect: [403] });
  await call('GET', '/members', null, { household: ownerId, expect: [403] });
  token = (await call('POST', '/auth/register', { name: 'Sneha Sibling', email: 'sibling@example.com', password: 'secret123' })).data.tokens.accessToken;
  const acc = await call('POST', `/invites/${inviteToken}/accept`, {});
  await call('POST', `/invites/${inviteToken}/accept`, {}, { expect: [410] });
  const hh = await call('GET', '/households');
  console.log(`  sibling households: ${hh.data.items.map((h) => `${h.name}(${h.role})`).join(', ')}`);
  const sibMembers = await call('GET', '/members', null, { household: acc.data.householdId });
  console.log(`  sibling sees ${sibMembers.data.items.length} members of the owner's family`);
  const sibMeds = await call('GET', '/medicines', null, { household: ownerId });
  const sibMed = sibMeds.data.items[0];
  await call('POST', '/medicines/doses', { medicine: sibMed._id, date: key, time: sibMed.times[0], status: 'TAKEN' }, { household: ownerId });
  const bySib = await call('GET', `/medicines/doses?date=${key}`, null, { household: ownerId });
  console.log(`  dose marked by: ${bySib.data.items.find((d) => d.medicine._id === sibMed._id && d.time === sibMed.times[0])?.byName}`);
  await call('DELETE', `/members/${papa._id}`, null, { household: ownerId, expect: [403] });
  await call('POST', '/circle/invites', { email: 'x@example.com' }, { household: ownerId, expect: [403] });
  const sibVital = await call('POST', '/vitals', { member: papa._id, type: 'BP', value: 190, value2: 115 }, { household: ownerId });
  console.log(`  sibling logged critical BP: ${sibVital.data.reading.status}`);
  // Viewer is read-only.
  token = (await call('POST', '/auth/register', { name: 'View Only', email: 'viewer@example.com', password: 'secret123' })).data.tokens.accessToken;
  await call('POST', `/invites/${viewInv.data.url.split('/invite/')[1]}/accept`, {});
  await call('GET', '/today', null, { household: ownerId });
  await call('POST', '/vitals', { member: papa._id, type: 'BP', value: 120, value2: 80 }, { household: ownerId, expect: [403] });
  // Owner sees the activity and the critical-reading alert.
  token = ownerToken;
  const feedAct = await call('GET', '/circle/activity');
  console.log(`  activity: ${feedAct.data.items.slice(0, 3).map((a) => a.text).join(' | ')}`);
  const notes = await call('GET', '/notifications');
  console.log(`  owner notifications: ${notes.data.unread} unread — ${notes.data.items.map((n) => n.title).join(' | ')}`);
  const { scanMissedDoses } = await import('../services/circleService.js');
  const late = new Date(); late.setHours(23, 30, 0, 0);
  const missed = await scanMissedDoses({ now: late });
  const missedAgain = await scanMissedDoses({ now: late });
  console.log(`  missed-dose alerts created: ${missed}, on re-run: ${missedAgain} (deduplicated)`);
  const circleNow = await call('GET', '/circle');
  console.log(`  circle: ${circleNow.data.members.map((m) => `${m.user.name}(${m.role})`).join(', ')}, pending invites ${circleNow.data.invites.length}`);
  const weekly = await call('GET', '/circle/report?days=7');
  console.log(`  weekly report: ${weekly.data.people.map((p) => `${p.member.name}=${p.adherence ?? '—'}%`).join(', ')}`);
  await call('POST', '/notifications/read', {});

  await call('GET', '/auth/export');
  await call('DELETE', `/members/${self._id}`, null, { expect: [400] });
  await call('DELETE', `/members/${papa._id}`);

  token = '';
  const demo = await call('POST', '/auth/demo');
  token = demo.data.tokens.accessToken;
  const dfeed = await call('GET', `/today?date=${key}`);
  console.log(`  demo today: ${dfeed.data.doses.length} doses, ${dfeed.data.alerts.length} alerts, upcoming ${dfeed.data.upcoming.length}, readiness ${dfeed.data.readiness.score}%, adherence ${dfeed.data.adherence.pct}%`);
  console.log(`  demo alerts: ${dfeed.data.alerts.map((x) => x.title).join(' | ')}`);
  const dscores = await call('GET', '/scores');
  console.log(`  demo health checks: ${dscores.data.items.map((s) => `${s.member.name.split(' ')[0]}=${s.onTrack}/${s.assessed}`).join(', ')}`);
  await call('GET', '/members?withScores=1');
  const house = await call('GET', '/predict');
  console.log(`  predict radar: ${house.data.members.map((r) => `${r.member.name.split(' ')[0]}=${r.cardio ? `${r.cardio.risk}%/ha${r.cardio.heartAge}` : '—'}`).join(', ')}`);
  console.log(`  predict insights: ${house.data.insights.slice(0, 4).map((i) => i.title).join(' | ')}`);
  const papaId = house.data.members.find((r) => r.member.relation === 'FATHER').member._id;
  const rep = await call('GET', `/predict/${papaId}`);
  console.log(`  papa forecasts: ${rep.data.forecasts.map((f) => `${f.type}:${f.direction}`).join(', ')}`);
  const sim = await call('POST', `/predict/${papaId}/simulate`, { sbp: 118 });
  console.log(`  what-if SBP 118: ${sim.data.baseline.risk}% → ${sim.data.risk}%`);
  const dfeed2 = await call('GET', `/today?date=${key}`);
  console.log(`  today predictions: ${dfeed2.data.predictions.insights.length} insights, doses at risk: ${dfeed2.data.doses.filter((d) => d.missRisk).map((d) => `${d.medicine.name}@${d.time} ${d.missRisk}%`).join(', ')}`);
  const br = await call('GET', `/members/${papaId}/brief`);
  console.log(`  brief outlook: cvd ${br.data.brief.outlook?.cardio?.risk}% trends ${br.data.brief.outlook?.trends.length}`);
  const ask = await call('POST', '/assistant', { message: "what's papa's heart risk?" });
  console.log(`  assistant risk (${ask.data.mode}): ${ask.data.reply.replace(/\n/g, ' ').slice(0, 140)}`);
  const asst2 = await call('POST', '/assistant', { message: "what was papa's latest bp?" });
  console.log(`  assistant: ${asst2.data.reply.replace(/\n/g, ' ').slice(0, 160)}`);
  await call('DELETE', '/auth/me', { confirm: 'DELETE' });
  await call('GET', '/auth/me', null, { expect: [401] });
} catch (err) {
  failures += 1;
  console.error(err);
} finally {
  server.close();
  await disconnectDB();
  fs.rmSync('uploads-smoke', { recursive: true, force: true });
  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}
