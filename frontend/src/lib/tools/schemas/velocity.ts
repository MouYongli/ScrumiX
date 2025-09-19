/**
 * Centralized Zod schemas for velocity management operations
 * These schemas define validation rules for sprint and project velocity tracking and analysis
 */

import { z } from 'zod';

/**
 * Schema for getting velocity points of a specific sprint
 */
export const getSprintVelocitySchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to get velocity for (can also be called sprintId or id)')
});

/**
 * Schema for calculating project average velocity
 */
export const getProjectAverageVelocitySchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to calculate average velocity for (can also be called projectId)'),
  
  exclude_sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Optional sprint ID to exclude from the average calculation (can also be called excludeSprintId)')
});

/**
 * Schema for getting comprehensive project velocity metrics
 */
export const getProjectVelocityMetricsSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get comprehensive velocity metrics for (can also be called projectId)')
});

/**
 * Schema for getting project velocity trend analysis
 */
export const getProjectVelocityTrendSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get velocity trend for (can also be called projectId)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Number of recent sprints to include in the trend (default: 5, max: 20)')
});

// Export TypeScript types
export type GetSprintVelocityInput = z.infer<typeof getSprintVelocitySchema>;
export type GetProjectAverageVelocityInput = z.infer<typeof getProjectAverageVelocitySchema>;
export type GetProjectVelocityMetricsInput = z.infer<typeof getProjectVelocityMetricsSchema>;
export type GetProjectVelocityTrendInput = z.infer<typeof getProjectVelocityTrendSchema>;