/**
 * Legacy compatibility layer for semantic-backlog-management.ts
 * Re-exports all tools from the new modular structure for backward compatibility
 */

// Import all semantic backlog tools from the new modular structure
import {
  semanticSearchBacklogTool,
  bm25SearchBacklogTool,
  hybridSearchBacklogTool,
  findSimilarBacklogTool,
  semanticBacklogManagementTools,
  type SemanticBacklogManagementTools
} from '../backlog';

// Re-export all tools from the new modular structure
export {
  semanticSearchBacklogTool,
  bm25SearchBacklogTool,
  hybridSearchBacklogTool,
  findSimilarBacklogTool,
  semanticBacklogManagementTools,
  type SemanticBacklogManagementTools
};

// Legacy export for backward compatibility - already exported above
// The semanticBacklogManagementTools object maintains the same structure

