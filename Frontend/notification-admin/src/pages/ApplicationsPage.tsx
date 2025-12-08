import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { applicationsApi, profilesApi } from '@/api';
import type { Application, Profile, SelectOption } from '@/types';
import { DataGrid, Button, Modal, Input, Select } from '@/components/ui';

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [formData, setFormData] = useState<Partial<Application>>({});

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.getAll,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll,
  });

  const profileOptions: SelectOption[] = profiles.map((p: Profile) => ({
    Value: p.ProfileId.toString(),
    Text: p.ProfileCode,
  }));

  const createMutation = useMutation({
    mutationFn: (data: Omit<Application, 'App_ID'>) => applicationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Application> }) =>
      applicationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => applicationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const openCreateModal = () => {
    setEditingApp(null);
    setFormData({
      App_Code: '',
      Descr: '',
      ProfileID: null,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (app: Application) => {
    setEditingApp(app);
    setFormData(app);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingApp(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (editingApp) {
      updateMutation.mutate({ id: editingApp.App_ID, data: formData });
    } else {
      createMutation.mutate(formData as Omit<Application, 'App_ID'>);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this application?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<Application, unknown>[] = [
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
            onClick={() => handleDelete(row.original.App_ID)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'App_ID',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'App_Code',
      header: 'App Code',
    },
    {
      accessorKey: 'Descr',
      header: 'Description',
    },
    {
      accessorKey: 'ProfileID',
      header: 'Default Profile',
      cell: ({ row }) => {
        const profile = profiles.find((p: Profile) => p.ProfileId === row.original.ProfileID);
        return profile?.ProfileCode || '-';
      },
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Applications</h2>
        <p className="text-sm text-gray-500">Manage applications that use the notification system</p>
      </div>

      <DataGrid
        data={applications}
        columns={columns}
        isLoading={isLoading}
        onAddNew={openCreateModal}
        addNewLabel="Add Application"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingApp ? 'Edit Application' : 'Add Application'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingApp ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="App Code"
            value={formData.App_Code || ''}
            onChange={(e) => setFormData({ ...formData, App_Code: e.target.value })}
          />
          <Input
            label="Description"
            value={formData.Descr || ''}
            onChange={(e) => setFormData({ ...formData, Descr: e.target.value })}
          />
          <Select
            label="Default Profile"
            options={profileOptions}
            placeholder="Select a profile"
            value={formData.ProfileID?.toString() || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                ProfileID: e.target.value ? parseInt(e.target.value) : null,
              })
            }
          />
        </div>
      </Modal>
    </div>
  );
}
