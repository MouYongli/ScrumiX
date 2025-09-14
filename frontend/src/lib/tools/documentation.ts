/**
 * Comprehensive Documentation Tools for ScrumiX AI Agents
 * All agents can create any type of documentation
 * Combines CRUD operations with semantic search capabilities
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function for authenticated API calls to documentation endpoints
 */
async function makeAuthenticatedDocumentationApiCall(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  context: any,
  body?: any
) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for documentation API call');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const url = `${baseUrl}/documentations${endpoint ? `/${endpoint}` : ''}`;
    
    console.log(`Documentation API call: ${method} ${url}`);
    
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      requestInit.body = JSON.stringify(body);
      console.log('Request body:', JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, requestInit);
    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    // Handle DELETE responses (may not have JSON body)
    if (method === 'DELETE') {
      return { data: { success: true } };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Error in documentation API call (${method} ${endpoint}):`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Documentation type enum for validation - matches backend DocumentationType
 */
const DocumentationTypeEnum = z.enum([
  'sprint_review',
  'sprint_retrospective',
  'requirement',
  'design_architecture',
  'meeting_report',
  'user_guide',
  'other'
]);

/**
 * Schema for creating new documentation
 */
const createDocumentationSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be 500 characters or less')
    .describe('Document title (must be unique)'),
  
  type: DocumentationTypeEnum
    .describe('Documentation type: sprint_review, sprint_retrospective, requirement, design_architecture, meeting_report, user_guide, or other'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .describe('Optional brief description or summary of the document'),
  
  content: z.string()
    .optional()
    .describe('Full document content in markdown format'),
  
  file_url: z.string()
    .url('Must be a valid URL')
    .optional()
    .describe('Optional URL to external file or document'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('ID of the project this documentation belongs to'),
  
  author_ids: z.array(z.number().int().positive())
    .optional()
    .describe('Optional array of user IDs who are authors of this document')
});

/**
 * Tool for creating new documentation - Available to ALL agents
 */
export const createDocumentationTool = tool({
  description: `Create new documentation for a project. ALL AGENTS can create ANY type of documentation including sprint reviews, sprint retrospectives, requirements, design & architecture specs, meeting reports, and user guides. The document will automatically get semantic embeddings generated for intelligent search. 

AUTHOR MANAGEMENT:
- If user says "add me as author" or "make me the author", first use getCurrentUser to get their user ID, then include it in author_ids
- If user mentions specific names, use getProjectUsers to find matching users and validate they exist in the project
- If a name doesn't exist in the project, inform the user and suggest available users
- author_ids should contain user IDs (numbers), not names`,
  inputSchema: createDocumentationSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = createDocumentationSchema.parse(input);
      
      console.log('Creating documentation:', validated);

      const response = await makeAuthenticatedDocumentationApiCall('', 'POST', experimental_context, validated);

      if (response.error) {
        console.error('Documentation creation failed:', response.error);
        return `Failed to create documentation: ${response.error}`;
      }

      const doc = response.data;
      const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      return `✅ **Documentation Created Successfully!**

**"${doc.title}"** has been created as ${typeDisplay} documentation.

📋 **Document Details:**
- **Document ID**: #${doc.id}
- **Type**: ${typeDisplay}
- **Project ID**: ${doc.project_id}
${doc.description ? `- **Description**: ${doc.description}` : ''}
${doc.file_url ? `- **External File**: Available` : ''}
${doc.content ? `- **Content Length**: ${doc.content.length} characters` : ''}
- **Created**: ${new Date(doc.created_at).toLocaleString()}

🔍 **Semantic Search**: Document embeddings will be generated automatically for intelligent search across title, description, and content.

${doc.author_ids && doc.author_ids.length > 0 ? `👥 **Authors**: ${doc.author_ids.length} author(s) assigned` : ''}

The documentation is now available for the project team and can be found using semantic search tools.`;

    } catch (error) {
      console.error('Error in createDocumentationTool:', error);
      return `Failed to create documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for retrieving documentation
 */
const getDocumentationSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Optional project ID to filter documentation'),
  
  doc_type: DocumentationTypeEnum
    .optional()
    .describe('Optional filter by documentation type'),
  
  search: z.string()
    .max(500, 'Search term must be 500 characters or less')
    .optional()
    .describe('Optional search term for title and description'),
  
  skip: z.number()
    .int('Skip must be a whole number')
    .min(0, 'Skip must be 0 or greater')
    .default(0)
    .describe('Number of records to skip for pagination'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20)
    .describe('Maximum number of records to return')
});

/**
 * Tool for retrieving and listing documentation
 */
export const getDocumentationTool = tool({
  description: `Retrieve and list documentation with filtering options. Use this to browse existing documentation, search by keywords, filter by type, or get documentation for specific projects.`,
  inputSchema: getDocumentationSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getDocumentationSchema.parse(input);
      
      console.log('Retrieving documentation:', validated);

      // Build query parameters
      const params = new URLSearchParams();
      if (validated.skip > 0) params.append('skip', validated.skip.toString());
      if (validated.limit !== 20) params.append('limit', validated.limit.toString());
      if (validated.doc_type) params.append('doc_type', validated.doc_type);
      if (validated.search) params.append('search', validated.search);
      if (validated.project_id) params.append('project_id', validated.project_id.toString());

      const endpoint = params.toString() ? `?${params.toString()}` : '';
      const response = await makeAuthenticatedDocumentationApiCall(endpoint, 'GET', experimental_context);

      if (response.error) {
        console.error('Documentation retrieval failed:', response.error);
        return `Failed to retrieve documentation: ${response.error}`;
      }

      const docs = response.data || [];
      
      if (docs.length === 0) {
        let noResultsMsg = 'No documentation found';
        if (validated.search) noResultsMsg += ` for "${validated.search}"`;
        if (validated.doc_type) noResultsMsg += ` of type "${validated.doc_type}"`;
        if (validated.project_id) noResultsMsg += ` in project #${validated.project_id}`;
        
        return `${noResultsMsg}.

Try:
- Removing filters to see all documentation
- Using semantic search tools for concept-based discovery
- Checking different documentation types
- Searching in a different project`;
      }

      console.log(`Found ${docs.length} documentation items`);

      // Format results
      const searchContext = validated.search ? ` matching "${validated.search}"` : '';
      const typeContext = validated.doc_type ? ` of type "${validated.doc_type}"` : '';
      const projectContext = validated.project_id ? ` in project #${validated.project_id}` : '';
      
      const formattedResults = `Found ${docs.length} documentation item${docs.length === 1 ? '' : 's'}${searchContext}${typeContext}${projectContext}:

${docs.map((doc: any, index: number) => {
  const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  let docInfo = `${validated.skip + index + 1}. **${typeDisplay}**: "${doc.title}"
   - **Document ID**: #${doc.id}
   - **Project**: #${doc.project_id}`;
  
  if (doc.description && doc.description.length > 0) {
    const shortDesc = doc.description.length > 150 ? doc.description.substring(0, 150) + '...' : doc.description;
    docInfo += `\n   - **Description**: ${shortDesc}`;
  }
  
  if (doc.content) {
    const contentLength = doc.content.length;
    docInfo += `\n   - **Content**: ${contentLength} characters`;
  }
  
  if (doc.file_url) {
    docInfo += `\n   - **External File**: Available`;
  }
  
  docInfo += `\n   - **Updated**: ${new Date(doc.updated_at).toLocaleDateString()}`;
  
  return docInfo;
}).join('\n\n')}

**Query Summary**:
- **Results**: ${docs.length} documents (showing ${validated.skip + 1}-${validated.skip + docs.length})
${validated.search ? `- **Search**: "${validated.search}"` : ''}
${validated.doc_type ? `- **Type Filter**: ${validated.doc_type}` : ''}
${validated.project_id ? `- **Project**: #${validated.project_id}` : ''}

Use semantic search tools for concept-based discovery or get specific documents by ID for detailed content.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in getDocumentationTool:', error);
      return `Failed to retrieve documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for getting specific documentation by ID
 */
const getDocumentationByIdSchema = z.object({
  doc_id: z.number()
    .int('Document ID must be a whole number')
    .positive('Document ID must be a positive integer')
    .describe('ID of the documentation to retrieve')
});

/**
 * Tool for getting specific documentation by ID
 */
export const getDocumentationByIdTool = tool({
  description: `Get detailed information about a specific documentation item by its ID. This provides the full content, metadata, and all details about a single document.`,
  inputSchema: getDocumentationByIdSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getDocumentationByIdSchema.parse(input);
      
      console.log('Getting documentation by ID:', validated.doc_id);

      const response = await makeAuthenticatedDocumentationApiCall(validated.doc_id.toString(), 'GET', experimental_context);

      if (response.error) {
        console.error('Documentation retrieval failed:', response.error);
        if (response.error.includes('404') || response.error.includes('not found')) {
          return `Documentation #${validated.doc_id} not found. Please check the document ID and try again.`;
        }
        return `Failed to retrieve documentation #${validated.doc_id}: ${response.error}`;
      }

      const doc = response.data;
      const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      let docDetails = `📄 **${typeDisplay}**: "${doc.title}"

**Document Information:**
- **Document ID**: #${doc.id}
- **Type**: ${typeDisplay}
- **Project**: #${doc.project_id}
- **Created**: ${new Date(doc.created_at).toLocaleString()}
- **Last Updated**: ${new Date(doc.updated_at).toLocaleString()}`;

      if (doc.description && doc.description.length > 0) {
        docDetails += `\n\n**Description:**\n${doc.description}`;
      }

      if (doc.content && doc.content.length > 0) {
        const contentPreview = doc.content.length > 1000 ? doc.content.substring(0, 1000) + '\n\n...(content truncated)' : doc.content;
        docDetails += `\n\n**Content:**\n${contentPreview}`;
      }

      if (doc.file_url) {
        docDetails += `\n\n**External File:** ${doc.file_url}`;
      }

      // Show embedding status
      if (doc.embedding_updated_at) {
        docDetails += `\n\n**Semantic Search**: ✅ Embeddings available (updated ${new Date(doc.embedding_updated_at).toLocaleDateString()})`;
      } else {
        docDetails += `\n\n**Semantic Search**: ⏳ Embeddings being generated...`;
      }

      return docDetails;

    } catch (error) {
      console.error('Error in getDocumentationByIdTool:', error);
      return `Failed to retrieve documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for updating documentation
 */
const updateDocumentationSchema = z.object({
  doc_id: z.number()
    .int('Document ID must be a whole number')
    .positive('Document ID must be a positive integer')
    .describe('ID of the documentation to update'),
  
  title: z.string()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('New title for the document'),
  
  type: DocumentationTypeEnum
    .optional()
    .describe('New documentation type'),
  
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .describe('New description or summary'),
  
  content: z.string()
    .optional()
    .describe('New document content in markdown format'),
  
  file_url: z.string()
    .url('Must be a valid URL')
    .optional()
    .describe('New URL to external file or document'),
  
  author_ids: z.array(z.number().int().positive())
    .optional()
    .describe('New array of user IDs who are authors of this document')
});

/**
 * Tool for updating existing documentation
 */
export const updateDocumentationTool = tool({
  description: `Update existing documentation. You can modify the title, type, description, content, file URL, or authors. Only provide the fields you want to change. Semantic embeddings will be automatically regenerated after updates.

AUTHOR MANAGEMENT:
- If user says "add me as author", first use getCurrentUser to get their user ID, then include it in author_ids along with existing authors
- If user mentions adding specific names, use getProjectUsers to validate they exist in the project
- If a name doesn't exist in the project, inform the user and suggest available users
- author_ids should contain user IDs (numbers), not names
- When updating authors, include ALL desired author IDs (existing + new), as this replaces the entire author list`,
  inputSchema: updateDocumentationSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = updateDocumentationSchema.parse(input);
      
      console.log('Updating documentation:', validated);

      // Remove doc_id from the update payload
      const { doc_id, ...updateData } = validated;

      const response = await makeAuthenticatedDocumentationApiCall(doc_id.toString(), 'PUT', experimental_context, updateData);

      if (response.error) {
        console.error('Documentation update failed:', response.error);
        if (response.error.includes('404') || response.error.includes('not found')) {
          return `Documentation #${doc_id} not found. Please check the document ID and try again.`;
        }
        if (response.error.includes('title already')) {
          return `Failed to update documentation #${doc_id}: A document with that title already exists. Please choose a different title.`;
        }
        return `Failed to update documentation #${doc_id}: ${response.error}`;
      }

      const doc = response.data;
      const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      // List what was updated
      const updatedFields = Object.keys(updateData).filter(key => updateData[key as keyof typeof updateData] !== undefined);
      const fieldsList = updatedFields.map(field => {
        switch (field) {
          case 'author_ids': return 'authors';
          case 'file_url': return 'external file URL';
          default: return field;
        }
      }).join(', ');

      return `✅ **Documentation Updated Successfully!**

**"${doc.title}"** (#${doc.id}) has been updated.

📋 **Updated Fields**: ${fieldsList}

**Current Document Details:**
- **Type**: ${typeDisplay}
- **Project**: #${doc.project_id}
${doc.description ? `- **Description**: ${doc.description.length > 150 ? doc.description.substring(0, 150) + '...' : doc.description}` : ''}
${doc.content ? `- **Content Length**: ${doc.content.length} characters` : ''}
${doc.file_url ? `- **External File**: Available` : ''}
- **Last Updated**: ${new Date(doc.updated_at).toLocaleString()}

🔍 **Semantic Search**: Document embeddings will be automatically regenerated to reflect the changes.

The updated documentation is now available for the project team.`;

    } catch (error) {
      console.error('Error in updateDocumentationTool:', error);
      return `Failed to update documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for deleting documentation
 */
const deleteDocumentationSchema = z.object({
  doc_id: z.number()
    .int('Document ID must be a whole number')
    .positive('Document ID must be a positive integer')
    .describe('ID of the documentation to delete'),
  
  confirm: z.boolean()
    .default(false)
    .describe('Confirmation flag - must be true to actually delete the document')
});

/**
 * Tool for deleting documentation
 */
export const deleteDocumentationTool = tool({
  description: `Delete documentation permanently. This action cannot be undone. The confirm parameter must be set to true to actually delete the document. Use with caution.

SAFETY MEASURES:
- Always ask for user confirmation before deleting
- Explain that deletion is permanent and cannot be undone
- Show document details before deletion to ensure it's the correct document
- Require confirm=true parameter to proceed with deletion`,
  inputSchema: deleteDocumentationSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = deleteDocumentationSchema.parse(input);
      
      if (!validated.confirm) {
        return `⚠️ **Deletion Not Confirmed**

To delete documentation #${validated.doc_id}, you must set the confirm parameter to true.

**Warning**: This action cannot be undone. The document and all its content will be permanently removed.

Please confirm if you really want to delete this documentation.`;
      }

      console.log('Deleting documentation:', validated.doc_id);

      const response = await makeAuthenticatedDocumentationApiCall(validated.doc_id.toString(), 'DELETE', experimental_context);

      if (response.error) {
        console.error('Documentation deletion failed:', response.error);
        if (response.error.includes('404') || response.error.includes('not found')) {
          return `Documentation #${validated.doc_id} not found. It may have already been deleted.`;
        }
        return `Failed to delete documentation #${validated.doc_id}: ${response.error}`;
      }

      return `✅ **Documentation Deleted Successfully!**

Documentation #${validated.doc_id} has been permanently removed from the system.

🗑️ **What was deleted:**
- Document content and metadata
- Semantic search embeddings
- Author associations
- Tag relationships

The documentation is no longer available to the project team and cannot be recovered.`;

    } catch (error) {
      console.error('Error in deleteDocumentationTool:', error);
      return `Failed to delete documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for getting project users
 */
const getProjectUsersSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('ID of the project to get users for')
});

/**
 * Tool for getting project users for author selection
 */
export const getProjectUsersTool = tool({
  description: `Get all users in a project for author selection. Use this to validate author names and get user IDs when adding authors to documentation.`,
  inputSchema: getProjectUsersSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getProjectUsersSchema.parse(input);
      
      console.log('Getting project users:', validated.project_id);

      const response = await makeAuthenticatedDocumentationApiCall(`project/${validated.project_id}/users`, 'GET', experimental_context);

      if (response.error) {
        console.error('Project users retrieval failed:', response.error);
        return `Failed to retrieve project users: ${response.error}`;
      }

      const users = response.data || [];
      
      if (users.length === 0) {
        return `No users found in project #${validated.project_id}.`;
      }

      console.log(`Found ${users.length} users in project`);

      const formattedUsers = `Found ${users.length} user${users.length === 1 ? '' : 's'} in project #${validated.project_id}:

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
 * Schema for getting current user info
 */
const getCurrentUserSchema = z.object({
  get_info: z.boolean().default(true).describe('Flag to get current user information')
});

/**
 * Tool for getting current user information
 */
export const getCurrentUserTool = tool({
  description: `Get information about the currently logged-in user. Use this when the user says "add me as author" or similar requests.`,
  inputSchema: getCurrentUserSchema,
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Getting current user info');

      // Make a call to get current user - we can use any authenticated endpoint that returns user info
      // Let's use a simple documentation query which will include user context in error messages
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
      const cookies = (experimental_context as any)?.cookies;
      
      if (!cookies) {
        return `Cannot get current user information: No authentication context available.`;
      }

      try {
        // Make a simple request to get user context - we'll parse it from the response or error
        const response = await fetch(`${baseUrl}/users/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          return `Current user information:
- **Name**: ${userData.full_name || userData.username || 'Not set'}
- **Email**: ${userData.email}
- **User ID**: ${userData.id}

You can add yourself as an author by using your name "${userData.full_name || userData.username}" or user ID ${userData.id}.`;
        } else {
          return `Unable to retrieve current user information. Please ensure you are logged in.`;
        }
      } catch (error) {
        return `Failed to get current user information: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
      }

    } catch (error) {
      console.error('Error in getCurrentUserTool:', error);
      return `Failed to get current user information: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

// Import semantic search tools from existing file
import { semanticDocumentationTools } from './semantic-documentation-search';

/**
 * Complete documentation toolkit - ALL AGENTS GET THE SAME TOOLS
 * Every agent can create any type of documentation
 */
export const documentationTools = {
  // CRUD Operations - Available to ALL agents
  createDocumentation: createDocumentationTool,
  getDocumentation: getDocumentationTool,
  getDocumentationById: getDocumentationByIdTool,
  updateDocumentation: updateDocumentationTool,
  deleteDocumentation: deleteDocumentationTool,
  
  // User Management Operations - Available to ALL agents
  getProjectUsers: getProjectUsersTool,
  getCurrentUser: getCurrentUserTool,
  
  // Semantic Search Operations - Available to ALL agents
  searchDocumentationByField: semanticDocumentationTools.searchDocumentationByField,
  searchDocumentationMultiField: semanticDocumentationTools.searchDocumentationMultiField
};

/**
 * Type definition
 */
export type DocumentationTools = typeof documentationTools;
