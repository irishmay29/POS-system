import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

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

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    api.clearTokens();
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ user, token, refreshToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
