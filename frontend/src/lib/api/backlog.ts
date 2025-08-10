// API service for backlog items

import { fetchApi } from './client';
import type { 
  BacklogItem, 
  BacklogItemUI, 
  CreateBacklogItemRequest,
  PaginatedResponse 
} from '@/types/api';

// Transform backend BacklogItem to frontend BacklogItemUI
function transformBacklogItem(item: BacklogItem): BacklogItemUI {
  return {
    id: item.id.toString(),
    title: item.title,
    description: item.description || '',
    acceptanceCriteria: item.acceptance_criteria?.map(ac => ac.title) || [],
    priority: item.priority,
    status: item.status,
    story_point: item.story_point,
    label: item.label,
    item_type: item.item_type,
    level: item.level,
    path: item.path,
    created_at: item.created_at,
    updated_at: item.updated_at,
    sprint_id: item.sprint_id,
    // UI convenience fields
    storyPoints: item.story_point || 0,
    createdAt: item.created_at,
    lastUpdated: item.updated_at,
    assignee: item.assignee?.username,
    parentId: item.parent_id?.toString(),
    hierarchyLevel: item.level,
    type: item.item_type,
    labels: item.label ? [item.label] : [],
  };
}

export const backlogService = {
  // Get all backlog items for a project
  async getBacklogItems(projectId: string): Promise<BacklogItemUI[]> {
    const response = await fetchApi<BacklogItem[]>(`/projects/${projectId}/backlog/`);
    return response.map(transformBacklogItem);
  },

  // Get backlog items with pagination
  async getBacklogItemsPaginated(
    projectId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<PaginatedResponse<BacklogItemUI>> {
    const response = await fetchApi<PaginatedResponse<BacklogItem>>(
      `/projects/${projectId}/backlog/?page=${page}&limit=${limit}`
    );
    return {
      ...response,
      items: response.items.map(transformBacklogItem),
    };
  },

  // Get a specific backlog item
  async getBacklogItem(projectId: string, itemId: string): Promise<BacklogItemUI> {
    const response = await fetchApi<BacklogItem>(`/projects/${projectId}/backlog/${itemId}/`);
    return transformBacklogItem(response);
  },

  // Create a new backlog item
  async createBacklogItem(projectId: string, data: Omit<CreateBacklogItemRequest, 'project_id'>): Promise<BacklogItemUI> {
    const response = await fetchApi<BacklogItem>(`/projects/${projectId}/backlog/`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        project_id: parseInt(projectId),
      }),
    });
    return transformBacklogItem(response);
  },

  // Update a backlog item
  async updateBacklogItem(
    projectId: string, 
    itemId: string, 
    data: Partial<CreateBacklogItemRequest>
  ): Promise<BacklogItemUI> {
    const response = await fetchApi<BacklogItem>(`/projects/${projectId}/backlog/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return transformBacklogItem(response);
  },

  // Delete a backlog item
  async deleteBacklogItem(projectId: string, itemId: string): Promise<void> {
    await fetchApi<void>(`/projects/${projectId}/backlog/${itemId}/`, {
      method: 'DELETE',
    });
  },

  // Get backlog items by status
  async getBacklogItemsByStatus(projectId: string, status: string): Promise<BacklogItemUI[]> {
    const response = await fetchApi<BacklogItem[]>(`/projects/${projectId}/backlog/?status=${status}`);
    return response.map(transformBacklogItem);
  },

  // Get backlog items by type (epic, user_story, etc.)
  async getBacklogItemsByType(projectId: string, type: string): Promise<BacklogItemUI[]> {
    const response = await fetchApi<BacklogItem[]>(`/projects/${projectId}/backlog/?type=${type}`);
    return response.map(transformBacklogItem);
  },

  // Move backlog item to sprint
  async moveToSprint(projectId: string, itemId: string, sprintId: string): Promise<BacklogItemUI> {
    const response = await fetchApi<BacklogItem>(`/projects/${projectId}/backlog/${itemId}/move-to-sprint/`, {
      method: 'POST',
      body: JSON.stringify({ sprint_id: parseInt(sprintId) }),
    });
    return transformBacklogItem(response);
  },

  // Update item priority order
  async updatePriority(projectId: string, itemId: string, newPosition: number): Promise<BacklogItemUI> {
    const response = await fetchApi<BacklogItem>(`/projects/${projectId}/backlog/${itemId}/priority/`, {
      method: 'PUT',
      body: JSON.stringify({ position: newPosition }),
    });
    return transformBacklogItem(response);
  },
};
