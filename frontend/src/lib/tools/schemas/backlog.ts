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
    .int('Story points must be a whole number')
    .min(0, 'Story points must be non-negative')
    .max(100, 'Story points must be 100 or less')
    .optional()
    .describe('Estimation in story points using Fibonacci sequence (1,2,3,5,8,13,21). Epics: 13-21, Stories: 1-8, Bugs: 1-5. Always provide initial estimation.'),
  
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
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to retrieve backlog items from'),
  
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
    .optional()
    .describe('Filter by status: todo, in_progress, in_review, done, or cancelled'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Filter by priority: critical, high, medium, or low'),
  
  item_type: z.enum(['epic', 'story', 'bug'])
    .optional()
    .describe('Filter by item type: epic, story, or bug'),
  
  search: z.string()
    .optional()
    .describe('Search term to find items by title, description, or acceptance criteria'),
  
  assigned_to_id: z.number()
    .int('Assigned user ID must be a whole number')
    .positive('Assigned user ID must be a positive integer')
    .optional()
    .describe('Filter by assigned user ID'),
  
  include_children: z.boolean()
    .default(true)
    .describe('Whether to include child items in hierarchical structures'),
  
  include_acceptance_criteria: z.boolean()
    .default(true)
    .describe('Whether to include acceptance criteria for each item'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50)
    .describe('Maximum number of items to return (default: 50, max: 100)'),
  
  skip: z.number()
    .int('Skip must be a whole number')
    .min(0, 'Skip must be non-negative')
    .default(0)
    .describe('Number of items to skip for pagination (default: 0)')
});

export const updateBacklogItemSchema = z.object({
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('The ID of the backlog item to update'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (for verification). If not provided, will be extracted from the current context.'),
  
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be 200 characters or less')
    .optional()
    .describe('Update the title of the backlog item'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Update the description of the backlog item'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Update the priority level: critical, high, medium, or low'),
  
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
    .optional()
    .describe('Update the current status: todo, in_progress, in_review, done, or cancelled'),
  
  item_type: z.enum(['epic', 'story', 'bug'])
    .optional()
    .describe('Update the type of backlog item: epic, story, or bug'),
  
  story_point: z.number()
    .int('Story points must be a whole number')
    .min(0, 'Story points must be non-negative')
    .max(100, 'Story points must be 100 or less')
    .optional()
    .describe('Update the estimation in story points using Fibonacci sequence (1,2,3,5,8,13,21)'),
  
  assigned_to_id: z.number()
    .int('Assigned user ID must be a whole number')
    .positive('Assigned user ID must be a positive integer')
    .optional()
    .describe('Update the assigned user ID'),
  
  parent_id: z.number()
    .int('Parent ID must be a whole number')
    .positive('Parent ID must be a positive integer')
    .optional()
    .describe('Update the parent backlog item ID (for epic assignments)'),
  
  acceptance_criteria: z.array(z.string())
    .optional()
    .describe('Update the acceptance criteria list (will replace existing criteria)')
});

export const deleteBacklogItemSchema = z.object({
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('The ID of the backlog item to delete'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (for verification). If not provided, will be extracted from the current context.'),
  
  force_delete: z.boolean()
    .default(false)
    .describe('Set to true to force permanent deletion. By default, the tool will suggest changing status to cancelled instead.'),
  
  reason: z.string()
    .max(500, 'Reason must be 500 characters or less')
    .optional()
    .describe('Optional reason for deletion (recommended for audit purposes)')
});

// Export TypeScript types
export type CreateBacklogItemInput = z.infer<typeof createBacklogItemSchema>;
export type BacklogCreationResponse = z.infer<typeof backlogCreationResponseSchema>;
export type BacklogItemInput = z.infer<typeof backlogItemSchema>;
export type BacklogRetrievalInput = z.infer<typeof backlogRetrievalSchema>;
export type UpdateBacklogItemInput = z.infer<typeof updateBacklogItemSchema>;
export type DeleteBacklogItemInput = z.infer<typeof deleteBacklogItemSchema>;


