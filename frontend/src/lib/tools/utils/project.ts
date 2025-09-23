/**
 * Project context utilities
 */

import { requestWithAuth, type AuthContext } from './http';
import type { ProjectContext } from './types';

/**
 * Get current project context from the request context
 * This is a placeholder implementation that returns null
 * In a real implementation, this would extract project context from the request
 */
export async function getCurrentProjectContext(context: AuthContext): Promise<ProjectContext | null> {
  // This would typically extract project context from the request
  // For now, return null to indicate no context available
  // In the future, this could:
  // 1. Check for project_id in the context
  // 2. Make an API call to get the current user's active project
  // 3. Extract from URL parameters or session data
  return null;
}

/**
 * Get project information by ID
 */
export async function getProjectById(projectId: number, context: AuthContext): Promise<ProjectContext | null> {
  try {
    const response = await requestWithAuth(`/projects/${projectId}`, { method: 'GET' }, context);
    
    if (response.error || !response.data) {
      return null;
    }
    
    const project = response.data as any;
    return {
      project_id: project.id,
      project_name: project.name || project.title || `Project ${project.id}`
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}
