/**
 * Developer Agent Tools - Complete toolkit for sprint-focused development work
 * Includes sprint backlog management, task management, semantic search, and documentation tools
 */

// Import all developer tools
import { 
  getProjectSprints, 
  getCurrentActiveSprint, 
  getBacklogItems, 
  reviewSprintBacklog,
  createSprintBacklogItem,
  updateSprintBacklogItem,
  deleteSprintBacklogItem
} from './sprint-backlog';

import { 
  createTaskForBacklogItem, 
  getSprintTasks, 
  updateTask, 
  deleteTask 
} from './tasks';

import { 
  semanticSearchTasks, 
  findSimilarTasks 
} from './semantic-tasks';

import { 
  semanticSearchSprints 
} from './semantic-sprints';

import { documentationTools } from '../documentation';

// Export individual tools for direct access
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
  semanticSearchSprints
};

// Create sprint backlog tools aggregate
const sprintBacklogTools = {
  getProjectSprints,
  getCurrentActiveSprint,
  getBacklogItems,
  reviewSprintBacklog,
  createSprintBacklogItem,
  updateSprintBacklogItem,
  deleteSprintBacklogItem,
};

// Create task management tools aggregate
const taskManagementTools = {
  createTaskForBacklogItem,
  getSprintTasks,
  updateTask,
  deleteTask,
};

// Create semantic search tools aggregate
const semanticSearchTools = {
  semanticSearchTasks,
  findSimilarTasks,
  semanticSearchSprints,
};

// Export tool aggregates
export { sprintBacklogTools, taskManagementTools, semanticSearchTools };

/**
 * Complete Developer Agent Tools Collection
 * Includes all development-focused tools plus shared documentation capabilities
 */
export const developerTools = {
  // Sprint backlog management
  ...sprintBacklogTools,
  
  // Task management
  ...taskManagementTools,
  
  // Semantic search capabilities
  ...semanticSearchTools,
  
  // Documentation tools (shared across all agents)
  ...documentationTools,
};

// Type definitions
export type DeveloperTools = typeof developerTools;
export type SprintBacklogTools = typeof sprintBacklogTools;
export type TaskManagementTools = typeof taskManagementTools;
export type SemanticSearchTools = typeof semanticSearchTools;