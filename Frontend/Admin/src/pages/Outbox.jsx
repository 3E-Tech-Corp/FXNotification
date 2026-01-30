import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Paperclip,
  AlertCircle,
  Pause,
  Play,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { getNotificationHistory, retryNotification } from '../services/api';
import { useToast } from '../App';

export default function Outbox() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    taskCode: '',
    from: '',
    to: '',
    search: '',
    page: 1,
    pageSize: 20,
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.taskCode) params.taskCode = filters.taskCode;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.search) params.search = filters.search;
      params.page = filters.page;
      params.pageSize = filters.pageSize;

      const res = await getNotificationHistory(params);
      setItems(res.data.items || res.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotalCount(res.data.totalCount || 0);
    } catch {
      setError('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(fetchData, 10000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, fetchData]);

  const handleRetry = async (id, e) => {
    e.stopPropagation();
    try {
      await retryNotification(id);
      toast('Notification queued for retry', 'success');
      fetchData();
    } catch {
      toast('Failed to retry notification', 'error');
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Outbox</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Notification queue & history • {totalCount} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border ${
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400'
                : 'border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'
            }`}
          >
            {autoRefresh ? <Pause size={12} /> : <Play size={12} />}
            Auto-refresh
          </button>
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Filters
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Sent">Sent</option>
            <option value="Failed">Failed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Task Code"
            value={filters.taskCode}
            onChange={(e) => updateFilter('taskCode', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => updateFilter('from', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => updateFilter('to', e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipient..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
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
              onClick={fetchData}
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">
            No notifications found
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
                    Task
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    To
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <OutboxRow
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onRetry={handleRetry}
                    formatDate={formatDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {filters.page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={filters.page <= 1}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setFilters((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
              disabled={filters.page >= totalPages}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OutboxRow({ item, expanded, onToggle, onRetry, formatDate }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
      >
        <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">
          {item.id}
        </td>
        <td className="py-3 px-4 font-mono text-xs">{item.taskCode}</td>
        <td className="py-3 px-4 max-w-[180px] truncate">{item.to}</td>
        <td className="py-3 px-4 max-w-[250px] truncate">{item.subject}</td>
        <td className="py-3 px-4">
          <StatusBadge status={item.status} />
        </td>
        <td className="py-3 px-4 text-right">{item.attempts ?? 0}</td>
        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(item.createdAt)}
        </td>
        <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {formatDate(item.sentAt || item.failedAt)}
        </td>
        <td className="py-3 px-4 text-center">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50/50 dark:bg-gray-800/20">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Details */}
              <div className="space-y-3">
                {item.cc && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      CC:
                    </span>
                    <span className="ml-2 text-sm">{item.cc}</span>
                  </div>
                )}
                {item.bcc && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      BCC:
                    </span>
                    <span className="ml-2 text-sm">{item.bcc}</span>
                  </div>
                )}
                {item.errorMessage && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 block mb-1">
                      Error:
                    </span>
                    <span className="text-sm text-red-700 dark:text-red-300">
                      {item.errorMessage}
                    </span>
                  </div>
                )}
                {item.webhookStatus && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Webhook:
                    </span>
                    <span className="ml-2 text-sm">{item.webhookStatus}</span>
                  </div>
                )}
                {item.attachments && item.attachments.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                      Attachments:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((att, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs"
                        >
                          <Paperclip size={10} />
                          {att.fileName || att}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {item.status === 'Failed' && (
                  <button
                    onClick={(e) => onRetry(item.id, e)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
                  >
                    <RotateCcw size={12} />
                    Retry
                  </button>
                )}
              </div>
              {/* HTML preview */}
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                  Body Preview:
                </span>
                {item.body ? (
                  <iframe
                    srcDoc={item.body}
                    className="w-full h-48 border border-gray-200 dark:border-gray-700 rounded-lg bg-white"
                    sandbox="allow-same-origin"
                    title="Email body preview"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-400">
                    No body content
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
