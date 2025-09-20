/**
 * Sprint Backlog Schema Definitions
 * Centralized schemas for sprint backlog management operations
 */

import { z } from 'zod';

/**
 * Schema for getting project sprints with filtering options
 */
export const getProjectSprintsSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get sprints from'),
  
  status: z.enum(['planning', 'active', 'completed', 'cancelled'])
    .optional()
    .describe('Filter sprints by status'),
  
  search: z.string()
    .optional()
    .describe('Search in sprint names and goals'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .describe('Maximum number of sprints to return (default: 20)')
});

/**
 * Schema for getting current active sprint for a project
 */
export const getCurrentActiveSprintSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get active sprint for'),
});

/**
 * Schema for getting backlog items (read-only access for Developer agent)
 */
export const getBacklogItemsSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get backlog items from'),
  
  item_type: z.enum(['story', 'bug', 'epic'])
    .optional()
    .describe('Filter by item type (stories and bugs can be added to sprints)'),
  
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
    .optional()
    .describe('Filter by status'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Filter by priority'),
  
  search: z.string()
    .optional()
    .describe('Search term to filter items'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .describe('Maximum number of items to return (default: 20)')
});

/**
 * Schema for reviewing sprint backlog items with detailed information
 */
export const reviewSprintBacklogSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Specific sprint ID to review (if not provided, will use active sprint)'),
});

/**
 * Schema for creating a new sprint backlog item (story or bug)
 */
export const createSprintBacklogItemSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to create the item in'),
  
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be 200 characters or less')
    .describe('The title of the backlog item'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Detailed description of the backlog item'),
  
  item_type: z.enum(['story', 'bug'])
    .describe('Type of backlog item (only stories and bugs allowed for Developer agent)'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .default('medium')
    .describe('Priority level of the item'),
  
  story_point: z.number()
    .int('Story points must be a whole number')
    .min(0, 'Story points must be non-negative')
    .max(100, 'Story points must be 100 or less')
    .optional()
    .describe('Story point estimation for the item'),
  
  acceptance_criteria: z.array(z.string())
    .optional()
    .describe('List of acceptance criteria for the item'),
});

/**
 * Schema for updating sprint backlog item details
 */
export const updateSprintBacklogItemSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('The ID of the backlog item to update'),
  
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
    .optional()
    .describe('Update the status of the backlog item'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Update the priority of the backlog item'),
  
  story_point: z.number()
    .int('Story points must be a whole number')
    .min(0, 'Story points must be non-negative')
    .max(100, 'Story points must be 100 or less')
    .optional()
    .describe('Update the story point estimation'),
  
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be 200 characters or less')
    .optional()
    .describe('Update the title of the backlog item'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Update the description of the backlog item'),
});

/**
 * Schema for deleting/removing sprint backlog item
 */
export const deleteSprintBacklogItemSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('The ID of the backlog item to remove/delete'),
  
  action: z.enum(['remove_from_sprint'])
    .default('remove_from_sprint')
    .describe('Remove the item from sprint and move it back to the product backlog'),
  
  reason: z.string()
    .min(1, 'Reason cannot be empty')
    .max(500, 'Reason must be 500 characters or less')
    .optional()
    .describe('Reason for removing/deleting the item'),
});

// Export types for TypeScript inference
export type GetProjectSprintsInput = z.infer<typeof getProjectSprintsSchema>;
export type GetCurrentActiveSprintInput = z.infer<typeof getCurrentActiveSprintSchema>;
export type GetBacklogItemsInput = z.infer<typeof getBacklogItemsSchema>;
export type ReviewSprintBacklogInput = z.infer<typeof reviewSprintBacklogSchema>;
export type CreateSprintBacklogItemInput = z.infer<typeof createSprintBacklogItemSchema>;
export type UpdateSprintBacklogItemInput = z.infer<typeof updateSprintBacklogItemSchema>;
export type DeleteSprintBacklogItemInput = z.infer<typeof deleteSprintBacklogItemSchema>;
