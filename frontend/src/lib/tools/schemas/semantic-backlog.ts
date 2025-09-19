/**
 * Centralized Zod schemas for semantic backlog management operations
 * These schemas define validation rules for AI-powered semantic search and similarity matching
 */

import { z } from 'zod';

/**
 * Schema for semantic search of backlog items using AI embeddings
 */
export const semanticSearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Natural language search query to find relevant backlog items'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Optional project ID to limit search scope'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.7)
    .describe('Minimum semantic similarity score (0-1, default: 0.7)')
});

/**
 * Schema for BM25 (keyword-based) search of backlog items
 */
export const bm25SearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Keyword search query for precise term matching'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Optional project ID to limit search scope'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10)')
});

/**
 * Schema for hybrid search combining semantic and keyword approaches
 */
export const hybridSearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Search query combining both semantic meaning and keyword matching'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Optional project ID to limit search scope'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(15)
    .describe('Maximum number of results to return (default: 15)'),
  
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
 * Schema for finding similar backlog items based on an existing item
 */
export const findSimilarBacklogSchema = z.object({
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('ID of the reference backlog item to find similar items for'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Maximum number of similar items to return (default: 5)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.6)
    .describe('Minimum similarity score for related items (0-1, default: 0.6)')
});

// Export TypeScript types
export type SemanticSearchBacklogInput = z.infer<typeof semanticSearchBacklogSchema>;
export type BM25SearchBacklogInput = z.infer<typeof bm25SearchBacklogSchema>;
export type HybridSearchBacklogInput = z.infer<typeof hybridSearchBacklogSchema>;
export type FindSimilarBacklogInput = z.infer<typeof findSimilarBacklogSchema>;
