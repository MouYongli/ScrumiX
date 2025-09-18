/**
 * Backlog Management Tools Index
 * Aggregates all backlog-related tools for the Product Owner agent
 */

// Import core backlog management tools
import {
  createBacklogItemTool,
  getBacklogItemsTool,
  updateBacklogItemTool,
  deleteBacklogItemTool,
  getCurrentProjectContextTool
} from './backlog-management';

// Import semantic backlog management tools
import {
  semanticSearchBacklogTool,
  bm25SearchBacklogTool,
  hybridSearchBacklogTool,
  findSimilarBacklogTool,
  semanticBacklogManagementTools
} from './semantic-backlog-management';

// Export individual tools
export {
  // Core backlog management
  createBacklogItemTool,
  getBacklogItemsTool,
  updateBacklogItemTool,
  deleteBacklogItemTool,
  getCurrentProjectContextTool,
  
  // Semantic backlog management
  semanticSearchBacklogTool,
  bm25SearchBacklogTool,
  hybridSearchBacklogTool,
  findSimilarBacklogTool
};

// Create core backlog tools aggregate
export const coreBacklogTools = {
  createBacklogItem: createBacklogItemTool,
  getBacklogItems: getBacklogItemsTool,
  updateBacklogItem: updateBacklogItemTool,
  deleteBacklogItem: deleteBacklogItemTool,
  getCurrentProjectContext: getCurrentProjectContextTool,
};

// Export semantic tools aggregate (re-export from semantic file)
export { semanticBacklogManagementTools };

// Create complete backlog tools aggregate
export const backlogTools = {
  // Core backlog management
  ...coreBacklogTools,
  
  // Semantic backlog search and discovery
  ...semanticBacklogManagementTools,
};

// Export types
export type CoreBacklogTools = typeof coreBacklogTools;
export type BacklogTools = typeof backlogTools;

