'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { api } from '@/utils/api';
import { ProjectMemberResponse } from '@/types/api';

interface DeleteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  member: ProjectMemberResponse;
  onMemberDeleted: (memberId: number) => void;
}

export default function DeleteMemberModal({ isOpen, onClose, projectId, member, onMemberDeleted }: DeleteMemberModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError(null);

      const response = await api.projects.removeMember(parseInt(projectId), member.id);

      if (response.error) {
        setError(response.error);
      } else {
        onMemberDeleted(member.id);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Remove Team Member</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Warning Message */}
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Are you sure you want to remove this member?
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. The member will lose access to this project and all associated resources.
            </p>
          </div>

          {/* Member Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                {(member.full_name || member.username || member.email).charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                {member.full_name || member.username || member.email}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {member.email} • {member.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
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
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Removing...' : 'Remove Member'}
          </button>
        </div>
      </div>
    </div>
  );
}
