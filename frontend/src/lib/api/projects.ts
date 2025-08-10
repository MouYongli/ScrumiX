// Project API service functions

import { apiClient } from './client';
import type { 
  Project, 
  ProjectUI, 
  CreateProjectRequest, 
  UpdateProjectRequest,
  PaginatedResponse 
} from '@/types/api';

// Transform backend Project to frontend ProjectUI
function transformProjectToUI(project: Project): ProjectUI {
  return {
    id: String(project.id),
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.start_date,
    endDate: project.end_date,
    color: project.color,
    progress: project.progress,
    members: project.members,
    tasks: project.tasks,
    lastActivity: project.last_activity_at,
  };
}

// Transform frontend ProjectUI to backend Project format for requests
function transformProjectFromUI(project: Partial<ProjectUI>): Partial<CreateProjectRequest | UpdateProjectRequest> {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    start_date: project.startDate,
    end_date: project.endDate,
    color: project.color,
  };
}

export const projectService = {
  // Get all projects
  async getProjects(page: number = 1, limit: number = 50): Promise<ProjectUI[]> {
    const query = apiClient.buildQuery({ page, limit });
    const response = await apiClient.get<PaginatedResponse<Project>>(`/projects${query}`);
    return response.items.map(transformProjectToUI);
  },

  // Get project by ID
  async getProject(projectId: string): Promise<ProjectUI> {
    const response = await apiClient.get<Project>(`/projects/${projectId}`);
    return transformProjectToUI(response);
  },

  // Create new project
  async createProject(projectData: Omit<ProjectUI, 'id' | 'progress' | 'members' | 'tasks' | 'lastActivity'>): Promise<ProjectUI> {
    const requestData = transformProjectFromUI(projectData);
    const response = await apiClient.post<Project>('/projects', requestData);
    return transformProjectToUI(response);
  },

  // Update project
  async updateProject(projectId: string, projectData: Partial<ProjectUI>): Promise<ProjectUI> {
    const requestData = transformProjectFromUI(projectData);
    const response = await apiClient.patch<Project>(`/projects/${projectId}`, requestData);
    return transformProjectToUI(response);
  },

  // Delete project
  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}`);
  },

  // Get project statistics
  async getProjectStats(projectId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    totalSprints: number;
    activeSprints: number;
    totalMembers: number;
  }> {
    const response = await apiClient.get<{
      total_tasks: number;
      completed_tasks: number;
      total_sprints: number;
      active_sprints: number;
      total_members: number;
    }>(`/projects/${projectId}/stats`);
    
    return {
      totalTasks: response.total_tasks,
      completedTasks: response.completed_tasks,
      totalSprints: response.total_sprints,
      activeSprints: response.active_sprints,
      totalMembers: response.total_members,
    };
  },

  // Get user's projects
  async getUserProjects(): Promise<ProjectUI[]> {
    const response = await apiClient.get<PaginatedResponse<Project>>('/projects/user');
    return response.items.map(transformProjectToUI);
  },
};
