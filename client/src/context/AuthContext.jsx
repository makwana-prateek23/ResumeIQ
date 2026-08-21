import { useCallback, useMemo, useState } from 'react';
import { AuthContext } from './auth-context.js';
const TOKEN_KEY = 'resumeiq-auth-token';
const USER_KEY = 'resumeiq-auth-user';

function storedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const establishSession = useCallback((payload) => {
    localStorage.setItem(TOKEN_KEY, payload.token);
    if (payload.user) localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    setUser(payload.user ?? { name: 'ResumeIQ user' });
  }, []);
  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setUser(null); }, []);
  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user && localStorage.getItem(TOKEN_KEY)), establishSession, logout }), [user, establishSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
