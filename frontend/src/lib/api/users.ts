// API service for users and team members

import { fetchApi } from './client';
import type { User, TeamMember } from '@/types/api';

// Transform backend User to frontend TeamMember
function transformUser(user: User): TeamMember {
  return {
    id: user.id.toString(),
    name: user.full_name || user.username,
    email: user.email,
    role: 'developer', // Default role, should be determined by project membership
    avatar: user.avatar_url,
    joinedAt: user.created_at,
    isAdmin: false, // Should be determined by project role
  };
}

export const userService = {
  // Get all users
  async getUsers(): Promise<TeamMember[]> {
    const response = await fetchApi<User[]>('/users/');
    return response.map(transformUser);
  },

  // Get current user
  async getCurrentUser(): Promise<TeamMember> {
    const response = await fetchApi<User>('/users/me/');
    return transformUser(response);
  },

  // Get user by ID
  async getUser(userId: string): Promise<TeamMember> {
    const response = await fetchApi<User>(`/users/${userId}/`);
    return transformUser(response);
  },

  // Get team members for a project
  async getProjectTeamMembers(projectId: string): Promise<TeamMember[]> {
    const response = await fetchApi<User[]>(`/projects/${projectId}/members/`);
    return response.map(transformUser);
  },

  // Add team member to project
  async addProjectMember(projectId: string, userId: string, role: string = 'developer'): Promise<void> {
    await fetchApi<void>(`/projects/${projectId}/members/`, {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: parseInt(userId),
        role 
      }),
    });
  },

  // Remove team member from project
  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await fetchApi<void>(`/projects/${projectId}/members/${userId}/`, {
      method: 'DELETE',
    });
  },

  // Update team member role
  async updateMemberRole(projectId: string, userId: string, role: string): Promise<void> {
    await fetchApi<void>(`/projects/${projectId}/members/${userId}/`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Search users
  async searchUsers(query: string): Promise<TeamMember[]> {
    const response = await fetchApi<User[]>(`/users/search/?q=${encodeURIComponent(query)}`);
    return response.map(transformUser);
  },
};
