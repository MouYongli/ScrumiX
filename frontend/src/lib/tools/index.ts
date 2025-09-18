/**
 * ScrumiX AI Tools - Main Index
 * Central export point for all AI agent tools with modular structure
 */

// Import from new modular structure
export { productOwnerTools, productOwnerToolCategories } from './product-owner';
export type { ProductOwnerTools } from './product-owner';

export { developerTools, sprintBacklogTools, taskManagementTools, semanticSearchTools } from './developer';
export type { DeveloperTools, SprintBacklogTools, TaskManagementTools, SemanticSearchTools } from './developer';

export { scrumMasterTools } from './scrum-master';
export type { ScrumMasterTools } from './scrum-master';

// Shared utilities and documentation tools
export { documentationTools } from './utils/documentation';
export type { DocumentationTools } from './utils/documentation';

export { utils } from './utils';
export { getWebSearchToolsForModel, hasNativeWebSearch } from './utils/web-search';

// Schema exports
export * as ToolSchemas from './legacy/schemas';

// Legacy compatibility exports for backward compatibility
export { backlogManagementTools } from './product-owner/legacy/backlog-management';
export type { BacklogManagementTools } from './product-owner/legacy/backlog-management';

export { sprintManagementTools } from './product-owner/legacy/sprint-management';
export type { SprintManagementTools } from './product-owner/legacy/sprint-management';

export { velocityManagementTools } from './product-owner/legacy/velocity-management';
export type { VelocityManagementTools } from './product-owner/legacy/velocity-management';

export { semanticBacklogManagementTools } from './product-owner/legacy/semantic-backlog-management';
export type { SemanticBacklogManagementTools } from './product-owner/legacy/semantic-backlog-management';

export { semanticSprintManagementTools as semanticSprintTools } from './product-owner/legacy/semantic-sprint-management';
export type { SemanticSprintManagementTools as SemanticSprintTools } from './product-owner/legacy/semantic-sprint-management';

export { developerSprintTools } from './developer/legacy/developer-sprint-management';
export type { DeveloperSprintTools } from './developer/legacy/developer-sprint-management';

export { semanticDocumentationTools } from './legacy/semantic-documentation-search';
export type { SemanticDocumentationTools } from './legacy/semantic-documentation-search';

// Import tools for legacy collections
import { productOwnerTools } from './product-owner';
import { developerTools } from './developer';
import { scrumMasterTools } from './legacy/scrum-master';

// Legacy tool collections (deprecated - use modular imports instead)
/**
 * @deprecated Use productOwnerTools from './product-owner' instead
 */
export const legacyProductOwnerTools = productOwnerTools;

/**
 * @deprecated Use developerTools from './developer' instead  
 */
export const legacyDeveloperTools = developerTools;

/**
 * @deprecated Use scrumMasterTools from './scrum-master' instead
 */
export const scrumTools = scrumMasterTools;


