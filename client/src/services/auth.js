import api, { apiBaseUrl } from './api.js';
export const login = (credentials) => api.post('/auth/login', credentials);
export const signup = (details) => api.post('/auth/signup', details);
export const oauthUrl = (provider) => `${apiBaseUrl}/auth/oauth/${provider}`;
