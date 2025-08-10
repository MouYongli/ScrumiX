// Custom React hooks for users and team members

import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/lib/api';
import type { TeamMember } from '@/types/api';

export function useUsers() {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
  };
}

export function useCurrentUser() {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getCurrentUser();
      setUser(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch current user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    user,
    isLoading,
    error,
    refetch: fetchCurrentUser,
  };
}

export function useProjectTeamMembers(projectId: string) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getProjectTeamMembers(projectId);
      setTeamMembers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch team members');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const addMember = useCallback(async (userId: string, role: string = 'developer') => {
    try {
      await userService.addProjectMember(projectId, userId, role);
      // Refetch to get updated list
      await fetchTeamMembers();
    } catch (err: any) {
      setError(err.message || 'Failed to add team member');
      throw err;
    }
  }, [projectId, fetchTeamMembers]);

  const removeMember = useCallback(async (userId: string) => {
    try {
      await userService.removeProjectMember(projectId, userId);
      setTeamMembers((prev) => prev.filter((member) => member.id !== userId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove team member');
      throw err;
    }
  }, [projectId]);

  const updateMemberRole = useCallback(async (userId: string, role: string) => {
    try {
      await userService.updateMemberRole(projectId, userId, role);
      setTeamMembers((prev) =>
        prev.map((member) => (member.id === userId ? { ...member, role: role as any } : member))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
      throw err;
    }
  }, [projectId]);

  return {
    teamMembers,
    isLoading,
    error,
    addMember,
    removeMember,
    updateMemberRole,
    refetch: fetchTeamMembers,
  };
}

export function useUserSearch() {
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.searchUsers(query);
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchUsers,
  };
}
