/**
 * Sprint Backlog Management Tools for Developer Agent
 * These tools enable the AI agent to manage sprint backlog items through the frontend API layer
 * Following Scrum practices and maintaining sprint integrity
 */

import { tool } from 'ai';
import { z } from 'zod';
import { BacklogStatus, BacklogPriority, BacklogType } from '@/types/api';

/**
 * Helper function to make authenticated API calls to the backend
 * This handles server-side API calls from tools with proper cookie forwarding
 */
async function makeAuthenticatedApiCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  context: any,
  body?: any
) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in makeAuthenticatedApiCall:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to check if a sprint is completed (to prevent modifications)
 */
async function isSprintCompleted(sprintId: number, context: any): Promise<boolean> {
  const response = await makeAuthenticatedApiCall(`/sprints/${sprintId}`, 'GET', context);
  if (response.error) {
    console.warn('Could not check sprint status:', response.error);
    return false; // Default to allowing operations if we can't check
  }
  
  const sprint = response.data;
  return sprint?.status === 'completed' || sprint?.status === 'closed';
}

/**
 * Tool for adding existing backlog items to a sprint
 * This tool validates that only stories and bugs can be added (no epics)
 */
export const addItemToSprintTool = tool({
  description: `Add an existing backlog item (story or bug) to a sprint backlog. 
    Use this tool when developers need to add user stories or bug fixes to the current sprint.
    This tool enforces Scrum rules: only stories and bugs can be added to sprints, not epics.
    Epics should be broken down into smaller stories first.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint to add the item to'),
    
    backlog_id: z.number()
      .int('Backlog ID must be a whole number')
      .positive('Backlog ID must be a positive integer')
      .describe('The ID of the existing backlog item to add to the sprint'),
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Adding backlog item to sprint:', input);

      // First, check if the sprint is completed
      const sprintCompleted = await isSprintCompleted(input.sprint_id, experimental_context);
      if (sprintCompleted) {
        return `Cannot add items to sprint ${input.sprint_id} because it is already completed. Only active sprints can be modified.`;
      }

      // Get the backlog item details to validate type
      const itemResponse = await makeAuthenticatedApiCall(
        `/backlogs/${input.backlog_id}`, 
        'GET', 
        experimental_context
      );

      if (itemResponse.error) {
        return `Failed to retrieve backlog item: ${itemResponse.error}`;
      }

      const backlogItem = itemResponse.data;
      
      // Validate that only stories and bugs can be added to sprints
      if (backlogItem.item_type === 'epic') {
        return `Cannot add epic "${backlogItem.title}" to sprint backlog. Epics should be broken down into smaller user stories first. Please create user stories from this epic and add those to the sprint instead.`;
      }

      // Add the item to the sprint
      const response = await makeAuthenticatedApiCall(
        `/sprints/${input.sprint_id}/backlog/${input.backlog_id}`,
        'POST',
        experimental_context
      );

      if (response.error) {
        return `Failed to add backlog item to sprint: ${response.error}`;
      }

      const itemTypeDisplay = backlogItem.item_type.charAt(0).toUpperCase() + backlogItem.item_type.slice(1);
      const priorityDisplay = backlogItem.priority.charAt(0).toUpperCase() + backlogItem.priority.slice(1).toLowerCase();

      return `Successfully added ${itemTypeDisplay.toLowerCase()} **"${backlogItem.title}"** to Sprint ${input.sprint_id}!

**Item Details:**
- **Priority:** ${priorityDisplay}
- **Story Points:** ${backlogItem.story_point || 'Not estimated'}
- **Status:** ${backlogItem.status.replace('_', ' ').split(' ').map((word: string) => 
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}

The team can now work on this ${itemTypeDisplay.toLowerCase()} during the sprint. You can view the updated sprint backlog in the [Sprint Board](/project/${backlogItem.project_id}/sprint/${input.sprint_id}).`;

    } catch (error) {
      console.error('Error in addItemToSprintTool:', error);
      return `Failed to add backlog item to sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for retrieving sprint backlog items
 */
export const getSprintBacklogTool = tool({
  description: `Retrieve and review current sprint backlog items with their tasks and progress.
    Use this tool to analyze the current sprint state, check task assignments, 
    review progress, and provide context-aware recommendations for sprint management.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint to retrieve backlog items from'),
    
    skip: z.number()
      .int('Skip must be a whole number')
      .min(0, 'Skip must be non-negative')
      .default(0)
      .describe('Number of items to skip for pagination (default: 0)'),
    
    limit: z.number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(1000, 'Limit cannot exceed 1000')
      .default(1000)
      .describe('Maximum number of items to return (default: 1000, max: 1000)')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Retrieving sprint backlog items:', input);

      const response = await makeAuthenticatedApiCall(
        `/sprints/${input.sprint_id}/backlog?skip=${input.skip}&limit=${input.limit}`,
        'GET',
        experimental_context
      );

      if (response.error) {
        return `Failed to retrieve sprint backlog: ${response.error}`;
      }

      const backlogItems = response.data || [];
      
      if (backlogItems.length === 0) {
        return `No items found in Sprint ${input.sprint_id} backlog. The sprint backlog is empty.`;
      }

      console.log(`Successfully retrieved ${backlogItems.length} sprint backlog items`);

      // Calculate sprint statistics
      const totalStoryPoints = backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const statusCounts = backlogItems.reduce((counts: any, item: any) => {
        counts[item.status] = (counts[item.status] || 0) + 1;
        return counts;
      }, {});

      const summary = `Found ${backlogItems.length} item${backlogItems.length === 1 ? '' : 's'} in Sprint ${input.sprint_id} backlog:

${backlogItems.map((item: any, index: number) => {
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  const priorityDisplay = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
  
  let itemInfo = `${index + 1}. **${itemTypeDisplay} #${item.id}**: "${item.title}"
   - **Priority**: ${priorityDisplay}
   - **Status**: ${statusDisplay}
   - **Story Points**: ${item.story_point || 'Not estimated'}`;
  
  if (item.description) {
    itemInfo += `\n   - **Description**: ${item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}`;
  }
  
  if (item.acceptance_criteria && item.acceptance_criteria.length > 0) {
    itemInfo += `\n   - **Acceptance Criteria**: ${item.acceptance_criteria.length} criteria defined`;
  }
  
  if (item.tasks && item.tasks.length > 0) {
    const completedTasks = item.tasks.filter((task: any) => task.status === 'done').length;
    itemInfo += `\n   - **Tasks**: ${completedTasks}/${item.tasks.length} completed`;
  }
  
  return itemInfo;
}).join('\n\n')}

**Sprint Statistics:**
- **Total Items**: ${backlogItems.length}
- **Stories**: ${backlogItems.filter((item: any) => item.item_type === 'story').length}
- **Bugs**: ${backlogItems.filter((item: any) => item.item_type === 'bug').length}
- **Total Story Points**: ${totalStoryPoints}
- **Status Distribution**:
  - **To Do**: ${statusCounts.todo || 0}
  - **In Progress**: ${statusCounts.in_progress || 0}
  - **In Review**: ${statusCounts.in_review || 0}
  - **Done**: ${statusCounts.done || 0}
  - **Cancelled**: ${statusCounts.cancelled || 0}`;

      return summary;

    } catch (error) {
      console.error('Error in getSprintBacklogTool:', error);
      return `Failed to retrieve sprint backlog: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for updating sprint backlog item status and details
 */
export const updateSprintBacklogItemTool = tool({
  description: `Update a sprint backlog item's status, priority, story points, or other details.
    Use this tool when developers need to update task progress, change priorities, 
    or modify item details during the sprint. Maintains sprint integrity by preventing 
    modifications to completed sprints.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint containing the backlog item'),
    
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

      // Check if the sprint is completed
      const sprintCompleted = await isSprintCompleted(input.sprint_id, experimental_context);
      if (sprintCompleted) {
        return `Cannot update items in sprint ${input.sprint_id} because it is already completed. Only active sprints can be modified.`;
      }

      // Get current item details
      const itemResponse = await makeAuthenticatedApiCall(
        `/backlogs/${input.backlog_id}`, 
        'GET', 
        experimental_context
      );

      if (itemResponse.error) {
        return `Failed to retrieve backlog item: ${itemResponse.error}`;
      }

      const currentItem = itemResponse.data;

      // Verify the item is actually in the specified sprint
      if (currentItem.sprint_id !== input.sprint_id) {
        return `Backlog item ${input.backlog_id} is not in sprint ${input.sprint_id}. It is currently in sprint ${currentItem.sprint_id || 'none'}.`;
      }

      // Prepare update data (only include fields that are being updated)
      const updateData: any = {};
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.story_point !== undefined) updateData.story_point = input.story_point;
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;

      if (Object.keys(updateData).length === 0) {
        return `No updates provided. Please specify at least one field to update (status, priority, story_point, title, or description).`;
      }

      // Update the backlog item
      const response = await makeAuthenticatedApiCall(
        `/backlogs/${input.backlog_id}`,
        'PUT',
        experimental_context,
        updateData
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

      return `Successfully updated ${itemTypeDisplay.toLowerCase()} **"${updatedItem.title}"** in Sprint ${input.sprint_id}!

**Changes Made:**
${updates.map(update => `- ${update}`).join('\n')}

**Current Status:**
- **Priority:** ${updatedItem.priority.charAt(0).toUpperCase() + updatedItem.priority.slice(1).toLowerCase()}
- **Status:** ${updatedItem.status.replace('_', ' ').split(' ').map((word: string) => 
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
- **Story Points:** ${updatedItem.story_point || 'Not estimated'}

You can view the updated item in the [Sprint Board](/project/${updatedItem.project_id}/sprint/${input.sprint_id}).`;

    } catch (error) {
      console.error('Error in updateSprintBacklogItemTool:', error);
      return `Failed to update sprint backlog item: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for removing backlog items from sprint
 */
export const removeItemFromSprintTool = tool({
  description: `Remove a backlog item from the sprint backlog and delete associated tasks.
    Use this tool when items need to be moved back to the product backlog or when 
    sprint scope changes require item removal. This maintains sprint integrity by 
    preventing removal from completed sprints.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint to remove the item from'),
    
    backlog_id: z.number()
      .int('Backlog ID must be a whole number')
      .positive('Backlog ID must be a positive integer')
      .describe('The ID of the backlog item to remove from the sprint'),
    
    reason: z.string()
      .min(1, 'Reason cannot be empty')
      .max(500, 'Reason must be 500 characters or less')
      .optional()
      .describe('Optional reason for removing the item from sprint'),
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Removing backlog item from sprint:', input);

      // Check if the sprint is completed
      const sprintCompleted = await isSprintCompleted(input.sprint_id, experimental_context);
      if (sprintCompleted) {
        return `Cannot remove items from sprint ${input.sprint_id} because it is already completed. Only active sprints can be modified.`;
      }

      // Get current item details for confirmation
      const itemResponse = await makeAuthenticatedApiCall(
        `/backlogs/${input.backlog_id}`, 
        'GET', 
        experimental_context
      );

      if (itemResponse.error) {
        return `Failed to retrieve backlog item: ${itemResponse.error}`;
      }

      const backlogItem = itemResponse.data;

      // Verify the item is actually in the specified sprint
      if (backlogItem.sprint_id !== input.sprint_id) {
        return `Backlog item ${input.backlog_id} is not currently in sprint ${input.sprint_id}. It is in sprint ${backlogItem.sprint_id || 'none'}.`;
      }

      // Remove the item from the sprint
      const response = await makeAuthenticatedApiCall(
        `/sprints/${input.sprint_id}/backlog/${input.backlog_id}`,
        'DELETE',
        experimental_context
      );

      if (response.error) {
        return `Failed to remove backlog item from sprint: ${response.error}`;
      }

      const itemTypeDisplay = backlogItem.item_type.charAt(0).toUpperCase() + backlogItem.item_type.slice(1);
      
      let message = `Successfully removed ${itemTypeDisplay.toLowerCase()} **"${backlogItem.title}"** from Sprint ${input.sprint_id}.

**Item Details:**
- **Priority:** ${backlogItem.priority.charAt(0).toUpperCase() + backlogItem.priority.slice(1).toLowerCase()}
- **Story Points:** ${backlogItem.story_point || 'Not estimated'}
- **Status:** ${backlogItem.status.replace('_', ' ').split(' ').map((word: string) => 
  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}`;

      if (input.reason) {
        message += `\n\n**Reason:** ${input.reason}`;
      }

      message += `\n\nThe item has been moved back to the product backlog and any associated tasks have been deleted. You can find it in the [Product Backlog](/project/${backlogItem.project_id}/backlog) if you need to add it to a future sprint.`;

      return message;

    } catch (error) {
      console.error('Error in removeItemFromSprintTool:', error);
      return `Failed to remove backlog item from sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for getting available backlog items that can be added to sprint
 */
export const getAvailableBacklogItemsTool = tool({
  description: `Get backlog items that are available to be added to a sprint (not currently in any sprint).
    Use this tool to help developers find and select items to add to the current sprint.
    Only shows stories and bugs (epics are filtered out as they cannot be added to sprints).`,
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project to get available backlog items from'),
    
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint (for context and validation)'),
    
    item_type: z.enum(['story', 'bug'])
      .optional()
      .describe('Filter by item type - only stories and bugs can be added to sprints'),
    
    skip: z.number()
      .int('Skip must be a whole number')
      .min(0, 'Skip must be non-negative')
      .default(0)
      .describe('Number of items to skip for pagination'),
    
    limit: z.number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(1000, 'Limit cannot exceed 1000')
      .default(50)
      .describe('Maximum number of items to return (default: 50)')
  }),
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting available backlog items:', input);

      // Build query parameters
      const params = new URLSearchParams({
        project_id: input.project_id.toString(),
        skip: input.skip.toString(),
        limit: input.limit.toString()
      });
      
      if (input.item_type) {
        params.append('item_type', input.item_type);
      }

      const response = await makeAuthenticatedApiCall(
        `/sprints/${input.sprint_id}/backlog/available?${params.toString()}`,
        'GET',
        experimental_context
      );

      if (response.error) {
        return `Failed to retrieve available backlog items: ${response.error}`;
      }

      const availableItems = response.data || [];
      
      // Filter out epics (extra safety check)
      const sprintEligibleItems = availableItems.filter((item: any) => 
        item.item_type === 'story' || item.item_type === 'bug'
      );
      
      if (sprintEligibleItems.length === 0) {
        return `No available ${input.item_type ? input.item_type + 's' : 'stories or bugs'} found for project ${input.project_id}. All items may already be assigned to sprints or there are no items in the backlog.`;
      }

      console.log(`Found ${sprintEligibleItems.length} available items for sprint`);

      const summary = `Found ${sprintEligibleItems.length} available item${sprintEligibleItems.length === 1 ? '' : 's'} that can be added to Sprint ${input.sprint_id}:

${sprintEligibleItems.map((item: any, index: number) => {
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const priorityDisplay = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
  
  let itemInfo = `${index + 1}. **${itemTypeDisplay} #${item.id}**: "${item.title}"
   - **Priority**: ${priorityDisplay}
   - **Story Points**: ${item.story_point || 'Not estimated'}`;
  
  if (item.description) {
    itemInfo += `\n   - **Description**: ${item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}`;
  }
  
  if (item.acceptance_criteria && item.acceptance_criteria.length > 0) {
    itemInfo += `\n   - **Acceptance Criteria**: ${item.acceptance_criteria.length} criteria defined`;
  }
  
  return itemInfo;
}).join('\n\n')}

**Summary:**
- **Total Available**: ${sprintEligibleItems.length}
- **Stories**: ${sprintEligibleItems.filter((item: any) => item.item_type === 'story').length}
- **Bugs**: ${sprintEligibleItems.filter((item: any) => item.item_type === 'bug').length}
- **High Priority**: ${sprintEligibleItems.filter((item: any) => item.priority === 'high').length}
- **Total Story Points**: ${sprintEligibleItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0)}

To add any of these items to the sprint, use the item ID with the add item to sprint tool.`;

      return summary;

    } catch (error) {
      console.error('Error in getAvailableBacklogItemsTool:', error);
      return `Failed to retrieve available backlog items: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Collection of all sprint backlog management tools
 * Export this to use in the Developer Agent
 */
export const sprintBacklogManagementTools = {
  addItemToSprint: addItemToSprintTool,
  getSprintBacklog: getSprintBacklogTool,
  updateSprintBacklogItem: updateSprintBacklogItemTool,
  removeItemFromSprint: removeItemFromSprintTool,
  getAvailableBacklogItems: getAvailableBacklogItemsTool
};

/**
 * Type definition for the tools object
 * This ensures type safety when using the tools in the AI agent
 */
export type SprintBacklogManagementTools = typeof sprintBacklogManagementTools;
