/**
 * Documentation CRUD operations utilities
 */

import { requestWithAuth, AuthContext } from '../http';

/**
 * Helper function for authenticated API calls to documentation endpoints
 */
export async function makeAuthenticatedDocumentationApiCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  context: AuthContext,
  body?: any
) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for documentation API call');
    return { error: 'Authentication context missing' };
  }

  try {
    const url = `/documentations${endpoint ? `/${endpoint}` : ''}`;
    console.log(`Documentation API call: ${method} ${url}`);
    
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestInit.body = JSON.stringify(body);
      console.log('Request body:', JSON.stringify(body, null, 2));
    }

    const response = await requestWithAuth(url, requestInit, context);
    
    if (response.error) {
      return response;
    }

    // Handle DELETE responses (may not have JSON body)
    if (method === 'DELETE') {
      return { data: { success: true } };
    }

    return response;
  } catch (error) {
    console.error(`Error in documentation API call (${method} ${endpoint}):`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Create a new documentation entry
 */
export async function createDocumentation(documentationData: any, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall('', 'POST', context, documentationData);
}

/**
 * Get documentation with optional filtering
 */
export async function getDocumentation(filters: any, context: AuthContext) {
  const queryParams = new URLSearchParams();
  
  if (filters.project_id) queryParams.append('project_id', filters.project_id.toString());
  if (filters.type) queryParams.append('type', filters.type);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.skip) queryParams.append('skip', filters.skip.toString());
  
  const endpoint = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return makeAuthenticatedDocumentationApiCall(endpoint, 'GET', context);
}

/**
 * Get documentation by ID
 */
export async function getDocumentationById(documentationId: number, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall(documentationId.toString(), 'GET', context);
}

/**
 * Update existing documentation
 */
export async function updateDocumentation(documentationId: number, updateData: any, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall(documentationId.toString(), 'PUT', context, updateData);
}

/**
 * Delete documentation
 */
export async function deleteDocumentation(documentationId: number, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall(documentationId.toString(), 'DELETE', context);
}

/**
 * Format documentation type for display
 */
export function formatDocumentationType(type: string): string {
  return type.replace('_', ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

/**
 * Create documentation summary for display
 */
export function createDocumentationSummary(doc: any): string {
  const typeDisplay = formatDocumentationType(doc.type);
  const updatedDate = new Date(doc.updated_at).toLocaleDateString();
  
  let summary = `**${typeDisplay}** #${doc.id}: "${doc.title}"`;
  
  if (doc.description) {
    const shortDesc = doc.description.length > 100 ? 
      doc.description.substring(0, 100) + '...' : doc.description;
    summary += `\n   - **Description**: ${shortDesc}`;
  }
  
  if (doc.file_url) {
    summary += `\n   - **File**: Available`;
  }
  
  if (doc.authors && doc.authors.length > 0) {
    const authorNames = doc.authors.map((author: any) => author.full_name || author.username).join(', ');
    summary += `\n   - **Authors**: ${authorNames}`;
  }
  
  summary += `\n   - **Updated**: ${updatedDate}`;
  
  return summary;
}
