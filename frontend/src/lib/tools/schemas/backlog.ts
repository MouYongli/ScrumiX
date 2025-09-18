import { z } from 'zod';
import { BacklogStatus, BacklogPriority, BacklogType } from '@/types/api';

/**
 * Schema for creating a backlog item
 * Validates input data before sending to the API - matches monolithic schema exactly
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

/**
 * Alternative backlog item schema using string enums (for compatibility)
 */
export const backlogItemSchema = z.object({
  title: z.string().min(1).max(200).describe('The title of the backlog item'),
  description: z.string().max(2000).optional().describe('Optional detailed description'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium').describe('Priority level'),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).default('todo').describe('Current status'),
  item_type: z.enum(['epic', 'story', 'bug']).default('story').describe('Type of backlog item'),
  story_point: z.number().int().min(0).max(100).optional().describe('Estimation in story points'),
  project_id: z.number().int().positive().describe('Project ID'),
  parent_id: z.number().int().positive().optional().describe('Parent backlog item ID'),
  assigned_to_id: z.number().int().positive().optional().describe('Assigned user ID'),
  label: z.string().max(50).optional().describe('Optional label or tag'),
  acceptance_criteria: z.array(z.string().min(1)).max(10).optional().describe('Optional acceptance criteria'),
});

export const backlogRetrievalSchema = z.object({
  project_id: z.number().int().positive().describe('Project ID'),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional().describe('Filter by status'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Filter by priority'),
  item_type: z.enum(['epic', 'story', 'bug']).optional().describe('Filter by type'),
  search: z.string().optional().describe('Search term across fields'),
  label: z.string().optional().describe('Filter by label'),
  assigned_to_id: z.number().int().positive().optional().describe('Filter by assignee'),
  parent_id: z.number().int().positive().optional().describe('Filter by parent item'),
  limit: z.number().int().min(1).max(100).default(50).describe('Max results'),
  skip: z.number().int().min(0).default(0).describe('Offset'),
});

export const updateBacklogItemSchema = backlogItemSchema.partial().extend({
  backlog_id: z.number().int().positive().describe('Backlog item ID to update'),
});

// Export TypeScript types
export type CreateBacklogItemInput = z.infer<typeof createBacklogItemSchema>;
export type BacklogCreationResponse = z.infer<typeof backlogCreationResponseSchema>;
export type BacklogItemInput = z.infer<typeof backlogItemSchema>;
export type BacklogRetrievalInput = z.infer<typeof backlogRetrievalSchema>;
export type UpdateBacklogItemInput = z.infer<typeof updateBacklogItemSchema>;


