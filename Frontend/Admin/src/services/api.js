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

// Helper to unwrap ApiResponse wrapper: { success, data, message }
const unwrap = (res) => res.data?.data ?? res.data;

// ── Health ──────────────────────────────────────────────────────
export const getHealth = () => api.get('/api/health');
export const getHealthStats = () => api.get('/api/health/stats');

// ── Profiles ────────────────────────────────────────────────────
export const getProfiles = () => api.get('/api/profiles').then(unwrap);
export const getProfile = (id) => api.get(`/api/profiles/${id}`).then(unwrap);
export const createProfile = (data) => api.post('/api/profiles', data).then(unwrap);
export const updateProfile = (id, data) => api.put(`/api/profiles/${id}`, data).then(unwrap);
export const generateProfileKey = (id) => api.post(`/api/profiles/${id}/generate-key`).then(unwrap);
export const revokeProfileKey = (id) => api.delete(`/api/profiles/${id}/key`).then(unwrap);

// ── Tasks ───────────────────────────────────────────────────────
export const getTasks = () => api.get('/api/tasks').then(unwrap);
export const getTask = (id) => api.get(`/api/tasks/${id}`).then(unwrap);
export const createTask = (data) => api.post('/api/tasks', data).then(unwrap);
export const updateTask = (id, data) => api.put(`/api/tasks/${id}`, data).then(unwrap);
export const updateTaskStatus = (id, status) =>
  api.put(`/api/tasks/${id}/status`, { status }).then(unwrap);

// ── Templates ───────────────────────────────────────────────────
export const getTemplates = () => api.get('/api/templates').then(unwrap);
export const getTemplate = (id) => api.get(`/api/templates/${id}`).then(unwrap);
export const createTemplate = (data) => api.post('/api/templates', data).then(unwrap);
export const updateTemplate = (id, data) => api.put(`/api/templates/${id}`, data).then(unwrap);
export const previewTemplate = (data) =>
  api.post('/api/templates/preview', data).then(unwrap);

// ── Notifications / Queue ───────────────────────────────────────
export const queueNotification = (data) =>
  api.post('/api/notifications/queue', data).then(unwrap);
export const getNotificationStatus = (id) =>
  api.get(`/api/notifications/${id}/status`).then(unwrap);
export const retryNotification = (id) =>
  api.post(`/api/notifications/${id}/retry`).then(unwrap);
export const getNotificationHistory = (params) =>
  api.get('/api/notifications/history', { params }).then(unwrap);

// ── Outbox ──────────────────────────────────────────────────────
export const getOutbox = (params) =>
  api.get('/api/outbox', { params }).then(unwrap);
export const deleteOutbox = (id) =>
  api.delete(`/api/outbox/${id}`).then(unwrap);
export const retryOutbox = (id) =>
  api.post(`/api/outbox/${id}/retry`).then(unwrap);

// ── Apps / API Keys ─────────────────────────────────────────────
export const getApps = () => api.get('/api/apps').then(unwrap);
export const createApp = (data) => api.post('/api/apps', data).then(unwrap);
export const updateApp = (id, data) => api.put(`/api/apps/${id}`, data).then(unwrap);
export const deleteApp = (id) => api.delete(`/api/apps/${id}`).then(unwrap);
export const toggleApp = (id) => api.post(`/api/apps/${id}/toggle`).then(unwrap);
export const regenerateAppKey = (id) => api.post(`/api/apps/${id}/regenerate`).then(unwrap);
export const getAppProfiles = (id) => api.get(`/api/apps/${id}/profiles`).then(unwrap);
export const setAppProfiles = (id, profileIds) =>
  api.put(`/api/apps/${id}/profiles`, profileIds).then(unwrap);

// ── Lookups ─────────────────────────────────────────────────────
export const getSecurityModes = () => api.get('/api/lookup/security-modes').then(unwrap);
export const getTaskStatuses = () => api.get('/api/lookup/task-statuses').then(unwrap);
export const getTaskTypes = () => api.get('/api/lookup/task-types').then(unwrap);

export default api;
