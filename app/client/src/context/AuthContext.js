import React, { createContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  
  // Auto-logout configuration
  const INACTIVITY_TIMEOUT = 480 * 60 * 1000; // 30 minutes in milliseconds
  const timeoutRef = useRef(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (user) {
      timeoutRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const setupActivityListeners = () => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  };

  useEffect(() => {
    const stored = localStorage.getItem('auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed.user || null);
      setToken(parsed.token || null);
      setRefreshToken(parsed.refreshToken || null);
      api.setTokens(parsed.token, parsed.refreshToken);
    }
  }, []);

  useEffect(() => {
    if (user) {
      resetTimeout();
      const cleanup = setupActivityListeners();
      return cleanup;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  }, [user]);

  const persist = (nextUser, nextToken, nextRefresh) => {
    const payload = { user: nextUser, token: nextToken, refreshToken: nextRefresh };
    localStorage.setItem('auth', JSON.stringify(payload));
  };

  const login = (nextUser, nextToken, nextRefresh) => {
    setUser(nextUser);
    setToken(nextToken);
    setRefreshToken(nextRefresh);
    api.setTokens(nextToken, nextRefresh);
    persist(nextUser, nextToken, nextRefresh);
  };

  const logout = async () => {
    try {
      if (refreshToken) await api.post('auth/logout', { refreshToken });
    } catch (e) {
      // ignore errors
    }
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    api.clearTokens();
    localStorage.removeItem('auth');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
