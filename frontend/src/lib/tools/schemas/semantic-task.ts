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
export type FindSimilarTasksInput = z.infer<typeof findSimilarTasksSchema>;
