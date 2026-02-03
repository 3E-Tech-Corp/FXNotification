import { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Trash2, RefreshCw, Copy, Check,
  ToggleLeft, ToggleRight, Edit2, X, Loader2,
} from 'lucide-react';
import { useToast } from '../App';
import {
  getApiKeys, createApiKey, updateApiKey, deleteApiKey,
  toggleApiKey, regenerateApiKey, getTasks,
} from '../services/api';

export default function ApiKeys() {
  const toast = useToast();
  const [apiKeys, setApiKeys] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/edit state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ appName: '', allowedTasks: [], notes: '' });

  // New key display
  const [newKey, setNewKey] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Quick create
  const [quickName, setQuickName] = useState('');
  const [quickCreating, setQuickCreating] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keys, tasks] = await Promise.all([
        getApiKeys(),
        getTasks().catch(() => []),
      ]);
      setApiKeys(keys || []);
      setAvailableTasks(tasks || []);
    } catch (err) {
      toast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.appName) { toast('App name is required', 'error'); return; }
    setSaving(true);
    try {
      const created = await createApiKey(form);
      setNewKey(created);
      setApiKeys((prev) => [created, ...prev]);
      setShowModal(false);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!quickName.trim()) return;
    setQuickCreating(true);
    try {
      const created = await createApiKey({
        appName: quickName.trim(),
        allowedTasks: [],
        notes: `Quick-created for ${quickName.trim()}`,
      });
      setNewKey(created);
      setApiKeys((prev) => [created, ...prev]);
      setShowQuick(false);
      setQuickName('');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create', 'error');
    } finally {
      setQuickCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await updateApiKey(editingId, {
        allowedTasks: form.allowedTasks,
        notes: form.notes,
        isActive: form.isActive,
      });
      setApiKeys((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
      setShowModal(false);
      setEditingId(null);
      toast('Updated', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await toggleApiKey(id);
      setApiKeys((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    } catch (err) {
      toast('Failed to toggle', 'error');
    }
  };

  const handleRegenerate = async (id) => {
    if (!confirm('Regenerate? The old key will stop working immediately.')) return;
    try {
      const regen = await regenerateApiKey(id);
      setNewKey(regen);
      setApiKeys((prev) => prev.map((k) => (k.id === regen.id ? regen : k)));
    } catch (err) {
      toast('Failed to regenerate', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return;
    try {
      await deleteApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast('Deleted', 'success');
    } catch (err) {
      toast('Failed to delete', 'error');
    }
  };

  const copyKey = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreate = () => {
    setForm({ appName: '', allowedTasks: [], notes: '' });
    setEditingId(null);
    setNewKey(null);
    setShowModal(true);
  };

  const openEdit = (key) => {
    setForm({
      appName: key.appName,
      allowedTasks: key.allowedTasks || [],
      notes: key.notes || '',
      isActive: key.isActive,
    });
    setEditingId(key.id);
    setShowModal(true);
  };

  const toggleTask = (taskCode) => {
    setForm((prev) => ({
      ...prev,
      allowedTasks: prev.allowedTasks.includes(taskCode)
        ? prev.allowedTasks.filter((t) => t !== taskCode)
        : [...prev.allowedTasks, taskCode],
    }));
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage API keys for partner applications</p>
        </div>
        <div className="flex gap-2">
          {showQuick ? (
            <div className="flex items-center gap-2">
              <input type="text" value={quickName} onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                placeholder="App name..." autoFocus
                className="px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm w-48" />
              <button onClick={handleQuickCreate} disabled={quickCreating || !quickName.trim()}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                {quickCreating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                Generate
              </button>
              <button onClick={() => { setShowQuick(false); setQuickName(''); }}
                className="p-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          ) : (
            <>
              <button onClick={() => setShowQuick(true)}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                <Key size={14} /> Quick Create
              </button>
              <button onClick={openCreate}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                <Plus size={14} /> Advanced
              </button>
            </>
          )}
        </div>
      </div>

      {/* New Key Alert */}
      {newKey && newKey.fullKey && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-green-800 dark:text-green-300">API Key Created!</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">Copy it now — you won't see it again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="px-3 py-1.5 bg-white dark:bg-gray-800 border rounded font-mono text-sm select-all">
                  {newKey.fullKey}
                </code>
                <button onClick={() => copyKey(newKey.fullKey, newKey.id)}
                  className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded">
                  {copiedId === newKey.id ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <button onClick={() => setNewKey(null)} className="text-green-600 hover:text-green-800">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Key size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No API keys yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">App Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Key</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Allowed Tasks</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Usage</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key) => (
                  <tr key={key.id} className={`border-b border-gray-100 dark:border-gray-800/50 ${!key.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium">{key.appName}</div>
                      {key.notes && <div className="text-xs text-gray-500 truncate max-w-[200px]">{key.notes}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{key.maskedKey}</code>
                    </td>
                    <td className="py-3 px-4">
                      {key.allowedTasks?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {key.allowedTasks.slice(0, 3).map((t) => (
                            <span key={t} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded">{t}</span>
                          ))}
                          {key.allowedTasks.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 rounded">+{key.allowedTasks.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">All tasks</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{key.requestCount?.toLocaleString() || 0} calls</div>
                      <div className="text-xs text-gray-500">Last: {formatDate(key.lastUsedAt)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleToggle(key.id)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          key.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        {key.isActive ? <><ToggleRight size={14} /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(key)} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleRegenerate(key.id)} title="Regenerate"
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950 rounded">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handleDelete(key.id)} title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded">
                          <Trash2 size={14} />
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold">{editingId ? 'Edit' : 'Create'} API Key</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium mb-1">App Name *</label>
                  <input type="text" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })}
                    placeholder="e.g., Pickleball Community"
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Allowed Tasks</label>
                <p className="text-xs text-gray-500 mb-2">Leave empty to allow all tasks. Select specific tasks to restrict.</p>
                <div className="flex flex-wrap gap-2">
                  {availableTasks.map((task) => (
                    <button key={task.taskCode} type="button" onClick={() => toggleTask(task.taskCode)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                        form.allowedTasks.includes(task.taskCode)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                      }`}>
                      {task.taskCode}
                    </button>
                  ))}
                  {availableTasks.length === 0 && (
                    <span className="text-sm text-gray-400">No tasks available</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional description" rows={2}
                  className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div className="p-4 border-t dark:border-gray-800 flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setEditingId(null); }}
                className="px-4 py-2 border dark:border-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={editingId ? handleUpdate : handleCreate} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingId ? 'Save Changes' : 'Create API Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
