import Member from '../models/Member.js';
import Medicine from '../models/Medicine.js';
import Reminder from '../models/Reminder.js';
import Vaccination from '../models/Vaccination.js';

const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const utc = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dateOnly = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
};
const fold = (line) => {
  const chars = Array.from(line);
  if (chars.length <= 70) return line;
  const parts = [];
  for (let i = 0; i < chars.length; i += 70) parts.push(chars.slice(i, i + 70).join(''));
  return parts.join('\r\n ');
};
/** Floating local time (no Z): calendar apps render it in the viewer's own zone. */
const floating = (dateKeyDate, hh, mm) => `${dateOnly(dateKeyDate)}T${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;

const RRULE = { MONTHLY: 'FREQ=MONTHLY', QUARTERLY: 'FREQ=MONTHLY;INTERVAL=3', HALF_YEARLY: 'FREQ=MONTHLY;INTERVAL=6', YEARLY: 'FREQ=YEARLY' };
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * iCalendar feed with appointments, vaccinations and daily medicine
 * alarms. Subscribe from Google Calendar / Apple Calendar via URL.
 */
export const buildCalendar = async (ownerId) => {
  const [members, reminders, vaccines, meds] = await Promise.all([
    Member.find({ owner: ownerId }).select('name'),
    Reminder.find({ owner: ownerId, status: 'UPCOMING' }),
    Vaccination.find({ owner: ownerId, givenDate: null, dueDate: { $ne: null } }),
    Medicine.find({ owner: ownerId, active: true, 'times.0': { $exists: true } }),
  ]);
  const nameOf = new Map(members.map((m) => [String(m._id), m.name]));
  const stamp = utc(new Date());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ArogyaKosh//Family Health//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:ArogyaKosh — Family health', 'X-PUBLISHED-TTL:PT6H', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H'];

  for (const r of reminders) {
    const end = new Date(new Date(r.dueAt).getTime() + 60 * 60000);
    lines.push('BEGIN:VEVENT', `UID:rem-${r._id}@arogyakosh`, `DTSTAMP:${stamp}`, `DTSTART:${utc(r.dueAt)}`, `DTEND:${utc(end)}`,
      `SUMMARY:${esc(`${r.title} — ${nameOf.get(String(r.member)) || ''}`)}`,
      `DESCRIPTION:${esc([r.doctor && `Doctor: ${r.doctor}`, r.notes].filter(Boolean).join('\n'))}`,
      ...(r.location ? [`LOCATION:${esc(r.location)}`] : []),
      ...(RRULE[r.repeat] ? [`RRULE:${RRULE[r.repeat]}`] : []),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-PT2H', 'END:VALARM', 'END:VEVENT');
  }
  for (const v of vaccines) {
    lines.push('BEGIN:VEVENT', `UID:vac-${v._id}@arogyakosh`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${dateOnly(v.dueDate)}`,
      `SUMMARY:${esc(`Vaccine: ${v.name} (${v.dose}) — ${nameOf.get(String(v.member)) || ''}`)}`, 'END:VEVENT');
  }
  for (const m of meds) {
    const start = new Date(Math.max(new Date(m.startDate || Date.now()).getTime(), Date.now() - 86400000));
    for (const t of m.times) {
      const [hh, mm] = t.split(':').map(Number);
      const rule = ['FREQ=DAILY'];
      if (m.daysOfWeek?.length && m.daysOfWeek.length < 7) { rule[0] = 'FREQ=WEEKLY'; rule.push(`BYDAY=${m.daysOfWeek.map((d) => BYDAY[d]).join(',')}`); }
      if (m.endDate) rule.push(`UNTIL=${dateOnly(m.endDate)}T235959`);
      lines.push('BEGIN:VEVENT', `UID:med-${m._id}-${t.replace(':', '')}@arogyakosh`, `DTSTAMP:${stamp}`, `DTSTART:${floating(start, hh, mm)}`, 'DURATION:PT10M',
        `SUMMARY:${esc(`💊 ${m.name} ${m.strength} — ${nameOf.get(String(m.member)) || ''}`)}`, `RRULE:${rule.join(';')}`,
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Medicine time', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    }
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n');
};
