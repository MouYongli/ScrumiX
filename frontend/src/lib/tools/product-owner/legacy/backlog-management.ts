/**
 * Legacy compatibility layer for backlog-management.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Import all backlog management tools from the new modular structure
import {
  createBacklogItemTool,
  getBacklogItemsTool,
  updateBacklogItemTool,
  getCurrentProjectContextTool,
  coreBacklogTools,
  backlogTools,
  type CoreBacklogTools,
  type BacklogTools
} from '../backlog';

// Re-export all tools from the new modular structure
export {
  createBacklogItemTool,
  getBacklogItemsTool,
  updateBacklogItemTool,
  getCurrentProjectContextTool,
  coreBacklogTools,
  backlogTools,
  type CoreBacklogTools,
  type BacklogTools
};

// Legacy export for backward compatibility - the original collection
export const backlogManagementTools = {
  // Re-export all tools from the new structure
  ...backlogTools
};

// Legacy type export
export type BacklogManagementTools = typeof backlogManagementTools;

