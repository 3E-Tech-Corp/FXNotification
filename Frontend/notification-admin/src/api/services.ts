import apiClient from './client';
import type {
  Profile,
  Application,
  EmailTemplate,
  Task,
  OutboxItem,
  HistoryItem,
  AuditItem,
  SelectOption,
} from '@/types';

// ==================== Profiles ====================

export const profilesApi = {
  getAll: async (): Promise<Profile[]> => {
    const response = await apiClient.get('/profiles');
    return response.data;
  },

  getById: async (id: number): Promise<Profile> => {
    const response = await apiClient.get(`/profiles/${id}`);
    return response.data;
  },

  create: async (profile: Omit<Profile, 'ProfileId'>): Promise<Profile> => {
    const response = await apiClient.post('/profiles', profile);
    return response.data;
  },

  update: async (id: number, profile: Partial<Profile>): Promise<Profile> => {
    const response = await apiClient.put(`/profiles/${id}`, profile);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/profiles/${id}`);
  },
};

// ==================== Applications ====================

export const applicationsApi = {
  getAll: async (): Promise<Application[]> => {
    const response = await apiClient.get('/applications');
    return response.data;
  },

  getById: async (id: number): Promise<Application> => {
    const response = await apiClient.get(`/applications/${id}`);
    return response.data;
  },

  create: async (app: Omit<Application, 'App_ID'>): Promise<Application> => {
    const response = await apiClient.post('/applications', app);
    return response.data;
  },

  update: async (id: number, app: Partial<Application>): Promise<Application> => {
    const response = await apiClient.put(`/applications/${id}`, app);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/applications/${id}`);
  },
};

// ==================== Email Templates ====================

export const templatesApi = {
  getAll: async (appId?: number): Promise<EmailTemplate[]> => {
    const params = appId ? { appId } : {};
    const response = await apiClient.get('/templates', { params });
    return response.data;
  },

  getById: async (id: number): Promise<EmailTemplate> => {
    const response = await apiClient.get(`/templates/${id}`);
    return response.data;
  },

  create: async (template: Omit<EmailTemplate, 'ET_ID'>): Promise<EmailTemplate> => {
    const response = await apiClient.post('/templates', template);
    return response.data;
  },

  update: async (id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const response = await apiClient.put(`/templates/${id}`, template);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/templates/${id}`);
  },
};

// ==================== Tasks ====================

export const tasksApi = {
  getAll: async (appId?: number): Promise<Task[]> => {
    const params = appId ? { appId } : {};
    const response = await apiClient.get('/tasks', { params });
    return response.data;
  },

  getById: async (id: number): Promise<Task> => {
    const response = await apiClient.get(`/tasks/${id}`);
    return response.data;
  },

  create: async (task: Omit<Task, 'Task_ID'>): Promise<Task> => {
    const response = await apiClient.post('/tasks', task);
    return response.data;
  },

  update: async (id: number, task: Partial<Task>): Promise<Task> => {
    const response = await apiClient.put(`/tasks/${id}`, task);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};

// ==================== Outbox ====================

export const outboxApi = {
  getAll: async (): Promise<OutboxItem[]> => {
    const response = await apiClient.get('/outbox');
    return response.data;
  },

  getById: async (id: number): Promise<OutboxItem> => {
    const response = await apiClient.get(`/outbox/${id}`);
    return response.data;
  },

  update: async (id: number, item: Partial<OutboxItem>): Promise<OutboxItem> => {
    const response = await apiClient.put(`/outbox/${id}`, item);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/outbox/${id}`);
  },

  retry: async (id: number): Promise<void> => {
    await apiClient.post(`/outbox/${id}/retry`);
  },
};

// ==================== History ====================

export const historyApi = {
  getAll: async (): Promise<HistoryItem[]> => {
    const response = await apiClient.get('/history');
    return response.data;
  },

  getById: async (id: number): Promise<HistoryItem> => {
    const response = await apiClient.get(`/history/${id}`);
    return response.data;
  },

  retry: async (id: number): Promise<void> => {
    await apiClient.post(`/history/${id}/retry`);
  },

  getAudit: async (id: number): Promise<AuditItem[]> => {
    const response = await apiClient.get(`/history/${id}/audit`);
    return response.data;
  },
};

// ==================== Lookup Data ====================

export const lookupsApi = {
  getSecurityModes: async (): Promise<SelectOption[]> => {
    const response = await apiClient.get('/lookups/security-modes');
    return response.data;
  },

  getTaskStatuses: async (): Promise<SelectOption[]> => {
    const response = await apiClient.get('/lookups/task-statuses');
    return response.data;
  },

  getTaskTypes: async (): Promise<SelectOption[]> => {
    const response = await apiClient.get('/lookups/task-types');
    return response.data;
  },

  getMailPriorities: async (): Promise<SelectOption[]> => {
    const response = await apiClient.get('/lookups/mail-priorities');
    return response.data;
  },

  getOutboxStatuses: async (): Promise<SelectOption[]> => {
    const response = await apiClient.get('/lookups/outbox-statuses');
    return response.data;
  },
};
