/**
 * Product Owner Tools Index
 * Complete collection of all Product Owner-specific tools plus shared documentation capabilities
 */

// Import backlog management tools
import { backlogTools, coreBacklogTools, semanticBacklogManagementTools } from './backlog';

// Import sprint management tools
import { sprintTools, coreSprintTools, velocityTools, semanticSprintManagementTools } from './sprint';

// Import shared documentation tools
import { documentationTools } from '../utils/documentation';

// Export individual tool collections for direct access
export {
  // Backlog tools
  backlogTools,
  coreBacklogTools,
  semanticBacklogManagementTools,
  
  // Sprint tools
  sprintTools,
  coreSprintTools,
  velocityTools,
  semanticSprintManagementTools,
  
  // Documentation tools
  documentationTools
};

// Export individual tools for direct import
export * from './backlog';
export * from './sprint';

/**
 * Complete Product Owner Agent Tools Collection
 * Includes all product management tools plus shared documentation capabilities
 */
export const productOwnerTools = {
  // Core backlog management
  createBacklogItem: coreBacklogTools.createBacklogItem,
  getBacklogItems: coreBacklogTools.getBacklogItems,
  updateBacklogItem: coreBacklogTools.updateBacklogItem,
  deleteBacklogItem: coreBacklogTools.deleteBacklogItem,
  getCurrentProjectContext: coreBacklogTools.getCurrentProjectContext,

  // Semantic backlog search and discovery
  semanticSearchBacklog: semanticBacklogManagementTools.semanticSearchBacklog,
  bm25SearchBacklog: semanticBacklogManagementTools.bm25SearchBacklog,
  hybridSearchBacklog: semanticBacklogManagementTools.hybridSearchBacklog,
  findSimilarBacklog: semanticBacklogManagementTools.findSimilarBacklog,

  // Core sprint management
  createSprint: coreSprintTools.createSprint,
  getSprints: coreSprintTools.getSprints,
  getSprintById: coreSprintTools.getSprintById,
  updateSprint: coreSprintTools.updateSprint,
  deleteSprint: coreSprintTools.deleteSprint,

  // Velocity management
  getSprintVelocity: velocityTools.getSprintVelocity,
  getProjectAverageVelocity: velocityTools.getProjectAverageVelocity,
  getProjectVelocityMetrics: velocityTools.getProjectVelocityMetrics,
  getProjectVelocityTrend: velocityTools.getProjectVelocityTrend,

  // Semantic sprint search and discovery
  semanticSearchSprints: semanticSprintManagementTools.semanticSearchSprints,
  findSimilarSprints: semanticSprintManagementTools.findSimilarSprints,

  // Shared documentation tools (available to ALL agents)
  createDocumentation: documentationTools.createDocumentation,
  getDocumentation: documentationTools.getDocumentation,
  getDocumentationById: documentationTools.getDocumentationById,
  updateDocumentation: documentationTools.updateDocumentation,
  deleteDocumentation: documentationTools.deleteDocumentation,
  getProjectUsers: documentationTools.getProjectUsers,
  getCurrentUser: documentationTools.getCurrentUser,
  searchDocumentationByField: documentationTools.searchDocumentationByField,
  searchDocumentationMultiField: documentationTools.searchDocumentationMultiField,
};

/**
 * Type definition for the complete Product Owner tools collection
 */
export type ProductOwnerTools = typeof productOwnerTools;

/**
 * Product Owner tool categories for organized access
 */
export const productOwnerToolCategories = {
  // Backlog management category
  backlog: {
    core: coreBacklogTools,
    semantic: semanticBacklogManagementTools,
    all: backlogTools,
  },
  
  // Sprint management category
  sprint: {
    core: coreSprintTools,
    velocity: velocityTools,
    semantic: semanticSprintManagementTools,
    all: sprintTools,
  },
  
  // Documentation category (shared across all agents)
  documentation: documentationTools,
};

/**
 * Legacy compatibility - maintains backward compatibility with existing imports
 * @deprecated Use productOwnerTools instead
 */
export const legacyProductOwnerTools = productOwnerTools;