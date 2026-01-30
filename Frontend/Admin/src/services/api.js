import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
});

// Add API key interceptor
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('fx-notify-api-key');
  if (apiKey) config.headers['X-API-Key'] = apiKey;
  return config;
});

// Health
export const getHealth = () => api.get('/api/health');
export const getHealthStats = () => api.get('/api/health/stats');

// Notifications / Outbox
export const getNotificationHistory = (params) =>
  api.get('/api/notifications/history', { params });
export const getNotificationStatus = (id) =>
  api.get(`/api/notifications/${id}/status`);
export const retryNotification = (id) =>
  api.post(`/api/notifications/${id}/retry`);
export const queueNotification = (data) =>
  api.post('/api/notifications/queue', data);

// Templates
export const getTemplates = () => api.get('/api/templates');
export const getTemplate = (id) => api.get(`/api/templates/${id}`);
export const previewTemplate = (data) =>
  api.post('/api/templates/preview', data);

// Tasks
export const getTasks = () => api.get('/api/tasks');
export const getTask = (id) => api.get(`/api/tasks/${id}`);
export const updateTaskStatus = (id, status) =>
  api.put(`/api/tasks/${id}/status`, { status });

// Profiles
export const getProfiles = () => api.get('/api/profiles');
export const getProfile = (id) => api.get(`/api/profiles/${id}`);

export default api;
