import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Search,
  Server,
  Shield,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Key,
  X,
  Copy,
  Check,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  generateProfileKey,
  revokeProfileKey,
} from '../services/api';
import { useToast } from '../App';

const securityModeLabels = {
  0: 'None',
  1: 'StartTLS',
  2: 'SSL/TLS',
};

const securityModeOptions = [
  { value: 0, label: 'None' },
  { value: 1, label: 'StartTLS' },
  { value: 2, label: 'SSL/TLS' },
];

function SecurityBadge({ mode }) {
  const label = securityModeLabels[mode] ?? String(mode);
  const isSecure = Number(mode) > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        isSecure
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {isSecure ? <Lock size={10} /> : <Unlock size={10} />}
      {label}
    </span>
  );
}

const emptyForm = {
  appKey: '',
  fromName: '',
  fromEmail: '',
  smtpHost: '',
  smtpPort: 587,
  authUser: '',
  authSecretRef: '',
  securityMode: 1,
  isActive: true,
};

export default function Profiles() {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
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

  // Generated key display
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchProfiles = useCallback(async () => {
    try {
      setError(null);
      const res = await getProfiles();
      setProfiles(res.data?.data || []);
    } catch {
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const openProfile = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await getProfile(id);
      setDetail(res.data?.data);
    } catch {
      toast('Failed to load profile details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (profile) => {
    setForm({
      appKey: profile.appKey || '',
      fromName: profile.fromName || '',
      fromEmail: profile.fromEmail || '',
      smtpHost: profile.smtpHost || '',
      smtpPort: profile.smtpPort || 587,
      authUser: profile.authUser || '',
      authSecretRef: '',
      securityMode: profile.securityMode ?? 1,
      isActive: profile.isActive ?? true,
    });
    setEditingId(profile.profileId);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.appKey.trim()) {
      toast('App Key is required', 'error');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await updateProfile(editingId, form);
        toast('Profile updated', 'success');
      } else {
        await createProfile(form);
        toast('Profile created', 'success');
      }
      setShowModal(false);
      fetchProfiles();
      if (selectedId) openProfile(selectedId);
    } catch {
      toast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateKey = async (id) => {
    if (!confirm('Generate a new API key for this profile? Any existing key will be replaced.')) return;
    try {
      const res = await generateProfileKey(id);
      const data = res.data?.data;
      if (data?.apiKey) {
        setGeneratedKey(data.apiKey);
      }
      toast('API key generated', 'success');
      fetchProfiles();
      if (selectedId) openProfile(selectedId);
    } catch {
      toast('Failed to generate API key', 'error');
    }
  };

  const handleRevokeKey = async (id) => {
    if (!confirm('Revoke this profile\'s API key? Applications using it will lose access.')) return;
    try {
      await revokeProfileKey(id);
      toast('API key revoked', 'success');
      fetchProfiles();
      if (selectedId) openProfile(selectedId);
    } catch {
      toast('Failed to revoke API key', 'error');
    }
  };

  const copyKey = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      !search ||
      (p.appKey || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.fromName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.fromEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.smtpHost || '').toLowerCase().includes(search.toLowerCase())
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
            Back to profiles
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
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Server size={24} className="text-indigo-500" />
                <div>
                  <h2 className="text-xl font-bold">Profile #{detail.profileId}</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {detail.appKey || 'Default'}
                  </span>
                </div>
                <StatusBadge status={String(detail.isActive ?? true)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <ReadOnlyField label="Profile ID" value={detail.profileId} />
                <ReadOnlyField label="App Key" value={detail.appKey} />
                <ReadOnlyField label="From Name" value={detail.fromName} />
                <ReadOnlyField label="From Email" value={detail.fromEmail} />
                <ReadOnlyField label="SMTP Host" value={detail.smtpHost} />
                <ReadOnlyField label="SMTP Port" value={detail.smtpPort} />
                <ReadOnlyField label="Security Mode" value={securityModeLabels[detail.securityMode] || detail.securityMode} />
                <ReadOnlyField label="Auth User" value={detail.authUser || '(none)'} />
                <ReadOnlyField label="Active" value={detail.isActive ? 'Yes' : 'No'} />
                <ReadOnlyField label="Last Used" value={detail.lastUsedAt ? new Date(detail.lastUsedAt).toLocaleString() : 'Never'} />
                <ReadOnlyField label="Request Count" value={detail.requestCount || 0} />
                <ReadOnlyField label="API Key" value={detail.maskedApiKey || '(none)'} />
              </div>
            </div>

            {/* API Key Management */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Key size={16} className="text-indigo-500" />
                Profile API Key
              </h3>

              {generatedKey && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-xs text-green-700 dark:text-green-400 mb-2">
                    New key generated — copy it now, it won't be shown again:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 bg-white dark:bg-gray-800 border rounded font-mono text-sm break-all">
                      {generatedKey}
                    </code>
                    <button
                      onClick={() => copyKey(generatedKey)}
                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerateKey(detail.profileId)}
                  className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Generate New Key
                </button>
                {detail.maskedApiKey && (
                  <button
                    onClick={() => handleRevokeKey(detail.profileId)}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Revoke Key
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">Profile not found</div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profiles</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mail server configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfiles}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            <Plus size={14} />
            New Profile
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search profiles..."
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
              onClick={fetchProfiles}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">
            No profiles found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  <Th>ID</Th>
                  <Th>App Key</Th>
                  <Th>From Name</Th>
                  <Th>From Email</Th>
                  <Th>SMTP</Th>
                  <Th>Security</Th>
                  <Th>Active</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p) => (
                  <tr
                    key={p.profileId}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400" onClick={() => openProfile(p.profileId)}>
                      {p.profileId}
                    </td>
                    <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400 text-xs" onClick={() => openProfile(p.profileId)}>
                      {p.appKey || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm" onClick={() => openProfile(p.profileId)}>{p.fromName || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300" onClick={() => openProfile(p.profileId)}>
                      {p.fromEmail || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs" onClick={() => openProfile(p.profileId)}>
                      {p.smtpHost}:{p.smtpPort}
                    </td>
                    <td className="py-3 px-4" onClick={() => openProfile(p.profileId)}>
                      <SecurityBadge mode={p.securityMode} />
                    </td>
                    <td className="py-3 px-4" onClick={() => openProfile(p.profileId)}>
                      <StatusBadge status={String(p.isActive ?? true)} />
                    </td>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
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
            {editingId ? 'Edit Profile' : 'New Profile'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="App Key *" value={form.appKey} onChange={(v) => updateField('appKey', v)} placeholder="e.g., MyApp" />
            <FormField label="From Name" value={form.fromName} onChange={(v) => updateField('fromName', v)} placeholder="Sender Name" />
            <FormField label="From Email" value={form.fromEmail} onChange={(v) => updateField('fromEmail', v)} placeholder="noreply@example.com" type="email" />
            <FormField label="SMTP Host *" value={form.smtpHost} onChange={(v) => updateField('smtpHost', v)} placeholder="smtp.example.com" />
            <FormField label="SMTP Port" value={form.smtpPort} onChange={(v) => updateField('smtpPort', parseInt(v) || 587)} type="number" />
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Security Mode</label>
              <select
                value={form.securityMode}
                onChange={(e) => updateField('securityMode', parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {securityModeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <FormField label="Auth User" value={form.authUser} onChange={(v) => updateField('authUser', v)} placeholder="username" />
            <FormField
              label={editingId ? 'Auth Secret (leave blank to keep)' : 'Auth Secret'}
              value={form.authSecretRef}
              onChange={(v) => updateField('authSecretRef', v)}
              placeholder="password"
              type="password"
            />
            <div className="flex items-center gap-2 col-span-full">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">Active</label>
            </div>
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
              {editingId ? 'Save Changes' : 'Create Profile'}
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

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-0.5">{label}</span>
      <span className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded block">
        {value ?? '—'}
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
