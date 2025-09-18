/**
 * User management utilities for documentation tools
 */

import { requestWithAuth, AuthContext } from '../http';

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
 * Get users associated with a project
 */
export async function getProjectUsers(projectId: number, context: AuthContext) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to getProjectUsers');
    return { error: 'Authentication context missing' };
  }

  try {
    const response = await requestWithAuth(`/projects/${projectId}/users`, { method: 'GET' }, context);
    
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
