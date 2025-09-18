/**
 * Developer Task Management Tools
 * Create, update, delete, and manage tasks for sprint backlog items
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestWithAuth, AuthContext } from '../utils/http';

// Task Status and Priority enums (matching backend)
const TaskStatus = z.enum(['todo', 'in_progress', 'done', 'cancelled']);
const TaskPriority = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Create a task for a backlog item in the current sprint
 */
export const createTaskForBacklogItem = tool({
  description: `Create a new task for a specific backlog item in the current sprint. Tasks break down backlog items into smaller, actionable work units.
    Use this tool to decompose user stories or bugs into specific tasks that developers can work on.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Creating task for backlog item:', input);

      let sprintId = input.sprint_id;

      // If no sprint ID provided, get active sprint
      if (!sprintId) {
        const sprintResponse = await requestWithAuth(
          `/sprints?project_id=${input.project_id}&status=active&limit=1`,
          { method: 'GET' },
          experimental_context
        );

        if (sprintResponse.error) {
          return `Cannot create task: ${sprintResponse.error}`;
        }

        const sprints = sprintResponse.data || [];
        if (sprints.length === 0) {
          return `No active sprint found for project ${input.project_id}. Please activate a sprint first.`;
        }

        sprintId = sprints[0].id;
      }

      // Create task for the backlog item
      const taskData = {
        title: input.title,
        description: input.description || '',
        priority: input.priority,
        status: 'todo' // New tasks start as TODO
      };

      const response = await requestWithAuth(
        `/sprints/${sprintId}/backlog/${input.backlog_id}/tasks`,
        {
          method: 'POST',
          body: JSON.stringify(taskData),
        },
        experimental_context
      );

      if (response.error) {
        return `Failed to create task: ${response.error}`;
      }

      return `✅ Task created successfully!

**Task Details:**
- **Title**: ${input.title}
- **Priority**: ${input.priority.charAt(0).toUpperCase() + input.priority.slice(1)}
- **Status**: Todo (ready to work on)
- **Backlog Item ID**: ${input.backlog_id}
- **Sprint ID**: ${sprintId}
- **Task ID**: ${response.data.task_id}

The task has been added to the sprint backlog and is ready for development work.`;

    } catch (error) {
      console.error('Error in createTaskForBacklogItem:', error);
      return `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * List tasks for sprint backlog items
 */
export const getSprintTasks = tool({
  description: `Get all tasks for the current sprint, optionally filtered by backlog item or status.
    Use this to see what specific tasks are available and their current status.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting sprint tasks:', input);

      let sprintId = input.sprint_id;

      // If no sprint ID provided, get active sprint
      if (!sprintId) {
        const sprintResponse = await requestWithAuth(
          `/sprints?project_id=${input.project_id}&status=active&limit=1`,
          { method: 'GET' },
          experimental_context
        );

        if (sprintResponse.error) {
          return `Cannot get tasks: ${sprintResponse.error}`;
        }

        const sprints = sprintResponse.data || [];
        if (sprints.length === 0) {
          return `No active sprint found for project ${input.project_id}.`;
        }

        sprintId = sprints[0].id;
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        sprint_id: sprintId!.toString(), // We know sprintId is defined at this point
        limit: '100'
      });

      if (input.backlog_id) {
        queryParams.append('backlog_id', input.backlog_id.toString());
      }

      if (input.status) {
        queryParams.append('status', input.status);
      }

      const response = await requestWithAuth(
        `/tasks?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context
      );

      if (response.error) {
        return `Failed to get tasks: ${response.error}`;
      }

      const tasksData = response.data || {};
      const tasks = tasksData.tasks || [];

      if (tasks.length === 0) {
        let message = `No tasks found for sprint ${sprintId}`;
        if (input.backlog_id) message += ` and backlog item ${input.backlog_id}`;
        if (input.status) message += ` with status '${input.status}'`;
        return message + '.';
      }

      // Group tasks by status for better overview
      const tasksByStatus = tasks.reduce((groups: any, task: any) => {
        const status = task.status || 'unknown';
        if (!groups[status]) groups[status] = [];
        groups[status].push(task);
        return groups;
      }, {});

      let summary = `Found ${tasks.length} task${tasks.length === 1 ? '' : 's'} in sprint ${sprintId}:\n\n`;

      // Display tasks grouped by status
      Object.keys(tasksByStatus).forEach(status => {
        const statusTasks = tasksByStatus[status];
        const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        
        summary += `**${statusDisplay}** (${statusTasks.length}):\n`;
        
        statusTasks.forEach((task: any, index: number) => {
          const priority = task.priority ? ` [${task.priority.toUpperCase()}]` : '';
          summary += `  ${index + 1}. **Task ${task.id}**: ${task.title}${priority}\n`;
          if (task.description) {
            summary += `     ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}\n`;
          }
        });
        summary += '\n';
      });

      // Add summary stats
      const statusCounts = Object.keys(tasksByStatus).map(status => 
        `${status.replace('_', ' ')}: ${tasksByStatus[status].length}`
      ).join(', ');
      
      summary += `**Task Summary**: ${statusCounts}`;

      return summary;

    } catch (error) {
      console.error('Error in getSprintTasks:', error);
      return `Failed to get tasks: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Update a task's status or details
 */
export const updateTask = tool({
  description: `Update a task's status, priority, title, or description. Use this to track progress and modify task details.
    Common workflow: todo → in_progress → done`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Updating task:', input);

      let sprintId = input.sprint_id;

      // If no sprint ID provided, get active sprint
      if (!sprintId) {
        const sprintResponse = await requestWithAuth(
          `/sprints?project_id=${input.project_id}&status=active&limit=1`,
          { method: 'GET' },
          experimental_context
        );

        if (sprintResponse.error) {
          return `Cannot update task: ${sprintResponse.error}`;
        }

        const sprints = sprintResponse.data || [];
        if (sprints.length === 0) {
          return `No active sprint found for project ${input.project_id}.`;
        }

        sprintId = sprints[0].id;
      }

      // Build update data (only include fields that are provided)
      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status) updateData.status = input.status;
      if (input.priority) updateData.priority = input.priority;

      if (Object.keys(updateData).length === 0) {
        return 'No updates specified. Please provide at least one field to update (title, description, status, or priority).';
      }

      const response = await requestWithAuth(
        `/sprints/${sprintId}/tasks/${input.task_id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        },
        experimental_context
      );

      if (response.error) {
        return `Failed to update task: ${response.error}`;
      }

      // Build update summary
      const updates: string[] = [];
      if (input.title) updates.push(`Title: "${input.title}"`);
      if (input.description !== undefined) updates.push(`Description: "${input.description || '(empty)'}"`);
      if (input.status) updates.push(`Status: ${input.status.replace('_', ' ')}`);
      if (input.priority) updates.push(`Priority: ${input.priority}`);

      return `✅ Task ${input.task_id} updated successfully!

**Updates Made:**
${updates.map(update => `- ${update}`).join('\n')}

The task changes have been saved to sprint ${sprintId}.`;

    } catch (error) {
      console.error('Error in updateTask:', error);
      return `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Delete a task from the sprint
 */
export const deleteTask = tool({
  description: `Delete a task from the sprint. Use this when a task is no longer needed or was created by mistake.
    Note: This permanently removes the task and cannot be undone.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Deleting task:', input);

      let sprintId = input.sprint_id;

      // If no sprint ID provided, get active sprint
      if (!sprintId) {
        const sprintResponse = await requestWithAuth(
          `/sprints?project_id=${input.project_id}&status=active&limit=1`,
          { method: 'GET' },
          experimental_context
        );

        if (sprintResponse.error) {
          return `Cannot delete task: ${sprintResponse.error}`;
        }

        const sprints = sprintResponse.data || [];
        if (sprints.length === 0) {
          return `No active sprint found for project ${input.project_id}.`;
        }

        sprintId = sprints[0].id;
      }

      const response = await requestWithAuth(
        `/sprints/${sprintId}/tasks/${input.task_id}`,
        { method: 'DELETE' },
        experimental_context
      );

      if (response.error) {
        return `Failed to delete task: ${response.error}`;
      }

      return `✅ Task ${input.task_id} has been deleted from sprint ${sprintId}.

The task has been permanently removed and is no longer available.`;

    } catch (error) {
      console.error('Error in deleteTask:', error);
      return `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

