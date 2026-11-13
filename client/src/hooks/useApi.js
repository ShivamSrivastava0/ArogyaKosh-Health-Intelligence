import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { api, errorMessage } from '../api/client';

/**
 * Tiny query cache.
 * - useApi(path, params) fetches, caches by key and re-renders subscribers.
 * - invalidate('/medicines') refetches every active query whose path starts with it.
 * Keeps pages instant on revisit while always revalidating in the background.
 */
const cache = new Map(); // key -> { data, error, loading, promise, at }
const listeners = new Set();
const fetchers = new Map(); // key -> () => Promise
const refs = new Map(); // key -> number of mounted subscribers

const emit = () => listeners.forEach((l) => l());
const keyOf = (path, params) => (params ? `${path}?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}` : path);

const run = (key) => {
  const fetcher = fetchers.get(key);
  if (!fetcher) return Promise.resolve();
  const prev = cache.get(key) || {};
  if (prev.promise) return prev.promise;
  const promise = fetcher()
    .then((data) => cache.set(key, { data, error: null, loading: false, at: Date.now() }))
    .catch((err) => cache.set(key, { data: prev.data, error: errorMessage(err), loading: false, at: Date.now() }))
    .finally(() => emit());
  cache.set(key, { ...prev, loading: !prev.data, promise });
  emit();
  return promise;
};

export const invalidate = (...prefixes) => {
  const jobs = [];
  for (const key of fetchers.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) jobs.push(run(key));
  }
  for (const key of cache.keys()) {
    if (!fetchers.has(key) && prefixes.some((p) => key.startsWith(p))) cache.delete(key);
  }
  return Promise.all(jobs);
};

export const clearCache = () => {
  cache.clear();
  emit();
};

export const setCached = (path, params, updater) => {
  const key = keyOf(path, params);
  const prev = cache.get(key);
  if (!prev?.data) return;
  cache.set(key, { ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater });
  emit();
};

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useApi(path, params, { enabled = true } = {}) {
  const key = path ? keyOf(path, params) : null;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const snapshot = useSyncExternalStore(subscribe, () => (key ? cache.get(key) : undefined));

  useEffect(() => {
    if (!key || !enabled) return undefined;
    refs.set(key, (refs.get(key) || 0) + 1);
    fetchers.set(key, () => api.get(path, paramsRef.current));
    const cached = cache.get(key);
    if (!cached || !cached.at || Date.now() - cached.at > 1500) run(key);
    return () => {
      const n = (refs.get(key) || 1) - 1;
      if (n <= 0) {
        refs.delete(key);
        fetchers.delete(key);
      } else refs.set(key, n);
    };
  }, [key, enabled, path]);

  const reload = useCallback(() => (key ? run(key) : Promise.resolve()), [key]);

  return {
    data: snapshot?.data,
    error: snapshot?.error || null,
    loading: enabled && Boolean(key) && (!snapshot || snapshot.loading) && !snapshot?.data,
    refreshing: Boolean(snapshot?.promise && snapshot?.data),
    reload,
  };
}
