/**
 * Zod schemas for AI tool validation
 * These schemas ensure that data passed to tools is properly structured and validated
 */

import { z } from 'zod';
import { BacklogStatus, BacklogPriority, BacklogType } from '@/types/api';

/**
 * Schema for creating a backlog item
 * Validates input data before sending to the API
 */
export const createBacklogItemSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .describe('The title of the backlog item'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Optional detailed description of the backlog item'),
  
  priority: z.nativeEnum(BacklogPriority)
    .default(BacklogPriority.MEDIUM)
    .describe('Priority level: critical, high, medium, or low'),
  
  status: z.nativeEnum(BacklogStatus)
    .default(BacklogStatus.TODO)
    .describe('Current status: todo, in_progress, in_review, done, or cancelled'),
  
  item_type: z.nativeEnum(BacklogType)
    .default(BacklogType.STORY)
    .describe('Type of backlog item: epic, story, or bug'),
  
  story_point: z.number()
    .int()
    .min(0, 'Story points must be non-negative')
    .max(100, 'Story points must be 100 or less')
    .optional()
    .describe('Estimation in story points (optional)'),
  
  project_id: z.number()
    .int()
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project this backlog item belongs to'),
  
  parent_id: z.number()
    .int()
    .positive('Parent ID must be a positive integer')
    .optional()
    .describe('Optional parent backlog item ID (for hierarchical items)'),
  
  assigned_to_id: z.number()
    .int()
    .positive('Assigned user ID must be a positive integer')
    .optional()
    .describe('Optional ID of the user assigned to this item'),
  
  label: z.string()
    .max(50, 'Label must be 50 characters or less')
    .optional()
    .describe('Optional label or tag for categorization'),
  
  acceptance_criteria: z.array(z.string().min(1, 'Acceptance criteria cannot be empty'))
    .max(10, 'Maximum 10 acceptance criteria allowed')
    .optional()
    .describe('Optional array of acceptance criteria for the backlog item')
});

/**
 * Inferred TypeScript type for the backlog creation schema
 */
export type CreateBacklogItemInput = z.infer<typeof createBacklogItemSchema>;

/**
 * Schema for the successful backlog creation response
 */
export const backlogCreationResponseSchema = z.object({
  success: z.boolean(),
  backlog_item: z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.nativeEnum(BacklogPriority),
    status: z.nativeEnum(BacklogStatus),
    item_type: z.nativeEnum(BacklogType),
    story_point: z.number().optional(),
    project_id: z.number(),
    created_at: z.string(),
    updated_at: z.string()
  }),
  message: z.string()
});

export type BacklogCreationResponse = z.infer<typeof backlogCreationResponseSchema>;

/**
 * Scrum Master Tool Schemas
 */

/**
 * Schema for sprint health analysis
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

export type SprintHealthAnalysisInput = z.infer<typeof sprintHealthAnalysisSchema>;

/**
 * Schema for Scrum event scheduling
 */
export const scrumEventScheduleSchema = z.object({
  event_type: z.enum(['sprint_planning', 'daily_standup', 'sprint_review', 'sprint_retrospective'])
    .describe('Type of Scrum event to schedule'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project for the event'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint for the event'),
  
  start_datetime: z.string()
    .describe('Start date and time in ISO format (e.g., 2024-01-15T10:00:00Z)'),
  
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours')
    .default(60)
    .describe('Duration of the meeting in minutes'),
  
  location: z.string()
    .max(500, 'Location must be 500 characters or less')
    .optional()
    .describe('Meeting location (physical or virtual link)'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Additional meeting description or agenda notes')
});

export type ScrumEventScheduleInput = z.infer<typeof scrumEventScheduleSchema>;

/**
 * Schema for velocity analysis
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

export type VelocityAnalysisInput = z.infer<typeof velocityAnalysisSchema>;

/**
 * Schema for retrospective analysis
 */
export const retrospectiveAnalysisSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to analyze retrospectives for'),
  
  lookback_sprints: z.number()
    .int('Lookback sprints must be a whole number')
    .min(1, 'Must analyze at least 1 sprint')
    .max(6, 'Cannot analyze more than 6 sprints retrospectives')
    .default(3)
    .describe('Number of recent sprints to analyze retrospective patterns'),
  
  include_action_tracking: z.boolean()
    .default(true)
    .describe('Whether to track action items from previous retrospectives')
});

export type RetrospectiveAnalysisInput = z.infer<typeof retrospectiveAnalysisSchema>;

/**
 * Schema for Scrum compliance checking
 */
export const scrumComplianceCheckSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to check Scrum compliance for'),
  
  check_period_days: z.number()
    .int('Check period must be a whole number')
    .min(7, 'Check period must be at least 7 days')
    .max(90, 'Check period cannot exceed 90 days')
    .default(30)
    .describe('Number of days to analyze for compliance patterns'),
  
  include_recommendations: z.boolean()
    .default(true)
    .describe('Whether to include specific recommendations for compliance improvements')
});

export type ScrumComplianceCheckInput = z.infer<typeof scrumComplianceCheckSchema>;