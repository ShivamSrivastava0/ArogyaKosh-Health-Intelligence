import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokens } from '../api/client';
import { clearCache } from '../hooks/useApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(tokens.access ? 'loading' : 'guest'); // loading | authed | guest

  const loadUser = useCallback(async () => {
    try {
      const { user: me } = await api.get('/auth/me');
      setUser(me);
      setStatus('authed');
      return me;
    } catch {
      tokens.clear();
      setUser(null);
      setStatus('guest');
      return null;
    }
  }, []);

  useEffect(() => {
    if (tokens.access) loadUser();
    const onSignedOut = () => {
      setUser(null);
      setStatus('guest');
      clearCache();
    };
    window.addEventListener('ak:signed-out', onSignedOut);
    return () => window.removeEventListener('ak:signed-out', onSignedOut);
  }, [loadUser]);

  const startSession = useCallback((data) => {
    tokens.set(data.tokens);
    clearCache();
    setUser(data.user);
    setStatus('authed');
    return data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    status,
    isAuthed: status === 'authed',
    login: async (email, password) => startSession(await api.post('/auth/login', { email, password })),
    register: async (body) => startSession(await api.post('/auth/register', body)),
    demo: async () => startSession(await api.post('/auth/demo')),
    google: async (credential) => startSession(await api.post('/auth/google', { credential })),
    applySession: startSession,
    updateUser: (u) => setUser(u),
    reloadUser: loadUser,
    logout: async () => {
      try { await api.post('/auth/logout', { refreshToken: tokens.refresh }); } catch { /* ignore */ }
      tokens.clear();
      clearCache();
      setUser(null);
      setStatus('guest');
    },
  }), [user, status, startSession, loadUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
