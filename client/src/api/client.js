import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN = 'ak.access';
const REFRESH = 'ak.refresh';

export const tokens = {
  get access() { return localStorage.getItem(TOKEN); },
  get refresh() { return localStorage.getItem(REFRESH); },
  set({ accessToken, refreshToken }) {
    localStorage.setItem(TOKEN, accessToken);
    localStorage.setItem(REFRESH, refreshToken);
  },
  clear() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(REFRESH);
  },
};

// Generous because AI report reading can take a while; normal calls return in ms.
const http = axios.create({ baseURL: API_URL, timeout: 90000 });

http.interceptors.request.use((config) => {
  if (tokens.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

// One refresh request at a time; concurrent 401s wait for it.
let refreshing = null;
const refreshSession = async () => {
  if (!tokens.refresh) throw new Error('No session');
  const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: tokens.refresh });
  tokens.set(data.data.tokens);
  return data.data.tokens.accessToken;
};

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const isAuthCall = /\/auth\/(login|register|refresh|demo|google)/.test(original.url || '');
    if (status === 401 && !original._retry && !isAuthCall && tokens.refresh) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshSession().finally(() => { refreshing = null; });
        const access = await refreshing;
        original.headers.Authorization = `Bearer ${access}`;
        return http(original);
      } catch {
        tokens.clear();
        window.dispatchEvent(new Event('ak:signed-out'));
      }
    }
    return Promise.reject(error);
  },
);

/** Human-readable message from any API error. */
export const errorMessage = (err, fallback = 'Something went wrong') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
  if (err?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  return err?.message || fallback;
};

const unwrap = (p) => p.then((r) => r.data.data);

export const api = {
  get: (url, params) => unwrap(http.get(url, { params })),
  post: (url, body) => unwrap(http.post(url, body)),
  patch: (url, body) => unwrap(http.patch(url, body)),
  put: (url, body) => unwrap(http.put(url, body)),
  delete: (url, body) => unwrap(http.delete(url, { data: body })),
  upload: (url, formData, onProgress) => unwrap(http.post(url, formData, {
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  })),
  /** Fetch a protected file as a blob URL (for preview / download). */
  blob: async (url) => {
    const res = await http.get(url, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
};

export default http;
