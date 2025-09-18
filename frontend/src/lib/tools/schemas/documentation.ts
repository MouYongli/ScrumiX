import { z } from 'zod';

/**
 * Documentation type enum for validation - matches backend DocumentationType
 */
export const DocumentationTypeEnum = z.enum([
  'sprint_review',
  'sprint_retrospective',
  'requirement',
  'design_architecture',
  'meeting_report',
  'user_guide',
  'other'
]);

/**
 * Schema for creating new documentation
 * Used by all agents to create various types of documentation
 */
export const createDocumentationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less')
    .describe('Document title (must be unique)'),
  
  type: DocumentationTypeEnum
    .describe('Documentation type: sprint_review, sprint_retrospective, requirement, design_architecture, meeting_report, user_guide, or other'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .describe('Optional brief description or summary of the document'),
  
  content: z.string()
    .optional()
    .describe('Full document content in markdown format'),
  
  file_url: z.string()
    .url('Must be a valid URL')
    .optional()
    .describe('Optional URL to external file or document'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('ID of the project this documentation belongs to'),
  
  author_ids: z.array(z.number().int().positive())
    .optional()
    .describe('Optional array of user IDs who are authors of this document')
});

/**
 * Schema for retrieving documentation with filtering
 * Supports pagination and various filter criteria
 */
export const getDocumentationSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('Filter by documentation type'),
  
  search: z.string()
    .optional()
    .describe('Search term across title, description, and content'),
  
  author_id: z.number()
    .int('Author ID must be a whole number')
    .positive('Author ID must be a positive integer')
    .optional()
    .describe('Filter by author user ID'),
  
  skip: z.number()
    .int('Skip must be a whole number')
    .min(0, 'Skip must be non-negative')
    .default(0)
    .describe('Number of documents to skip for pagination'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50)
    .describe('Maximum number of documents to return')
});

/**
 * Schema for getting documentation by ID
 */
export const getDocumentationByIdSchema = z.object({
  documentation_id: z.number()
    .int('Documentation ID must be a whole number')
    .positive('Documentation ID must be a positive integer')
    .describe('The ID of the documentation to retrieve')
});

/**
 * Schema for updating existing documentation
 * All fields are optional except the ID
 */
export const updateDocumentationSchema = z.object({
  documentation_id: z.number()
    .int('Documentation ID must be a whole number')
    .positive('Documentation ID must be a positive integer')
    .describe('The ID of the documentation to update'),
  
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('Updated document title'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('Updated documentation type'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .describe('Updated description or summary'),
  
  content: z.string()
    .optional()
    .describe('Updated document content in markdown format'),
  
  file_url: z.string()
    .url('Must be a valid URL')
    .optional()
    .describe('Updated URL to external file or document'),
  
  author_ids: z.array(z.number().int().positive())
    .optional()
    .describe('Updated array of author user IDs')
});

/**
 * Schema for deleting documentation
 */
export const deleteDocumentationSchema = z.object({
  documentation_id: z.number()
    .int('Documentation ID must be a whole number')
    .positive('Documentation ID must be a positive integer')
    .describe('The ID of the documentation to delete'),
  
  confirm: z.boolean()
    .default(false)
    .describe('Confirmation flag - must be true to proceed with deletion')
});

/**
 * Schema for semantic search by specific field
 * Allows targeted search within title, description, or content
 */
export const searchDocumentationByFieldSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .describe('Search query text'),
  
  field: z.enum(['title', 'description', 'content'])
    .describe('Field to search in: title, description, or content'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('Filter by documentation type'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return')
});

/**
 * Schema for multi-field semantic search
 * Searches across multiple fields with weighted results
 */
export const searchDocumentationMultiFieldSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .describe('Search query text'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('Filter by documentation type'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return')
});

/**
 * Schema for BM25 (keyword-based) search of documentation
 */
export const bm25SearchDocumentationSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .describe('Keyword search query for precise term matching in documentation'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('Filter by documentation type'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return')
});

/**
 * Schema for hybrid search combining semantic and keyword approaches for documentation
 */
export const hybridSearchDocumentationSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .describe('Search query combining both semantic meaning and keyword matching'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('Filter by documentation type'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(15)
    .describe('Maximum number of results to return'),
  
  semantic_weight: z.number()
    .min(0.0, 'Semantic weight must be between 0 and 1')
    .max(1.0, 'Semantic weight must be between 0 and 1')
    .default(0.7)
    .describe('Weight for semantic search (used in weighted mode, default: 0.7)'),
  
  keyword_weight: z.number()
    .min(0.0, 'Keyword weight must be between 0 and 1')
    .max(1.0, 'Keyword weight must be between 0 and 1')
    .default(0.3)
    .describe('Weight for BM25 keyword search (used in weighted mode, default: 0.3)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.5)
    .describe('Minimum semantic similarity score (0-1, default: 0.5)'),
  
  use_rrf: z.boolean()
    .default(true)
    .describe('Use Reciprocal Rank Fusion (recommended) vs weighted scoring (default: true)')
});

/**
 * Schema for getting project users
 * Used for author management in documentation
 */
export const getProjectUsersSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The project ID to get users for (auto-detected if not provided)'),
  
  search: z.string()
    .optional()
    .describe('Search term to filter users by name or email')
});

/**
 * Schema for getting current user information
 * Used to identify the current user for author assignment
 */
export const getCurrentUserSchema = z.object({
  // No input parameters - uses authentication context
});

// Export TypeScript types
export type CreateDocumentationInput = z.infer<typeof createDocumentationSchema>;
export type GetDocumentationInput = z.infer<typeof getDocumentationSchema>;
export type GetDocumentationByIdInput = z.infer<typeof getDocumentationByIdSchema>;
export type UpdateDocumentationInput = z.infer<typeof updateDocumentationSchema>;
export type DeleteDocumentationInput = z.infer<typeof deleteDocumentationSchema>;
export type SearchDocumentationByFieldInput = z.infer<typeof searchDocumentationByFieldSchema>;
export type SearchDocumentationMultiFieldInput = z.infer<typeof searchDocumentationMultiFieldSchema>;
export type BM25SearchDocumentationInput = z.infer<typeof bm25SearchDocumentationSchema>;
export type HybridSearchDocumentationInput = z.infer<typeof hybridSearchDocumentationSchema>;
export type GetProjectUsersInput = z.infer<typeof getProjectUsersSchema>;
export type GetCurrentUserInput = z.infer<typeof getCurrentUserSchema>;


