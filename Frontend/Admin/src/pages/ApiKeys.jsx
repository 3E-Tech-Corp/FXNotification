import { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Trash2, RefreshCw, Copy, Check, Server,
  ToggleLeft, ToggleRight, Edit2, X, Loader2,
} from 'lucide-react';
import { useToast } from '../App';
import {
  getApps, createApp, updateApp, deleteApp,
  toggleApp, regenerateAppKey,
  getTasks, getProfiles,
} from '../services/api';

export default function ApiKeys() {
  const toast = useToast();
  const [apps, setApps] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create/edit state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ appCode: '', appName: '', allowedTasks: [], notes: '', profileIds: [] });

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
      const [a, tasks, profs] = await Promise.all([
        getApps(),
        getTasks().catch(() => []),
        getProfiles().catch(() => []),
      ]);
      setApps(a || []);
      setAvailableTasks(tasks || []);
      setAvailableProfiles(profs || []);
    } catch {
      toast('Failed to load apps', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.appName) { toast('App name is required', 'error'); return; }
    setSaving(true);
    try {
      const created = await createApp(form);
      setNewKey(created);
      setApps((prev) => [created, ...prev]);
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
      const created = await createApp({
        appName: quickName.trim(),
        appCode: quickName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        allowedTasks: [],
        notes: '',
        profileIds: [],
      });
      setNewKey(created);
      setApps((prev) => [created, ...prev]);
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
      const updated = await updateApp(editingId, {
        appCode: form.appCode,
        appName: form.appName,
        allowedTasks: form.allowedTasks,
        notes: form.notes,
        isActive: form.isActive,
        profileIds: form.profileIds,
      });
      setApps((prev) => prev.map((k) => (k.appId === updated.appId ? updated : k)));
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
      const updated = await toggleApp(id);
      setApps((prev) => prev.map((k) => (k.appId === updated.appId ? updated : k)));
    } catch {
      toast('Failed to toggle', 'error');
    }
  };

  const handleRegenerate = async (id) => {
    if (!confirm('Regenerate? The old key will stop working immediately.')) return;
    try {
      const regen = await regenerateAppKey(id);
      setNewKey(regen);
      setApps((prev) => prev.map((k) => (k.appId === regen.appId ? regen : k)));
    } catch {
      toast('Failed to regenerate', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this app and its API key? This cannot be undone.')) return;
    try {
      await deleteApp(id);
      setApps((prev) => prev.filter((k) => k.appId !== id));
      toast('Deleted', 'success');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const copyKey = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreate = () => {
    setForm({ appCode: '', appName: '', allowedTasks: [], notes: '', profileIds: [] });
    setEditingId(null);
    setNewKey(null);
    setShowModal(true);
  };

  const openEdit = (app) => {
    setForm({
      appCode: app.appCode || '',
      appName: app.appName || '',
      allowedTasks: app.allowedTasks || [],
      notes: app.notes || '',
      isActive: app.isActive,
      profileIds: app.profileIds || [],
    });
    setEditingId(app.appId);
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

  const toggleProfile = (profileId) => {
    setForm((prev) => ({
      ...prev,
      profileIds: prev.profileIds.includes(profileId)
        ? prev.profileIds.filter((p) => p !== profileId)
        : [...prev.profileIds, profileId],
    }));
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const profileName = (id) => {
    const p = availableProfiles.find((pr) => pr.profileId === id);
    return p ? (p.appKey || `Profile #${id}`) : `#${id}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage apps, API keys, and profile assignments</p>
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
                <Plus size={14} /> New App
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
              <h3 className="font-medium text-green-800 dark:text-green-300">API Key for "{newKey.appName}"</h3>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">Copy it now — you won't see it again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="px-3 py-1.5 bg-white dark:bg-gray-800 border rounded font-mono text-sm select-all">
                  {newKey.fullKey}
                </code>
                <button onClick={() => copyKey(newKey.fullKey, newKey.appId)}
                  className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded">
                  {copiedId === newKey.appId ? <Check size={16} /> : <Copy size={16} />}
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
        ) : apps.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Key size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No apps yet. Create one to get an API key.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">App</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">API Key</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Profiles</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Allowed Tasks</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Usage</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => (
                  <tr key={app.appId} className={`border-b border-gray-100 dark:border-gray-800/50 ${!app.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="font-medium">{app.appName}</div>
                      <div className="text-xs text-gray-500 font-mono">{app.appCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{app.maskedKey}</code>
                    </td>
                    <td className="py-3 px-4">
                      {app.profileIds?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {app.profileIds.map((pid) => (
                            <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded">
                              <Server size={10} /> {profileName(pid)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">None assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {app.allowedTasks?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {app.allowedTasks.slice(0, 3).map((t) => (
                            <span key={t} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded">{t}</span>
                          ))}
                          {app.allowedTasks.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 rounded">+{app.allowedTasks.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">All tasks</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{app.requestCount?.toLocaleString() || 0} calls</div>
                      <div className="text-xs text-gray-500">Last: {formatDate(app.lastUsedAt)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleToggle(app.appId)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          app.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        {app.isActive ? <><ToggleRight size={14} /> Active</> : <><ToggleLeft size={14} /> Inactive</>}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(app)} title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleRegenerate(app.appId)} title="Regenerate Key"
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950 rounded">
                          <RefreshCw size={14} />
                        </button>
                        <button onClick={() => handleDelete(app.appId)} title="Delete"
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
              <h3 className="font-semibold">{editingId ? 'Edit' : 'Create'} Application</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null); }}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">App Code</label>
                  <input type="text" value={form.appCode} onChange={(e) => setForm({ ...form, appCode: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-app"
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm" />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated from name if empty</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">App Name *</label>
                  <input type="text" value={form.appName} onChange={(e) => setForm({ ...form, appName: e.target.value })}
                    placeholder="My Application"
                    className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
                </div>
              </div>

              {/* Mail Profiles */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Server size={14} className="inline mr-1" />
                  Mail Profiles
                </label>
                <p className="text-xs text-gray-500 mb-2">Select which SMTP profiles this app can use.</p>
                <div className="space-y-1.5">
                  {availableProfiles.map((prof) => (
                    <label key={prof.profileId}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        form.profileIds.includes(prof.profileId)
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}>
                      <input type="checkbox" checked={form.profileIds.includes(prof.profileId)}
                        onChange={() => toggleProfile(prof.profileId)}
                        className="accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{prof.appKey || `Profile #${prof.profileId}`}</div>
                        <div className="text-xs text-gray-500">{prof.fromEmail} — {prof.smtpHost}:{prof.smtpPort}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${prof.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {prof.isActive ? 'Active' : 'Off'}
                      </span>
                    </label>
                  ))}
                  {availableProfiles.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">No profiles available. Create one first.</p>
                  )}
                </div>
              </div>

              {/* Allowed Tasks */}
              <div>
                <label className="block text-sm font-medium mb-2">Allowed Tasks</label>
                <p className="text-xs text-gray-500 mb-2">Leave empty to allow all tasks. Select to restrict.</p>
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
                  {availableTasks.length === 0 && <span className="text-sm text-gray-400">No tasks available</span>}
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
                {editingId ? 'Save Changes' : 'Create App'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
