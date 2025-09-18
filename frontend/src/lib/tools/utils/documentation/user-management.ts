/**
 * User management utilities for documentation tools
 * Refactored to use centralized schemas and provide comprehensive AI tools
 */

import { tool } from 'ai';
import { requestWithAuth, AuthContext } from '../http';
import {
  getProjectUsersSchema,
  getCurrentUserSchema,
  type GetProjectUsersInput,
  type GetCurrentUserInput
} from '../../schemas/documentation';

/**
 * Get current user information
 */
export async function getCurrentUser(context: AuthContext) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to getCurrentUser');
    return { error: 'Authentication context missing' };
  }

  try {
    const response = await requestWithAuth('/users/me', { method: 'GET' }, context);
    
    if (response.error) {
      return response;
    }

    return response;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * AI Tool for getting current user information
 */
export const getCurrentUserTool = tool({
  description: `Get information about the currently logged-in user. Use this when the user says "add me as author" or similar requests.`,
  inputSchema: getCurrentUserSchema,
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting current user info');

      const response = await getCurrentUser(experimental_context as AuthContext);

      if (response.error) {
        console.error('Current user retrieval failed:', response.error);
        return `Cannot get current user information: ${response.error}`;
      }

      const userData = response.data as any;
      
      if (!userData) {
        return `Unable to retrieve current user information. Please ensure you are logged in.`;
      }

      return `Current user information:
- **Name**: ${userData.full_name || userData.username || 'Not set'}
- **Email**: ${userData.email}
- **User ID**: ${userData.id}

You can add yourself as an author by using your name "${userData.full_name || userData.username}" or user ID ${userData.id}.`;

    } catch (error) {
      console.error('Error in getCurrentUserTool:', error);
      return `Failed to get current user information: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Get users associated with a project
 */
export async function getProjectUsers(input: GetProjectUsersInput, context: AuthContext) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to getProjectUsers');
    return { error: 'Authentication context missing' };
  }

  try {
    // If no project_id provided, we'll let the backend auto-detect from context
    const endpoint = input.project_id ? `/projects/${input.project_id}/users` : '/users/project';
    const queryParams = new URLSearchParams();
    
    if (input.search) {
      queryParams.append('search', input.search);
    }
    
    const url = queryParams.toString() ? `${endpoint}?${queryParams.toString()}` : endpoint;
    const response = await requestWithAuth(url, { method: 'GET' }, context);
    
    if (response.error) {
      return response;
    }

    return response;
  } catch (error) {
    console.error('Error in getProjectUsers:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * AI Tool for getting project users for author selection
 */
export const getProjectUsersTool = tool({
  description: `Get all users in a project for author selection. Use this to validate author names and get user IDs when adding authors to documentation.`,
  inputSchema: getProjectUsersSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getProjectUsersSchema.parse(input);
      
      console.log('Getting project users:', validated);

      const response = await getProjectUsers(validated, experimental_context as AuthContext);

      if (response.error) {
        console.error('Project users retrieval failed:', response.error);
        return `Failed to retrieve project users: ${response.error}`;
      }

      const users = (response.data as any[]) || [];
      
      if (users.length === 0) {
        return validated.project_id 
          ? `No users found in project #${validated.project_id}.`
          : 'No users found in the current project.';
      }

      console.log(`Found ${users.length} users in project`);

      const searchContext = validated.search ? ` matching "${validated.search}"` : '';
      const projectContext = validated.project_id ? ` in project #${validated.project_id}` : ' in current project';

      const formattedUsers = `Found ${users.length} user${users.length === 1 ? '' : 's'}${searchContext}${projectContext}:

${users.map((user: any, index: number) => {
  return `${index + 1}. **${user.full_name || user.username || user.email}** (ID: ${user.id})
   - **Email**: ${user.email}
   - **Role**: ${user.role || 'Member'}`;
}).join('\n\n')}

These users can be added as authors to documentation by using their names or user IDs.`;

      return formattedUsers;

    } catch (error) {
      console.error('Error in getProjectUsersTool:', error);
      return `Failed to get project users: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Find user by name in project users list
 */
export function findUserByName(users: any[], searchName: string): any | null {
  const normalizedSearch = searchName.toLowerCase().trim();
  
  return users.find(user => {
    const fullName = user.full_name?.toLowerCase() || '';
    const username = user.username?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    
    return fullName.includes(normalizedSearch) || 
           username.includes(normalizedSearch) || 
           email.includes(normalizedSearch) ||
           fullName === normalizedSearch ||
           username === normalizedSearch;
  }) || null;
}

/**
 * Find multiple users by names
 */
export function findUsersByNames(users: any[], searchNames: string[]): { found: any[], missing: string[] } {
  const found: any[] = [];
  const missing: string[] = [];
  
  for (const name of searchNames) {
    const user = findUserByName(users, name);
    if (user) {
      found.push(user);
    } else {
      missing.push(name);
    }
  }
  
  return { found, missing };
}

/**
 * Format user information for display
 */
export function formatUserInfo(user: any): string {
  const name = user.full_name || user.username || 'Unknown';
  const email = user.email ? ` (${user.email})` : '';
  return `${name}${email}`;
}

/**
 * Create user list for display
 */
export function formatUserList(users: any[]): string {
  if (users.length === 0) {
    return 'No users found.';
  }
  
  return users.map((user, index) => 
    `${index + 1}. ${formatUserInfo(user)} - ID: ${user.id}`
  ).join('\n');
}

/**
 * Validate author IDs exist in project users
 */
export function validateAuthorIds(authorIds: number[], projectUsers: any[]): { valid: number[], invalid: number[] } {
  const validUserIds = new Set(projectUsers.map(user => user.id));
  const valid: number[] = [];
  const invalid: number[] = [];
  
  for (const id of authorIds) {
    if (validUserIds.has(id)) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }
  
  return { valid, invalid };
}

/**
 * Parse author names from user input and resolve to user IDs
 */
export function parseAuthorNames(input: string): string[] {
  // Split by common delimiters and clean up
  return input
    .split(/[,;|&\n]/)
    .map(name => name.trim())
    .filter(name => name.length > 0);
}

/**
 * Resolve author names to user IDs with validation
 */
export function resolveAuthorNamesToIds(
  authorNames: string[], 
  projectUsers: any[]
): { 
  resolved: { name: string; user: any }[], 
  missing: string[] 
} {
  const resolved: { name: string; user: any }[] = [];
  const missing: string[] = [];
  
  for (const name of authorNames) {
    const user = findUserByName(projectUsers, name);
    if (user) {
      resolved.push({ name, user });
    } else {
      missing.push(name);
    }
  }
  
  return { resolved, missing };
}

/**
 * Create author suggestions for auto-complete
 */
export function createAuthorSuggestions(projectUsers: any[], query: string = ''): string[] {
  const queryLower = query.toLowerCase();
  
  return projectUsers
    .filter(user => {
      if (!query) return true;
      
      const fullName = user.full_name?.toLowerCase() || '';
      const username = user.username?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      
      return fullName.includes(queryLower) || 
             username.includes(queryLower) || 
             email.includes(queryLower);
    })
    .map(user => user.full_name || user.username || user.email)
    .filter(Boolean)
    .slice(0, 10); // Limit to 10 suggestions
}

/**
 * User management tools collection
 */
export const userManagementTools = {
  getCurrentUser: getCurrentUserTool,
  getProjectUsers: getProjectUsersTool
};

/**
 * Type definition for user management tools
 */
export type UserManagementTools = typeof userManagementTools;

