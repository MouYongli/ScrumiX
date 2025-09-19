import { z } from 'zod';

export const createSprintSchema = z.object({
  sprint_name: z.string()
    .min(1, 'Sprint name is required')
    .max(100, 'Sprint name must be 100 characters or less')
    .describe('The name of the sprint (can also be called sprintName, name, or title)'),
  
  sprint_goal: z.string()
    .max(2000, 'Sprint goal must be 2000 characters or less')
    .optional()
    .describe('Optional goal or objective for the sprint (can also be called sprintGoal, goal, or objective)'),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Start date must be in date format (YYYY-MM-DD)')
    .describe('Sprint start date in date format YYYY-MM-DD (can also be called startDate or start)'),
  
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'End date must be in date format (YYYY-MM-DD)')
    .describe('Sprint end date in date format YYYY-MM-DD (can also be called endDate or end)'),
  
  status: z.enum(['planning', 'active', 'cancelled'])
    .default('planning')
    .describe('Sprint status: planning (default), active, or cancelled'),
  
  sprint_capacity: z.number()
    .int('Sprint capacity must be a whole number')
    .min(0, 'Sprint capacity must be non-negative')
    .optional()
    .describe('Optional sprint capacity in story points (can also be called sprintCapacity or capacity)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project this sprint belongs to (can also be called projectId)')
});

export const updateSprintSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to update (can also be called sprintId or id)'),
  
  sprint_name: z.string()
    .min(1, 'Sprint name is required')
    .max(100, 'Sprint name must be 100 characters or less')
    .optional()
    .describe('The name of the sprint (can also be called sprintName, name, or title)'),
  
  sprint_goal: z.string()
    .max(2000, 'Sprint goal must be 2000 characters or less')
    .optional()
    .describe('Goal or objective for the sprint (can also be called sprintGoal, goal, or objective)'),
  
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Start date must be in date format (YYYY-MM-DD)')
    .optional()
    .describe('Sprint start date in date format YYYY-MM-DD (can also be called startDate or start)'),
  
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'End date must be in date format (YYYY-MM-DD)')
    .optional()
    .describe('Sprint end date in date format YYYY-MM-DD (can also be called endDate or end)'),
  
  status: z.enum(['planning', 'active', 'cancelled'])
    .optional()
    .describe('Sprint status: planning, active, or cancelled'),
  
  sprint_capacity: z.number()
    .int('Sprint capacity must be a whole number')
    .min(0, 'Sprint capacity must be non-negative')
    .optional()
    .describe('Sprint capacity in story points (can also be called sprintCapacity or capacity)')
});

export const getSprintsSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to retrieve sprints from (can also be called projectId)'),
  
  status: z.enum(['planning', 'active', 'cancelled'])
    .optional()
    .describe('Filter by sprint status: planning, active, or cancelled'),
  
  search: z.string()
    .optional()
    .describe('Search term to find sprints by name or goal'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50)
    .describe('Maximum number of sprints to return (default: 50, max: 100)'),
  
  skip: z.number()
    .int('Skip must be a whole number')
    .min(0, 'Skip must be non-negative')
    .default(0)
    .describe('Number of sprints to skip for pagination (default: 0)')
});

export const deleteSprintSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to delete (can also be called sprintId or id)')
});

export const getSprintByIdSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to retrieve (can also be called sprintId or id)')
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
export type GetSprintsInput = z.infer<typeof getSprintsSchema>;
export type DeleteSprintInput = z.infer<typeof deleteSprintSchema>;
export type GetSprintByIdInput = z.infer<typeof getSprintByIdSchema>;



