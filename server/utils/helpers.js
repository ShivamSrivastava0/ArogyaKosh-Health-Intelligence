import mongoose from 'mongoose';
import ApiError from './ApiError.js';

/** Copy only whitelisted keys that are present on the source. */
export const pick = (src = {}, keys = []) =>
  keys.reduce((acc, k) => {
    if (src[k] !== undefined) acc[k] = src[k];
    return acc;
  }, {});

export const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const assertObjectId = (id, label = 'id') => {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label}`);
  return id;
};

/** YYYY-MM-DD of a Date in local server time. */
export const toDateKey = (d = new Date()) => {
  const x = new Date(d);
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${mm}-${dd}`;
};

export const parseDateKey = (key) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return null;
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
