/**
 * Task Management Schema Definitions
 * Centralized schemas for task management operations in sprints
 */

import { z } from 'zod';

// Task Status and Priority enums (matching backend)
export const TaskStatus = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
export const TaskPriority = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Schema for creating a task for a backlog item in the current sprint
 */
export const createTaskForBacklogItemSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('The ID of the backlog item to create a task for'),
  
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be 200 characters or less')
    .describe('Title of the task (specific, actionable work item)'),
  
  description: z.string()
    .optional()
    .describe('Detailed description of the task (optional)'),
  
  priority: TaskPriority
    .default('medium')
    .describe('Priority level of the task'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Sprint ID (optional - will use active sprint if not provided)')
});

/**
 * Schema for getting all tasks for the current sprint with filtering
 */
export const getSprintTasksSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Sprint ID (optional - will use active sprint if not provided)'),
  
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .optional()
    .describe('Filter tasks for a specific backlog item (optional)'),
  
  status: TaskStatus
    .optional()
    .describe('Filter tasks by status (optional)')
});

/**
 * Schema for updating a task's status or details
 */
export const updateTaskSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  task_id: z.number()
    .int('Task ID must be a whole number')
    .positive('Task ID must be a positive integer')
    .describe('The ID of the task to update'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Sprint ID (optional - will use active sprint if not provided)'),
  
  title: z.string()
    .min(1, 'Task title is required')
    .max(200, 'Task title must be 200 characters or less')
    .optional()
    .describe('New title for the task (optional)'),
  
  description: z.string()
    .optional()
    .describe('New description for the task (optional)'),
  
  status: TaskStatus
    .optional()
    .describe('New status for the task (optional)'),
  
  priority: TaskPriority
    .optional()
    .describe('New priority for the task (optional)')
});

/**
 * Schema for deleting a task from the sprint
 */
export const deleteTaskSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project'),
  
  task_id: z.number()
    .int('Task ID must be a whole number')
    .positive('Task ID must be a positive integer')
    .describe('The ID of the task to delete'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Sprint ID (optional - will use active sprint if not provided)')
});

// Export types for TypeScript inference
export type CreateTaskForBacklogItemInput = z.infer<typeof createTaskForBacklogItemSchema>;
export type GetSprintTasksInput = z.infer<typeof getSprintTasksSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;

// Export enum types for use in other files
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type TaskPriorityType = z.infer<typeof TaskPriority>;
