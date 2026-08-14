import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Initialize and verify user on mount or token change
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data);
        } catch (error) {
          // Token expired or invalid
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await API.post('/auth/login', { email, password });
      const { access_token, role } = res.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Fetch user profile immediately
      const profileRes = await API.get('/auth/me');
      setUser(profileRes.data);
      return profileRes.data;
    } catch (error) {
      throw error.friendlyMessage || 'Invalid email or password';
    }
  };

  const registerUser = async (userData) => {
    try {
      const res = await API.post('/auth/register', userData);
      return res.data;
    } catch (error) {
      throw error.friendlyMessage || 'Registration failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register: registerUser,
    logout,
    refreshUser: async () => {
      try {
        const res = await API.get('/auth/me');
        setUser(res.data);
      } catch (error) {
        logout();
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
