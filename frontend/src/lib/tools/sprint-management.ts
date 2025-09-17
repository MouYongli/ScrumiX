/**
 * Sprint Management Tools for Product Owner Agent
 * These tools enable the AI agent to create, read, update, and delete sprints through the frontend API layer
 */

import { tool } from 'ai';
import { z } from 'zod';
import { ApiSprint } from '@/types/api';

/**
 * Helper function to convert simple date format to datetime format for backend
 * Converts YYYY-MM-DD to YYYY-MM-DDTHH:mm:ss format
 */
function formatDateForBackend(dateString: string, isEndDate: boolean = false): string {
  // If already in datetime format, return as-is
  if (dateString.includes('T')) {
    return dateString;
  }
  
  // Convert simple date to datetime
  // Start dates default to 00:00:00, end dates default to 23:59:59
  const timeComponent = isEndDate ? 'T23:59:59' : 'T00:00:00';
  return `${dateString}${timeComponent}`;
}

/**
 * Helper function to create sprints with authentication context
 * This handles server-side API calls from tools with proper cookie forwarding
 */
async function createSprintWithAuth(sprintData: any, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/sprints/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
      body: JSON.stringify(sprintData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in createSprintWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to update sprints with authentication context
 */
async function updateSprintWithAuth(sprintId: number, sprintData: any, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/sprints/${sprintId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
      body: JSON.stringify(sprintData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in updateSprintWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to delete sprints with authentication context
 */
async function deleteSprintWithAuth(sprintId: number, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/sprints/${sprintId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    return { data: { success: true } };
  } catch (error) {
    console.error('Error in deleteSprintWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to get sprints with authentication context
 */
async function getSprintsWithAuth(filters: any, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters.project_id) params.append('project_id', filters.project_id.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());

    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/sprints/?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in getSprintsWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to get a single sprint by ID with authentication context
 */
async function getSprintByIdWithAuth(sprintId: number, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/sprints/${sprintId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in getSprintByIdWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Define the Zod schema for sprint creation
const createSprintSchema = z.object({
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

// Define the Zod schema for sprint updates
const updateSprintSchema = z.object({
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

// Define the Zod schema for sprint retrieval
const getSprintsSchema = z.object({
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

// Define the Zod schema for sprint deletion
const deleteSprintSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to delete (can also be called sprintId or id)')
});

// Define the Zod schema for getting a single sprint
const getSprintByIdSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to retrieve (can also be called sprintId or id)')
});

/**
 * Tool for creating a new sprint
 */
export const createSprintTool = tool({
  description: `Create a new sprint in the project. This tool allows the Product Owner to create sprints with proper planning details.
    Use this when users request to create a new sprint, iteration, or time-boxed development cycle.
    The tool validates input and ensures proper Scrum practices are followed.
    
    Supports various naming aliases:
    - Sprint name: sprint_name, sprintName, name, title
    - Sprint goal: sprint_goal, sprintGoal, goal, objective
    - Start date: start_date, startDate, start
    - End date: end_date, endDate, end
    - Sprint capacity: sprint_capacity, sprintCapacity, capacity
    - Project ID: project_id, projectId`,
  inputSchema: createSprintSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = createSprintSchema.parse(input);

      console.log('Creating sprint with validated input:', validated);

      // Convert date formats for backend and validate date logic
      const formattedStartDate = formatDateForBackend(validated.start_date, false);
      const formattedEndDate = formatDateForBackend(validated.end_date, true);
      
      const startDate = new Date(formattedStartDate);
      const endDate = new Date(formattedEndDate);
      
      if (endDate <= startDate) {
        return 'Failed to create sprint: End date must be after start date.';
      }

      // Prepare sprint data with formatted dates
      const sprintData = {
        ...validated,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      };

      // Call the API to create the sprint
      const response = await createSprintWithAuth(sprintData, experimental_context);

      if (response.error) {
        console.error('Failed to create sprint:', response.error);
        return `Failed to create sprint: ${response.error}`;
      }

      const createdSprint = response.data;
      if (!createdSprint) {
        throw new Error('No data returned from sprint creation');
      }

      console.log('Successfully created sprint:', createdSprint);

      // Format the response with sprint details
      const statusDisplay = createdSprint.status.charAt(0).toUpperCase() + createdSprint.status.slice(1);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const successMessage = `The sprint **"${createdSprint.sprintName}"** has been successfully created in the project. Here are the details:

- **Sprint ID:** #${createdSprint.id}
- **Status:** ${statusDisplay}
- **Duration:** ${duration} days
- **Start Date:** ${new Date(createdSprint.startDate).toLocaleDateString()}
- **End Date:** ${new Date(createdSprint.endDate).toLocaleDateString()}${createdSprint.sprintGoal ? `\n- **Goal:** ${createdSprint.sprintGoal}` : ''}${createdSprint.sprintCapacity ? `\n- **Capacity:** ${createdSprint.sprintCapacity} story points` : ''}

You can view this sprint in the [Project Sprints](http://localhost:3000/project/${createdSprint.projectId}/sprint) page. The sprint is ready for backlog items to be added and planning to begin!`;
      
      return successMessage;

    } catch (error) {
      console.error('Error in createSprintTool:', error);
      return `Failed to create sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for updating an existing sprint
 */
export const updateSprintTool = tool({
  description: `Update an existing sprint's information. This tool allows the Product Owner to modify sprint details like name, goal, dates, status, and capacity.
    Use this when users request to edit, modify, or change sprint information.
    
    Supports various naming aliases:
    - Sprint ID: sprint_id, sprintId, id
    - Sprint name: sprint_name, sprintName, name, title
    - Sprint goal: sprint_goal, sprintGoal, goal, objective
    - Start date: start_date, startDate, start
    - End date: end_date, endDate, end
    - Sprint capacity: sprint_capacity, sprintCapacity, capacity`,
  inputSchema: updateSprintSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = updateSprintSchema.parse(input);

      console.log('Updating sprint with validated input:', validated);

      // Convert date formats for backend if provided and validate date logic
      let updateData = { ...validated };
      delete (updateData as any).sprint_id;
      
      if (validated.start_date) {
        updateData.start_date = formatDateForBackend(validated.start_date, false);
      }
      if (validated.end_date) {
        updateData.end_date = formatDateForBackend(validated.end_date, true);
      }
      
      // Validate date logic if both dates are provided
      if (updateData.start_date && updateData.end_date) {
        const startDate = new Date(updateData.start_date);
        const endDate = new Date(updateData.end_date);
        
        if (endDate <= startDate) {
          return 'Failed to update sprint: End date must be after start date.';
        }
      }

      // Extract sprint ID
      const sprintId = validated.sprint_id;

      // Call the API to update the sprint
      const response = await updateSprintWithAuth(sprintId, updateData, experimental_context);

      if (response.error) {
        console.error('Failed to update sprint:', response.error);
        return `Failed to update sprint: ${response.error}`;
      }

      const updatedSprint = response.data;
      if (!updatedSprint) {
        throw new Error('No data returned from sprint update');
      }

      console.log('Successfully updated sprint:', updatedSprint);

      // Format the response with updated sprint details
      const statusDisplay = updatedSprint.status.charAt(0).toUpperCase() + updatedSprint.status.slice(1);
      const startDate = new Date(updatedSprint.startDate);
      const endDate = new Date(updatedSprint.endDate);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const successMessage = `The sprint **"${updatedSprint.sprintName}"** has been successfully updated. Here are the current details:

- **Sprint ID:** #${updatedSprint.id}
- **Status:** ${statusDisplay}
- **Duration:** ${duration} days
- **Start Date:** ${startDate.toLocaleDateString()}
- **End Date:** ${endDate.toLocaleDateString()}${updatedSprint.sprintGoal ? `\n- **Goal:** ${updatedSprint.sprintGoal}` : ''}${updatedSprint.sprintCapacity ? `\n- **Capacity:** ${updatedSprint.sprintCapacity} story points` : ''}
- **Last Updated:** ${new Date(updatedSprint.updatedAt).toLocaleString()}

You can view this sprint in the [Project Sprints](http://localhost:3000/project/${updatedSprint.projectId}/sprint) page.`;
      
      return successMessage;

    } catch (error) {
      console.error('Error in updateSprintTool:', error);
      return `Failed to update sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for deleting a sprint
 */
export const deleteSprintTool = tool({
  description: `Delete a sprint from the project. This tool allows the Product Owner to remove sprints that are no longer needed.
    Use this when users request to delete, remove, or cancel a sprint.
    WARNING: This action cannot be undone and will also delete all associated data.
    
    Supports various naming aliases:
    - Sprint ID: sprint_id, sprintId, id`,
  inputSchema: deleteSprintSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = deleteSprintSchema.parse(input);

      console.log('Deleting sprint with ID:', validated.sprint_id);

      // First, get the sprint details for confirmation message
      const sprintResponse = await getSprintByIdWithAuth(validated.sprint_id, experimental_context);
      
      if (sprintResponse.error) {
        console.error('Failed to retrieve sprint for deletion:', sprintResponse.error);
        return `Failed to delete sprint: Could not find sprint with ID ${validated.sprint_id}`;
      }

      const sprintToDelete = sprintResponse.data;

      // Call the API to delete the sprint
      const response = await deleteSprintWithAuth(validated.sprint_id, experimental_context);

      if (response.error) {
        console.error('Failed to delete sprint:', response.error);
        return `Failed to delete sprint: ${response.error}`;
      }

      console.log('Successfully deleted sprint:', validated.sprint_id);

      const successMessage = `The sprint **"${sprintToDelete.sprintName}"** (ID: #${validated.sprint_id}) has been successfully deleted from the project.

**Deleted Sprint Details:**
- **Name:** ${sprintToDelete.sprintName}
- **Status:** ${sprintToDelete.status}${sprintToDelete.sprintGoal ? `\n- **Goal:** ${sprintToDelete.sprintGoal}` : ''}
- **Duration:** ${new Date(sprintToDelete.startDate).toLocaleDateString()} - ${new Date(sprintToDelete.endDate).toLocaleDateString()}

⚠️ **Note:** This action cannot be undone. All associated backlog items, tasks, and meetings have been removed from this sprint.

You can view the remaining sprints in the [Project Sprints](http://localhost:3000/project/${sprintToDelete.projectId}/sprint) page.`;
      
      return successMessage;

    } catch (error) {
      console.error('Error in deleteSprintTool:', error);
      return `Failed to delete sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for retrieving sprints from a project
 */
export const getSprintsTool = tool({
  description: `Retrieve and review sprints from the project. Use this tool to analyze current sprints, check their status, 
    or search for specific sprints. This is essential for sprint planning and management.
    
    Supports various naming aliases:
    - Project ID: project_id, projectId`,
  inputSchema: getSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = getSprintsSchema.parse(input);

      console.log('Retrieving sprints with filters:', validated);

      // Call the API to get sprints
      const response = await getSprintsWithAuth(validated, experimental_context);

      if (response.error) {
        console.error('Failed to retrieve sprints:', response.error);
        return `Failed to retrieve sprints: ${response.error}`;
      }

      const sprints = response.data || [];
      
      if (sprints.length === 0) {
        return `No sprints found matching the specified criteria for project ${validated.project_id}.`;
      }

      console.log(`Successfully retrieved ${sprints.length} sprints`);

      // Format the response with comprehensive sprint information
      const summary = `Found ${sprints.length} sprint${sprints.length === 1 ? '' : 's'} in project ${validated.project_id}:

${sprints.map((sprint: ApiSprint, index: number) => {
  const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const isActive = sprint.status === 'active';
  const isUpcoming = sprint.status === 'planning' && startDate > new Date();
  
  let sprintInfo = `${index + 1}. **Sprint #${sprint.id}**: "${sprint.sprintName}"
   - **Status**: ${statusDisplay}${isActive ? ' 🟢' : isUpcoming ? ' 🔵' : ''}
   - **Duration**: ${duration} days (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
  
  if (sprint.sprintGoal) {
    sprintInfo += `\n   - **Goal**: ${sprint.sprintGoal.length > 100 ? sprint.sprintGoal.substring(0, 100) + '...' : sprint.sprintGoal}`;
  }
  
  if (sprint.sprintCapacity) {
    sprintInfo += `\n   - **Capacity**: ${sprint.sprintCapacity} story points`;
  }
  
  sprintInfo += `\n   - **Created**: ${new Date(sprint.createdAt).toLocaleDateString()}`;
  
  return sprintInfo;
}).join('\n\n')}

**Summary Statistics**:
- **Total Sprints**: ${sprints.length}
- **Planning**: ${sprints.filter((sprint: ApiSprint) => sprint.status === 'planning').length}
- **Active**: ${sprints.filter((sprint: ApiSprint) => sprint.status === 'active').length}
- **Cancelled**: ${sprints.filter((sprint: ApiSprint) => sprint.status === 'cancelled').length}
- **Total Capacity**: ${sprints.reduce((sum: number, sprint: ApiSprint) => sum + (sprint.sprintCapacity || 0), 0)} story points`;

      return summary;

    } catch (error) {
      console.error('Error in getSprintsTool:', error);
      return `Failed to retrieve sprints: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for retrieving a single sprint by ID
 */
export const getSprintByIdTool = tool({
  description: `Retrieve detailed information about a specific sprint by its ID. Use this tool when you need to get complete details about a particular sprint.
    
    Supports various naming aliases:
    - Sprint ID: sprint_id, sprintId, id`,
  inputSchema: getSprintByIdSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = getSprintByIdSchema.parse(input);

      console.log('Retrieving sprint by ID:', validated.sprint_id);

      // Call the API to get the sprint
      const response = await getSprintByIdWithAuth(validated.sprint_id, experimental_context);

      if (response.error) {
        console.error('Failed to retrieve sprint:', response.error);
        return `Failed to retrieve sprint: ${response.error}`;
      }

      const sprint = response.data;
      if (!sprint) {
        return `Sprint with ID ${validated.sprint_id} not found.`;
      }

      console.log('Successfully retrieved sprint:', sprint);

      // Format the detailed response
      const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const isActive = sprint.status === 'active';
      const isUpcoming = sprint.status === 'planning' && startDate > new Date();
      
      const sprintDetails = `**Sprint Details for "${sprint.sprintName}"**

**Basic Information:**
- **Sprint ID:** #${sprint.id}
- **Name:** ${sprint.sprintName}
- **Status:** ${statusDisplay}${isActive ? ' 🟢 (Currently Active)' : isUpcoming ? ' 🔵 (Upcoming)' : ''}
- **Project ID:** ${sprint.projectId}

**Timeline:**
- **Start Date:** ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}
- **End Date:** ${endDate.toLocaleDateString()} at ${endDate.toLocaleTimeString()}
- **Duration:** ${duration} days${sprint.sprintGoal ? `\n\n**Sprint Goal:**\n${sprint.sprintGoal}` : ''}${sprint.sprintCapacity ? `\n\n**Capacity:** ${sprint.sprintCapacity} story points` : ''}

**Timestamps:**
- **Created:** ${new Date(sprint.createdAt).toLocaleString()}
- **Last Updated:** ${new Date(sprint.updatedAt).toLocaleString()}

You can view this sprint in detail at [Sprint Details](http://localhost:3000/project/${sprint.projectId}/sprint/${sprint.id}).`;

      return sprintDetails;

    } catch (error) {
      console.error('Error in getSprintByIdTool:', error);
      return `Failed to retrieve sprint: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Collection of all sprint management tools
 * Export this to use in the Product Owner Agent
 */
export const sprintManagementTools = {
  createSprint: createSprintTool,
  updateSprint: updateSprintTool,
  deleteSprint: deleteSprintTool,
  getSprints: getSprintsTool,
  getSprintById: getSprintByIdTool,
};

/**
 * Type definition for the tools object
 * This ensures type safety when using the tools in the AI agent
 */
export type SprintManagementTools = typeof sprintManagementTools;
