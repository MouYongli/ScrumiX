'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Crown, Shield, Code, Clipboard } from 'lucide-react';
import { api } from '@/utils/api';
import { ApiUser, ScrumRole } from '@/types/api';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onMemberInvited: (member: any) => void;
  isCurrentUserOwner?: boolean;
}

interface UserOption {
  id: number;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

export default function InviteMemberModal({ isOpen, onClose, projectId, onMemberInvited, isCurrentUserOwner = false }: InviteMemberModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedRole, setSelectedRole] = useState<ScrumRole>(ScrumRole.DEVELOPER);
  const [transferOwnership, setTransferOwnership] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available users (this would need a backend endpoint to get users not in the project)
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
    }
  }, [isOpen]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        return (
          user.email.toLowerCase().includes(searchLower) ||
          (user.username && user.username.toLowerCase().includes(searchLower)) ||
          (user.full_name && user.full_name.toLowerCase().includes(searchLower))
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const response = await api.projects.getAvailableUsers(parseInt(projectId));
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setUsers(response.data);
        setFilteredUsers(response.data);
      }
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedUser) return;

    try {
      setInviting(true);
      setError(null);

      const response = await api.projects.inviteMember(parseInt(projectId), {
        user_id: selectedUser.id,
        role: selectedRole
      });

      if (response.error) {
        setError(response.error);
        return;
      } 
      
      if (!response.data) {
        setError('Failed to invite member');
        return;
      }

      // If ownership transfer is requested, transfer ownership after successful invitation
      if (transferOwnership) {
        const transferResponse = await api.projects.transferOwnership(parseInt(projectId), selectedUser.id);
        if (transferResponse.error) {
          setError(`Member invited but ownership transfer failed: ${transferResponse.error}`);
          onMemberInvited(response.data);
          onClose();
          resetForm();
          return;
        }
        
        // Update the invited member data to reflect ownership
        const updatedMemberData = { ...response.data, is_owner: true };
        onMemberInvited(updatedMemberData);
      } else {
        onMemberInvited(response.data);
      }
      
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setSelectedUser(null);
    setSelectedRole(ScrumRole.DEVELOPER);
    setTransferOwnership(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invite Team Member</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* User List */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-400 text-sm font-semibold">
                        {(user.full_name || user.username || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.full_name || user.username || 'No name'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
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

          {/* Ownership Transfer */}
          {isCurrentUserOwner && selectedUser && (
            <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  id="transfer-ownership"
                  type="checkbox"
                  checked={transferOwnership}
                  onChange={(e) => setTransferOwnership(e.target.checked)}
                  className="mt-1 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-yellow-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="transfer-ownership" className="text-sm font-medium text-yellow-800 dark:text-yellow-300 cursor-pointer">
                    Transfer project ownership to this member
                  </label>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    Warning: This will transfer full project ownership to {selectedUser.full_name || selectedUser.username || selectedUser.email}. 
                    You will lose owner privileges and cannot undo this action.
                  </p>
                </div>
              </div>
            </div>
          )}

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
            onClick={handleInvite}
            disabled={!selectedUser || inviting}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              transferOwnership 
                ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {transferOwnership ? <Crown className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
            {inviting 
              ? (transferOwnership ? 'Inviting & Transferring...' : 'Inviting...') 
              : (transferOwnership ? 'Invite & Transfer Ownership' : 'Invite Member')
            }
          </button>
        </div>
      </div>
    </div>
  );
}
