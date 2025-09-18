/**
 * Legacy compatibility layer for developer-sprint-management.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Import all tools from the new modular structure
import {
  // Sprint backlog tools
  getProjectSprints,
  getCurrentActiveSprint,
  getBacklogItems,
  reviewSprintBacklog,
  createSprintBacklogItem,
  updateSprintBacklogItem,
  deleteSprintBacklogItem,
  
  // Task management tools
  createTaskForBacklogItem,
  getSprintTasks,
  updateTask,
  deleteTask,
  
  // Semantic search tools
  semanticSearchTasks,
  findSimilarTasks,
  semanticSearchSprints,
  
  // Aggregated collections
  developerTools,
  sprintBacklogTools,
  taskManagementTools,
  semanticSearchTools,
  
  // Types
  type DeveloperTools,
  type SprintBacklogTools,
  type TaskManagementTools,
  type SemanticSearchTools,
} from '../index';

// Re-export all tools from the new modular structure
export {
  // Sprint backlog tools
  getProjectSprints,
  getCurrentActiveSprint,
  getBacklogItems,
  reviewSprintBacklog,
  createSprintBacklogItem,
  updateSprintBacklogItem,
  deleteSprintBacklogItem,
  
  // Task management tools
  createTaskForBacklogItem,
  getSprintTasks,
  updateTask,
  deleteTask,
  
  // Semantic search tools
  semanticSearchTasks,
  findSimilarTasks,
  semanticSearchSprints,
  
  // Aggregated collections
  developerTools,
  sprintBacklogTools,
  taskManagementTools,
  semanticSearchTools,
  
  // Types
  type DeveloperTools,
  type SprintBacklogTools,
  type TaskManagementTools,
  type SemanticSearchTools,
};

// Legacy export for backward compatibility - the original collection
export const developerSprintTools = {
  // Sprint backlog management
  getProjectSprints,
  getCurrentActiveSprint,
  getBacklogItems,
  createSprintBacklogItem,
  updateSprintBacklogItem,
  deleteSprintBacklogItem,
  reviewSprintBacklog,
  semanticSearchSprints,
  
  // Task management tools
  createTaskForBacklogItem,
  getSprintTasks,
  updateTask,
  deleteTask,
  
  // Task semantic search tools
  semanticSearchTasks,
  findSimilarTasks
};

// Legacy type export
export type DeveloperSprintTools = typeof developerSprintTools;
