/**
 * Semantic search utilities for documentation
 */

import { requestWithAuth, AuthContext } from '../http';
import { formatSimilarityScore } from '../formatting';

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
      `/documentations/${endpoint}`,
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
  query: string,
  field: string,
  similarityThreshold: number = 0.3,
  limit: number = 10,
  context: AuthContext
) {
  const searchData = {
    query,
    field,
    similarity_threshold: similarityThreshold,
    limit
  };

  const response = await documentationSearchWithAuth(searchData, 'search/field', context);
  
  if (response.error) {
    return response;
  }

  const formattedResults = formatDocumentationSearchResults(
    response.data || [], 
    query, 
    'field'
  );

  return { data: formattedResults };
}

/**
 * Search documentation across multiple fields
 */
export async function searchDocumentationMultiField(
  query: string,
  fields: string[] = ['title', 'description', 'content'],
  similarityThreshold: number = 0.3,
  limit: number = 10,
  context: AuthContext
) {
  const searchData = {
    query,
    fields,
    similarity_threshold: similarityThreshold,
    limit
  };

  const response = await documentationSearchWithAuth(searchData, 'search/multi-field', context);
  
  if (response.error) {
    return response;
  }

  const formattedResults = formatDocumentationSearchResults(
    response.data || [], 
    query, 
    'multi-field'
  );

  return { data: formattedResults };
}

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
