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

/**
 * Schema for comprehensive velocity analysis across multiple sprints
 */
export const velocityAnalysisSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
    
  sprint_count: z.number()
    .int('Sprint count must be a whole number')
    .min(1, 'Sprint count must be at least 1')
    .max(50, 'Sprint count cannot exceed 50')
    .default(20)
    .describe('Number of recent completed sprints to analyze'),
    
  include_forecast: z.boolean()
    .default(true)
    .describe('Include capacity planning forecasts and recommendations')
});

/**
 * Schema for current sprint velocity analysis
 */
export const currentSprintVelocitySchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the sprint to analyze (auto-detected if not provided)'),
    
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
    
  compare_with_average: z.boolean()
    .default(true)
    .describe('Compare current sprint velocity with team average')
});

/**
 * Schema for detailed burndown chart analysis
 */
export const burndownAnalysisSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the sprint to analyze (auto-detected if not provided)'),
    
  sprint_title: z.string()
    .optional()
    .describe('Title or partial title of the sprint to search for'),
    
  start_date: z.string()
    .optional()
    .describe('Start date for custom date range analysis (YYYY-MM-DD)'),
    
  end_date: z.string()
    .optional()
    .describe('End date for custom date range analysis (YYYY-MM-DD)'),
    
  include_trend_analysis: z.boolean()
    .default(false)
    .describe('Include trend analysis comparing with historical data'),
    
  include_ideal_comparison: z.boolean()
    .default(true)
    .describe('Include comparison with ideal burndown line'),
    
  include_pattern_analysis: z.boolean()
    .default(false)
    .describe('Include pattern analysis to detect spikes, plateaus, and blockers'),
    
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of data points to include in analysis')
});

// Export TypeScript types
export type GetSprintVelocityInput = z.infer<typeof getSprintVelocitySchema>;
export type GetProjectAverageVelocityInput = z.infer<typeof getProjectAverageVelocitySchema>;
export type GetProjectVelocityMetricsInput = z.infer<typeof getProjectVelocityMetricsSchema>;
export type GetProjectVelocityTrendInput = z.infer<typeof getProjectVelocityTrendSchema>;
export type VelocityAnalysisInput = z.infer<typeof velocityAnalysisSchema>;
export type CurrentSprintVelocityInput = z.infer<typeof currentSprintVelocitySchema>;
export type BurndownAnalysisInput = z.infer<typeof burndownAnalysisSchema>;