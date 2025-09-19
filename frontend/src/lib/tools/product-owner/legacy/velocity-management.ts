/**
 * Legacy compatibility layer for velocity-management.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Import all velocity management tools from the new modular structure
import {
  getSprintVelocityTool,
  getProjectAverageVelocityTool,
  getProjectVelocityMetricsTool,
  getProjectVelocityTrendTool,
  velocityTools,
  type VelocityTools
} from '../sprint';

// Re-export all tools from the new modular structure
export {
  getSprintVelocityTool,
  getProjectAverageVelocityTool,
  getProjectVelocityMetricsTool,
  getProjectVelocityTrendTool,
  velocityTools,
  type VelocityTools
};

// Legacy export for backward compatibility - the original collection
export const velocityManagementTools = {
  getSprintVelocity: getSprintVelocityTool,
  getProjectAverageVelocity: getProjectAverageVelocityTool,
  getProjectVelocityMetrics: getProjectVelocityMetricsTool,
  getProjectVelocityTrend: getProjectVelocityTrendTool,
};

// Legacy type export
export type VelocityManagementTools = typeof velocityManagementTools;


