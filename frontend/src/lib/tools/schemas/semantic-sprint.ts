/**
 * Centralized Zod schemas for semantic sprint management operations
 * These schemas define validation rules for AI-powered semantic search and similarity matching for sprints
 */

import { z } from 'zod';

/**
 * Schema for semantic search of sprints using AI embeddings
 * Compatible with both PO agent and developer tools
 */
export const semanticSearchSprintsSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .max(500, 'Query must be 500 characters or less')
    .describe('Natural language search query to find relevant sprints (describe the sprint concept, theme, or purpose)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Project ID to scope the search (auto-detected if not provided, optional for developer tools)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10 for developer tools, can be overridden)')
});

/**
 * Schema for finding similar sprints based on an existing sprint
 */
export const findSimilarSprintsSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('ID of the sprint to find similar sprints for'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(10, 'Limit cannot exceed 10')
    .default(3)
    .describe('Maximum number of similar sprints to return (default: 3)')
});

// Export TypeScript types
export type SemanticSearchSprintsInput = z.infer<typeof semanticSearchSprintsSchema>;
export type FindSimilarSprintsInput = z.infer<typeof findSimilarSprintsSchema>;
