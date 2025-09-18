/**
 * Sprint Management Tools Index
 * Aggregates all sprint-related tools for the Product Owner agent
 */

// Import core sprint management tools
import {
  createSprintTool,
  getSprintsTool,
  getSprintByIdTool,
  updateSprintTool,
  deleteSprintTool
} from './sprint-management';

// Import velocity management tools
import {
  getSprintVelocityTool,
  getProjectAverageVelocityTool,
  getProjectVelocityMetricsTool,
  getProjectVelocityTrendTool
} from './velocity-management';

// Import semantic sprint management tools
import {
  semanticSearchSprintsTool,
  findSimilarSprintsTool,
  semanticSprintManagementTools
} from './semantic-sprint-management';

// Export individual tools
export {
  // Core sprint management
  createSprintTool,
  getSprintsTool,
  getSprintByIdTool,
  updateSprintTool,
  deleteSprintTool,
  
  // Velocity management
  getSprintVelocityTool,
  getProjectAverageVelocityTool,
  getProjectVelocityMetricsTool,
  getProjectVelocityTrendTool,
  
  // Semantic sprint management
  semanticSearchSprintsTool,
  findSimilarSprintsTool
};

// Create core sprint tools aggregate
export const coreSprintTools = {
  createSprint: createSprintTool,
  getSprints: getSprintsTool,
  getSprintById: getSprintByIdTool,
  updateSprint: updateSprintTool,
  deleteSprint: deleteSprintTool,
};

// Create velocity tools aggregate
export const velocityTools = {
  getSprintVelocity: getSprintVelocityTool,
  getProjectAverageVelocity: getProjectAverageVelocityTool,
  getProjectVelocityMetrics: getProjectVelocityMetricsTool,
  getProjectVelocityTrend: getProjectVelocityTrendTool,
};

// Export semantic tools aggregate (re-export from semantic file)
export { semanticSprintManagementTools };

// Create complete sprint tools aggregate
export const sprintTools = {
  // Core sprint management
  ...coreSprintTools,
  
  // Velocity management
  ...velocityTools,
  
  // Semantic sprint search and discovery
  ...semanticSprintManagementTools,
};

// Export types
export type CoreSprintTools = typeof coreSprintTools;
export type VelocityTools = typeof velocityTools;
export type SprintTools = typeof sprintTools;

