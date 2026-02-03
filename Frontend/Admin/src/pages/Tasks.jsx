import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Search,
  Mail,
  MessageSquare,
  Plus,
  Edit2,
  X,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  getProfiles,
  getTemplates,
} from '../services/api';
import { useToast } from '../App';

const emptyForm = {
  taskCode: '',
  status: 'N',
  mailPriority: 'N',
  profileID: 0,
  templateID: 0,
  templateCode: '',
  taskType: 'E',
  testMailTo: '',
  mailFromName: '',
  mailFrom: '',
  mailTo: '',
  mailCC: '',
  mailBCC: '',
  mainProcName: '',
  lineProcName: '',
  attachmentProcName: '',
  langCode: 'en',
};

export default function Tasks() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Lookups
  const [profiles, setProfiles] = useState([]);
  const [templates, setTemplates] = useState([]);

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await getTasks();
      setTasks(res.data?.data || []);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    try {
      const [pRes, tRes] = await Promise.all([getProfiles(), getTemplates()]);
      setProfiles(pRes.data?.data || []);
      setTemplates(tRes.data?.data || []);
    } catch {
      // Silently fail — lookups are optional
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchLookups();
  }, [fetchTasks, fetchLookups]);

  const openTask = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await getTask(id);
      setDetail(res.data?.data);
    } catch {
      toast('Failed to load task details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus, e) => {
    if (e) e.stopPropagation();
    try {
      await updateTaskStatus(id, newStatus);
      toast(
        `Task status updated to ${newStatus === 'A' ? 'Active' : newStatus === 'T' ? 'Testing' : 'Inactive'}`,
        'success'
      );
      fetchTasks();
      if (detail && (detail.taskID === id || detail.id === id)) {
        setDetail((prev) => ({ ...prev, status: newStatus }));
      }
    } catch {
      toast('Failed to update task status', 'error');
    }
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (task) => {
    setForm({
      taskCode: task.taskCode || '',
      status: task.status || 'N',
      mailPriority: task.mailPriority || 'N',
      profileID: task.profileID || 0,
      templateID: task.templateID || 0,
      templateCode: task.templateCode || '',
      taskType: task.taskType || 'E',
      testMailTo: task.testMailTo || '',
      mailFromName: task.mailFromName || '',
      mailFrom: task.mailFrom || '',
      mailTo: task.mailTo || '',
      mailCC: task.mailCC || '',
      mailBCC: task.mailBCC || '',
      mainProcName: task.mainProcName || '',
      lineProcName: task.lineProcName || '',
      attachmentProcName: task.attachmentProcName || '',
      langCode: task.langCode || 'en',
    });
    setEditingId(task.taskID);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.taskCode.trim()) {
      toast('Task code is required', 'error');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateTask(editingId, form);
        toast('Task updated', 'success');
      } else {
        await createTask(form);
        toast('Task created', 'success');
      }
      setShowModal(false);
      fetchTasks();
      if (selectedId) openTask(selectedId);
    } catch {
      toast('Failed to save task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const taskType = (t) => {
    const type = t.taskType || '';
    if (type === 'S' || type.toLowerCase().includes('sms')) return 'SMS';
    return 'Email';
  };

  const filteredTasks = tasks.filter(
    (t) =>
      !search ||
      (t.taskCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.templateCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const updateField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  // Detail view
  if (selectedId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedId(null); setDetail(null); }}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ArrowLeft size={14} />
            Back to tasks
          </button>
          {detail && (
            <button
              onClick={() => openEdit(detail)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Edit2 size={14} />
              Edit
            </button>
          )}
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : detail ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {taskType(detail) === 'Email' ? (
                  <Mail size={24} className="text-indigo-500" />
                ) : (
                  <MessageSquare size={24} className="text-green-500" />
                )}
                <div>
                  <h2 className="text-xl font-bold">{detail.taskCode}</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{taskType(detail)} Task</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={detail.status} />
                <select
                  value={detail.status}
                  onChange={(e) => handleStatusChange(detail.taskID, e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="A">Active</option>
                  <option value="T">Testing</option>
                  <option value="N">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DetailField label="Task Code" value={detail.taskCode} />
              <DetailField label="Task Type" value={taskType(detail)} />
              <DetailField label="Profile ID" value={detail.profileID} />
              <DetailField label="Template Code" value={detail.templateCode} />
              <DetailField label="Template ID" value={detail.templateID} />
              <DetailField label="Priority" value={detail.mailPriority} />
              <DetailField label="From Name" value={detail.mailFromName} />
              <DetailField label="From Email" value={detail.mailFrom} />
              <DetailField label="To" value={detail.mailTo} />
              <DetailField label="CC" value={detail.mailCC} />
              <DetailField label="BCC" value={detail.mailBCC} />
              <DetailField label="Test Email" value={detail.testMailTo} highlight={detail.status === 'T'} />
              <DetailField label="Main Proc" value={detail.mainProcName} />
              <DetailField label="Line Proc" value={detail.lineProcName} />
              <DetailField label="Attachment Proc" value={detail.attachmentProcName} />
              <DetailField label="Language" value={detail.langCode} />
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">Task not found</div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Notification task configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            <Plus size={14} />
            New Task
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={fetchTasks} className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Retry
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">No tasks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <Th>Task Code</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Profile</Th>
                  <Th>Template</Th>
                  <Th>Priority</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr
                    key={t.taskID}
                    onClick={() => openTask(t.taskID)}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {t.taskCode}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs">
                        {taskType(t) === 'Email' ? (
                          <Mail size={12} className="text-indigo-400" />
                        ) : (
                          <MessageSquare size={12} className="text-green-400" />
                        )}
                        {taskType(t)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        {t.status === 'T' && t.testMailTo && (
                          <span className="text-[10px] text-yellow-600 dark:text-yellow-400 truncate max-w-[120px]">
                            → {t.testMailTo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{t.profileID || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{t.templateCode || '—'}</td>
                    <td className="py-3 px-4 text-xs">{t.mailPriority ?? '—'}</td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.taskID, e.target.value, e)}
                          className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="A">Active</option>
                          <option value="T">Testing</option>
                          <option value="N">Inactive</option>
                        </select>
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Task' : 'New Task'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Task Code *" value={form.taskCode} onChange={(v) => updateField('taskCode', v)} placeholder="e.g., WELCOME_EMAIL" />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Task Type</label>
              <select
                value={form.taskType}
                onChange={(e) => updateField('taskType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="E">Email</option>
                <option value="S">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A">Active</option>
                <option value="T">Testing</option>
                <option value="N">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
              <select
                value={form.mailPriority}
                onChange={(e) => updateField('mailPriority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="H">High</option>
                <option value="N">Normal</option>
                <option value="L">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Profile</label>
              <select
                value={form.profileID}
                onChange={(e) => updateField('profileID', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0}>— Select Profile —</option>
                {profiles.map((p) => (
                  <option key={p.profileId} value={p.profileId}>
                    {p.profileId} — {p.appKey || p.fromEmail}
                  </option>
                ))}
              </select>
            </div>
            <FormField label="Template Code" value={form.templateCode} onChange={(v) => updateField('templateCode', v)} placeholder="e.g., WELCOME_TPL" />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Template ID</label>
              <select
                value={form.templateID}
                onChange={(e) => updateField('templateID', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0}>— Select Template —</option>
                {templates.map((t) => (
                  <option key={t.eT_ID} value={t.eT_ID}>
                    {t.eT_ID} — {t.eT_Code || t.subject}
                  </option>
                ))}
              </select>
            </div>
            <FormField label="Language" value={form.langCode} onChange={(v) => updateField('langCode', v)} placeholder="en" />
          </div>

          <h4 className="text-sm font-semibold mt-5 mb-3 text-gray-500 dark:text-gray-400">Email Overrides</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="From Name" value={form.mailFromName} onChange={(v) => updateField('mailFromName', v)} />
            <FormField label="From Email" value={form.mailFrom} onChange={(v) => updateField('mailFrom', v)} />
            <FormField label="To" value={form.mailTo} onChange={(v) => updateField('mailTo', v)} />
            <FormField label="CC" value={form.mailCC} onChange={(v) => updateField('mailCC', v)} />
            <FormField label="BCC" value={form.mailBCC} onChange={(v) => updateField('mailBCC', v)} />
            <FormField label="Test Email" value={form.testMailTo} onChange={(v) => updateField('testMailTo', v)} placeholder="test@example.com" />
          </div>

          <h4 className="text-sm font-semibold mt-5 mb-3 text-gray-500 dark:text-gray-400">Stored Procedures</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Main Proc" value={form.mainProcName} onChange={(v) => updateField('mainProcName', v)} />
            <FormField label="Line Proc" value={form.lineProcName} onChange={(v) => updateField('lineProcName', v)} />
            <FormField label="Attachment Proc" value={form.attachmentProcName} onChange={(v) => updateField('attachmentProcName', v)} />
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <RefreshCw size={12} className="inline animate-spin mr-1" />}
              {editingId ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
      {children}
    </th>
  );
}

function DetailField({ label, value, highlight = false }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-0.5">{label}</span>
      <span
        className={`text-sm ${
          highlight
            ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 px-2 py-0.5 rounded'
            : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
