// API service for favorites

import { fetchApi } from './client';
import type { 
  Favorite, 
  FavoriteItem 
} from '@/types/api';

export const favoriteService = {
  // Get all favorites for current user
  async getFavorites(): Promise<FavoriteItem[]> {
    const response = await fetchApi<Favorite[]>('/favorites/');
    // Transform to FavoriteItem format - this would need additional API calls
    // to get the actual item details, or the backend should return enriched data
    return response.map(fav => ({
      id: fav.id.toString(),
      type: fav.project_id ? 'project' : fav.task_id ? 'task' : 'backlog_item',
      title: 'Loading...', // Would be populated from additional API calls
      description: '',
      url: fav.project_id ? `/project/${fav.project_id}` : 
           fav.task_id ? `/task/${fav.task_id}` : 
           `/backlog/${fav.backlog_item_id}`,
      metadata: {},
    }));
  },

  // Get enriched favorites with full item details
  async getEnrichedFavorites(): Promise<FavoriteItem[]> {
    return fetchApi<FavoriteItem[]>('/favorites/enriched/');
  },

  // Add project to favorites
  async addProjectToFavorites(projectId: string): Promise<void> {
    await fetchApi('/favorites/', {
      method: 'POST',
      body: JSON.stringify({ 
        project_id: parseInt(projectId) 
      }),
    });
  },

  // Add task to favorites
  async addTaskToFavorites(taskId: string): Promise<void> {
    await fetchApi('/favorites/', {
      method: 'POST',
      body: JSON.stringify({ 
        task_id: parseInt(taskId) 
      }),
    });
  },

  // Add backlog item to favorites
  async addBacklogItemToFavorites(backlogItemId: string): Promise<void> {
    await fetchApi('/favorites/', {
      method: 'POST',
      body: JSON.stringify({ 
        backlog_item_id: parseInt(backlogItemId) 
      }),
    });
  },

  // Remove from favorites
  async removeFromFavorites(favoriteId: string): Promise<void> {
    await fetchApi(`/favorites/${favoriteId}/`, {
      method: 'DELETE',
    });
  },

  // Check if item is favorited
  async isFavorited(type: 'project' | 'task' | 'backlog_item', itemId: string): Promise<boolean> {
    const fieldName = type === 'project' ? 'project_id' : 
                     type === 'task' ? 'task_id' : 
                     'backlog_item_id';
    
    try {
      const response = await fetchApi<Favorite[]>(`/favorites/?${fieldName}=${itemId}`);
      return response.length > 0;
    } catch {
      return false;
    }
  },

  // Get favorites by type
  async getFavoritesByType(type: 'project' | 'task' | 'backlog_item'): Promise<FavoriteItem[]> {
    const response = await fetchApi<FavoriteItem[]>(`/favorites/enriched/?type=${type}`);
    return response;
  },

  // Clear all favorites
  async clearAllFavorites(): Promise<void> {
    await fetchApi('/favorites/clear/', {
      method: 'DELETE',
    });
  },
};
