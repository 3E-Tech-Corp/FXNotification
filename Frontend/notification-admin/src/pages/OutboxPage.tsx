import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { outboxApi, tasksApi } from '@/api';
import type { OutboxItem, Task, SelectOption } from '@/types';
import { OutboxStatuses } from '@/types';
import { DataGrid, Button, Modal, Input, Select, Textarea, Badge } from '@/components/ui';
import { formatDate, truncateText, getStatusColor } from '@/lib/utils';

export default function OutboxPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OutboxItem | null>(null);
  const [formData, setFormData] = useState<Partial<OutboxItem>>({});

  const { data: outbox = [], isLoading } = useQuery({
    queryKey: ['outbox'],
    queryFn: outboxApi.getAll,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll(),
  });

  const taskOptions: SelectOption[] = tasks
    .filter((t: Task) => t.Task_ID != null)
    .map((t: Task) => ({
      Value: t.Task_ID.toString(),
      Text: t.TaskCode || '',
    }));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OutboxItem> }) =>
      outboxApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbox'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => outboxApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbox'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: number) => outboxApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbox'] });
    },
  });

  const openEditModal = (item: OutboxItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.ID, data: formData });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this outbox item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRetry = (id: number) => {
    retryMutation.mutate(id);
  };

  const columns: ColumnDef<OutboxItem, unknown>[] = [
    {
      id: 'actions',
      header: '',
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRetry(row.original.ID)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Retry"
            disabled={retryMutation.isPending}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => openEditModal(row.original)}
            className="p-1 text-gray-600 hover:text-gray-800"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.ID)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'CreatedAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.CreatedAt),
    },
    {
      accessorKey: 'TaskID',
      header: 'Task',
      cell: ({ row }) => {
        const task = tasks.find((t: Task) => t.Task_ID === row.original.TaskID);
        return task?.TaskCode || row.original.TaskCode || '-';
      },
    },
    {
      accessorKey: 'ToList',
      header: 'To',
      cell: ({ row }) => (
        <span title={row.original.ToList}>{truncateText(row.original.ToList, 30)}</span>
      ),
    },
    {
      accessorKey: 'CcList',
      header: 'CC',
      cell: ({ row }) => (
        <span title={row.original.CcList}>{truncateText(row.original.CcList, 20)}</span>
      ),
    },
    {
      accessorKey: 'Attempts',
      header: 'Attempts',
      size: 80,
    },
    {
      accessorKey: 'LastError',
      header: 'Last Error',
      cell: ({ row }) => (
        <span className="text-red-600" title={row.original.LastError}>
          {truncateText(row.original.LastError, 30)}
        </span>
      ),
    },
    {
      accessorKey: 'BodyJson',
      header: 'Body JSON',
      cell: ({ row }) => (
        <span title={row.original.BodyJson}>{truncateText(row.original.BodyJson, 20)}</span>
      ),
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
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Outbox</h2>
        <p className="text-sm text-gray-500">View and manage pending emails</p>
      </div>

      <DataGrid
        data={outbox}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No pending emails"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Edit Outbox Item"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              Update
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Task"
            options={taskOptions}
            value={formData.TaskID?.toString() || ''}
            onChange={(e) =>
              setFormData({ ...formData, TaskID: parseInt(e.target.value) })
            }
          />
          <Input
            label="To List"
            value={formData.ToList || ''}
            onChange={(e) => setFormData({ ...formData, ToList: e.target.value })}
          />
          <Textarea
            label="Body JSON"
            value={formData.BodyJson || ''}
            onChange={(e) => setFormData({ ...formData, BodyJson: e.target.value })}
            rows={5}
          />
          <Textarea
            label="Detail JSON"
            value={formData.DetailJson || ''}
            onChange={(e) => setFormData({ ...formData, DetailJson: e.target.value })}
            rows={5}
          />
        </div>
      </Modal>
    </div>
  );
}
