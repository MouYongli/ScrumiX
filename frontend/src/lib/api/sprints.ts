// Sprint API service functions

import { apiClient } from './client';
import type { 
  Sprint, 
  SprintUI, 
  CreateSprintRequest, 
  UpdateSprintRequest,
  PaginatedResponse 
} from '@/types/api';

// Transform backend Sprint to frontend SprintUI
function transformSprintToUI(sprint: Sprint): SprintUI {
  return {
    id: String(sprint.id),
    name: sprint.sprintName, // Map sprintName to name
    goal: sprint.sprintGoal, // Map sprintGoal to goal
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: sprint.status,
    capacity: sprint.sprintCapacity || 0, // Map sprintCapacity to capacity
    // These calculated fields will need to be populated from task data
    totalStoryPoints: 0, // TODO: Calculate from associated tasks
    completedStoryPoints: 0, // TODO: Calculate from completed tasks
    totalStories: 0, // TODO: Count associated tasks
    completedStories: 0, // TODO: Count completed tasks
    teamMembers: [], // TODO: Populate from project team members
    createdAt: sprint.createdAt,
  };
}

// Transform frontend SprintUI to backend Sprint format for requests
function transformSprintFromUI(sprint: Partial<SprintUI>, projectId: number): Partial<CreateSprintRequest | UpdateSprintRequest> {
  const baseData = {
    sprintName: sprint.name,
    sprintGoal: sprint.goal,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: sprint.status,
    sprintCapacity: sprint.capacity,
  };

  // Add projectId for create requests
  if ('name' in sprint) {
    return {
      ...baseData,
      projectId,
    } as CreateSprintRequest;
  }

  return baseData as UpdateSprintRequest;
}

export const sprintService = {
  // Get all sprints for a project
  async getSprints(projectId: string, page: number = 1, limit: number = 50): Promise<SprintUI[]> {
    const query = apiClient.buildQuery({ page, limit });
    const response = await apiClient.get<PaginatedResponse<Sprint>>(`/projects/${projectId}/sprints${query}`);
    return response.items.map(transformSprintToUI);
  },

  // Get sprint by ID
  async getSprint(sprintId: string): Promise<SprintUI> {
    const response = await apiClient.get<Sprint>(`/sprints/${sprintId}`);
    return transformSprintToUI(response);
  },

  // Create new sprint
  async createSprint(
    projectId: string, 
    sprintData: Omit<SprintUI, 'id' | 'totalStoryPoints' | 'completedStoryPoints' | 'totalStories' | 'completedStories' | 'teamMembers' | 'createdAt'>
  ): Promise<SprintUI> {
    const requestData = transformSprintFromUI(sprintData, parseInt(projectId)) as CreateSprintRequest;
    const response = await apiClient.post<Sprint>('/sprints', requestData);
    return transformSprintToUI(response);
  },

  // Update sprint
  async updateSprint(sprintId: string, sprintData: Partial<SprintUI>): Promise<SprintUI> {
    const requestData = transformSprintFromUI(sprintData, 0) as UpdateSprintRequest;
    const response = await apiClient.patch<Sprint>(`/sprints/${sprintId}`, requestData);
    return transformSprintToUI(response);
  },

  // Delete sprint
  async deleteSprint(sprintId: string): Promise<void> {
    await apiClient.delete(`/sprints/${sprintId}`);
  },

  // Get active sprint for project
  async getActiveSprint(projectId: string): Promise<SprintUI | null> {
    try {
      const response = await apiClient.get<Sprint>(`/projects/${projectId}/sprints/active`);
      return transformSprintToUI(response);
    } catch (error) {
      // If no active sprint found, return null
      return null;
    }
  },

  // Start sprint (change status to active)
  async startSprint(sprintId: string): Promise<SprintUI> {
    const response = await apiClient.patch<Sprint>(`/sprints/${sprintId}`, { 
      status: 'active' 
    });
    return transformSprintToUI(response);
  },

  // Complete sprint (change status to completed)
  async completeSprint(sprintId: string): Promise<SprintUI> {
    const response = await apiClient.patch<Sprint>(`/sprints/${sprintId}`, { 
      status: 'completed' 
    });
    return transformSprintToUI(response);
  },

  // Get sprint statistics with task data
  async getSprintStats(sprintId: string): Promise<{
    totalStoryPoints: number;
    completedStoryPoints: number;
    totalTasks: number;
    completedTasks: number;
    burndownData: Array<{ day: string; remaining: number; ideal: number }>;
  }> {
    const response = await apiClient.get<{
      total_story_points: number;
      completed_story_points: number;
      total_tasks: number;
      completed_tasks: number;
      burndown_data: Array<{ day: string; remaining: number; ideal: number }>;
    }>(`/sprints/${sprintId}/stats`);
    
    return {
      totalStoryPoints: response.total_story_points,
      completedStoryPoints: response.completed_story_points,
      totalTasks: response.total_tasks,
      completedTasks: response.completed_tasks,
      burndownData: response.burndown_data,
    };
  },

  // Get velocity data for project (last several sprints)
  async getProjectVelocity(projectId: string, limit: number = 10): Promise<Array<{
    sprint: string;
    velocity: number;
    capacity: number;
  }>> {
    const response = await apiClient.get<Array<{
      sprint_name: string;
      completed_story_points: number;
      sprint_capacity: number;
    }>>(`/projects/${projectId}/velocity?limit=${limit}`);
    
    return response.map(item => ({
      sprint: item.sprint_name,
      velocity: item.completed_story_points,
      capacity: item.sprint_capacity,
    }));
  },
};
