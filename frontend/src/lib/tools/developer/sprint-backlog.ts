/**
 * Developer Sprint Backlog Management Tools
 * Read-only access to sprints and backlog items, plus sprint backlog CRUD operations
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestWithAuth, AuthContext } from '../utils/http';

/**
 * Get sprints by project with filtering and search capabilities
 */
export const getProjectSprints = tool({
  description: `Get sprints for a project with filtering options. 
    Use this to access sprint metadata, find sprints by status, or search sprint names and goals.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting project sprints:', input);

      // Build query parameters
      const params = new URLSearchParams({
        project_id: input.project_id.toString(),
        limit: input.limit.toString()
      });
      
      if (input.status) params.append('status', input.status);
      if (input.search) params.append('search', input.search);

      const response = await requestWithAuth(
        `/sprints?${params.toString()}`,
        { method: 'GET' },
        experimental_context
      );

      if (response.error) {
        return `Failed to get project sprints: ${response.error}`;
      }

      const sprints = response.data || [];
      
      if (sprints.length === 0) {
        return `No sprints found for project ${input.project_id}${input.status ? ` with status '${input.status}'` : ''}${input.search ? ` matching '${input.search}'` : ''}.`;
      }

      console.log(`Found ${sprints.length} sprints for project`);

      let summary = `Found ${sprints.length} sprint${sprints.length === 1 ? '' : 's'} for project ${input.project_id}:\n\n`;

      sprints.forEach((sprint: any, index: number) => {
        const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
        const startDate = (sprint.startDate || sprint.start_date) ? new Date(sprint.startDate || sprint.start_date).toLocaleDateString() : 'Not set';
        const endDate = (sprint.endDate || sprint.end_date) ? new Date(sprint.endDate || sprint.end_date).toLocaleDateString() : 'Not set';
        
        summary += `${index + 1}. **Sprint ${sprint.id}**: "${sprint.sprintName || sprint.sprint_name || 'Unnamed Sprint'}"\n`;
        summary += `   - **Status**: ${statusDisplay}\n`;
        summary += `   - **Duration**: ${startDate} - ${endDate}\n`;
        if (sprint.sprintGoal || sprint.sprint_goal) {
          summary += `   - **Goal**: ${sprint.sprintGoal || sprint.sprint_goal}\n`;
        }
        if (sprint.sprintCapacity || sprint.sprint_capacity) {
          summary += `   - **Capacity**: ${sprint.sprintCapacity || sprint.sprint_capacity} story points\n`;
        }
        summary += '\n';
      });

      // Add status summary
      const statusCounts = sprints.reduce((counts: any, sprint: any) => {
        counts[sprint.status] = (counts[sprint.status] || 0) + 1;
        return counts;
      }, {});

      summary += `**Status Summary:**\n`;
      Object.entries(statusCounts).forEach(([status, count]) => {
        const statusDisplay = (status as string).charAt(0).toUpperCase() + (status as string).slice(1);
        summary += `- **${statusDisplay}**: ${count} sprint${count === 1 ? '' : 's'}\n`;
      });

      return summary;

    } catch (error) {
      console.error('Error in getProjectSprints:', error);
      return `Failed to get project sprints: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Get current active sprint for a project
 */
export const getCurrentActiveSprint = tool({
  description: `Get the current active sprint for a project. This automatically identifies the active sprint context.
    Use this tool to find the active sprint before performing sprint operations.`,
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project to get active sprint for'),
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting active sprint for project:', input.project_id);

      const response = await requestWithAuth(
        `/sprints?project_id=${input.project_id}&status=active&limit=1`,
        { method: 'GET' },
        experimental_context
      );

      if (response.error) {
        return `Failed to get active sprint: ${response.error}`;
      }

      const sprints = response.data || [];
      
      if (sprints.length === 0) {
        return `No active sprint found for project ${input.project_id}. Please create and activate a sprint first before managing sprint backlog items.`;
      }

      const activeSprint = sprints[0];
      const startDate = (activeSprint.startDate || activeSprint.start_date) ? new Date(activeSprint.startDate || activeSprint.start_date).toLocaleDateString() : 'Not set';
      const endDate = (activeSprint.endDate || activeSprint.end_date) ? new Date(activeSprint.endDate || activeSprint.end_date).toLocaleDateString() : 'Not set';
      
      const sprintName = activeSprint.sprintName || activeSprint.sprint_name || 'Unnamed Sprint';
      
      return `Active sprint detected:

**${sprintName}** (ID: ${activeSprint.id})
- **Status**: ${activeSprint.status.charAt(0).toUpperCase() + activeSprint.status.slice(1)}
- **Start date**: ${startDate}
- **End date**: ${endDate}
- **Goal**: ${activeSprint.sprintGoal || activeSprint.sprint_goal || '(none set)'}

I'll use this sprint as the context for any sprint backlog operations.`;

    } catch (error) {
      console.error('Error in getCurrentActiveSprint:', error);
      return `Failed to get active sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Get backlog items (read-only access for Developer agent)
 */
export const getBacklogItems = tool({
  description: `Get backlog items from the product backlog (read-only access). 
    Use this to review available stories and bugs that can be added to sprints.
    Developer agent can only VIEW backlog items, not create, update, or delete them.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting backlog items:', input);

      // Build query parameters
      const params = new URLSearchParams({
        project_id: input.project_id.toString(),
        limit: input.limit.toString()
      });
      
      if (input.item_type) params.append('item_type', input.item_type);
      if (input.status) params.append('status', input.status);
      if (input.priority) params.append('priority', input.priority);
      if (input.search) params.append('search', input.search);

      const response = await requestWithAuth(
        `/backlogs?${params.toString()}`,
        { method: 'GET' },
        experimental_context
      );

      if (response.error) {
        return `Failed to get backlog items: ${response.error}`;
      }

      const backlogItems = response.data || [];
      
      if (backlogItems.length === 0) {
        return `No backlog items found for the specified criteria.`;
      }

      console.log(`Found ${backlogItems.length} backlog items`);

      // Separate items by type and sprint status
      const availableForSprint = backlogItems.filter((item: any) => 
        !item.sprint_id && (item.item_type === 'story' || item.item_type === 'bug')
      );
      
      const inSprints = backlogItems.filter((item: any) => item.sprint_id);
      const epics = backlogItems.filter((item: any) => item.item_type === 'epic');

      let summary = `Found ${backlogItems.length} backlog item${backlogItems.length === 1 ? '' : 's'}:\n\n`;

      // Show available items for sprint (stories and bugs not in any sprint)
      if (availableForSprint.length > 0) {
        summary += `**Available for Sprint (${availableForSprint.length} items):**\n`;
        availableForSprint.slice(0, 10).forEach((item: any, index: number) => {
          const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
          const priorityDisplay = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
          
          summary += `${index + 1}. **${itemTypeDisplay} #${item.id}**: "${item.title}"\n`;
          summary += `   - **Priority**: ${priorityDisplay}\n`;
          summary += `   - **Story Points**: ${item.story_point || 'Not estimated'}\n`;
          if (item.description && item.description.length > 0) {
            summary += `   - **Description**: ${item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description}\n`;
          }
          summary += '\n';
        });
        if (availableForSprint.length > 10) {
          summary += `   ... and ${availableForSprint.length - 10} more items\n\n`;
        }
      }

      // Show items already in sprints
      if (inSprints.length > 0) {
        summary += `**Already in Sprints (${inSprints.length} items):**\n`;
        inSprints.slice(0, 5).forEach((item: any, index: number) => {
          const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
          summary += `${index + 1}. **${itemTypeDisplay} #${item.id}**: "${item.title}" (Sprint ${item.sprint_id})\n`;
        });
        if (inSprints.length > 5) {
          summary += `   ... and ${inSprints.length - 5} more items in sprints\n\n`;
        }
      }

      // Show epics (cannot be added to sprints directly)
      if (epics.length > 0) {
        summary += `**Epics (${epics.length} items - need to be broken down into stories):**\n`;
        epics.slice(0, 3).forEach((item: any, index: number) => {
          summary += `${index + 1}. **Epic #${item.id}**: "${item.title}"\n`;
        });
        if (epics.length > 3) {
          summary += `   ... and ${epics.length - 3} more epics\n`;
        }
      }

      return summary;

    } catch (error) {
      console.error('Error in getBacklogItems:', error);
      return `Failed to get backlog items: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Get sprint backlog items with detailed information
 */
export const reviewSprintBacklog = tool({
  description: `Review current sprint backlog items with detailed progress tracking and analysis.
    Use this to get comprehensive overview of sprint work and progress.`,
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project'),
    
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .optional()
      .describe('Specific sprint ID to review (if not provided, will use active sprint)'),
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Reviewing sprint backlog:', input);

      let sprintId = input.sprint_id;

      // If no sprint ID provided, get active sprint
      if (!sprintId) {
        const sprintResponse = await requestWithAuth(
          `/sprints?project_id=${input.project_id}&status=active&limit=1`,
          { method: 'GET' },
          experimental_context
        );

        if (sprintResponse.error) {
          return `Failed to get active sprint: ${sprintResponse.error}`;
        }

        const sprints = sprintResponse.data || [];
        if (sprints.length === 0) {
          return `No active sprint found for project ${input.project_id}. Please specify a sprint ID or create an active sprint.`;
        }

        sprintId = sprints[0].id;
      }

      // Get sprint backlog items
      const response = await requestWithAuth(
        `/sprints/${sprintId}/backlog?limit=1000`,
        { method: 'GET' },
        experimental_context
      );

      if (response.error) {
        return `Failed to get sprint backlog: ${response.error}`;
      }

      const backlogItems = response.data || [];
      
      if (backlogItems.length === 0) {
        return `Sprint ${sprintId} backlog is empty. No items to review.`;
      }

      console.log(`Found ${backlogItems.length} sprint backlog items`);

      // Calculate statistics
      const totalStoryPoints = backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const statusCounts = backlogItems.reduce((counts: any, item: any) => {
        counts[item.status] = (counts[item.status] || 0) + 1;
        return counts;
      }, {});

      // Calculate progress
      const completedPoints = backlogItems
        .filter((item: any) => item.status === 'done')
        .reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      
      const progressPercent = totalStoryPoints > 0 ? Math.round((completedPoints / totalStoryPoints) * 100) : 0;

      let summary = `**Sprint ${sprintId} Backlog Review**

**Sprint Progress:**
- **Total Items**: ${backlogItems.length}
- **Total Story Points**: ${totalStoryPoints}
- **Completed Points**: ${completedPoints} (${progressPercent}%)
- **Remaining Points**: ${totalStoryPoints - completedPoints}

**Status Distribution:**
- **To Do**: ${statusCounts.todo || 0} items
- **In Progress**: ${statusCounts.in_progress || 0} items
- **In Review**: ${statusCounts.in_review || 0} items
- **Done**: ${statusCounts.done || 0} items
- **Cancelled**: ${statusCounts.cancelled || 0} items

**Backlog Items:**

`;

      backlogItems.forEach((item: any, index: number) => {
        const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
        const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        const priorityDisplay = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
        
        summary += `${index + 1}. **${itemTypeDisplay} #${item.id}**: "${item.title}"
   - **Status**: ${statusDisplay}
   - **Priority**: ${priorityDisplay}
   - **Story Points**: ${item.story_point || 'Not estimated'}`;
        
        if (item.description) {
          summary += `\n   - **Description**: ${item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}`;
        }
        
        if (item.acceptance_criteria && item.acceptance_criteria.length > 0) {
          summary += `\n   - **Acceptance Criteria**: ${item.acceptance_criteria.length} criteria defined`;
        }
        
        if (item.tasks && item.tasks.length > 0) {
          const completedTasks = item.tasks.filter((task: any) => task.status === 'done').length;
          summary += `\n   - **Tasks**: ${completedTasks}/${item.tasks.length} completed`;
        }
        
        summary += '\n\n';
      });

      // Add insights
      if (statusCounts.in_progress > 3) {
        summary += `⚠️ **Insight**: Many items (${statusCounts.in_progress}) are in progress. Consider focusing on completing current work before starting new items.\n\n`;
      }
      
      if (totalStoryPoints - completedPoints > completedPoints && backlogItems.length > 0) {
        summary += `📊 **Insight**: More work remains than completed. Consider sprint scope or timeline.\n\n`;
      }

      return summary;

    } catch (error) {
      console.error('Error in reviewSprintBacklog:', error);
      return `Failed to review sprint backlog: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Create a new sprint backlog item (story or bug)
 */
export const createSprintBacklogItem = tool({
  description: `Create a new sprint backlog item (story or bug) and automatically add it to the active sprint.
    Use this to create new work items during sprint planning or when new requirements emerge.
    Only stories and bugs can be created - epics should be created by the Product Owner.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Creating sprint backlog item:', input);

      // First, get the active sprint
      const sprintResponse = await requestWithAuth(
        `/sprints?project_id=${input.project_id}&status=active&limit=1`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintResponse.error) {
        return `Cannot create sprint backlog item: ${sprintResponse.error}`;
      }

      const sprints = sprintResponse.data || [];
      if (sprints.length === 0) {
        return `Cannot create sprint backlog item: No active sprint found for project ${input.project_id}. Please create and activate a sprint first.`;
      }

      const activeSprint = sprints[0];

      // Create the backlog item
      const backlogData = {
        title: input.title,
        description: input.description || '',
        item_type: input.item_type,
        priority: input.priority,
        story_point: input.story_point,
        project_id: input.project_id,
        status: 'todo' as const
      };

      const createResponse = await requestWithAuth(
        '/backlogs/',
        {
          method: 'POST',
          body: JSON.stringify(backlogData),
        },
        experimental_context
      );

      if (createResponse.error) {
        return `Failed to create backlog item: ${createResponse.error}`;
      }

      const newItem = createResponse.data;

      // Add acceptance criteria if provided
      if (input.acceptance_criteria && input.acceptance_criteria.length > 0) {
        for (const criteria of input.acceptance_criteria) {
          await requestWithAuth(
            '/acceptance-criteria/',
            {
              method: 'POST',
              body: JSON.stringify({
                title: criteria,
                backlog_id: newItem.id
              }),
            },
            experimental_context
          );
        }
      }

      // Add the item to the active sprint
      const addToSprintResponse = await requestWithAuth(
        `/sprints/${activeSprint.id}/backlog/${newItem.id}`,
        { method: 'POST' },
        experimental_context
      );

      if (addToSprintResponse.error) {
        return `Created backlog item but failed to add to sprint: ${addToSprintResponse.error}. You can manually add item #${newItem.id} to the sprint.`;
      }

      const itemTypeDisplay = newItem.item_type.charAt(0).toUpperCase() + newItem.item_type.slice(1);
      const priorityDisplay = newItem.priority.charAt(0).toUpperCase() + newItem.priority.slice(1).toLowerCase();

      return `Successfully created and added ${itemTypeDisplay.toLowerCase()} **"${newItem.title}"** to Sprint ${activeSprint.id}!

**Item Details:**
- **ID**: #${newItem.id}
- **Type**: ${itemTypeDisplay}
- **Priority**: ${priorityDisplay}
- **Story Points**: ${newItem.story_point || 'Not estimated'}
- **Status**: Todo
${input.acceptance_criteria ? `- **Acceptance Criteria**: ${input.acceptance_criteria.length} criteria added` : ''}

The item is now ready for development in the current sprint. You can view it in the [Sprint Board](/project/${input.project_id}/sprint/${activeSprint.id}).`;

    } catch (error) {
      console.error('Error in createSprintBacklogItem:', error);
      return `Failed to create sprint backlog item: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Update sprint backlog item
 */
export const updateSprintBacklogItem = tool({
  description: `Update a sprint backlog item's details (status, priority, story points, etc.).
    Use this to track progress and modify item details during development.`,
  inputSchema: z.object({
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
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Updating sprint backlog item:', input);

      // Get current item details
      const itemResponse = await requestWithAuth(
        `/backlogs/${input.backlog_id}`,
        { method: 'GET' },
        experimental_context
      );

      if (itemResponse.error) {
        return `Failed to get backlog item: ${itemResponse.error}`;
      }

      const currentItem = itemResponse.data;

      // Verify item is in a sprint and in the correct project
      if (!currentItem.sprint_id) {
        return `Backlog item #${input.backlog_id} is not currently in any sprint. Use the regular backlog management tools to update items not in sprints.`;
      }

      if (currentItem.project_id !== input.project_id) {
        return `Backlog item #${input.backlog_id} belongs to project ${currentItem.project_id}, not project ${input.project_id}.`;
      }

      // Check if sprint is completed
      const sprintResponse = await requestWithAuth(
        `/sprints/${currentItem.sprint_id}`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintResponse.data?.status === 'completed' || sprintResponse.data?.status === 'closed') {
        return `Cannot update item #${input.backlog_id} because Sprint ${currentItem.sprint_id} is already completed.`;
      }

      // Prepare update data
      const updateData: any = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.story_point !== undefined) updateData.story_point = input.story_point;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;

      if (Object.keys(updateData).length === 0) {
        return `No updates provided. Please specify at least one field to update.`;
      }

      // Update the item
      const response = await requestWithAuth(
        `/backlogs/${input.backlog_id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        },
        experimental_context
      );

      if (response.error) {
        return `Failed to update backlog item: ${response.error}`;
      }

      const updatedItem = response.data;
      const itemTypeDisplay = updatedItem.item_type.charAt(0).toUpperCase() + updatedItem.item_type.slice(1);
      
      // Build update summary
      const updates = [];
      if (input.status && input.status !== currentItem.status) {
        const oldStatus = currentItem.status.replace('_', ' ').split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        const newStatus = input.status.replace('_', ' ').split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        updates.push(`Status: ${oldStatus} → ${newStatus}`);
      }
      if (input.priority && input.priority !== currentItem.priority) {
        updates.push(`Priority: ${currentItem.priority} → ${input.priority}`);
      }
      if (input.story_point !== undefined && input.story_point !== currentItem.story_point) {
        updates.push(`Story Points: ${currentItem.story_point || 'Not estimated'} → ${input.story_point}`);
      }
      if (input.title && input.title !== currentItem.title) {
        updates.push(`Title updated`);
      }
      if (input.description !== undefined && input.description !== currentItem.description) {
        updates.push(`Description updated`);
      }

      return `Successfully updated ${itemTypeDisplay.toLowerCase()} **"${updatedItem.title}"** in Sprint ${currentItem.sprint_id}!

**Changes Made:**
${updates.map(update => `- ${update}`).join('\n')}

**Current Status:**
- **Priority**: ${updatedItem.priority.charAt(0).toUpperCase() + updatedItem.priority.slice(1).toLowerCase()}
- **Status**: ${updatedItem.status.replace('_', ' ').split(' ').map((word: string) => 
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
- **Story Points**: ${updatedItem.story_point || 'Not estimated'}

You can view the updated item in the [Sprint Board](/project/${input.project_id}/sprint/${currentItem.sprint_id}).`;

    } catch (error) {
      console.error('Error in updateSprintBacklogItem:', error);
      return `Failed to update sprint backlog item: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Delete/Remove sprint backlog item
 */
export const deleteSprintBacklogItem = tool({
  description: `Remove a backlog item from the sprint and optionally delete it completely.
    Use this when items need to be removed from sprint scope or when work is no longer needed.`,
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project'),
    
    backlog_id: z.number()
      .int('Backlog ID must be a whole number')
      .positive('Backlog ID must be a positive integer')
      .describe('The ID of the backlog item to remove/delete'),
    
    action: z.enum(['remove_from_sprint', 'delete_completely'])
      .default('remove_from_sprint')
      .describe('Whether to just remove from sprint (move back to backlog) or delete completely'),
    
    reason: z.string()
      .min(1, 'Reason cannot be empty')
      .max(500, 'Reason must be 500 characters or less')
      .optional()
      .describe('Reason for removing/deleting the item'),
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Removing/deleting sprint backlog item:', input);

      // Get current item details
      const itemResponse = await requestWithAuth(
        `/backlogs/${input.backlog_id}`,
        { method: 'GET' },
        experimental_context
      );

      if (itemResponse.error) {
        return `Failed to get backlog item: ${itemResponse.error}`;
      }

      const backlogItem = itemResponse.data;

      // Verify item is in the correct project
      if (backlogItem.project_id !== input.project_id) {
        return `Backlog item #${input.backlog_id} belongs to project ${backlogItem.project_id}, not project ${input.project_id}.`;
      }

      if (!backlogItem.sprint_id) {
        return `Backlog item #${input.backlog_id} is not currently in any sprint.`;
      }

      // Check if sprint is completed
      const sprintResponse = await requestWithAuth(
        `/sprints/${backlogItem.sprint_id}`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintResponse.data?.status === 'completed' || sprintResponse.data?.status === 'closed') {
        return `Cannot remove item #${input.backlog_id} because Sprint ${backlogItem.sprint_id} is already completed.`;
      }

      const itemTypeDisplay = backlogItem.item_type.charAt(0).toUpperCase() + backlogItem.item_type.slice(1);

      if (input.action === 'remove_from_sprint') {
        // Remove from sprint (move back to product backlog)
        const removeResponse = await requestWithAuth(
          `/sprints/${backlogItem.sprint_id}/backlog/${input.backlog_id}`,
          { method: 'DELETE' },
          experimental_context
        );

        if (removeResponse.error) {
          return `Failed to remove item from sprint: ${removeResponse.error}`;
        }

        let message = `Successfully removed ${itemTypeDisplay.toLowerCase()} **"${backlogItem.title}"** from Sprint ${backlogItem.sprint_id}.

**Item Details:**
- **ID**: #${backlogItem.id}
- **Priority**: ${backlogItem.priority.charAt(0).toUpperCase() + backlogItem.priority.slice(1).toLowerCase()}
- **Story Points**: ${backlogItem.story_point || 'Not estimated'}`;

        if (input.reason) {
          message += `\n\n**Reason**: ${input.reason}`;
        }

        message += `\n\nThe item has been moved back to the product backlog. You can find it in the [Product Backlog](/project/${input.project_id}/backlog) if you need to add it to a future sprint.`;

        return message;

      } else {
        // Delete completely
        const deleteResponse = await requestWithAuth(
          `/backlogs/${input.backlog_id}`,
          { method: 'DELETE' },
          experimental_context
        );

        if (deleteResponse.error) {
          return `Failed to delete backlog item: ${deleteResponse.error}`;
        }

        let message = `Successfully deleted ${itemTypeDisplay.toLowerCase()} **"${backlogItem.title}"** completely.

**Deleted Item Details:**
- **ID**: #${backlogItem.id}
- **Priority**: ${backlogItem.priority.charAt(0).toUpperCase() + backlogItem.priority.slice(1).toLowerCase()}
- **Story Points**: ${backlogItem.story_point || 'Not estimated'}`;

        if (input.reason) {
          message += `\n\n**Reason**: ${input.reason}`;
        }

        message += `\n\n⚠️ **Warning**: This item has been permanently deleted and cannot be recovered.`;

        return message;
      }

    } catch (error) {
      console.error('Error in deleteSprintBacklogItem:', error);
      return `Failed to remove/delete sprint backlog item: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

