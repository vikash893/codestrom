import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mediresq_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mediresq_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          setProfile(res.data.profile);
          localStorage.setItem('mediresq_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.warn('Session expired or invalid:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    fetchMe();
  }, [token]);

  const login = async (phoneOrEmail, password) => {
    const res = await api.post('/auth/login', { phoneOrEmail, password });
    const { token: newToken, user: newUser, profile: newProfile } = res.data;
    setToken(newToken);
    setUser(newUser);
    setProfile(newProfile);
    localStorage.setItem('mediresq_token', newToken);
    localStorage.setItem('mediresq_user', JSON.stringify(newUser));
    return res.data;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { token: newToken, user: newUser, profile: newProfile } = res.data;
    setToken(newToken);
    setUser(newUser);
    setProfile(newProfile);
    localStorage.setItem('mediresq_token', newToken);
    localStorage.setItem('mediresq_user', JSON.stringify(newUser));
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('mediresq_token');
    localStorage.removeItem('mediresq_user');
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, loading, login, register, logout, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
