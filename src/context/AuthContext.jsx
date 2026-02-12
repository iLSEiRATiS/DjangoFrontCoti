import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../lib/api';

const AuthCtx = createContext(null);
const INACTIVITY_MS = 30 * 60 * 1000;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || '');
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!token);
  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!token) return;
      try {
        const { user } = await api.auth.me(token);
        if (!cancelled) setUser(user);
      } catch {
        if (!cancelled) {
          setToken('');
          setUser(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const logoutInternal = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const persistUser = (nextUser) => {
    setUser(nextUser || null);
    if (nextUser) localStorage.setItem('auth_user', JSON.stringify(nextUser));
    else localStorage.removeItem('auth_user');
  };

  useEffect(() => {
    if (!token || !user) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        logoutInternal();
      }, INACTIVITY_MS);
    };

    const onActivity = () => resetTimer();
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [token, user]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isLoggedIn: !!token && !!user, // bandera global usada por ProductCard
      login({ token, user }) {
        setToken(token);
        persistUser(user);
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      },
      updateUser(nextUser) {
        persistUser(nextUser);
      },
      logout() {
        logoutInternal();
      },
    }),
    [token, user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
