import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const fetchTenant = async () => {
    try {
      const res = await API.get('/tenant/me');
      setTenant(res.data);
    } catch (error) {
      setTenant(null);
    }
  };

  // Initialize and verify user on mount or token change
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          setUser(res.data);
          if (res.data?.role !== 'super_admin' && res.data?.tenant_id) {
            await fetchTenant();
          } else {
            setTenant(null);
          }
        } catch (error) {
          // Token expired or invalid
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setTenant(null);
        }
      } else {
        setUser(null);
        setTenant(null);
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password, tenantSlug = null, loginType = null) => {
    try {
      // Clear previous user/tenant state immediately before login
      setUser(null);
      setTenant(null);

      const payload = { email, password };
      if (tenantSlug) payload.tenant_slug = tenantSlug;
      if (loginType) payload.login_type = loginType;

      const res = await API.post('/auth/login', payload);
      const { access_token } = res.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Fetch user profile immediately
      const profileRes = await API.get('/auth/me');
      setUser(profileRes.data);
      if (profileRes.data?.role !== 'super_admin' && profileRes.data?.tenant_id) {
        await fetchTenant();
      } else {
        setTenant(null);
      }
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
    setTenant(null);
  };

  const updateUserProfile = async (profileData) => {
    try {
      const res = await API.put('/auth/me', profileData);
      setUser(res.data);
      return res.data;
    } catch (error) {
      throw error.friendlyMessage || 'Failed to update profile';
    }
  };

  const uploadProfilePhoto = async (photoFile) => {
    try {
      const formData = new FormData();
      formData.append('photo_file', photoFile);
      const res = await API.post('/auth/me/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(res.data);
      return res.data;
    } catch (error) {
      throw error.friendlyMessage || 'Failed to upload profile photo';
    }
  };

  const removeProfilePhoto = async () => {
    try {
      const res = await API.delete('/auth/me/profile-photo');
      setUser(res.data);
      return res.data;
    } catch (error) {
      throw error.friendlyMessage || 'Failed to remove profile photo';
    }
  };

  const value = {
    user,
    tenant,
    token,
    loading,
    login,
    register: registerUser,
    logout,
    fetchTenant,
    updateUserProfile,
    uploadProfilePhoto,
    removeProfilePhoto,
    refreshUser: async () => {
      try {
        const res = await API.get('/auth/me');
        setUser(res.data);
        if (res.data?.tenant_id) {
          await fetchTenant();
        }
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
