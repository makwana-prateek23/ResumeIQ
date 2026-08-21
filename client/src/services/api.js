import axios from 'axios';

function normalizeApiUrl(value) {
  const baseUrl = (value || 'http://localhost:5000').replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

export const apiBaseUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
const api = axios.create({ baseURL: apiBaseUrl });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('resumeiq-auth-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
