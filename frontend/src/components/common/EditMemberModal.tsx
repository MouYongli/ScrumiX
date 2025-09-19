'use client';

import React, { useState } from 'react';
import { X, Crown, Shield, Code, Save, Clipboard } from 'lucide-react';
import { api } from '@/utils/api';
import { ScrumRole, ProjectMemberResponse } from '@/types/api';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  member: ProjectMemberResponse;
  onMemberUpdated: (member: ProjectMemberResponse) => void;
}

export default function EditMemberModal({ isOpen, onClose, projectId, member, onMemberUpdated }: EditMemberModalProps) {
  const [selectedRole, setSelectedRole] = useState<ScrumRole>(member.role);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async () => {
    if (selectedRole === member.role) {
      onClose();
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      console.log('DEBUG: Updating member role:', {
        projectId: parseInt(projectId),
        memberId: member.id,
        currentRole: member.role,
        newRole: selectedRole,
        memberData: member
      });

      const response = await api.projects.updateMember(parseInt(projectId), member.id, {
        role: selectedRole
      });

      console.log('DEBUG: Update member response:', response);

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        console.log('DEBUG: Updated member data:', response.data);
        onMemberUpdated(response.data);
        onClose();
      }
    } catch (err) {
      console.error('DEBUG: Error updating member:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedRole(member.role);
    setError(null);
    onClose();
  };

  const getRoleIcon = (role: ScrumRole) => {
    switch (role) {
      case ScrumRole.PRODUCT_OWNER: return <Clipboard className="w-4 h-4" />;
      case ScrumRole.SCRUM_MASTER: return <Crown className="w-4 h-4" />;
      case ScrumRole.DEVELOPER: return <Code className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  const getRoleDisplayName = (role: ScrumRole) => {
    switch (role) {
      case ScrumRole.PRODUCT_OWNER: return 'Product Owner';
      case ScrumRole.SCRUM_MASTER: return 'Scrum Master';
      case ScrumRole.DEVELOPER: return 'Developer';
      default: return 'Developer';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Team Member</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Member Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-400 text-lg font-semibold">
                {(member.full_name || member.username || member.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {member.full_name || member.username || member.email}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
            </div>
          </div>

          {/* Current Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Role
            </label>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              member.role === 'product_owner' ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' :
              member.role === 'scrum_master' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' :
              'text-green-600 bg-green-50 dark:bg-green-900/20'
            }`}>
              {getRoleIcon(member.role)}
              {getRoleDisplayName(member.role)}
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(ScrumRole).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 rounded-lg border transition-colors ${
                    selectedRole === role
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {getRoleIcon(role)}
                    <span className="text-xs font-medium">{getRoleDisplayName(role)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={selectedRole === member.role || updating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {updating ? 'Updating...' : 'Update Role'}
          </button>
        </div>
      </div>
    </div>
  );
}
