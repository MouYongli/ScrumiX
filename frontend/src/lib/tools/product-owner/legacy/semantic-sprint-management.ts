/**
 * Legacy compatibility layer for semantic-sprint-management.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Import all semantic sprint tools from the new modular structure
import {
  semanticSearchSprintsTool,
  findSimilarSprintsTool,
  semanticSprintManagementTools,
  type SemanticSprintManagementTools
} from '../sprint';

// Re-export all tools from the new modular structure
export {
  semanticSearchSprintsTool,
  findSimilarSprintsTool,
  semanticSprintManagementTools,
  type SemanticSprintManagementTools
};

// Legacy export for backward compatibility - already exported above
// The semanticSprintManagementTools object maintains the same structure


