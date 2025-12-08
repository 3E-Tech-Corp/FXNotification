import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { templatesApi, applicationsApi } from '@/api';
import type { EmailTemplate, Application, SelectOption } from '@/types';
import { DataGrid, Button, Modal, Input, Select } from '@/components/ui';
import RichTextEditor from '@/components/RichTextEditor';
import { truncateText } from '@/lib/utils';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({});
  const [selectedAppId, setSelectedAppId] = useState<number | undefined>(undefined);

  const { data: applications = [] } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.getAll,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', selectedAppId],
    queryFn: () => templatesApi.getAll(selectedAppId),
  });

  const appOptions: SelectOption[] = [
    { Value: '', Text: 'All Applications' },
    ...applications
      .filter((app: Application) => app.App_ID != null)
      .map((app: Application) => ({
        Value: app.App_ID.toString(),
        Text: app.App_Code || '',
      })),
  ];

  const createMutation = useMutation({
    mutationFn: (data: Omit<EmailTemplate, 'ET_ID'>) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EmailTemplate> }) =>
      templatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => templatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      ET_Code: '',
      Subject: '',
      Body: '',
      Lang_Code: 'en',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData(template);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.ET_ID, data: formData });
    } else {
      createMutation.mutate(formData as Omit<EmailTemplate, 'ET_ID'>);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<EmailTemplate, unknown>[] = [
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
            onClick={() => handleDelete(row.original.ET_ID)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'ET_ID',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'ET_Code',
      header: 'Template Code',
    },
    {
      accessorKey: 'Lang_Code',
      header: 'Language',
      size: 80,
    },
    {
      accessorKey: 'Subject',
      header: 'Subject',
    },
    {
      accessorKey: 'Body',
      header: 'Body',
      cell: ({ row }) => (
        <span title={row.original.Body}>
          {truncateText(row.original.Body?.replace(/<[^>]*>/g, ''), 50)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Email Templates</h2>
          <p className="text-sm text-gray-500">Manage email templates with Scriban syntax</p>
        </div>
        <div className="w-64">
          <Select
            options={appOptions}
            value={selectedAppId?.toString() || ''}
            onChange={(e) =>
              setSelectedAppId(e.target.value ? parseInt(e.target.value) : undefined)
            }
          />
        </div>
      </div>

      <DataGrid
        data={templates}
        columns={columns}
        isLoading={isLoading}
        onAddNew={openCreateModal}
        addNewLabel="Add Template"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTemplate ? 'Edit Template' : 'Add Template'}
        size="full"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Template Code"
              value={formData.ET_Code || ''}
              onChange={(e) => setFormData({ ...formData, ET_Code: e.target.value })}
            />
            <Input
              label="Language Code"
              value={formData.Lang_Code || ''}
              onChange={(e) => setFormData({ ...formData, Lang_Code: e.target.value })}
              placeholder="en, es, fr, etc."
            />
          </div>
          <Input
            label="Subject"
            value={formData.Subject || ''}
            onChange={(e) => setFormData({ ...formData, Subject: e.target.value })}
            placeholder="Use {{ variable }} for Scriban placeholders"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Body
            </label>
            <RichTextEditor
              content={formData.Body || ''}
              onChange={(content) => setFormData({ ...formData, Body: content })}
            />
            <p className="mt-1 text-sm text-gray-500">
              Use Scriban syntax for templates: {'{{ variable }}'}, {'{% for item in items %}'}, etc.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
