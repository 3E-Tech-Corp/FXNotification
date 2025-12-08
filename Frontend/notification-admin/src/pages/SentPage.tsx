import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw } from 'lucide-react';
import { historyApi } from '@/api';
import type { HistoryItem, AuditItem } from '@/types';
import { OutboxStatuses } from '@/types';
import { DataGrid, Badge, Spinner } from '@/components/ui';
import { formatDate, truncateText, getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function SentPage() {
  const queryClient = useQueryClient();
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: historyApi.getAll,
  });

  const { data: audit = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['audit', selectedEmailId],
    queryFn: () => (selectedEmailId ? historyApi.getAudit(selectedEmailId) : Promise.resolve([])),
    enabled: !!selectedEmailId,
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => historyApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['outbox'] });
    },
  });

  const handleRetry = (id: number) => {
    retryMutation.mutate(id);
  };

  const handleRowClick = (id: number) => {
    setSelectedEmailId(id);
  };

  const auditColumns: ColumnDef<AuditItem, unknown>[] = [
    {
      accessorKey: 'Audit_ID',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'DT_Audit',
      header: 'Audit Time',
      cell: ({ row }) => formatDate(row.original.DT_Audit),
    },
    {
      accessorKey: 'NextAttemptAt',
      header: 'Next Attempt',
      cell: ({ row }) => formatDate(row.original.NextAttemptAt),
    },
    {
      accessorKey: 'Status',
      header: 'Status',
      cell: ({ row }) => {
        const status = OutboxStatuses.find(s => s.Value === row.original.Status);
        return (
          <Badge className={getStatusColor(row.original.Status)}>
            {status?.Text || row.original.Status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'Attempts',
      header: 'Attempts',
      size: 80,
    },
    {
      accessorKey: 'LastError',
      header: 'Error',
      cell: ({ row }) => (
        <span className="text-red-600" title={row.original.LastError}>
          {truncateText(row.original.LastError, 40)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Sent Emails</h2>
        <p className="text-sm text-gray-500">View email history and audit trail</p>
      </div>

      {/* History Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-gray-200">
          <span className="text-sm text-gray-500">
            {history.length} {history.length === 1 ? 'email' : 'emails'} in history
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}></th>
                <th>Created</th>
                <th>Task</th>
                <th>To</th>
                <th>CC</th>
                <th>BCC</th>
                <th style={{ width: 80 }}>Attempts</th>
                <th>Last Error</th>
                <th>Body JSON</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <Spinner size="lg" />
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-500">
                    No emails in history
                  </td>
                </tr>
              ) : (
                history.map((item: HistoryItem) => (
                  <tr
                    key={item.ID}
                    onClick={() => handleRowClick(item.ID)}
                    className={cn(
                      'cursor-pointer',
                      selectedEmailId === item.ID && 'bg-blue-50'
                    )}
                  >
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetry(item.ID);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Retry"
                        disabled={retryMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </td>
                    <td>{formatDate(item.CreatedAt)}</td>
                    <td>{item.TaskCode}</td>
                    <td>
                      <span title={item.ToList}>{truncateText(item.ToList, 30)}</span>
                    </td>
                    <td>
                      <span title={item.CcList}>{truncateText(item.CcList, 20)}</span>
                    </td>
                    <td>
                      <span title={item.BccList}>{truncateText(item.BccList, 20)}</span>
                    </td>
                    <td>{item.Attempts}</td>
                    <td>
                      <span className="text-red-600" title={item.LastError}>
                        {truncateText(item.LastError, 20)}
                      </span>
                    </td>
                    <td>
                      <span title={item.BodyJson}>{truncateText(item.BodyJson, 20)}</span>
                    </td>
                    <td>
                      <Badge className={getStatusColor(item.Status)}>
                        {OutboxStatuses.find(s => s.Value === item.Status)?.Text || item.Status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Audit Trail</h3>
        <p className="text-sm text-gray-500">
          {selectedEmailId
            ? `Showing audit history for email #${selectedEmailId}`
            : 'Select an email from the list above to view its audit trail'}
        </p>
      </div>

      {selectedEmailId && (
        <DataGrid
          data={audit}
          columns={auditColumns}
          isLoading={isLoadingAudit}
          emptyMessage="No audit records found"
        />
      )}
    </div>
  );
}
