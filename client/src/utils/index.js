import { clsx } from 'clsx';

/**
 * Merge CSS class names conditionally.
 * Uses clsx for conditional class joining.
 * 
 * @param  {...any} inputs - Class names, arrays, or objects
 * @returns {string} Merged class string
 * 
 * @example
 * classNames('base', isActive && 'active', { 'disabled': isDisabled })
 */
export function classNames(...inputs) {
  return clsx(inputs);
}

export function formatDate(date, formatStr = 'PPP') {
  if (!date) return '';
  const d = new Date(date);
  // Simple format for now (e.g. "Oct 12, 2023")
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatRelativeTime(date) {
  if (!date) return '';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const daysDifference = Math.round((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return rtf.format(daysDifference, 'day');
}

export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function calculateBMI(heightCm, weightKg) {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
}

export function getBMICategory(bmi) {
  if (!bmi) return 'Unknown';
  const val = parseFloat(bmi);
  if (val < 18.5) return 'Underweight';
  if (val >= 18.5 && val < 25) return 'Normal weight';
  if (val >= 25 && val < 30) return 'Overweight';
  return 'Obese';
}

export function getStatusColor(status) {
  const s = status?.toLowerCase() || '';
  if (s.includes('normal') || s.includes('good') || s.includes('active')) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
  if (s.includes('warning') || s.includes('elevated') || s.includes('overweight')) return 'text-amber-500 bg-amber-50 border-amber-200';
  if (s.includes('danger') || s.includes('critical') || s.includes('obese') || s.includes('underweight')) return 'text-rose-500 bg-rose-50 border-rose-200';
  return 'text-blue-500 bg-blue-50 border-blue-200';
}
