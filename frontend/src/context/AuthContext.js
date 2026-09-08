import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rms_admin')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rms_token');
    if (token) {
      authAPI.me()
        .then((res) => setAdmin(res.data.data))
        .catch(() => { localStorage.removeItem('rms_token'); localStorage.removeItem('rms_admin'); setAdmin(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { admin: adminData, token } = res.data.data;
    localStorage.setItem('rms_token', token);
    localStorage.setItem('rms_admin', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    const { admin: adminData, token } = res.data.data;
    localStorage.setItem('rms_token', token);
    localStorage.setItem('rms_admin', JSON.stringify(adminData));
    setAdmin(adminData);
    return adminData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_admin');
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
