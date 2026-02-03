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

// ── Health ────────────────────────────────────────────────────────────────
export const getHealth = () => api.get('/api/health');
export const getHealthStats = () => api.get('/api/health/stats');

// ── Notifications / History ───────────────────────────────────────────────
export const getNotificationHistory = (params) =>
  api.get('/api/notifications/history', { params });
export const getNotificationStatus = (id) =>
  api.get(`/api/notifications/${id}/status`);
export const retryNotification = (id) =>
  api.post(`/api/notifications/${id}/retry`);
export const queueNotification = (data) =>
  api.post('/api/notifications/queue', data);

// ── Templates ─────────────────────────────────────────────────────────────
export const getTemplates = () => api.get('/api/templates');
export const getTemplate = (id) => api.get(`/api/templates/${id}`);
export const createTemplate = (data) => api.post('/api/templates', data);
export const updateTemplate = (id, data) => api.put(`/api/templates/${id}`, data);
export const previewTemplate = (data) =>
  api.post('/api/templates/preview', data);

// ── Tasks ─────────────────────────────────────────────────────────────────
export const getTasks = () => api.get('/api/tasks');
export const getTask = (id) => api.get(`/api/tasks/${id}`);
export const createTask = (data) => api.post('/api/tasks', data);
export const updateTask = (id, data) => api.put(`/api/tasks/${id}`, data);
export const updateTaskStatus = (id, status) =>
  api.put(`/api/tasks/${id}/status`, { status });

// ── Profiles ──────────────────────────────────────────────────────────────
export const getProfiles = () => api.get('/api/profiles');
export const getProfile = (id) => api.get(`/api/profiles/${id}`);
export const createProfile = (data) => api.post('/api/profiles', data);
export const updateProfile = (id, data) => api.put(`/api/profiles/${id}`, data);
export const generateProfileKey = (id) =>
  api.post(`/api/profiles/${id}/generate-key`);
export const revokeProfileKey = (id) =>
  api.delete(`/api/profiles/${id}/key`);

// ── API Keys ──────────────────────────────────────────────────────────────
export const getApiKeys = () => api.get('/api/apikeys');
export const createApiKey = (data) => api.post('/api/apikeys', data);
export const updateApiKey = (id, data) => api.put(`/api/apikeys/${id}`, data);
export const deleteApiKey = (id) => api.delete(`/api/apikeys/${id}`);
export const toggleApiKey = (id) => api.post(`/api/apikeys/${id}/toggle`);
export const regenerateApiKey = (id) => api.post(`/api/apikeys/${id}/regenerate`);

// ── Outbox ────────────────────────────────────────────────────────────────
export const getOutbox = (params) => api.get('/api/outbox', { params });
export const deleteOutboxItem = (id) => api.delete(`/api/outbox/${id}`);
export const retryOutboxItem = (id) => api.post(`/api/outbox/${id}/retry`);

// ── Lookups ───────────────────────────────────────────────────────────────
export const getSecurityModes = () => api.get('/api/lookups/security-modes');
export const getTaskStatuses = () => api.get('/api/lookups/task-statuses');
export const getTaskTypes = () => api.get('/api/lookups/task-types');
export const getTaskPriorities = () => api.get('/api/lookups/task-priorities');

export default api;
