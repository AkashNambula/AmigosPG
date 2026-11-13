import axios from 'axios';

export const getBackendBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/api$/, '');
  if (import.meta.env.PROD) return '';
  let hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
  if (hostname === 'localhost') hostname = '127.0.0.1';
  return `http://${hostname}:8001`;
};

const getDefaultBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (import.meta.env.PROD) return '/api';
  let hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : '127.0.0.1';
  if (hostname === 'localhost') hostname = '127.0.0.1';
  return `http://${hostname}:8001/api`;
};

const API = axios.create({
  baseURL: getDefaultBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Append Authorization token to every request if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Centralized error interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Suppress raw console errors, extract friendly messages
    let friendlyMessage = 'An unexpected error occurred. Please try again.';
    
    if (error.response) {
      // Server returned error status code
      friendlyMessage = error.response.data?.detail || error.response.data?.message || friendlyMessage;
    } else if (error.request) {
      // Request was made but no response received
      friendlyMessage = 'Could not connect to the server. Please check your network connection.';
    }
    
    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default API;
