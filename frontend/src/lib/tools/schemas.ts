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
