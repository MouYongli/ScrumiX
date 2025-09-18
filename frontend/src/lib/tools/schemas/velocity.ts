import { z } from 'zod';

/**
 * Schema for velocity analysis across multiple sprints
 * Analyzes team velocity trends and provides forecasting
 */
export const velocityAnalysisSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to analyze velocity for'),
  
  sprint_count: z.number()
    .int('Sprint count must be a whole number')
    .min(1, 'Must analyze at least 1 sprint')
    .max(10, 'Cannot analyze more than 10 sprints at once')
    .default(5)
    .describe('Number of recent sprints to include in velocity calculation'),
  
  include_forecast: z.boolean()
    .default(true)
    .describe('Whether to include capacity forecasting for upcoming sprints')
});

/**
 * Schema for current sprint velocity analysis
 * Analyzes velocity for the currently active sprint
 */
export const currentSprintVelocitySchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the current sprint (auto-detected if not provided)'),
  
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
 * Schema for sprint health analysis including velocity metrics
 * Comprehensive analysis of sprint progress and team performance
 */
export const sprintHealthAnalysisSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to analyze'),
  
  include_burndown: z.boolean()
    .default(true)
    .describe('Whether to include burndown chart data'),
  
  include_velocity: z.boolean()
    .default(true)
    .describe('Whether to include velocity calculations'),
  
  include_team_performance: z.boolean()
    .default(true)
    .describe('Whether to include team performance metrics'),
});

/**
 * Schema for burndown analysis
 * Analyzes sprint burndown patterns and progress tracking
 */
export const burndownAnalysisSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Sprint ID (auto-detected if not provided)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Project ID (auto-detected if not provided)'),
  
  sprint_title: z.string()
    .optional()
    .describe('Sprint title to analyze (alternative to sprint_id)'),
  
  include_trend_analysis: z.boolean()
    .default(true)
    .describe('Include trend analysis and projections'),
  
  include_ideal_comparison: z.boolean()
    .default(true)
    .describe('Compare actual progress with ideal burndown line'),
  
  include_pattern_analysis: z.boolean()
    .default(true)
    .describe('Analyze burndown patterns'),
  
  start_date: z.string()
    .optional()
    .describe('Optional start date filter (ISO)'),
  
  end_date: z.string()
    .optional()
    .describe('Optional end date filter (ISO)'),
});

// Export TypeScript types
export type VelocityAnalysisInput = z.infer<typeof velocityAnalysisSchema>;
export type CurrentSprintVelocityInput = z.infer<typeof currentSprintVelocitySchema>;
export type SprintHealthAnalysisInput = z.infer<typeof sprintHealthAnalysisSchema>;
export type BurndownAnalysisInput = z.infer<typeof burndownAnalysisSchema>;

