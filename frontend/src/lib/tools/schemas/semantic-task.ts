/**
 * Semantic Task Search Schema Definitions
 * Centralized schemas for semantic task search and similarity operations
 */

import { z } from 'zod';

/**
 * Schema for semantic search of tasks by meaning and concept
 */
export const semanticSearchTasksSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or less')
    .describe('What you\'re looking for (e.g., "authentication tasks", "database setup", "UI components")'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Filter to specific sprint (optional - will use active sprint if not provided)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return'),
  
  similarity_threshold: z.number()
    .min(0, 'Similarity threshold must be between 0 and 1')
    .max(1, 'Similarity threshold must be between 0 and 1')
    .default(0.7)
    .describe('Minimum similarity score (0.7 = good matches, 0.5 = broader matches)')
});

/**
 * Schema for BM25 (keyword-based) search of tasks
 */
export const bm25SearchTasksSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or less')
    .describe('Keyword search query for precise term matching in task titles and descriptions'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Filter to specific sprint (optional - will use active sprint if not provided)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return')
});

/**
 * Schema for hybrid search combining semantic and keyword approaches for tasks
 */
export const hybridSearchTasksSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Search query must be 500 characters or less')
    .describe('Search query combining both semantic meaning and keyword matching'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Filter to specific sprint (optional - will use active sprint if not provided)'),
  
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
    .min(0, 'Similarity threshold must be between 0 and 1')
    .max(1, 'Similarity threshold must be between 0 and 1')
    .default(0.5)
    .describe('Minimum semantic similarity score (0.5 = broader matches, 0.7 = good matches)'),
  
  use_rrf: z.boolean()
    .default(true)
    .describe('Use Reciprocal Rank Fusion (recommended) vs weighted scoring (default: true)')
});

/**
 * Schema for finding tasks similar to a specific task
 */
export const findSimilarTasksSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  task_id: z.number()
    .int('Task ID must be a whole number')
    .positive('Task ID must be a positive integer')
    .describe('The ID of the task to find similar tasks for'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Maximum number of similar tasks to return'),
  
  similarity_threshold: z.number()
    .min(0, 'Similarity threshold must be between 0 and 1')
    .max(1, 'Similarity threshold must be between 0 and 1')
    .default(0.6)
    .describe('Minimum similarity score (0.6 = good matches, 0.4 = broader matches)')
});

// Export types for TypeScript inference
export type SemanticSearchTasksInput = z.infer<typeof semanticSearchTasksSchema>;
export type BM25SearchTasksInput = z.infer<typeof bm25SearchTasksSchema>;
export type HybridSearchTasksInput = z.infer<typeof hybridSearchTasksSchema>;
export type FindSimilarTasksInput = z.infer<typeof findSimilarTasksSchema>;
