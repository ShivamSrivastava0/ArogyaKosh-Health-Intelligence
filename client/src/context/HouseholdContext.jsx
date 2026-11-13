import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, activeHousehold } from '../api/client';
import { clearCache } from '../hooks/useApi';
import { useAuth } from './AuthContext';

const Ctx = createContext({ households: [], active: null, role: 'OWNER', switchTo: () => {}, reload: () => {} });

/**
 * Which family the app is showing. Users see their own household plus any
 * they've joined through Care Circle. Switching remounts the app subtree so no
 * data from one family can leak into another's screens.
 */
export function HouseholdProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState([]);
  const [active, setActive] = useState(() => activeHousehold.get() || user?._id);

  const reload = useCallback(async () => {
    try {
      const { items } = await api.get('/households');
      setHouseholds(items);
      // If the saved household is no longer accessible (removed from circle), fall back to own.
      if (!items.some((h) => h._id === activeHousehold.get())) {
        activeHousehold.set(null);
        setActive(user._id);
      }
    } catch { /* keep current */ }
  }, [user?._id]);

  useEffect(() => { reload(); }, [reload]);

  const switchTo = useCallback((id) => {
    activeHousehold.set(id === user._id ? null : id);
    clearCache();
    setActive(id);
    navigate('/app');
  }, [user?._id, navigate]);

  const value = useMemo(() => {
    const current = households.find((h) => h._id === active) || { _id: user?._id, role: 'OWNER', name: 'My family' };
    return { households, active: current._id, current, role: current.role, isOwner: current.role === 'OWNER', canWrite: current.role !== 'VIEWER', switchTo, reload };
  }, [households, active, user?._id, switchTo, reload]);

  return <Ctx.Provider value={value}><div key={value.active}>{children}</div></Ctx.Provider>;
}

export const useHousehold = () => useContext(Ctx);
