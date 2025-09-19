/**
 * Semantic Documentation Search Tools for Product Owner Agent
 * These tools leverage pgvector embeddings for intelligent documentation search
 * across title, description, and content fields
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function for documentation search API calls with authentication
 */
async function documentationSearchWithAuth(searchData: any, endpoint: string, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for documentation search');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/semantic-search/documentation/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(searchData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error(`Error in documentation search (${endpoint}):`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Schema for field-specific documentation search
 */
const fieldSpecificDocSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Natural language search query for documentation'),
  
  field: z.enum(['title', 'description', 'content'])
    .describe('Specific field to search in: title (document titles), description (summaries), or content (full document text)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Optional project ID to limit search scope'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.7)
    .describe('Minimum semantic similarity score (0-1, default: 0.7)')
});

/**
 * Tool for targeted semantic search in specific documentation fields
 */
export const searchDocumentationByFieldTool = tool({
  description: `Search documentation in a specific field using semantic understanding.
    Choose the field based on what you're looking for:
    - 'title': Find documents by their titles and document types
    - 'description': Search document summaries and overviews  
    - 'content': Search within the full document content and details
    This focused approach gives more precise results than searching all fields.`,
  inputSchema: fieldSpecificDocSearchSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = fieldSpecificDocSearchSchema.parse(input);
      
      console.log('Searching documentation by field:', validated);

      const response = await documentationSearchWithAuth(validated, 'field-search', experimental_context);

      if (response.error) {
        console.error('Documentation field search failed:', response.error);
        return `Documentation search failed: ${response.error}`;
      }

      const results = response.data || [];
      
      if (results.length === 0) {
        const fieldDescription = {
          title: 'document titles and types',
          description: 'document descriptions and summaries',
          content: 'document content and full text'
        };
        
        return `No documentation found in ${fieldDescription[validated.field]} for "${validated.query}" with similarity threshold ${validated.similarity_threshold}.
        
Try:
- Lowering the similarity threshold (e.g., 0.5 or 0.6)
- Searching in a different field (title, description, or content)
- Using broader search terms`;
      }

      console.log(`Found ${results.length} documents in ${validated.field} field`);

      // Format results with field-specific context
      const fieldDisplayName = validated.field.charAt(0).toUpperCase() + validated.field.slice(1);
      const formattedResults = `Found ${results.length} document${results.length === 1 ? '' : 's'} in **${fieldDisplayName}** field for "${validated.query}":

${results.map((result: any, index: number) => {
  const doc = result.documentation;
  const score = (result.similarity_score * 100).toFixed(1);
  const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  let docInfo = `${index + 1}. **${typeDisplay}** (${score}% match): "${doc.title}"
   - **Document ID**: #${doc.id}
   - **Type**: ${typeDisplay}`;
  
  if (doc.description && doc.description.length > 0) {
    const shortDesc = doc.description.length > 150 ? doc.description.substring(0, 150) + '...' : doc.description;
    docInfo += `\n   - **Description**: ${shortDesc}`;
  }
  
  if (validated.field === 'content' && doc.content) {
    // Show a snippet of the content for content searches
    const contentSnippet = doc.content.length > 200 ? doc.content.substring(0, 200) + '...' : doc.content;
    docInfo += `\n   - **Content Preview**: ${contentSnippet}`;
  }
  
  if (doc.file_url) {
    docInfo += `\n   - **File**: Available`;
  }
  
  docInfo += `\n   - **Updated**: ${new Date(doc.updated_at).toLocaleDateString()}`;
  
  return docInfo;
}).join('\n\n')}

**Search Details**:
- **Field Searched**: ${fieldDisplayName}
- **Query**: "${validated.query}"
- **Similarity Threshold**: ${(validated.similarity_threshold * 100).toFixed(0)}%
- **Best Match**: ${(results[0].similarity_score * 100).toFixed(1)}% similarity

This targeted search focused specifically on the ${validated.field} field of documents, providing more precise results for your query.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in searchDocumentationByFieldTool:', error);
      return `Failed to search documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for multi-field documentation search
 */
const multiFieldDocSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Natural language search query for comprehensive documentation search'),
  
  fields: z.array(z.enum(['title', 'description', 'content']))
    .min(1, 'At least one field must be specified')
    .default(['title', 'description', 'content'])
    .describe('Fields to search across: title, description, and/or content'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Optional project ID to limit search scope'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(15)
    .describe('Maximum number of results to return (default: 15)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.6)
    .describe('Minimum semantic similarity score (0-1, default: 0.6)')
});

/**
 * Tool for comprehensive multi-field documentation search
 */
export const searchDocumentationMultiFieldTool = tool({
  description: `Perform comprehensive semantic search across multiple documentation fields.
    This tool searches across title, description, and content fields simultaneously,
    providing detailed similarity scores for each field. Perfect for thorough documentation
    discovery when you want to find all relevant documents regardless of where the information appears.`,
  inputSchema: multiFieldDocSearchSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = multiFieldDocSearchSchema.parse(input);
      
      console.log('Multi-field documentation search:', validated);

      const response = await documentationSearchWithAuth(validated, 'multi-field-search', experimental_context);

      if (response.error) {
        console.error('Multi-field documentation search failed:', response.error);
        return `Multi-field documentation search failed: ${response.error}`;
      }

      const results = response.data || [];
      
      if (results.length === 0) {
        const fieldsText = validated.fields.join(', ');
        return `No documentation found across fields [${fieldsText}] for "${validated.query}" with similarity threshold ${validated.similarity_threshold}.
        
Try:
- Lowering the similarity threshold (e.g., 0.4 or 0.5)
- Using different search terms
- Searching in specific fields individually`;
      }

      console.log(`Found ${results.length} documents across multiple fields`);

      // Format results with field-specific scores
      const formattedResults = `Found ${results.length} document${results.length === 1 ? '' : 's'} across multiple fields for "${validated.query}":

${results.map((result: any, index: number) => {
  const doc = result.documentation;
  const scores = result.similarity_scores;
  const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  // Find the highest scoring field
  const maxScore = Math.max(...Object.values(scores).map(s => Number(s)));
  const bestField = Object.entries(scores).find(([_, score]) => Number(score) === maxScore)?.[0] || 'unknown';
  
  let docInfo = `${index + 1}. **${typeDisplay}** (best: ${(maxScore * 100).toFixed(1)}% in ${bestField}): "${doc.title}"
   - **Document ID**: #${doc.id}`;
  
  // Show field-specific scores
  const scoreDetails = Object.entries(scores)
    .map(([field, score]) => `${field}: ${(Number(score) * 100).toFixed(1)}%`)
    .join(' | ');
  docInfo += `\n   - **Field Scores**: ${scoreDetails}`;
  
  if (doc.description && doc.description.length > 0) {
    const shortDesc = doc.description.length > 120 ? doc.description.substring(0, 120) + '...' : doc.description;
    docInfo += `\n   - **Description**: ${shortDesc}`;
  }
  
  // Show content preview if content had a high score
  if (scores.content && Number(scores.content) > 0.7 && doc.content) {
    const contentSnippet = doc.content.length > 150 ? doc.content.substring(0, 150) + '...' : doc.content;
    docInfo += `\n   - **Relevant Content**: ${contentSnippet}`;
  }
  
  if (doc.file_url) {
    docInfo += `\n   - **File**: Available`;
  }
  
  docInfo += `\n   - **Updated**: ${new Date(doc.updated_at).toLocaleDateString()}`;
  
  return docInfo;
}).join('\n\n')}

**Multi-Field Search Analysis**:
- **Query**: "${validated.query}"
- **Fields Searched**: ${validated.fields.join(', ')}
- **Similarity Threshold**: ${(validated.similarity_threshold * 100).toFixed(0)}%
- **Results Ranked By**: Highest field-specific similarity score

**Field Score Legend**:
- **title**: Match in document title/type
- **description**: Match in document summary
- **content**: Match in full document content

This comprehensive search provides the most thorough coverage of your documentation, with detailed insights into where matches were found.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in searchDocumentationMultiFieldTool:', error);
      return `Failed to perform multi-field search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Enhanced semantic documentation search tools collection
 */
export const semanticDocumentationTools = {
  searchDocumentationByField: searchDocumentationByFieldTool,
  searchDocumentationMultiField: searchDocumentationMultiFieldTool
};

/**
 * Type definition for semantic documentation tools
 */
export type SemanticDocumentationTools = typeof semanticDocumentationTools;
