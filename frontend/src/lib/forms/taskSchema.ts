// Task form validation schemas using Zod

import { z } from 'zod';
import type { TaskStatus, TaskPriority } from '@/types/api';

// Task creation schema
export const createTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done'] as const)
    .default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const)
    .default('medium'),
  story_point: z.number()
    .min(1, 'Story points must be at least 1')
    .max(21, 'Story points must be at most 21')
    .optional(),
  sprintId: z.string().optional(),
});

// Task update schema (all fields optional)
export const updateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done'] as const)
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const)
    .optional(),
  story_point: z.number()
    .min(1, 'Story points must be at least 1')
    .max(21, 'Story points must be at most 21')
    .optional(),
});

export type CreateTaskForm = z.infer<typeof createTaskSchema>;
export type UpdateTaskForm = z.infer<typeof updateTaskSchema>;
