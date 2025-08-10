// API service for documentation

import { fetchApi } from './client';
import type { 
  DocumentationItem, 
  DocumentationItemUI, 
  CreateDocumentationRequest,
  PaginatedResponse 
} from '@/types/api';

// Transform backend DocumentationItem to frontend DocumentationItemUI
function transformDocumentationItem(item: DocumentationItem): DocumentationItemUI {
  return {
    id: item.id.toString(),
    title: item.title,
    content: item.content,
    type: item.type,
    category: item.category,
    tags: item.tags,
    author: 'Unknown', // Will be populated from user relationships
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    isPublished: item.is_published,
    projectId: item.project_id.toString(),
  };
}

export const documentationService = {
  // Get all documentation items for a project
  async getDocumentationItems(projectId: string): Promise<DocumentationItemUI[]> {
    const response = await fetchApi<DocumentationItem[]>(`/projects/${projectId}/documentation/`);
    return response.map(transformDocumentationItem);
  },

  // Get documentation items with pagination
  async getDocumentationItemsPaginated(
    projectId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResponse<DocumentationItemUI>> {
    const response = await fetchApi<PaginatedResponse<DocumentationItem>>(
      `/projects/${projectId}/documentation/?page=${page}&limit=${limit}`
    );
    return {
      ...response,
      items: response.items.map(transformDocumentationItem),
    };
  },

  // Get a specific documentation item
  async getDocumentationItem(projectId: string, itemId: string): Promise<DocumentationItemUI> {
    const response = await fetchApi<DocumentationItem>(`/projects/${projectId}/documentation/${itemId}/`);
    return transformDocumentationItem(response);
  },

  // Create a new documentation item
  async createDocumentationItem(projectId: string, data: Omit<CreateDocumentationRequest, 'project_id'>): Promise<DocumentationItemUI> {
    const response = await fetchApi<DocumentationItem>(`/projects/${projectId}/documentation/`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        project_id: parseInt(projectId),
      }),
    });
    return transformDocumentationItem(response);
  },

  // Update a documentation item
  async updateDocumentationItem(
    projectId: string, 
    itemId: string, 
    data: Partial<CreateDocumentationRequest>
  ): Promise<DocumentationItemUI> {
    const response = await fetchApi<DocumentationItem>(`/projects/${projectId}/documentation/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return transformDocumentationItem(response);
  },

  // Delete a documentation item
  async deleteDocumentationItem(projectId: string, itemId: string): Promise<void> {
    await fetchApi<void>(`/projects/${projectId}/documentation/${itemId}/`, {
      method: 'DELETE',
    });
  },

  // Get documentation items by type
  async getDocumentationByType(projectId: string, type: string): Promise<DocumentationItemUI[]> {
    const response = await fetchApi<DocumentationItem[]>(`/projects/${projectId}/documentation/?type=${type}`);
    return response.map(transformDocumentationItem);
  },

  // Get documentation items by category
  async getDocumentationByCategory(projectId: string, category: string): Promise<DocumentationItemUI[]> {
    const response = await fetchApi<DocumentationItem[]>(`/projects/${projectId}/documentation/?category=${category}`);
    return response.map(transformDocumentationItem);
  },

  // Search documentation
  async searchDocumentation(projectId: string, query: string): Promise<DocumentationItemUI[]> {
    const response = await fetchApi<DocumentationItem[]>(`/projects/${projectId}/documentation/search/?q=${encodeURIComponent(query)}`);
    return response.map(transformDocumentationItem);
  },

  // Get published documentation only
  async getPublishedDocumentation(projectId: string): Promise<DocumentationItemUI[]> {
    const response = await fetchApi<DocumentationItem[]>(`/projects/${projectId}/documentation/?published=true`);
    return response.map(transformDocumentationItem);
  },
};
