/**
 * Semantic search utilities for documentation
 * Refactored to use centralized schemas and provide comprehensive AI tools
 */

import { tool } from 'ai';
import { requestWithAuth, AuthContext } from '../http';
import { formatSimilarityScore } from '../formatting';
import {
  searchDocumentationByFieldSchema,
  searchDocumentationMultiFieldSchema,
  type SearchDocumentationByFieldInput,
  type SearchDocumentationMultiFieldInput
} from '../../schemas/documentation';

/**
 * Perform semantic search on documentation with authentication
 */
export async function documentationSearchWithAuth(
  searchData: any, 
  endpoint: string, 
  context: AuthContext
) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for documentation search');
    return { error: 'Authentication context missing' };
  }

  try {
    const response = await requestWithAuth(
      `/semantic-search/documentation/${endpoint}`,
      {
        method: 'POST',
        body: JSON.stringify(searchData),
      },
      context
    );

    if (response.error) {
      return response;
    }

    return response;
  } catch (error) {
    console.error('Error in documentationSearchWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Format documentation search results for display
 */
export function formatDocumentationSearchResults(
  results: any[], 
  query: string,
  searchType: 'field' | 'multi-field' = 'field'
): string {
  if (results.length === 0) {
    return `No documentation found matching "${query}".`;
  }

  const header = `Found ${results.length} document${results.length === 1 ? '' : 's'} for "${query}":`;
  
  const formattedResults = results.map((result: any, index: number) => {
    const doc = result.documentation;
    const typeDisplay = doc.type.replace('_', ' ').split(' ').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    let docInfo = `${index + 1}. **${typeDisplay}**: "${doc.title}"`;
    docInfo += `\n   - **Document ID**: #${doc.id}`;
    
    // Handle different search result formats
    if (searchType === 'multi-field' && result.similarity_scores) {
      const scores = result.similarity_scores;
      const maxScore = Math.max(...Object.values(scores).map(s => Number(s)));
      const bestField = Object.entries(scores).find(([_, score]) => Number(score) === maxScore)?.[0] || 'unknown';
      
      docInfo += `\n   - **Best Match**: ${formatSimilarityScore(maxScore)} in ${bestField}`;
      
      const scoreDetails = Object.entries(scores)
        .map(([field, score]) => `${field}: ${formatSimilarityScore(Number(score))}`)
        .join(' | ');
      docInfo += `\n   - **Field Scores**: ${scoreDetails}`;
    } else if (result.similarity_score) {
      const score = formatSimilarityScore(result.similarity_score);
      docInfo += `\n   - **Similarity**: ${score}`;
    }
    
    if (doc.description && doc.description.length > 0) {
      const shortDesc = doc.description.length > 150 ? 
        doc.description.substring(0, 150) + '...' : doc.description;
      docInfo += `\n   - **Description**: ${shortDesc}`;
    }
    
    if (doc.content && (searchType === 'field' || (result.similarity_scores?.content && Number(result.similarity_scores.content) > 0.7))) {
      const contentSnippet = doc.content.length > 200 ? 
        doc.content.substring(0, 200) + '...' : doc.content;
      docInfo += `\n   - **Content Preview**: ${contentSnippet}`;
    }
    
    if (doc.file_url) {
      docInfo += `\n   - **File**: Available`;
    }
    
    if (doc.authors && doc.authors.length > 0) {
      const authorNames = doc.authors.map((author: any) => author.full_name || author.username).join(', ');
      docInfo += `\n   - **Authors**: ${authorNames}`;
    }
    
    docInfo += `\n   - **Updated**: ${new Date(doc.updated_at).toLocaleDateString()}`;
    
    return docInfo;
  }).join('\n\n');

  return `${header}\n\n${formattedResults}`;
}

/**
 * Search documentation by specific field
 */
export async function searchDocumentationByField(
  searchInput: SearchDocumentationByFieldInput,
  context: AuthContext
) {
  const searchData = {
    query: searchInput.query,
    field: searchInput.field,
    project_id: searchInput.project_id,
    type: searchInput.type,
    limit: searchInput.limit
  };

  const response = await documentationSearchWithAuth(searchData, 'field-search', context);
  
  if (response.error) {
    return response;
  }

  const formattedResults = formatDocumentationSearchResults(
    Array.isArray(response.data) ? response.data : [], 
    searchInput.query, 
    'field'
  );

  return { data: formattedResults };
}

/**
 * AI Tool for targeted semantic search in specific documentation fields
 */
export const searchDocumentationByFieldTool = tool({
  description: `Search documentation in a specific field using semantic understanding.
    Choose the field based on what you're looking for:
    - 'title': Find documents by their titles and document types
    - 'description': Search document summaries and overviews  
    - 'content': Search within the full document content and details
    This focused approach gives more precise results than searching all fields.`,
  inputSchema: searchDocumentationByFieldSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = searchDocumentationByFieldSchema.parse(input);
      
      console.log('Searching documentation by field:', validated);

      const response = await searchDocumentationByField(validated, experimental_context as AuthContext);

      if (response.error) {
        console.error('Documentation field search failed:', response.error);
        return `Documentation search failed: ${response.error}`;
      }

      return response.data;

    } catch (error) {
      console.error('Error in searchDocumentationByFieldTool:', error);
      return `Failed to search documentation: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Search documentation across multiple fields
 */
export async function searchDocumentationMultiField(
  searchInput: SearchDocumentationMultiFieldInput,
  context: AuthContext
) {
  const searchData = {
    query: searchInput.query,
    project_id: searchInput.project_id,
    type: searchInput.type,
    limit: searchInput.limit
  };

  const response = await documentationSearchWithAuth(searchData, 'multi-field-search', context);
  
  if (response.error) {
    return response;
  }

  const formattedResults = formatDocumentationSearchResults(
    Array.isArray(response.data) ? response.data : [], 
    searchInput.query, 
    'multi-field'
  );

  return { data: formattedResults };
}

/**
 * AI Tool for comprehensive multi-field documentation search
 */
export const searchDocumentationMultiFieldTool = tool({
  description: `Perform comprehensive semantic search across multiple documentation fields.
    This tool searches across title, description, and content fields simultaneously,
    providing detailed similarity scores for each field. Perfect for thorough documentation
    discovery when you want to find all relevant documents regardless of where the information appears.`,
  inputSchema: searchDocumentationMultiFieldSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = searchDocumentationMultiFieldSchema.parse(input);
      
      console.log('Multi-field documentation search:', validated);

      const response = await searchDocumentationMultiField(validated, experimental_context as AuthContext);

      if (response.error) {
        console.error('Multi-field documentation search failed:', response.error);
        return `Multi-field documentation search failed: ${response.error}`;
      }

      return response.data;

    } catch (error) {
      console.error('Error in searchDocumentationMultiFieldTool:', error);
      return `Failed to perform multi-field search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Get search suggestions based on query
 */
export function getSearchSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  
  // Common documentation-related terms
  const commonTerms = [
    'requirements', 'specification', 'architecture', 'design',
    'meeting', 'retrospective', 'review', 'user guide',
    'api', 'technical', 'implementation', 'process'
  ];
  
  const queryLower = query.toLowerCase();
  
  // Find related terms
  commonTerms.forEach(term => {
    if (term.includes(queryLower) || queryLower.includes(term)) {
      suggestions.push(term);
    }
  });
  
  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

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


