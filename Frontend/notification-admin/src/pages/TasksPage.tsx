import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { tasksApi, profilesApi, templatesApi, applicationsApi } from '@/api';
import type { Task, Profile, EmailTemplate, Application, SelectOption } from '@/types';
import { TaskStatuses, TaskTypes, MailPriorities } from '@/types';
import { DataGrid, Button, Modal, Input, Select, Badge } from '@/components/ui';
import { getStatusColor } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { selectedApp } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({});

  const { data: applications = [] } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.getAll,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates', selectedApp?.App_ID],
    queryFn: () => templatesApi.getAll(selectedApp?.App_ID),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', selectedApp?.App_ID],
    queryFn: () => tasksApi.getAll(selectedApp?.App_ID),
  });

  const appOptions: SelectOption[] = [
    { Value: '', Text: '(Shared - No Application)' },
    ...applications
      .filter((app: Application) => app.App_ID != null)
      .map((app: Application) => ({
        Value: app.App_ID.toString(),
        Text: app.App_Code || '',
      })),
  ];

  const profileOptions: SelectOption[] = profiles
    .filter((p: Profile) => p.ProfileId != null)
    .map((p: Profile) => ({
      Value: p.ProfileId.toString(),
      Text: p.ProfileCode || '',
    }));

  const templateOptions: SelectOption[] = templates
    .filter((t: EmailTemplate) => t.ET_ID != null)
    .map((t: EmailTemplate) => ({
      Value: t.ET_ID.toString(),
      Text: t.ET_Code || '',
    }));

  const createMutation = useMutation({
    mutationFn: (data: Omit<Task, 'Task_ID'>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      TaskCode: '',
      TaskType: 'E',
      Status: 'A',
      MailPriority: 'N',
      ProfileID: null,
      TemplateID: null,
      TestMailTo: '',
      LangCode: 'en',
      MailFromName: '',
      MailFrom: '',
      MailTo: '',
      MailCC: '',
      MailBCC: '',
      AttachmentProcName: '',
      App_ID: selectedApp?.App_ID,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.Task_ID, data: formData });
    } else {
      createMutation.mutate(formData as Omit<Task, 'Task_ID'>);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<Task, unknown>[] = [
    {
      id: 'actions',
      header: '',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row.original)}
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original.Task_ID)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'Task_ID',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'TaskCode',
      header: 'Task Code',
    },
    {
      accessorKey: 'Status',
      header: 'Status',
      cell: ({ row }) => {
        const status = TaskStatuses.find(s => s.Value === row.original.Status);
        return (
          <Badge className={getStatusColor(row.original.Status)}>
            {status?.Text || row.original.Status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'TaskType',
      header: 'Type',
      cell: ({ row }) => {
        const type = TaskTypes.find(t => t.Value === row.original.TaskType);
        return type?.Text || row.original.TaskType;
      },
    },
    {
      accessorKey: 'ProfileID',
      header: 'Profile',
      cell: ({ row }) => {
        const profile = profiles.find((p: Profile) => p.ProfileId === row.original.ProfileID);
        return profile?.ProfileCode || '-';
      },
    },
    {
      accessorKey: 'TemplateID',
      header: 'Template',
      cell: ({ row }) => {
        const template = templates.find((t: EmailTemplate) => t.ET_ID === row.original.TemplateID);
        return template?.ET_Code || '-';
      },
    },
    {
      accessorKey: 'TestMailTo',
      header: 'Test Email',
    },
    {
      accessorKey: 'LangCode',
      header: 'Lang',
      size: 60,
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Notification Tasks</h2>
        <p className="text-sm text-gray-500">
          {selectedApp
            ? <>Configure email/SMS notification tasks for <span className="font-medium">{selectedApp.App_Code}</span></>
            : 'Configure email/SMS notification tasks for all applications'
          }
        </p>
      </div>

      <DataGrid
        data={tasks}
        columns={columns}
        isLoading={isLoading}
        onAddNew={openCreateModal}
        addNewLabel="Add Task"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Task Code"
            value={formData.TaskCode || ''}
            onChange={(e) => setFormData({ ...formData, TaskCode: e.target.value })}
          />
          <Select
            label="Application"
            options={appOptions}
            value={formData.App_ID?.toString() || ''}
            onChange={(e) =>
              setFormData({ ...formData, App_ID: e.target.value ? parseInt(e.target.value) : undefined })
            }
          />
          <Select
            label="Status"
            options={TaskStatuses}
            value={formData.Status || 'A'}
            onChange={(e) => setFormData({ ...formData, Status: e.target.value })}
          />
          <Select
            label="Task Type"
            options={TaskTypes}
            value={formData.TaskType || 'E'}
            onChange={(e) => setFormData({ ...formData, TaskType: e.target.value })}
          />
          <Select
            label="Mail Priority"
            options={MailPriorities}
            value={formData.MailPriority || 'N'}
            onChange={(e) => setFormData({ ...formData, MailPriority: e.target.value })}
          />
          <Select
            label="Profile"
            options={profileOptions}
            placeholder="Select Profile"
            value={formData.ProfileID?.toString() || ''}
            onChange={(e) =>
              setFormData({ ...formData, ProfileID: e.target.value ? parseInt(e.target.value) : null })
            }
          />
          <Select
            label="Template"
            options={templateOptions}
            placeholder="Select Template"
            value={formData.TemplateID?.toString() || ''}
            onChange={(e) =>
              setFormData({ ...formData, TemplateID: e.target.value ? parseInt(e.target.value) : null })
            }
          />
          <Input
            label="Test Mail To"
            value={formData.TestMailTo || ''}
            onChange={(e) => setFormData({ ...formData, TestMailTo: e.target.value })}
            placeholder="test@example.com"
          />
          <Input
            label="Language Code"
            value={formData.LangCode || ''}
            onChange={(e) => setFormData({ ...formData, LangCode: e.target.value })}
          />
          <Input
            label="Mail From Name"
            value={formData.MailFromName || ''}
            onChange={(e) => setFormData({ ...formData, MailFromName: e.target.value })}
          />
          <Input
            label="Mail From"
            value={formData.MailFrom || ''}
            onChange={(e) => setFormData({ ...formData, MailFrom: e.target.value })}
          />
          <Input
            label="Mail To"
            value={formData.MailTo || ''}
            onChange={(e) => setFormData({ ...formData, MailTo: e.target.value })}
          />
          <Input
            label="Mail CC"
            value={formData.MailCC || ''}
            onChange={(e) => setFormData({ ...formData, MailCC: e.target.value })}
          />
          <Input
            label="Mail BCC"
            value={formData.MailBCC || ''}
            onChange={(e) => setFormData({ ...formData, MailBCC: e.target.value })}
          />
          <Input
            label="Attachment Proc Name"
            value={formData.AttachmentProcName || ''}
            onChange={(e) => setFormData({ ...formData, AttachmentProcName: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
