/**
 * Legacy compatibility layer for sprint-management.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Import all sprint management tools from the new modular structure
import {
  createSprintTool,
  getSprintsTool,
  getSprintByIdTool,
  updateSprintTool,
  deleteSprintTool,
  coreSprintTools,
  sprintTools,
  type CoreSprintTools,
  type SprintTools
} from '../sprint';

// Re-export all tools from the new modular structure
export {
  createSprintTool,
  getSprintsTool,
  getSprintByIdTool,
  updateSprintTool,
  deleteSprintTool,
  coreSprintTools,
  sprintTools,
  type CoreSprintTools,
  type SprintTools
};

// Legacy export for backward compatibility - the original collection
export const sprintManagementTools = {
  createSprint: createSprintTool,
  getSprints: getSprintsTool,
  getSprintById: getSprintByIdTool,
  updateSprint: updateSprintTool,
  deleteSprint: deleteSprintTool,
};

// Legacy type export
export type SprintManagementTools = typeof sprintManagementTools;
