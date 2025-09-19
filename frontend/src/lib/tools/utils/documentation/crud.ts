/**
 * Documentation CRUD operations utilities
 * Refactored to use centralized schemas and provide comprehensive functionality
 */

import { tool } from 'ai';
import { requestWithAuth, AuthContext } from '../http';
import {
  createDocumentationSchema,
  getDocumentationSchema,
  getDocumentationByIdSchema,
  updateDocumentationSchema,
  deleteDocumentationSchema,
  getProjectUsersSchema,
  getCurrentUserSchema,
  DocumentationTypeEnum,
  type CreateDocumentationInput,
  type GetDocumentationInput,
  type GetDocumentationByIdInput,
  type UpdateDocumentationInput,
  type DeleteDocumentationInput,
  type GetProjectUsersInput,
  type GetCurrentUserInput
} from '../../schemas/documentation';

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
export async function createDocumentation(documentationData: CreateDocumentationInput, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall('', 'POST', context, documentationData);
}

/**
 * AI Tool for creating new documentation - Available to ALL agents
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

      const response = await createDocumentation(validated, experimental_context as AuthContext);

      if (response.error) {
        console.error('Documentation creation failed:', response.error);
        return `Failed to create documentation: ${response.error}`;
      }

      const doc = response.data as any;
      const typeDisplay = formatDocumentationType(doc.type);

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
 * Get documentation with optional filtering
 */
export async function getDocumentation(filters: GetDocumentationInput, context: AuthContext) {
  const queryParams = new URLSearchParams();
  
  if (filters.project_id) queryParams.append('project_id', filters.project_id.toString());
  if (filters.type) queryParams.append('type', filters.type);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.author_id) queryParams.append('author_id', filters.author_id.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.skip) queryParams.append('skip', filters.skip.toString());
  
  const endpoint = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return makeAuthenticatedDocumentationApiCall(endpoint, 'GET', context);
}

/**
 * AI Tool for retrieving and listing documentation
 */
export const getDocumentationTool = tool({
  description: `Retrieve and list documentation with filtering options. Use this to browse existing documentation, search by keywords, filter by type, or get documentation for specific projects.`,
  inputSchema: getDocumentationSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getDocumentationSchema.parse(input);
      
      console.log('Retrieving documentation:', validated);

      const response = await getDocumentation(validated, experimental_context as AuthContext);

      if (response.error) {
        console.error('Documentation retrieval failed:', response.error);
        return `Failed to retrieve documentation: ${response.error}`;
      }

      const docs = (response.data as any[]) || [];
      
      if (docs.length === 0) {
        let noResultsMsg = 'No documentation found';
        if (validated.search) noResultsMsg += ` for "${validated.search}"`;
        if (validated.type) noResultsMsg += ` of type "${validated.type}"`;
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
      const typeContext = validated.type ? ` of type "${validated.type}"` : '';
      const projectContext = validated.project_id ? ` in project #${validated.project_id}` : '';
      
      const formattedResults = `Found ${docs.length} documentation item${docs.length === 1 ? '' : 's'}${searchContext}${typeContext}${projectContext}:

${docs.map((doc: any, index: number) => createDocumentationSummary(doc, validated.skip + index + 1)).join('\n\n')}

**Query Summary**:
- **Results**: ${docs.length} documents (showing ${validated.skip + 1}-${validated.skip + docs.length})
${validated.search ? `- **Search**: "${validated.search}"` : ''}
${validated.type ? `- **Type Filter**: ${validated.type}` : ''}
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
 * Get documentation by ID
 */
export async function getDocumentationById(documentationId: number, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall(documentationId.toString(), 'GET', context);
}

/**
 * AI Tool for getting specific documentation by ID
 */
export const getDocumentationByIdTool = tool({
  description: `Get detailed information about a specific documentation item by its ID. This provides the full content, metadata, and all details about a single document.`,
  inputSchema: getDocumentationByIdSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = getDocumentationByIdSchema.parse(input);
      
      console.log('Getting documentation by ID:', validated.documentation_id);

      const response = await getDocumentationById(validated.documentation_id, experimental_context as AuthContext);

      if (response.error) {
        console.error('Documentation retrieval failed:', response.error);
        if (response.error.includes('404') || response.error.includes('not found')) {
          return `Documentation #${validated.documentation_id} not found. Please check the document ID and try again.`;
        }
        return `Failed to retrieve documentation #${validated.documentation_id}: ${response.error}`;
      }

      const doc = response.data as any;
      const typeDisplay = formatDocumentationType(doc.type);

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
 * Update existing documentation
 */
export async function updateDocumentation(documentationId: number, updateData: Omit<UpdateDocumentationInput, 'documentation_id'>, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall(documentationId.toString(), 'PUT', context, updateData);
}

/**
 * AI Tool for updating existing documentation
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

      // Remove documentation_id from the update payload
      const { documentation_id, ...updateData } = validated;

      const response = await updateDocumentation(documentation_id, updateData, experimental_context as AuthContext);

      if (response.error) {
        console.error('Documentation update failed:', response.error);
        if (response.error.includes('404') || response.error.includes('not found')) {
          return `Documentation #${documentation_id} not found. Please check the document ID and try again.`;
        }
        if (response.error.includes('title already')) {
          return `Failed to update documentation #${documentation_id}: A document with that title already exists. Please choose a different title.`;
        }
        return `Failed to update documentation #${documentation_id}: ${response.error}`;
      }

      const doc = response.data as any;
      const typeDisplay = formatDocumentationType(doc.type);

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
 * Delete documentation
 */
export async function deleteDocumentation(documentationId: number, context: AuthContext) {
  return makeAuthenticatedDocumentationApiCall(documentationId.toString(), 'DELETE', context);
}

/**
 * AI Tool for deleting documentation
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

To delete documentation #${validated.documentation_id}, you must set the confirm parameter to true.

**Warning**: This action cannot be undone. The document and all its content will be permanently removed.

Please confirm if you really want to delete this documentation.`;
      }

      console.log('Deleting documentation:', validated.documentation_id);

      const response = await deleteDocumentation(validated.documentation_id, experimental_context as AuthContext);

      if (response.error) {
        console.error('Documentation deletion failed:', response.error);
        if (response.error.includes('404') || response.error.includes('not found')) {
          return `Documentation #${validated.documentation_id} not found. It may have already been deleted.`;
        }
        return `Failed to delete documentation #${validated.documentation_id}: ${response.error}`;
      }

      return `✅ **Documentation Deleted Successfully!**

Documentation #${validated.documentation_id} has been permanently removed from the system.

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
export function createDocumentationSummary(doc: any, index?: number): string {
  const typeDisplay = formatDocumentationType(doc.type);
  const updatedDate = new Date(doc.updated_at).toLocaleDateString();
  
  let summary = index ? `${index}. **${typeDisplay}**: "${doc.title}"` : `**${typeDisplay}**: "${doc.title}"`;
  summary += `\n   - **Document ID**: #${doc.id}`;
  summary += `\n   - **Project**: #${doc.project_id}`;
  
  if (doc.description) {
    const shortDesc = doc.description.length > 150 ? 
      doc.description.substring(0, 150) + '...' : doc.description;
    summary += `\n   - **Description**: ${shortDesc}`;
  }
  
  if (doc.content) {
    const contentLength = doc.content.length;
    summary += `\n   - **Content**: ${contentLength} characters`;
  }
  
  if (doc.file_url) {
    summary += `\n   - **External File**: Available`;
  }
  
  if (doc.authors && doc.authors.length > 0) {
    const authorNames = doc.authors.map((author: any) => author.full_name || author.username).join(', ');
    summary += `\n   - **Authors**: ${authorNames}`;
  }
  
  summary += `\n   - **Updated**: ${updatedDate}`;
  
  return summary;
}

/**
 * Get documentation type options for display
 */
export function getDocumentationTypeOptions() {
  return DocumentationTypeEnum.options.map(type => ({
    value: type,
    label: formatDocumentationType(type)
  }));
}


