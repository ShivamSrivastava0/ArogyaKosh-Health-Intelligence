import { 
  HiOutlineHome, 
  HiOutlineUser, 
  HiOutlineUsers, 
  HiOutlineLightBulb, 
  HiOutlineChartBar, 
  HiOutlineDocumentText, 
  HiOutlineQrCode 
} from 'react-icons/hi2';

export const APP_NAME = 'ArogyaKosh';
export const APP_TAGLINE = 'AI-powered Health Intelligence Platform';

export const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: HiOutlineHome },
  { name: 'Health Profile', path: '/profile', icon: HiOutlineUser },
  { name: 'Family Vault', path: '/family', icon: HiOutlineUsers },
  { name: 'Health Intelligence', path: '/intelligence', icon: HiOutlineLightBulb },
  { name: 'Predictions', path: '/predict', icon: HiOutlineChartBar },
  { name: 'Doctor Brief', path: '/doctor-brief', icon: HiOutlineDocumentText },
  { name: 'Emergency Card', path: '/emergency-card', icon: HiOutlineQrCode },
];

export const COLORS = {
  primary: 'emerald',
  accent: 'blue',
  success: 'emerald',
  warning: 'amber',
  danger: 'rose',
  info: 'blue',
};
