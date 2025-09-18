/**
 * Export all shared utilities for tools
 */

// Import functions for re-export and utils object
import { requestWithAuth, getApiBaseUrl, AuthContext } from './http';
import { formatDateForBackend } from './dates';
import { getWebSearchToolsForModel, hasNativeWebSearch } from './web-search';
import { 
  formatPercentage, 
  formatNumber, 
  createProgressBar, 
  createMarkdownTable, 
  truncateText, 
  toTitleCase, 
  formatStatus 
} from './formatting';
import { documentationUtils } from './documentation';
import { getCurrentProjectContext, getProjectById } from './project';
import { getUserTimezoneAndFormatDatetime, simpleToISO } from './datetime';

// HTTP utilities
export { requestWithAuth, getApiBaseUrl } from './http';
export type { AuthContext } from './http';

// Date utilities  
export { formatDateForBackend } from './dates';

// Formatting utilities
export * from './formatting';

// Type definitions (excluding AuthContext to avoid conflict)
export * from './types';

// Web search utilities
export * from './web-search';

// Documentation utilities (shared across all agents)
export * from './documentation';

// Project utilities
export { getCurrentProjectContext, getProjectById } from './project';

// DateTime utilities
export * from './datetime';

// Aggregate utils object for easy access
export const utils = {
  // HTTP
  requestWithAuth,
  getApiBaseUrl,
  
  // Dates
  formatDateForBackend,
  
  // Web search
  getWebSearchToolsForModel,
  hasNativeWebSearch,
  
  // Documentation
  documentation: documentationUtils,
  
  // Project
  getCurrentProjectContext,
  getProjectById,
  
  // DateTime
  getUserTimezoneAndFormatDatetime,
  simpleToISO,
  
  // Formatting helpers
  formatPercentage,
  formatNumber,
  createProgressBar,
  createMarkdownTable,
  truncateText,
  toTitleCase,
  formatStatus
};
