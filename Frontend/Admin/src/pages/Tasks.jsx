import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Search,
  Mail,
  MessageSquare,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getTasks, getTask, updateTaskStatus } from '../services/api';
import { useToast } from '../App';

export default function Tasks() {
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await getTasks();
      setTasks(res.data || []);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openTask = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await getTask(id);
      setDetail(res.data);
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
      if (detail && detail.id === id) {
        setDetail((prev) => ({ ...prev, status: newStatus }));
      }
    } catch {
      toast('Failed to update task status', 'error');
    }
  };

  const taskType = (t) => {
    const type = t.taskType || t.type || '';
    if (type.toLowerCase().includes('sms') || type === 'S') return 'SMS';
    return 'Email';
  };

  const filteredTasks = tasks.filter(
    (t) =>
      !search ||
      (t.taskCode || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.templateCode || '').toLowerCase().includes(search.toLowerCase())
  );

  // Detail view
  if (selectedId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setSelectedId(null);
            setDetail(null);
          }}
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft size={14} />
          Back to tasks
        </button>

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
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {taskType(detail)} Task
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={detail.status} />
                <select
                  value={detail.status}
                  onChange={(e) => handleStatusChange(detail.id, e.target.value)}
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
              <DetailField label="Profile" value={detail.profileId || detail.profile} />
              <DetailField label="Template" value={detail.templateCode || detail.template} />
              <DetailField label="Priority" value={detail.priority} />
              <DetailField label="Max Retries" value={detail.maxRetries} />
              <DetailField label="From Override" value={detail.fromOverride || detail.fromEmail} />
              <DetailField label="To Override" value={detail.toOverride || detail.toEmail} />
              <DetailField label="CC" value={detail.cc} />
              <DetailField label="BCC" value={detail.bcc} />
              <DetailField label="Data Stored Proc" value={detail.dataStoredProc || detail.storedProcBody} />
              <DetailField label="Detail Stored Proc" value={detail.detailStoredProc || detail.storedProcDetail} />
              <DetailField label="Test Email" value={detail.testEmail} highlight={detail.status === 'T'} />
              <DetailField label="Webhook URL" value={detail.webhookUrl} />
              <DetailField label="Created" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString() : null} />
              <DetailField label="Updated" value={detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : null} />
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
        <button
          onClick={fetchTasks}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw size={16} />
        </button>
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
            <button
              onClick={fetchTasks}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">
            No tasks found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Task Code
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Template
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => openTask(t.id)}
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
                        {t.status === 'T' && t.testEmail && (
                          <span className="text-[10px] text-yellow-600 dark:text-yellow-400 truncate max-w-[120px]">
                            → {t.testEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {t.profileId || t.profile || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {t.templateCode || t.template || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">{t.priority ?? '—'}</td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value, e)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="A">Active</option>
                        <option value="T">Testing</option>
                        <option value="N">Inactive</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, highlight = false }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-0.5">
        {label}
      </span>
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
