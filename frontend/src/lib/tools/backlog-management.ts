/**
 * Backlog Management Tools for Product Owner Agent
 * These tools enable the AI agent to create and manage backlog items through the frontend API layer
 */

import { tool } from 'ai';
import { z } from 'zod';
import { api } from '@/utils/api';
import { BacklogStatus, BacklogPriority, BacklogType } from '@/types/api';

/**
 * Helper function to create backlog items with authentication context
 * This handles server-side API calls from tools with proper cookie forwarding
 */
async function createBacklogWithAuth(backlogData: any, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/backlogs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
      body: JSON.stringify(backlogData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in createBacklogWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to create acceptance criteria with authentication context
 */
async function createAcceptanceCriteriaWithAuth(backlogId: number, criteriaList: string[], context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for acceptance criteria creation');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies using bulk create endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/acceptance-criteria/backlog/${backlogId}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
      body: JSON.stringify(criteriaList),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in createAcceptanceCriteriaWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Tool for creating a new backlog item
 * This tool validates input data and creates backlog items via the frontend API layer
 */

// Define the Zod schema as source of truth for validation
const backlogItemZod = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less')
    .describe('The title of the backlog item'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Optional detailed description of the backlog item'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .default('medium')
    .describe('Priority level: critical, high, medium, or low'),
  
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
    .default('todo')
    .describe('Current status: todo, in_progress, in_review, done, or cancelled'),
  
  item_type: z.enum(['epic', 'story', 'bug'])
    .default('story')
    .describe('Type of backlog item: epic, story, or bug'),
  
  story_point: z.number()
    .int('Story points must be a whole number')
    .min(0, 'Story points must be non-negative')
    .max(100, 'Story points must be 100 or less')
    .optional()
    .describe('Estimation in story points (optional)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project this backlog item belongs to'),
  
  parent_id: z.number()
    .int('Parent ID must be a whole number')
    .positive('Parent ID must be a positive integer')
    .optional()
    .describe('Optional parent backlog item ID (for hierarchical items)'),
  
  assigned_to_id: z.number()
    .int('Assigned user ID must be a whole number')
    .positive('Assigned user ID must be a positive integer')
    .optional()
    .describe('Optional ID of the user assigned to this item'),
  
  label: z.string()
    .max(50, 'Label must be 50 characters or less')
    .optional()
    .describe('Optional label or tag for categorization'),
  
  acceptance_criteria: z.array(z.string().min(1, 'Acceptance criteria cannot be empty'))
    .max(10, 'Maximum 10 acceptance criteria allowed')
    .optional()
    .describe('Optional array of acceptance criteria for the backlog item')
});

// Debug: Log the schema to ensure it's properly defined
console.log('Zod schema defined:', !!backlogItemZod);
console.log('Schema shape keys:', Object.keys(backlogItemZod.shape || {}));

export const createBacklogItemTool = tool({
  description: `Create a new backlog item (epic, story, or bug) in the project backlog. 
    Use this tool when users request to add new features, user stories, epics, or bug reports to the backlog.
    The tool validates the input and ensures proper Scrum practices are followed.`,
  inputSchema: backlogItemZod,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod to apply defaults and ensure correct types
      const validated = backlogItemZod.parse(input);

      console.log('Creating backlog item with validated input:', validated);
      console.log('Tool execution context:', experimental_context ? 'present' : 'missing');

      // Apply defaults for optional fields and convert to proper enum types
      const backlogData = {
        title: validated.title,
        description: validated.description || '',
        priority: (validated.priority || 'medium') as BacklogPriority,
        status: (validated.status || 'todo') as BacklogStatus,
        item_type: (validated.item_type || 'story') as BacklogType,
        story_point: validated.story_point || 0,
        project_id: validated.project_id,
        parent_id: validated.parent_id,
        assigned_to_id: validated.assigned_to_id,
        label: validated.label
      };

      // Call the frontend API layer to create the backlog item with authentication context
      const response = await createBacklogWithAuth(backlogData, experimental_context);

      if (response.error) {
        console.error('Failed to create backlog item:', response.error);
        return `Failed to create backlog item: ${response.error}`;
      }

      const createdBacklog = response.data;
      if (!createdBacklog) {
        throw new Error('No data returned from backlog creation');
      }

      // Create acceptance criteria if provided
      if (validated.acceptance_criteria && validated.acceptance_criteria.length > 0) {
        try {
          console.log('Creating acceptance criteria:', validated.acceptance_criteria);
          
          // Use the bulk create API for better performance
          const criteriaResponse = await createAcceptanceCriteriaWithAuth(
            createdBacklog.id, 
            validated.acceptance_criteria, 
            experimental_context
          );
          
          if (criteriaResponse.error) {
            console.warn('Failed to create acceptance criteria:', criteriaResponse.error);
          } else {
            console.log('Successfully created acceptance criteria:', criteriaResponse.data);
          }
        } catch (error) {
          console.warn('Error creating acceptance criteria:', error);
        }
      }

      console.log('Successfully created backlog item:', createdBacklog);

      // Create markdown-formatted success message that renders beautifully
      const itemTypeDisplay = createdBacklog.item_type.charAt(0).toUpperCase() + createdBacklog.item_type.slice(1);
      const statusDisplay = createdBacklog.status.replace('_', ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      const priorityDisplay = createdBacklog.priority.charAt(0).toUpperCase() + createdBacklog.priority.slice(1).toLowerCase();
      
      // Format acceptance criteria if provided
      let acceptanceCriteriaText = '';
      if (validated.acceptance_criteria && validated.acceptance_criteria.length > 0) {
        acceptanceCriteriaText = '\n\n**Acceptance Criteria:**\n' + 
          validated.acceptance_criteria.map((criteria, index) => `${index + 1}. ${criteria}`).join('\n');
      }
      
      const successMessage = `The ${createdBacklog.item_type} titled **"${createdBacklog.title}"** has been successfully created in the project backlog. Here are the details:

- **Priority:** ${priorityDisplay}
- **Status:** ${statusDisplay}
- **Item ID:** #${createdBacklog.id}${createdBacklog.description ? `\n- **Description:** ${createdBacklog.description}` : ''}${acceptanceCriteriaText}

You can view this ${createdBacklog.item_type} in the [Project Backlog](/project/${createdBacklog.project_id}/backlog). If you have any further requirements or modifications, just let me know!`;
      
      return successMessage;

    } catch (error) {
      console.error('Error in createBacklogItemTool:', error);
      
      return `Failed to create backlog item: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Helper function to retrieve backlog items with authentication context
 */
async function getBacklogItemsWithAuth(filters: any, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for backlog retrieval');
    return { error: 'Authentication context missing' };
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (filters.project_id) params.append('project_id', filters.project_id.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.item_type) params.append('item_type', filters.item_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.assigned_to_id) params.append('assigned_to_id', filters.assigned_to_id.toString());
    if (filters.include_children !== undefined) params.append('include_children', filters.include_children.toString());
    if (filters.include_acceptance_criteria !== undefined) params.append('include_acceptance_criteria', filters.include_acceptance_criteria.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.skip) params.append('skip', filters.skip.toString());

    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/backlogs/?${params.toString()}`, {
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
    console.error('Error in getBacklogItemsWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Zod schema for backlog retrieval filters
 */
const backlogRetrievalSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to retrieve backlog items from'),
  
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
    .optional()
    .describe('Filter by status: todo, in_progress, in_review, done, or cancelled'),
  
  priority: z.enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .describe('Filter by priority: critical, high, medium, or low'),
  
  item_type: z.enum(['epic', 'story', 'bug'])
    .optional()
    .describe('Filter by item type: epic, story, or bug'),
  
  search: z.string()
    .optional()
    .describe('Search term to find items by title, description, or acceptance criteria'),
  
  assigned_to_id: z.number()
    .int('Assigned user ID must be a whole number')
    .positive('Assigned user ID must be a positive integer')
    .optional()
    .describe('Filter by assigned user ID'),
  
  include_children: z.boolean()
    .default(true)
    .describe('Whether to include child items in hierarchical structures'),
  
  include_acceptance_criteria: z.boolean()
    .default(true)
    .describe('Whether to include acceptance criteria for each item'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50)
    .describe('Maximum number of items to return (default: 50, max: 100)'),
  
  skip: z.number()
    .int('Skip must be a whole number')
    .min(0, 'Skip must be non-negative')
    .default(0)
    .describe('Number of items to skip for pagination (default: 0)')
});

/**
 * Tool for retrieving and reviewing current backlog items
 */
export const getBacklogItemsTool = tool({
  description: `Retrieve and review current backlog items from the project. 
    Use this tool to analyze the current backlog state, review existing items, 
    check priorities and statuses, or search for specific items.
    This is essential for providing context-aware recommendations and backlog management.`,
  inputSchema: backlogRetrievalSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = backlogRetrievalSchema.parse(input);

      console.log('Retrieving backlog items with filters:', validated);

      // Call the backend API to get backlog items
      const response = await getBacklogItemsWithAuth(validated, experimental_context);

      if (response.error) {
        console.error('Failed to retrieve backlog items:', response.error);
        return `Failed to retrieve backlog items: ${response.error}`;
      }

      const backlogItems = response.data || [];
      
      if (backlogItems.length === 0) {
        return `No backlog items found matching the specified criteria for project ${validated.project_id}.`;
      }

      console.log(`Successfully retrieved ${backlogItems.length} backlog items`);

      // Format the response with comprehensive item information
      const summary = `Found ${backlogItems.length} backlog item${backlogItems.length === 1 ? '' : 's'} in project ${validated.project_id}:

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
  
  if (item.assigned_to_id) {
    itemInfo += `\n   - **Assigned**: User ID ${item.assigned_to_id}`;
  }
  
  return itemInfo;
}).join('\n\n')}

**Summary Statistics**:
- **Total Items**: ${backlogItems.length}
- **Epics**: ${backlogItems.filter((item: any) => item.item_type === 'epic').length}
- **Stories**: ${backlogItems.filter((item: any) => item.item_type === 'story').length}
- **Bugs**: ${backlogItems.filter((item: any) => item.item_type === 'bug').length}
- **High Priority**: ${backlogItems.filter((item: any) => item.priority === 'high').length}
- **In Progress**: ${backlogItems.filter((item: any) => item.status === 'in_progress').length}
- **Done**: ${backlogItems.filter((item: any) => item.status === 'done').length}
- **Total Story Points**: ${backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0)}`;

      return summary;

    } catch (error) {
      console.error('Error in getBacklogItemsTool:', error);
      return `Failed to retrieve backlog items: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Collection of all backlog management tools
 * Export this to use in the Product Owner Agent
 */
export const backlogManagementTools = {
  createBacklogItem: createBacklogItemTool,
  getBacklogItems: getBacklogItemsTool
};

/**
 * Type definition for the tools object
 * This ensures type safety when using the tools in the AI agent
 */
export type BacklogManagementTools = typeof backlogManagementTools;
