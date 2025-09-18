import { z } from 'zod';

/**
 * Schema for retrospective analysis across multiple sprints
 * Analyzes retrospective patterns and tracks action item progress
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

/**
 * Schema for creating retrospective documentation
 * Used specifically for sprint retrospective documentation
 */
export const createRetrospectiveSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint this retrospective is for'),
  
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less')
    .describe('Retrospective title (e.g., "Sprint 5 Retrospective")'),
  
  what_went_well: z.array(z.string().min(1))
    .min(1, 'At least one "what went well" item is required')
    .describe('Array of things that went well during the sprint'),
  
  what_could_improve: z.array(z.string().min(1))
    .min(1, 'At least one improvement item is required')
    .describe('Array of things that could be improved'),
  
  action_items: z.array(z.object({
    description: z.string().min(1, 'Action item description is required'),
    assignee: z.string().optional().describe('Person responsible for the action item'),
    due_date: z.string().optional().describe('Due date in ISO format'),
    priority: z.enum(['high', 'medium', 'low']).default('medium')
  })).optional().describe('Action items identified during the retrospective'),
  
  key_insights: z.array(z.string().min(1))
    .optional()
    .describe('Key insights or patterns identified'),
  
  team_mood: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative'])
    .optional()
    .describe('Overall team mood assessment'),
  
  velocity_discussion: z.string()
    .optional()
    .describe('Discussion points about team velocity and capacity'),
  
  process_improvements: z.array(z.string().min(1))
    .optional()
    .describe('Specific process improvements identified'),
  
  additional_notes: z.string()
    .optional()
    .describe('Any additional notes or observations from the retrospective')
});

/**
 * Schema for getting retrospective data
 * Retrieves retrospective documentation with filtering options
 */
export const getRetrospectiveSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Filter by specific sprint ID'),
  
  date_from: z.string()
    .optional()
    .describe('Filter retrospectives from this date (ISO format)'),
  
  date_to: z.string()
    .optional()
    .describe('Filter retrospectives up to this date (ISO format)'),
  
  team_mood: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative'])
    .optional()
    .describe('Filter by team mood'),
  
  skip: z.number()
    .int('Skip must be a whole number')
    .min(0, 'Skip must be non-negative')
    .default(0)
    .describe('Number of retrospectives to skip for pagination'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(20)
    .describe('Maximum number of retrospectives to return')
});

/**
 * Schema for updating retrospective data
 * Allows updating existing retrospective documentation
 */
export const updateRetrospectiveSchema = z.object({
  retrospective_id: z.number()
    .int('Retrospective ID must be a whole number')
    .positive('Retrospective ID must be a positive integer')
    .describe('The ID of the retrospective to update'),
  
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('Updated retrospective title'),
  
  what_went_well: z.array(z.string().min(1))
    .optional()
    .describe('Updated array of things that went well'),
  
  what_could_improve: z.array(z.string().min(1))
    .optional()
    .describe('Updated array of improvement items'),
  
  action_items: z.array(z.object({
    id: z.number().optional().describe('Existing action item ID (for updates)'),
    description: z.string().min(1, 'Action item description is required'),
    assignee: z.string().optional(),
    due_date: z.string().optional(),
    priority: z.enum(['high', 'medium', 'low']).default('medium'),
    completed: z.boolean().optional().describe('Whether the action item is completed')
  })).optional().describe('Updated action items'),
  
  key_insights: z.array(z.string().min(1))
    .optional()
    .describe('Updated key insights'),
  
  team_mood: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative'])
    .optional()
    .describe('Updated team mood assessment'),
  
  velocity_discussion: z.string()
    .optional()
    .describe('Updated velocity discussion notes'),
  
  process_improvements: z.array(z.string().min(1))
    .optional()
    .describe('Updated process improvements'),
  
  additional_notes: z.string()
    .optional()
    .describe('Updated additional notes')
});

/**
 * Schema for action item tracking
 * Manages action items from retrospectives
 */
export const actionItemTrackingSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Filter by project ID (auto-detected if not provided)'),
  
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'])
    .optional()
    .describe('Filter by action item status'),
  
  assignee: z.string()
    .optional()
    .describe('Filter by assignee name'),
  
  priority: z.enum(['high', 'medium', 'low'])
    .optional()
    .describe('Filter by priority level'),
  
  overdue_only: z.boolean()
    .default(false)
    .describe('Show only overdue action items'),
  
  sprint_range: z.number()
    .int('Sprint range must be a whole number')
    .min(1, 'Sprint range must be at least 1')
    .max(10, 'Sprint range cannot exceed 10')
    .default(3)
    .describe('Number of recent sprints to include in tracking')
});

// Export TypeScript types
export type RetrospectiveAnalysisInput = z.infer<typeof retrospectiveAnalysisSchema>;
export type CreateRetrospectiveInput = z.infer<typeof createRetrospectiveSchema>;
export type GetRetrospectiveInput = z.infer<typeof getRetrospectiveSchema>;
export type UpdateRetrospectiveInput = z.infer<typeof updateRetrospectiveSchema>;
export type ActionItemTrackingInput = z.infer<typeof actionItemTrackingSchema>;


