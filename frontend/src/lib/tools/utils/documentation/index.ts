/**
 * Main documentation tools export
 * Aggregates all documentation utilities for easy import
 */

// CRUD operations
export * from './crud';

// User management
export * from './user-management';

// Semantic search
export * from './semantic-search';

// Re-export commonly used functions
export {
  createDocumentation,
  getDocumentation,
  getDocumentationById,
  updateDocumentation,
  deleteDocumentation,
  formatDocumentationType,
  createDocumentationSummary
} from './crud';

export {
  getCurrentUser,
  getProjectUsers,
  findUserByName,
  findUsersByNames,
  formatUserInfo,
  formatUserList,
  validateAuthorIds
} from './user-management';

export {
  documentationSearchWithAuth,
  formatDocumentationSearchResults,
  searchDocumentationByField,
  searchDocumentationMultiField,
  getSearchSuggestions
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
  getCurrentUser,
  getProjectUsers,
  findUserByName,
  
  // Search
  searchByField: searchDocumentationByField,
  searchMultiField: searchDocumentationMultiField,
  
  // Formatting
  formatType: formatDocumentationType,
  formatSummary: createDocumentationSummary,
  formatUserList,
  formatSearchResults: formatDocumentationSearchResults
};
