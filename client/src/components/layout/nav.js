import {
  LuHouse, LuUsers, LuPill, LuActivity, LuFileText, LuCalendarDays, LuSyringe, LuWallet, LuSiren, LuSparkles, LuSettings, LuBrainCircuit, LuHandHeart, LuDna, LuHospital, LuMessageCircle, LuIdCard,
} from 'react-icons/lu';

export const NAV = [
  { group: 'Daily', items: [
    { to: '/app', label: 'Today', icon: LuHouse, end: true },
    { to: '/app/predict', label: 'ArogyaPredict', short: 'Predict', icon: LuBrainCircuit, badge: 'AI' },
    { to: '/app/medicines', label: 'Medicines', icon: LuPill },
    { to: '/app/whatsapp', label: 'WhatsApp reminders', short: 'WhatsApp', icon: LuMessageCircle },
    { to: '/app/appointments', label: 'Appointments', icon: LuCalendarDays },
  ] },
  { group: 'Health', items: [
    { to: '/app/family', label: 'Family', icon: LuUsers },
    { to: '/app/family-tree', label: 'Family Health Tree', short: 'Tree', icon: LuDna },
    { to: '/app/vitals', label: 'Vitals & labs', icon: LuActivity },
    { to: '/app/records', label: 'Health locker', short: 'Records', icon: LuFileText },
    { to: '/app/abha', label: 'ABHA records', short: 'ABHA', icon: LuIdCard },
    { to: '/app/vaccines', label: 'Vaccines', icon: LuSyringe },
  ] },
  { group: 'Plan', items: [
    { to: '/app/circle', label: 'Care Circle', icon: LuHandHeart },
    { to: '/app/emergency', label: 'Emergency', icon: LuSiren },
    { to: '/app/admission', label: 'Admission kit', short: 'Admission', icon: LuHospital },
    { to: '/app/expenses', label: 'Expenses', icon: LuWallet },
    { to: '/app/assistant', label: 'Ask Kosh', icon: LuSparkles },
  ] },
];

export const SETTINGS = { to: '/app/settings', label: 'Settings', icon: LuSettings };
export const ALL_NAV = [...NAV.flatMap((g) => g.items), SETTINGS];
export const MOBILE_TABS = ['/app', '/app/predict', '/app/medicines', '/app/family'];
