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
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getProfiles, getProfile } from '../services/api';
import { useToast } from '../App';

const securityModeLabels = {
  0: 'None',
  1: 'StartTLS',
  2: 'SSL',
  None: 'None',
  StartTls: 'StartTLS',
  Ssl: 'SSL',
  SSL: 'SSL',
  StartTLS: 'StartTLS',
};

function SecurityBadge({ mode }) {
  const label = securityModeLabels[mode] || String(mode);
  const isSecure = label !== 'None';
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

export default function Profiles() {
  const toast = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchProfiles = useCallback(async () => {
    try {
      setError(null);
      const res = await getProfiles();
      setProfiles(res.data || []);
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
      setDetail(res.data);
    } catch {
      toast('Failed to load profile details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(
    (p) =>
      !search ||
      (p.appKey || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.fromName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.fromEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.smtpHost || '').toLowerCase().includes(search.toLowerCase())
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
          Back to profiles
        </button>

        {detailLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : detail ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Server size={24} className="text-indigo-500" />
              <div>
                <h2 className="text-xl font-bold">Profile #{detail.id}</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {detail.appKey || 'Default'} — Read Only
                </span>
              </div>
              <StatusBadge status={String(detail.active ?? detail.isActive ?? true)} />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400">
                <Shield size={14} />
                Profile details are read-only. Editing SMTP credentials via UI is restricted for security.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <ReadOnlyField label="Profile ID" value={detail.id} />
              <ReadOnlyField label="App Key" value={detail.appKey} />
              <ReadOnlyField label="From Name" value={detail.fromName} />
              <ReadOnlyField label="From Email" value={detail.fromEmail} />
              <ReadOnlyField label="SMTP Host" value={detail.smtpHost} />
              <ReadOnlyField label="SMTP Port" value={detail.smtpPort} />
              <ReadOnlyField label="Security Mode" value={securityModeLabels[detail.securityMode] || detail.securityMode} />
              <ReadOnlyField label="Username" value={detail.username ? '••••••••' : '(none)'} />
              <ReadOnlyField label="Active" value={detail.active ?? detail.isActive ? 'Yes' : 'No'} />
              <ReadOnlyField label="Created" value={detail.createdAt ? new Date(detail.createdAt).toLocaleString() : null} />
              <ReadOnlyField label="Reply-To" value={detail.replyTo} />
              <ReadOnlyField label="Timeout (ms)" value={detail.timeout} />
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
        <button
          onClick={fetchProfiles}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    App Key
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    From Name
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    From Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    SMTP
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Security
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openProfile(p.id)}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {p.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400 text-xs">
                      {p.appKey || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">{p.fromName || '—'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {p.fromEmail || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {p.smtpHost}:{p.smtpPort}
                    </td>
                    <td className="py-3 px-4">
                      <SecurityBadge mode={p.securityMode} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={String(p.active ?? p.isActive ?? true)} />
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

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-0.5">
        {label}
      </span>
      <span className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded block">
        {value ?? '—'}
      </span>
    </div>
  );
}
