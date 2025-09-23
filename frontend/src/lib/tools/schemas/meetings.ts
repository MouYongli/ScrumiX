import { z } from 'zod';

export const scheduleEventSchema = z.object({
  event_type: z.enum(['sprint_planning', 'daily_standup', 'sprint_review', 'sprint_retrospective'])
    .describe('Type of Scrum event to schedule'),
  start_datetime: z.string()
    .describe('Start date and time in ISO format (e.g., 2024-01-15T10:00:00Z)'),
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours')
    .optional()
    .describe('Duration of the meeting in minutes (uses defaults if not specified)'),
  location: z.string()
    .max(500, 'Location must be 500 characters or less')
    .optional()
    .describe('Meeting location (physical or virtual link)'),
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Additional meeting description or agenda notes'),
  participants: z.array(z.string())
    .optional()
    .describe('List of participant names to invite to the meeting'),
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (will be auto-detected if not provided)'),
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the sprint (will be auto-detected if not provided)'),
  sprint_title: z.string()
    .optional()
    .describe('The title of the sprint to schedule the meeting for (alternative to sprint_id)'),
  recurring: z.boolean()
    .default(false)
    .describe('Whether this should be a recurring meeting (daily standups are automatically recurring)')
});

export const agendaManagementSchema = z.object({
  operation: z.enum(['create', 'read', 'update', 'delete', 'reorder'])
    .describe('The CRUD operation to perform on meeting agenda'),
  meeting_id: z.number()
    .int('Meeting ID must be a whole number')
    .positive('Meeting ID must be a positive integer')
    .optional()
    .describe('The ID of the meeting (will be searched if not provided)'),
  meeting_search: z.string()
    .optional()
    .describe('Search term to find the meeting (title, type, or date)'),
  agenda_id: z.number()
    .int('Agenda ID must be a whole number')
    .positive('Agenda ID must be a positive integer')
    .optional()
    .describe('The ID of the agenda item (required for update/delete)'),
  title: z.string()
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('The title/description of the agenda item'),
  agenda_items: z.array(z.string())
    .optional()
    .describe('Array of agenda item titles for bulk creation'),
  order_index: z.number()
    .int('Order index must be a whole number')
    .min(0, 'Order index must be non-negative')
    .optional()
    .describe('The order position of the agenda item'),
  agenda_ids: z.array(z.number())
    .optional()
    .describe('Array of agenda IDs for reordering')
});

export const meetingManagementSchema = z.object({
  operation: z.enum(['create', 'read', 'update', 'delete', 'list'])
    .describe('The CRUD operation to perform on meetings'),
  meeting_id: z.number()
    .int('Meeting ID must be a whole number')
    .positive('Meeting ID must be a positive integer')
    .optional()
    .describe('The ID of the meeting (required for read, update, delete operations)'),
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Optional sprint context'),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('The title of the meeting'),
  meeting_type: z.enum(['sprint_planning', 'daily_standup', 'sprint_review', 'sprint_retrospective', 'other'])
    .optional()
    .describe('Type of meeting'),
  start_datetime: z.string()
    .optional()
    .describe('Start date and time in ISO format (e.g., 2024-01-15T10:00:00Z)'),
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours')
    .optional()
    .describe('Duration of the meeting in minutes'),
  location: z.string()
    .max(500, 'Location must be 500 characters or less')
    .optional()
    .describe('Meeting location (physical or virtual link)'),
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Meeting description or agenda notes'),
  participants: z.array(z.string())
    .optional()
    .describe('List of participant names'),
  agenda: z.array(z.object({
    id: z.number().optional(),
    title: z.string(),
    order_index: z.number().optional(),
  })).optional(),
  search_term: z.string().optional().describe('Search term for listing/filtering meetings'),
  date_from: z.string().optional().describe('Filter meetings from this date (ISO)'),
  date_to: z.string().optional().describe('Filter meetings up to this date (ISO)'),
  limit: z.number().int('Limit must be a whole number').min(1).max(100).optional().describe('Limit number of results')
});

export const actionItemManagementSchema = z.object({
  operation: z.enum(['create', 'read', 'update', 'delete', 'complete', 'list'])
    .describe('The CRUD operation to perform on action items'),
  action_item_id: z.number()
    .int('Action item ID must be a whole number')
    .positive('Action item ID must be a positive integer')
    .optional()
    .describe('The ID of the action item (required for update/delete/complete)'),
  meeting_id: z.number()
    .int('Meeting ID must be a whole number')
    .positive('Meeting ID must be a positive integer')
    .optional()
    .describe('The ID of the meeting (optional for list operations)'),
  meeting_search: z.string().optional().describe('Search term to find meeting for action items'),
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('The title/description of the action item'),
  assignee: z.string()
    .optional()
    .describe('The name or ID of the person responsible for the action item'),
  due_date: z.string()
    .optional()
    .describe('Due date in ISO format (e.g., 2024-01-31T23:59:59Z)'),
  completed: z.boolean()
    .optional()
    .describe('Whether the action item is completed')
});


