import {
  LuHouse, LuUsers, LuPill, LuActivity, LuFileText, LuCalendarDays, LuSyringe, LuWallet, LuSiren, LuSparkles, LuSettings,
} from 'react-icons/lu';

export const NAV = [
  { group: 'Daily', items: [
    { to: '/app', label: 'Today', icon: LuHouse, end: true },
    { to: '/app/medicines', label: 'Medicines', icon: LuPill },
    { to: '/app/appointments', label: 'Appointments', icon: LuCalendarDays },
  ] },
  { group: 'Health', items: [
    { to: '/app/family', label: 'Family', icon: LuUsers },
    { to: '/app/vitals', label: 'Vitals & labs', icon: LuActivity },
    { to: '/app/records', label: 'Health locker', short: 'Records', icon: LuFileText },
    { to: '/app/vaccines', label: 'Vaccines', icon: LuSyringe },
  ] },
  { group: 'Plan', items: [
    { to: '/app/emergency', label: 'Emergency', icon: LuSiren },
    { to: '/app/expenses', label: 'Expenses', icon: LuWallet },
    { to: '/app/assistant', label: 'Ask Kosh', icon: LuSparkles },
  ] },
];

export const SETTINGS = { to: '/app/settings', label: 'Settings', icon: LuSettings };
export const ALL_NAV = [...NAV.flatMap((g) => g.items), SETTINGS];
export const MOBILE_TABS = ['/app', '/app/medicines', '/app/family', '/app/records'];
