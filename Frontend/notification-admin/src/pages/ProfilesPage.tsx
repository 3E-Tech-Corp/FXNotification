import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Trash2 } from 'lucide-react';
import { profilesApi } from '@/api';
import type { Profile } from '@/types';
import { SecurityModes, YesNoOptions } from '@/types';
import { DataGrid, Button, Modal, Input, Select, Badge } from '@/components/ui';

export default function ProfilesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>({});

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: profilesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Profile, 'ProfileId'>) => profilesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Profile> }) =>
      profilesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => profilesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  const openCreateModal = () => {
    setEditingProfile(null);
    setFormData({
      ProfileCode: '',
      FromName: '',
      FromEmail: '',
      SmtpHost: '',
      SmtpPort: 587,
      AuthUser: '',
      AuthSecretRef: '',
      SecurityMode: '1',
      IsActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData(profile);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProfile(null);
    setFormData({});
  };

  const handleSubmit = () => {
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.ProfileId, data: formData });
    } else {
      createMutation.mutate(formData as Omit<Profile, 'ProfileId'>);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns: ColumnDef<Profile, unknown>[] = [
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
            onClick={() => handleDelete(row.original.ProfileId)}
            className="p-1 text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      accessorKey: 'ProfileId',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'ProfileCode',
      header: 'Profile Code',
    },
    {
      accessorKey: 'FromName',
      header: 'From Name',
    },
    {
      accessorKey: 'FromEmail',
      header: 'From Email',
    },
    {
      accessorKey: 'SmtpHost',
      header: 'SMTP Host',
    },
    {
      accessorKey: 'SmtpPort',
      header: 'Port',
      size: 70,
    },
    {
      accessorKey: 'AuthUser',
      header: 'Auth User',
    },
    {
      accessorKey: 'SecurityMode',
      header: 'Security',
      cell: ({ row }) => {
        const mode = SecurityModes.find(m => m.Value === row.original.SecurityMode);
        return mode?.Text || row.original.SecurityMode;
      },
    },
    {
      accessorKey: 'IsActive',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.original.IsActive ? 'success' : 'error'}>
          {row.original.IsActive ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Mail Profiles</h2>
        <p className="text-sm text-gray-500">Manage SMTP configurations for sending emails</p>
      </div>

      <DataGrid
        data={profiles}
        columns={columns}
        isLoading={isLoading}
        onAddNew={openCreateModal}
        addNewLabel="Add Profile"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProfile ? 'Edit Profile' : 'Add Profile'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingProfile ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Profile Code"
            value={formData.ProfileCode || ''}
            onChange={(e) => setFormData({ ...formData, ProfileCode: e.target.value })}
          />
          <Input
            label="From Name"
            value={formData.FromName || ''}
            onChange={(e) => setFormData({ ...formData, FromName: e.target.value })}
          />
          <Input
            label="From Email"
            type="email"
            value={formData.FromEmail || ''}
            onChange={(e) => setFormData({ ...formData, FromEmail: e.target.value })}
          />
          <Input
            label="SMTP Host"
            value={formData.SmtpHost || ''}
            onChange={(e) => setFormData({ ...formData, SmtpHost: e.target.value })}
          />
          <Input
            label="SMTP Port"
            type="number"
            value={formData.SmtpPort || 587}
            onChange={(e) => setFormData({ ...formData, SmtpPort: parseInt(e.target.value) })}
          />
          <Select
            label="Security Mode"
            options={SecurityModes}
            value={formData.SecurityMode || '1'}
            onChange={(e) => setFormData({ ...formData, SecurityMode: e.target.value })}
          />
          <Input
            label="Auth User"
            value={formData.AuthUser || ''}
            onChange={(e) => setFormData({ ...formData, AuthUser: e.target.value })}
          />
          <Input
            label="Auth Secret Ref"
            value={formData.AuthSecretRef || ''}
            onChange={(e) => setFormData({ ...formData, AuthSecretRef: e.target.value })}
            placeholder="ENV:VAR_NAME or KEY:secret"
          />
          <Select
            label="Is Active"
            options={YesNoOptions}
            value={formData.IsActive?.toString() || 'true'}
            onChange={(e) => setFormData({ ...formData, IsActive: e.target.value === 'true' })}
          />
        </div>
      </Modal>
    </div>
  );
}
