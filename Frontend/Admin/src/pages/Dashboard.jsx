import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Database,
  Mail,
  Server,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getHealth, getHealthStats } from '../services/api';

function StatCard({ icon: Icon, label, value, subtext, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      {subtext && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</div>
      )}
    </div>
  );
}

function HealthIndicator({ label, ok }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle size={16} className="text-green-500" />
      ) : (
        <XCircle size={16} className="text-red-500" />
      )}
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  );
}

function HourlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
        No data available
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.sent + d.failed), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.hour}: ${d.sent} sent, ${d.failed} failed`}>
          <div className="w-full flex flex-col-reverse gap-px">
            {d.failed > 0 && (
              <div
                className="w-full bg-red-400 dark:bg-red-500 rounded-t-sm min-h-[2px]"
                style={{ height: `${(d.failed / max) * 100}%` }}
              />
            )}
            {d.sent > 0 && (
              <div
                className="w-full bg-indigo-400 dark:bg-indigo-500 rounded-t-sm min-h-[2px]"
                style={{ height: `${(d.sent / max) * 100}%` }}
              />
            )}
          </div>
          {i % 3 === 0 && (
            <span className="text-[10px] text-gray-400 mt-1">{d.hour}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [healthRes, statsRes] = await Promise.all([
        getHealth().catch(() => null),
        getHealthStats().catch(() => null),
      ]);
      if (healthRes) setHealth(healthRes.data);
      if (statsRes) setStats(statsRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error && !health && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-gray-500 dark:text-gray-400">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Service overview & health monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Health status */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Service Health
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthIndicator label="Service Running" ok={health?.status === 'Healthy'} />
          <HealthIndicator label="Database" ok={health?.checks?.database ?? false} />
          <HealthIndicator label="SMTP" ok={health?.checks?.smtp ?? false} />
          <HealthIndicator label="Worker" ok={health?.checks?.worker ?? false} />
        </div>
        {health?.uptime && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Clock size={12} />
            Uptime: {health.uptime}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Mail}
          label="Pending"
          value={stats?.pending ?? 0}
          subtext="Queued notifications"
          color="yellow"
        />
        <StatCard
          icon={CheckCircle}
          label="Sent (24h)"
          value={stats?.sent24h ?? 0}
          subtext="Last 24 hours"
          color="green"
        />
        <StatCard
          icon={XCircle}
          label="Failed (24h)"
          value={stats?.failed24h ?? 0}
          subtext="Last 24 hours"
          color="red"
        />
        <StatCard
          icon={Activity}
          label="Total Processed"
          value={stats?.totalProcessed ?? 0}
          subtext="All time"
          color="indigo"
        />
      </div>

      {/* Hourly chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Send Volume (Last 24h)
          </h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-indigo-400 dark:bg-indigo-500 rounded-sm" />
              Sent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-red-400 dark:bg-red-500 rounded-sm" />
              Failed
            </span>
          </div>
        </div>
        <HourlyChart data={stats?.hourlyVolume} />
      </div>

      {/* Task breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Task Breakdown
        </h2>
        {stats?.taskBreakdown && stats.taskBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                    Task Code
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                    Sent
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                    Failed
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">
                    Pending
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.taskBreakdown.map((t, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="py-2.5 px-3 font-mono text-xs">{t.taskCode}</td>
                    <td className="py-2.5 px-3 text-right text-green-600 dark:text-green-400">
                      {t.sent}
                    </td>
                    <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">
                      {t.failed}
                    </td>
                    <td className="py-2.5 px-3 text-right text-yellow-600 dark:text-yellow-400">
                      {t.pending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
            No task data available
          </div>
        )}
      </div>
    </div>
  );
}
