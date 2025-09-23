/**
 * Documentation utilities and tools index
 * Central export point for all refactored documentation functionality
 * Uses centralized schemas from schemas/documentation.ts
 */

// Import refactored utility functions and AI tools from modular files
import { 
  makeAuthenticatedDocumentationApiCall,
  createDocumentation,
  getDocumentation,
  getDocumentationById,
  updateDocumentation,
  deleteDocumentation,
  formatDocumentationType,
  createDocumentationSummary,
  getDocumentationTypeOptions,
  // AI Tools
  createDocumentationTool,
  getDocumentationTool,
  getDocumentationByIdTool,
  updateDocumentationTool,
  deleteDocumentationTool
} from './crud';

import {
  documentationSearchWithAuth,
  formatDocumentationSearchResults,
  searchDocumentationByField,
  searchDocumentationMultiField,
  bm25SearchDocumentation,
  hybridSearchDocumentation,
  getSearchSuggestions,
  // AI Tools
  searchDocumentationByFieldTool,
  searchDocumentationMultiFieldTool,
  bm25SearchDocumentationTool,
  hybridSearchDocumentationTool,
  semanticDocumentationTools
} from './semantic-search';

import {
  getCurrentUser,
  getProjectUsers,
  findUserByName,
  findUsersByNames,
  formatUserInfo,
  formatUserList,
  validateAuthorIds,
  parseAuthorNames,
  resolveAuthorNamesToIds,
  createAuthorSuggestions,
  // AI Tools
  getCurrentUserTool,
  getProjectUsersTool,
  userManagementTools
} from './user-management';

// Import centralized schemas
import { DocumentationTypeEnum } from '../../schemas/documentation';

// Export utility functions
export {
  // CRUD utilities
  makeAuthenticatedDocumentationApiCall,
  createDocumentation,
  getDocumentation,
  getDocumentationById,
  updateDocumentation,
  deleteDocumentation,
  formatDocumentationType,
  createDocumentationSummary,
  getDocumentationTypeOptions,

  // Semantic search utilities
  documentationSearchWithAuth,
  formatDocumentationSearchResults,
  searchDocumentationByField,
  searchDocumentationMultiField,
  bm25SearchDocumentation,
  hybridSearchDocumentation,
  getSearchSuggestions,

  // User management utilities
  getCurrentUser,
  getProjectUsers,
  findUserByName,
  findUsersByNames,
  formatUserInfo,
  formatUserList,
  validateAuthorIds,
  parseAuthorNames,
  resolveAuthorNamesToIds,
  createAuthorSuggestions,

  // AI Tools
  createDocumentationTool,
  getDocumentationTool,
  getDocumentationByIdTool,
  updateDocumentationTool,
  deleteDocumentationTool,
  searchDocumentationByFieldTool,
  searchDocumentationMultiFieldTool,
  bm25SearchDocumentationTool,
  hybridSearchDocumentationTool,
  getCurrentUserTool,
  getProjectUsersTool,

  // Tool collections
  semanticDocumentationTools,
  userManagementTools,

  // Schema exports
  DocumentationTypeEnum
};

/**
 * Organized utility functions collection
 */
export const documentationUtils = {
  // CRUD operations
  crud: {
    makeAuthenticatedDocumentationApiCall,
    createDocumentation,
    getDocumentation,
    getDocumentationById,
    updateDocumentation,
    deleteDocumentation,
    formatDocumentationType,
    createDocumentationSummary,
    getDocumentationTypeOptions
  },

  // Semantic search
  semanticSearch: {
    documentationSearchWithAuth,
    formatDocumentationSearchResults,
    searchDocumentationByField,
    searchDocumentationMultiField,
    getSearchSuggestions
  },

  // User management
  userManagement: {
    getCurrentUser,
    getProjectUsers,
    findUserByName,
    findUsersByNames,
    formatUserInfo,
    formatUserList,
    validateAuthorIds,
    parseAuthorNames,
    resolveAuthorNamesToIds,
    createAuthorSuggestions
  },

  // Constants and schemas
  constants: {
    DocumentationTypeEnum
  }
};

/**
 * Complete documentation toolkit - AI tools for ALL agents
 * Every agent can create any type of documentation
 * Refactored to use centralized schemas and modular architecture
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
  searchDocumentationMultiField: semanticDocumentationTools.searchDocumentationMultiField,
  bm25SearchDocumentation: semanticDocumentationTools.bm25SearchDocumentation,
  hybridSearchDocumentation: semanticDocumentationTools.hybridSearchDocumentation
};

/**
 * Type definition for the complete documentation tools collection
 */
export type DocumentationTools = typeof documentationTools;

/**
 * Legacy compatibility exports
 * @deprecated Use the refactored functions and tools above
 */
export const legacyDocumentationUtils = documentationUtils;
export const legacyDocumentationTools = documentationTools;