import { createContext, useContext, useMemo } from 'react';
import { useApi } from '../hooks/useApi';

const FamilyContext = createContext({ members: [], byId: new Map(), loading: true, config: {} });

/** Household members + server feature flags, available everywhere inside the app. */
export function FamilyProvider({ children }) {
  const { data, loading, reload } = useApi('/members');
  const { data: config } = useApi('/config');
  const value = useMemo(() => {
    const members = data?.items || [];
    return {
      members,
      byId: new Map(members.map((m) => [m._id, m])),
      self: members.find((m) => m.isSelf),
      loading,
      reload,
      config: config || {},
    };
  }, [data, loading, reload, config]);
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export const useFamily = () => useContext(FamilyContext);
