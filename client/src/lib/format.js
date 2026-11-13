const IN = 'en-IN';

export const todayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const shiftKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d + days));
};

export const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDate = (d, opts = {}) => (d ? new Date(d).toLocaleDateString(IN, { day: 'numeric', month: 'short', year: 'numeric', ...opts }) : '—');
export const fmtShort = (d) => (d ? new Date(d).toLocaleDateString(IN, { day: 'numeric', month: 'short' }) : '—');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString(IN, { hour: 'numeric', minute: '2-digit' }) : '');
export const fmtDateTime = (d) => (d ? `${fmtShort(d)}, ${fmtTime(d)}` : '—');
export const fmtWeekday = (d) => new Date(d).toLocaleDateString(IN, { weekday: 'long', day: 'numeric', month: 'long' });

/** "08:30" → "8:30 am" */
export const fmtClock = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const relDays = (d) => {
  if (!d) return '';
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  const n = Math.round((b - a) / 86400000);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return `In ${n} days`;
  if (n < -1 && n > -7) return `${-n} days ago`;
  if (n >= 7 && n < 60) return `In ${Math.round(n / 7)} wk`;
  if (n <= -7 && n > -60) return `${Math.round(-n / 7)} wk ago`;
  if (n >= 60 && n < 548) return `In ${Math.round(n / 30.4)} mo`;
  if (n <= -60 && n > -548) return `${Math.round(-n / 30.4)} mo ago`;
  return n > 0 ? `In ${Math.round(n / 365)} yr` : `${Math.round(-n / 365)} yr ago`;
};

export const daysFromNow = (d) => {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

export const inr = (n, { compact = false } = {}) => {
  if (n === null || n === undefined) return '—';
  if (compact && Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (compact && Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${Math.round(n).toLocaleString(IN)}`;
};

export const bytes = (n) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
};

export const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
export const firstName = (name = '') => name.trim().split(/\s+/)[0] || name;

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const toInputDate = (d) => (d ? todayKey(d) : '');
export const toInputDateTime = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${todayKey(x)}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};

