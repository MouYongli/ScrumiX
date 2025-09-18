/**
 * Main documentation tools export
 * Aggregates all documentation utilities and AI tools for easy import
 */

// Import AI tools from the main documentation module
import {
  createDocumentationTool,
  getDocumentationTool,
  getDocumentationByIdTool,
  updateDocumentationTool,
  deleteDocumentationTool,
  getProjectUsersTool,
  getCurrentUserTool
} from '../../documentation';

// Import semantic search tools
import { semanticDocumentationTools } from '../../semantic-documentation-search';

// Export all functions from individual modules
export * from './crud';
export * from './user-management';
export * from './semantic-search';

// Import the actual utility functions
import {
  createDocumentation,
  getDocumentation,
  getDocumentationById,
  updateDocumentation,
  deleteDocumentation,
  formatDocumentationType,
  createDocumentationSummary
} from './crud';

import {
  getCurrentUser,
  getProjectUsers,
  findUserByName,
  formatUserList
} from './user-management';

import {
  searchDocumentationByField,
  searchDocumentationMultiField,
  formatDocumentationSearchResults
} from './semantic-search';

// Documentation utilities aggregate object for easy tool integration
export const documentationUtils = {
  // CRUD
  create: createDocumentation,
  get: getDocumentation,
  getById: getDocumentationById,
  update: updateDocumentation,
  delete: deleteDocumentation,
  
  // User management
  getCurrentUser: getCurrentUser,
  getProjectUsers: getProjectUsers,
  findUserByName: findUserByName,
  
  // Search
  searchByField: searchDocumentationByField,
  searchMultiField: searchDocumentationMultiField,
  
  // Formatting
  formatType: formatDocumentationType,
  formatSummary: createDocumentationSummary,
  formatUserList: formatUserList,
  formatSearchResults: formatDocumentationSearchResults
};

/**
 * Complete documentation toolkit - AI tools for ALL agents
 * Every agent can create any type of documentation
 */
export const documentationTools = {
  // CRUD Operations - Available to ALL agents
  createDocumentation: createDocumentationTool,
  getDocumentation: getDocumentationTool,
  getDocumentationById: getDocumentationByIdTool,
  updateDocumentation: updateDocumentationTool,
  deleteDocumentation: deleteDocumentationTool,
  
  // User Management Operations - Available to ALL agents
  getProjectUsers: getProjectUsersTool,
  getCurrentUser: getCurrentUserTool,
  
  // Semantic Search Operations - Available to ALL agents
  searchDocumentationByField: semanticDocumentationTools.searchDocumentationByField,
  searchDocumentationMultiField: semanticDocumentationTools.searchDocumentationMultiField
};

export type DocumentationTools = typeof documentationTools;
