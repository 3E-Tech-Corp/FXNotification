import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trash2, Loader2, Inbox, History } from 'lucide-react';
import { useToast } from '../App';
import { getOutbox, deleteOutbox, retryOutbox, getNotificationHistory, retryNotification } from '../services/api';

export default function Outbox() {
  const toast = useToast();
  const [tab, setTab] = useState('pending'); // 'pending' | 'sent'

  // Pending state
  const [outboxItems, setOutboxItems] = useState([]);
  const [outboxTotal, setOutboxTotal] = useState(0);
  const [outboxPage, setOutboxPage] = useState(1);

  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const loadOutbox = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await getOutbox({ page, pageSize: 20 });
      setOutboxItems(data?.items || []);
      setOutboxTotal(data?.totalCount || 0);
      setOutboxPage(page);
    } catch {
      toast('Failed to load outbox', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadHistory = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await getNotificationHistory({ page, pageSize: 20, status: 'Sent' });
      setHistoryItems(data?.items || []);
      setHistoryTotal(data?.totalCount || 0);
      setHistoryPage(page);
    } catch {
      toast('Failed to load history', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'pending') loadOutbox(outboxPage);
    else loadHistory(historyPage);
  }, [tab]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await deleteOutbox(id);
      toast('Deleted', 'success');
      loadOutbox(outboxPage);
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleRetryOutbox = async (id) => {
    try {
      await retryOutbox(id);
      toast('Requeued', 'success');
      loadOutbox(outboxPage);
    } catch {
      toast('Failed to retry', 'error');
    }
  };

  const handleRetryHistory = async (id) => {
    try {
      await retryNotification(id);
      toast('Requeued', 'success');
      loadHistory(historyPage);
    } catch {
      toast('Failed to retry', 'error');
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const items = tab === 'pending' ? outboxItems : historyItems;
  const total = tab === 'pending' ? outboxTotal : historyTotal;
  const page = tab === 'pending' ? outboxPage : historyPage;
  const loadPage = tab === 'pending' ? loadOutbox : loadHistory;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending, failed, and sent notifications</p>
        </div>
        <button onClick={() => loadPage(page)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('pending')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pending' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}>
          <Inbox size={16} /> Pending / Failed ({outboxTotal})
        </button>
        <button onClick={() => setTab('sent')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'sent' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}>
          <History size={16} /> Sent
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            {tab === 'pending' ? 'No pending messages' : 'No sent messages'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.toList}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {item.taskCode || '(no task)'} — Attempts: {item.attempts}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(item.sentAt || item.createdAt)}</p>
                  {item.errorMessage && (
                    <p className="text-xs text-red-500 truncate mt-0.5">{item.errorMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                    item.status === 'Sent' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                    item.status === 'Pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                    item.status === 'Failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {item.status}
                  </span>
                  {tab === 'pending' ? (
                    <>
                      <button onClick={() => handleRetryOutbox(item.id)} title="Retry"
                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded">
                        <RefreshCw size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} title="Delete"
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    item.status === 'Failed' && (
                      <button onClick={() => handleRetryHistory(item.id)} title="Retry"
                        className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded">
                        <RefreshCw size={14} />
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="p-4 border-t dark:border-gray-800 flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {page} · {total} total</span>
            <div className="flex gap-2">
              <button onClick={() => loadPage(page - 1)} disabled={page <= 1}
                className="px-3 py-1 border dark:border-gray-700 rounded text-sm disabled:opacity-50">Previous</button>
              <button onClick={() => loadPage(page + 1)} disabled={items.length < 20}
                className="px-3 py-1 border dark:border-gray-700 rounded text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
