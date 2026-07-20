import axios from 'axios';

function normalizeApiUrl(value) {
  const baseUrl = (value || 'http://localhost:5000').replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

const api = axios.create({
  baseURL: normalizeApiUrl(import.meta.env.VITE_API_URL)
});

export default api;
