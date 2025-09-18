/**
 * Sprint Management Tools for Product Owner Agent - FIXED VERSION
 * These tools enable the AI agent to create, update, delete, and manage sprints
 * FIXES: Proper field name mapping (snake_case) and 204 response handling
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  createSprintSchema,
  updateSprintSchema,
  getSprintsSchema,
  deleteSprintSchema,
  getSprintByIdSchema
} from '@/lib/tools/schemas/sprint';

/**
 * Helper function to make authenticated API calls for sprint management
 * FIXED: Handles 204 No Content responses properly
 */
async function makeAuthenticatedSprintCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  context: any,
  body?: any
) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to sprint management tool');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    // Handle 204 No Content responses (like DELETE)
    if (response.status === 204) {
      return { data: null };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in makeAuthenticatedSprintCall:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Schemas are now imported from centralized location

/**
 * Tool for creating a new sprint
 * FIXED: Uses snake_case field names to match backend API
 */
const createSprintTool = tool({
  description: `Create a new sprint for a project. This tool helps Product Owners set up sprints with proper 
    planning dates, goals, and capacity. The sprint will start in 'planning' status and can be activated later.
    
    Date format: Use YYYY-MM-DD format for dates (e.g., 2024-01-15)
    Capacity: Optional story points capacity based on team velocity
    
    Supports various parameter aliases:
    - Sprint name: sprint_name, sprintName, name, title
    - Sprint goal: sprint_goal, sprintGoal, goal, objective
    - Dates: start_date/startDate/start, end_date/endDate/end
    - Capacity: sprint_capacity, sprintCapacity, capacity
    - Project: project_id, projectId`,
  inputSchema: createSprintSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = createSprintSchema.parse(input);
      
      console.log('Creating sprint with validated input:', validated);

      // Call the API to create the sprint
      const response = await makeAuthenticatedSprintCall(
        '/sprints/',
        'POST',
        experimental_context,
        validated
      );

      if (response.error) {
        console.error('Failed to create sprint:', response.error);
        return `Failed to create sprint: ${response.error}`;
      }

      const createdSprint = response.data;
      if (!createdSprint) {
        throw new Error('No data returned from sprint creation');
      }

      console.log('Successfully created sprint:', createdSprint);

      // Handle both possible field name formats (snake_case and camelCase)
      const sprintName = createdSprint.sprint_name || createdSprint.sprintName || createdSprint.name || 'Unnamed Sprint';
      const sprintGoal = createdSprint.sprint_goal || createdSprint.sprintGoal || createdSprint.goal;
      const sprintCapacity = createdSprint.sprint_capacity || createdSprint.sprintCapacity || createdSprint.capacity;
      const projectId = createdSprint.project_id || createdSprint.projectId;
      
      // Format the success message - FIXED: Handle both field name formats
      const statusDisplay = createdSprint.status.charAt(0).toUpperCase() + createdSprint.status.slice(1);
      const startDate = new Date(createdSprint.start_date || createdSprint.startDate).toLocaleDateString();
      const endDate = new Date(createdSprint.end_date || createdSprint.endDate).toLocaleDateString();
      
      const successMessage = `Sprint **"${sprintName}"** has been successfully created! Here are the details:

**Sprint Information:**
- **Sprint ID:** #${createdSprint.id}
- **Status:** ${statusDisplay}
- **Duration:** ${startDate} to ${endDate}
- **Capacity:** ${sprintCapacity || 'Not set'} story points${sprintGoal ? `\n- **Goal:** ${sprintGoal}` : ''}

**Next Steps:**
1. Add backlog items to this sprint during sprint planning
2. Set the sprint status to 'active' when ready to begin
3. Monitor progress using velocity and burndown tools

You can view this sprint in the [Project Dashboard](http://localhost:3000/project/${projectId}/sprints). The sprint is ready for planning activities!`;

      return successMessage;

    } catch (error) {
      console.error('Error in createSprintTool:', error);
      return `Failed to create sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for retrieving sprints with filtering options
 * FIXED: Uses snake_case field names to match backend API
 */
const getSprintsTool = tool({
  description: `Retrieve sprints for a project with optional filtering by status, search terms, and pagination.
    Use this tool to review existing sprints, check sprint planning status, or search for specific sprints.
    
    Supports various parameter aliases:
    - Project: project_id, projectId`,
  inputSchema: getSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getSprintsSchema.parse(input);
      
      console.log('Retrieving sprints with filters:', validated);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('project_id', validated.project_id.toString());
      if (validated.status) params.append('status', validated.status);
      if (validated.search) params.append('search', validated.search);
      params.append('limit', validated.limit.toString());
      params.append('skip', validated.skip.toString());

      // Call the API to get sprints
      const response = await makeAuthenticatedSprintCall(
        `/sprints/?${params.toString()}`,
        'GET',
        experimental_context
      );

      if (response.error) {
        console.error('Failed to retrieve sprints:', response.error);
        return `Failed to retrieve sprints: ${response.error}`;
      }

      const sprints = response.data || [];
      
      if (sprints.length === 0) {
        return `No sprints found for project ${validated.project_id}${validated.status ? ` with status '${validated.status}'` : ''}${validated.search ? ` matching '${validated.search}'` : ''}.`;
      }

      console.log(`Successfully retrieved ${sprints.length} sprints`);
      console.log('Sprint API response data:', JSON.stringify(sprints, null, 2));
      
      // Debug: Check field names in the first sprint
      if (sprints.length > 0) {
        const firstSprint = sprints[0];
        console.log('First sprint fields:', Object.keys(firstSprint));
        console.log('Sprint name field values:', {
          sprint_name: firstSprint.sprint_name,
          sprintName: firstSprint.sprintName,
          name: firstSprint.name
        });
      }

      // Format the response - FIXED: Use snake_case field names
      const summary = `Found ${sprints.length} sprint${sprints.length === 1 ? '' : 's'} in project ${validated.project_id}:

${sprints.map((sprint: any, index: number) => {
  const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = new Date(sprint.start_date).toLocaleDateString();
  const endDate = new Date(sprint.end_date).toLocaleDateString();
  
  // Handle both possible field name formats (snake_case and camelCase)
  const sprintName = sprint.sprint_name || sprint.sprintName || sprint.name || 'Unnamed Sprint';
  const sprintGoal = sprint.sprint_goal || sprint.sprintGoal || sprint.goal;
  const sprintCapacity = sprint.sprint_capacity || sprint.sprintCapacity || sprint.capacity;
  
  let sprintInfo = `${index + 1}. **Sprint #${sprint.id}**: "${sprintName}"
   - **Status**: ${statusDisplay}
   - **Duration**: ${startDate} to ${endDate}
   - **Capacity**: ${sprintCapacity || 'Not set'} story points`;
  
  if (sprintGoal) {
    sprintInfo += `\n   - **Goal**: ${sprintGoal.length > 100 ? sprintGoal.substring(0, 100) + '...' : sprintGoal}`;
  }
  
  return sprintInfo;
}).join('\n\n')}

**Summary Statistics**:
- **Total Sprints**: ${sprints.length}
- **Planning**: ${sprints.filter((s: any) => s.status === 'planning').length}
- **Active**: ${sprints.filter((s: any) => s.status === 'active').length}
- **Cancelled**: ${sprints.filter((s: any) => s.status === 'cancelled').length}
- **Total Planned Capacity**: ${sprints.reduce((sum: number, s: any) => sum + (s.sprint_capacity || 0), 0)} story points`;

      return summary;

    } catch (error) {
      console.error('Error in getSprintsTool:', error);
      return `Failed to retrieve sprints: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for getting a specific sprint by ID
 * FIXED: Uses snake_case field names to match backend API
 */
const getSprintByIdTool = tool({
  description: `Retrieve detailed information about a specific sprint by its ID.
    Use this tool to get comprehensive sprint details including backlog items, progress, and metrics.
    
    Supports various parameter aliases:
    - Sprint ID: sprint_id, sprintId, id`,
  inputSchema: getSprintByIdSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getSprintByIdSchema.parse(input);
      
      console.log('Retrieving sprint by ID:', validated.sprint_id);

      // Call the API to get the specific sprint
      const response = await makeAuthenticatedSprintCall(
        `/sprints/${validated.sprint_id}`,
        'GET',
        experimental_context
      );

      if (response.error) {
        console.error('Failed to retrieve sprint:', response.error);
        return `Failed to retrieve sprint: ${response.error}`;
      }

      const sprint = response.data;
      if (!sprint) {
        return `Sprint #${validated.sprint_id} not found.`;
      }

      console.log('Successfully retrieved sprint:', sprint);

      // Handle both possible field name formats (snake_case and camelCase)
      const sprintName = sprint.sprint_name || sprint.sprintName || sprint.name || 'Unnamed Sprint';
      const sprintGoal = sprint.sprint_goal || sprint.sprintGoal || sprint.goal;
      const sprintCapacity = sprint.sprint_capacity || sprint.sprintCapacity || sprint.capacity;
      const startDate = new Date(sprint.start_date || sprint.startDate).toLocaleDateString();
      const endDate = new Date(sprint.end_date || sprint.endDate).toLocaleDateString();
      const createdDate = new Date(sprint.created_at || sprint.createdAt).toLocaleDateString();
      const projectId = sprint.project_id || sprint.projectId;

      // Format the detailed response - FIXED: Handle both field name formats
      const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);

      let sprintDetails = `**Sprint Details** - "${sprintName}"

**Basic Information:**
- **Sprint ID:** #${sprint.id}
- **Status:** ${statusDisplay}
- **Project ID:** ${projectId}
- **Created:** ${createdDate}

**Timeline:**
- **Start Date:** ${startDate}
- **End Date:** ${endDate}
- **Duration:** ${Math.ceil((new Date(sprint.end_date || sprint.endDate).getTime() - new Date(sprint.start_date || sprint.startDate).getTime()) / (1000 * 60 * 60 * 24))} days

**Capacity & Goals:**
- **Planned Capacity:** ${sprintCapacity || 'Not set'} story points${sprintGoal ? `\n- **Sprint Goal:** ${sprintGoal}` : ''}`;

      // Add backlog items if available
      if (sprint.backlog_items && sprint.backlog_items.length > 0) {
        const totalStoryPoints = sprint.backlog_items.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
        const completedItems = sprint.backlog_items.filter((item: any) => item.status === 'done').length;
        const completedStoryPoints = sprint.backlog_items
          .filter((item: any) => item.status === 'done')
          .reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);

        sprintDetails += `

**Sprint Backlog:**
- **Total Items:** ${sprint.backlog_items.length}
- **Completed Items:** ${completedItems}
- **Total Story Points:** ${totalStoryPoints}
- **Completed Story Points:** ${completedStoryPoints}
- **Progress:** ${totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0}%

**Backlog Items:**
${sprint.backlog_items.slice(0, 10).map((item: any, index: number) => {
  const itemType = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const status = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${index + 1}. **${itemType} #${item.id}**: "${item.title}" - ${status} (${item.story_point || 0} pts)`;
}).join('\n')}${sprint.backlog_items.length > 10 ? `\n... and ${sprint.backlog_items.length - 10} more items` : ''}`;
      }

      // Add recommendations based on status
      if (sprint.status === 'planning') {
        sprintDetails += `

**Planning Recommendations:**
- Add backlog items to reach the planned capacity
- Ensure all items have proper story point estimates
- Set clear acceptance criteria for all items
- Consider team velocity when finalizing the backlog`;
      } else if (sprint.status === 'active') {
        sprintDetails += `

**Active Sprint Monitoring:**
- Track daily progress against the sprint goal
- Monitor burndown chart for pace assessment
- Address any blockers or impediments quickly
- Conduct regular daily standups`;
      }

      return sprintDetails;

    } catch (error) {
      console.error('Error in getSprintByIdTool:', error);
      return `Failed to retrieve sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for updating an existing sprint
 * FIXED: Uses snake_case field names to match backend API
 */
const updateSprintTool = tool({
  description: `Update an existing sprint's properties such as name, goal, dates, status, or capacity.
    Use this tool to modify sprints during planning or to change sprint status (planning → active → completed).
    
    Important: Be careful when updating active sprints as it may affect ongoing work.
    
    Supports various parameter aliases:
    - Sprint ID: sprint_id, sprintId, id
    - Sprint name: sprint_name, sprintName, name, title
    - Sprint goal: sprint_goal, sprintGoal, goal, objective
    - Dates: start_date/startDate/start, end_date/endDate/end
    - Capacity: sprint_capacity, sprintCapacity, capacity`,
  inputSchema: updateSprintSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = updateSprintSchema.parse(input);
      
      console.log('Updating sprint:', validated);

      // Get current sprint details first
      const currentResponse = await makeAuthenticatedSprintCall(
        `/sprints/${validated.sprint_id}`,
        'GET',
        experimental_context
      );

      if (currentResponse.error) {
        return `Failed to retrieve current sprint details: ${currentResponse.error}`;
      }

      const currentSprint = currentResponse.data;
      if (!currentSprint) {
        return `Sprint #${validated.sprint_id} not found.`;
      }

      // Prepare update data (only include fields that were provided)
      const updateData: any = {};
      if (validated.sprint_name !== undefined) updateData.sprint_name = validated.sprint_name;
      if (validated.sprint_goal !== undefined) updateData.sprint_goal = validated.sprint_goal;
      if (validated.start_date !== undefined) updateData.start_date = validated.start_date;
      if (validated.end_date !== undefined) updateData.end_date = validated.end_date;
      if (validated.status !== undefined) updateData.status = validated.status;
      if (validated.sprint_capacity !== undefined) updateData.sprint_capacity = validated.sprint_capacity;

      // Check if we have actual updates
      if (Object.keys(updateData).length === 0) {
        return `No updates provided. Please specify at least one field to update for sprint #${validated.sprint_id}.`;
      }

      // Call the API to update the sprint
      const response = await makeAuthenticatedSprintCall(
        `/sprints/${validated.sprint_id}`,
        'PUT',
        experimental_context,
        updateData
      );

      if (response.error) {
        console.error('Failed to update sprint:', response.error);
        return `Failed to update sprint #${validated.sprint_id}: ${response.error}`;
      }

      const updatedSprint = response.data;
      console.log('Successfully updated sprint:', updatedSprint);

      // Format the success response - FIXED: Use snake_case field names
      const statusDisplay = updatedSprint.status.charAt(0).toUpperCase() + updatedSprint.status.slice(1);
      const startDate = new Date(updatedSprint.start_date).toLocaleDateString();
      const endDate = new Date(updatedSprint.end_date).toLocaleDateString();

      let successMessage = `Successfully updated Sprint #${validated.sprint_id}:

**"${updatedSprint.sprint_name}"**

**Current Details:**
- **Status:** ${statusDisplay}
- **Duration:** ${startDate} to ${endDate}
- **Capacity:** ${updatedSprint.sprint_capacity || 'Not set'} story points${updatedSprint.sprint_goal ? `\n- **Goal:** ${updatedSprint.sprint_goal}` : ''}

**Updated Fields:** ${Object.keys(updateData).join(', ')}`;

      // Add status-specific messages
      if (updateData.status) {
        if (updateData.status === 'active') {
          successMessage += `\n\nSprint is now ACTIVE! The team can begin working on the sprint backlog.`;
        } else if (updateData.status === 'cancelled') {
          successMessage += `\n\nSprint has been CANCELLED. Consider moving backlog items to another sprint.`;
        } else if (updateData.status === 'planning') {
          successMessage += `\n\nSprint is back in PLANNING. You can continue to modify the sprint backlog.`;
        }
      }

      return successMessage;

    } catch (error) {
      console.error('Error in updateSprintTool:', error);
      return `Failed to update sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for deleting a sprint
 * FIXED: Handles 204 No Content response properly
 */
const deleteSprintTool = tool({
  description: `Delete a sprint from the project. This action is irreversible and will remove the sprint 
    and all its associations. Use with caution!
    
    Important: This will not delete the backlog items themselves, but will remove their sprint assignments.
    
    Supports various parameter aliases:
    - Sprint ID: sprint_id, sprintId, id`,
  inputSchema: deleteSprintSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = deleteSprintSchema.parse(input);
      
      console.log('Deleting sprint:', validated.sprint_id);

      // Get sprint details first for confirmation message
      const sprintResponse = await makeAuthenticatedSprintCall(
        `/sprints/${validated.sprint_id}`,
        'GET',
        experimental_context
      );

      let sprintName = `Sprint #${validated.sprint_id}`;
      if (sprintResponse.data && !sprintResponse.error) {
        sprintName = `"${sprintResponse.data.sprint_name}" (#${validated.sprint_id})`;
      }

      // Call the API to delete the sprint
      const response = await makeAuthenticatedSprintCall(
        `/sprints/${validated.sprint_id}`,
        'DELETE',
        experimental_context
      );

      if (response.error) {
        console.error('Failed to delete sprint:', response.error);
        return `Failed to delete sprint: ${response.error}`;
      }

      console.log('Successfully deleted sprint:', validated.sprint_id);

      const successMessage = `Sprint ${sprintName} has been successfully deleted.

**Important Notes:**
- The sprint and its planning data have been permanently removed
- Backlog items that were assigned to this sprint are now unassigned
- Historical data and metrics for this sprint may no longer be available
- This action cannot be undone

Consider reviewing any backlog items that were part of this sprint and reassigning them to other sprints if needed.`;

      return successMessage;

    } catch (error) {
      console.error('Error in deleteSprintTool:', error);
      return `Failed to delete sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

// Export individual tools
export {
  createSprintTool,
  getSprintsTool,
  getSprintByIdTool,
  updateSprintTool,
  deleteSprintTool
};