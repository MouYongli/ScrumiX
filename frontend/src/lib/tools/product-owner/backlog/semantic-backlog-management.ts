/**
 * Semantic Backlog Management Tools for Product Owner Agent
 * These tools provide AI-powered semantic search and similarity matching for backlog items
 * Built on top of pgvector semantic search infrastructure
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestWithAuth, type AuthContext } from '../../utils/http';

// Schema for semantic search of backlog items
const semanticSearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .describe('Natural language search query to find relevant backlog items'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Project ID to scope the search (auto-detected if not provided)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10)')
});

// Schema for BM25 (keyword-based) search of backlog items
const bm25SearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .describe('Keyword-based search query to find relevant backlog items'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Project ID to scope the search (auto-detected if not provided)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10)')
});

// Schema for hybrid search combining semantic and keyword approaches
const hybridSearchBacklogSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .describe('Search query combining semantic and keyword matching'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Project ID to scope the search (auto-detected if not provided)'),
  
  semantic_weight: z.number()
    .min(0, 'Semantic weight must be non-negative')
    .max(1, 'Semantic weight must not exceed 1')
    .default(0.7)
    .describe('Weight for semantic search (0.0-1.0, default: 0.7)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of results to return (default: 10)')
});

// Schema for finding similar backlog items
const findSimilarBacklogSchema = z.object({
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('ID of the backlog item to find similar items for'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Maximum number of similar items to return (default: 5)')
});

/**
 * Tool for semantic search of backlog items
 * Uses AI embeddings to find contextually relevant items based on meaning
 */
export const semanticSearchBacklogTool = tool({
  description: `Search backlog items using AI-powered semantic understanding. This tool finds items based on 
    meaning and context, not just keyword matching. Perfect for finding related features, similar requirements, 
    or items that address comparable user needs.
    
    Examples:
    - "user authentication features" → finds login, signup, password reset items
    - "payment processing" → finds checkout, billing, subscription items
    - "mobile responsive design" → finds UI/UX items for mobile compatibility`,
  inputSchema: semanticSearchBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = semanticSearchBacklogSchema.parse(input);
      
      console.log('Performing semantic search for backlog items:', validated);

      // Call the semantic search API
      const response = await requestWithAuth(
        '/semantic-search/semantic-search',
        { 
          method: 'POST', 
          body: JSON.stringify({
            query: validated.query,
            project_id: validated.project_id,
            limit: validated.limit,
            similarity_threshold: 0.7
          })
        },
        experimental_context as AuthContext
      );

      if (response.error) {
        console.error('Semantic search failed:', response.error);
        return `Failed to perform semantic search: ${response.error}`;
      }

      const results = (response.data as any) || [];
      
      if (results.length === 0) {
        return `No backlog items found matching the semantic query: "${validated.query}"`;
      }

      console.log(`Found ${results.length} semantically similar backlog items`);

      // Format the results with semantic relevance scores
      const formattedResults = `**Semantic Search Results** for "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const similarity = (result.similarity_score * 100).toFixed(1);
  const itemType = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const priority = item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
  
  return `${index + 1}. **${itemType} #${item.id}** (${similarity}% match)
   **"${item.title}"**
   - **Priority**: ${priority}
   - **Status**: ${item.status.replace('_', ' ')}
   - **Story Points**: ${item.story_point || 'Not estimated'}${item.description ? `\n   - **Description**: ${item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}` : ''}`;
}).join('\n\n')}

**Search Insights**:
- **Total Matches**: ${results.length}
- **Best Match**: ${(results[0].similarity_score * 100).toFixed(1)}% semantic similarity
- **Search Type**: AI-powered semantic understanding

These results are ranked by semantic similarity, meaning they match the intent and context of your query, not just keywords.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in semanticSearchBacklogTool:', error);
      return `Failed to perform semantic search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for BM25 keyword-based search of backlog items
 * Uses traditional keyword matching with relevance scoring
 */
export const bm25SearchBacklogTool = tool({
  description: `Search backlog items using keyword-based BM25 algorithm. This tool finds items based on 
    exact keyword matches with relevance scoring. Best for finding items with specific terms or technical keywords.
    
    Examples:
    - "login API endpoint" → finds items with these exact terms
    - "database migration" → finds items mentioning database and migration
    - "React component" → finds items specifically about React components`,
  inputSchema: bm25SearchBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = bm25SearchBacklogSchema.parse(input);
      
      console.log('Performing BM25 search for backlog items:', validated);

      // Call the BM25 search API
      const response = await requestWithAuth(
        '/semantic-search/bm25-search',
        { 
          method: 'POST', 
          body: JSON.stringify({
            query: validated.query,
            project_id: validated.project_id,
            limit: validated.limit
          })
        },
        experimental_context as AuthContext
      );

      if (response.error) {
        console.error('BM25 search failed:', response.error);
        return `Failed to perform BM25 search: ${response.error}`;
      }

      const results = (response.data as any) || [];
      
      if (results.length === 0) {
        return `No backlog items found matching the keywords: "${validated.query}"`;
      }

      console.log(`Found ${results.length} keyword-matching backlog items`);

      // Format the results with BM25 relevance scores
      const formattedResults = `**Keyword Search Results** for "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const score = result.similarity_score ? result.similarity_score.toFixed(2) : 'N/A';
  const itemType = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const priority = item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
  
  return `${index + 1}. **${itemType} #${item.id}** (Score: ${score})
   **"${item.title}"**
   - **Priority**: ${priority}
   - **Status**: ${item.status.replace('_', ' ')}
   - **Story Points**: ${item.story_point || 'Not estimated'}${item.description ? `\n   - **Description**: ${item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}` : ''}`;
}).join('\n\n')}

**Search Insights**:
- **Total Matches**: ${results.length}
- **Search Type**: Keyword-based BM25 relevance scoring
- **Keywords**: Exact term matching with frequency weighting

These results are ranked by keyword relevance, prioritizing items with exact matches and term frequency.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in bm25SearchBacklogTool:', error);
      return `Failed to perform BM25 search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for hybrid search combining semantic and keyword approaches
 * Provides the best of both semantic understanding and keyword precision
 */
export const hybridSearchBacklogTool = tool({
  description: `Search backlog items using a hybrid approach that combines AI semantic understanding with 
    keyword matching. This provides the most comprehensive search results by balancing contextual relevance 
    with exact term matches.
    
    The semantic_weight parameter controls the balance:
    - 0.8-1.0: Prioritize semantic understanding (find similar concepts)
    - 0.5-0.7: Balanced approach (default 0.7)
    - 0.0-0.4: Prioritize keyword matching (find exact terms)`,
  inputSchema: hybridSearchBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = hybridSearchBacklogSchema.parse(input);
      
      console.log('Performing hybrid search for backlog items:', validated);

      // Call the hybrid search API
      const response = await requestWithAuth(
        '/semantic-search/hybrid-search',
        { 
          method: 'POST', 
          body: JSON.stringify({
            query: validated.query,
            project_id: validated.project_id,
            semantic_weight: validated.semantic_weight,
            keyword_weight: 1 - validated.semantic_weight,
            similarity_threshold: 0.5,
            use_rrf: true,
            limit: validated.limit
          })
        },
        experimental_context as AuthContext
      );

      if (response.error) {
        console.error('Hybrid search failed:', response.error);
        return `Failed to perform hybrid search: ${response.error}`;
      }

      const results = (response.data as any) || [];
      
      if (results.length === 0) {
        return `No backlog items found matching the hybrid query: "${validated.query}"`;
      }

      console.log(`Found ${results.length} hybrid-matching backlog items`);

      // Format the results with hybrid scores
      const semanticPercent = (validated.semantic_weight * 100).toFixed(0);
      const keywordPercent = ((1 - validated.semantic_weight) * 100).toFixed(0);

      const formattedResults = `**Hybrid Search Results** for "${validated.query}":
*Semantic: ${semanticPercent}% | Keywords: ${keywordPercent}%*

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const score = result.similarity_score ? result.similarity_score.toFixed(3) : 'N/A';
  const itemType = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const priority = item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
  
  return `${index + 1}. **${itemType} #${item.id}** (Combined Score: ${score})
   **"${item.title}"**
   - **Priority**: ${priority}
   - **Status**: ${item.status.replace('_', ' ')}
   - **Story Points**: ${item.story_point || 'Not estimated'}${item.description ? `\n   - **Description**: ${item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}` : ''}`;
}).join('\n\n')}

**Search Insights**:
- **Total Matches**: ${results.length}
- **Search Type**: Hybrid (Semantic + Keyword)
- **Balance**: ${semanticPercent}% semantic understanding, ${keywordPercent}% keyword matching
- **Best Combined Score**: ${results[0].similarity_score ? results[0].similarity_score.toFixed(3) : 'N/A'}

This hybrid approach finds items that are both contextually relevant and contain matching keywords, providing the most comprehensive results.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in hybridSearchBacklogTool:', error);
      return `Failed to perform hybrid search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for finding similar backlog items based on an existing item
 * Uses semantic similarity to discover related or duplicate items
 */
export const findSimilarBacklogTool = tool({
  description: `Find backlog items that are similar to a specific existing item. This tool uses AI to identify 
    items with similar requirements, functionality, or context. Useful for:
    - Identifying potential duplicates
    - Finding related features that should be grouped
    - Discovering items that might conflict or overlap
    - Finding items that could be combined or split`,
  inputSchema: findSimilarBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = findSimilarBacklogSchema.parse(input);
      
      console.log('Finding similar backlog items for:', validated.backlog_id);

      // Call the similar items API
      const response = await requestWithAuth(
        `/semantic-search/similar/${validated.backlog_id}?limit=${validated.limit}&similarity_threshold=0.6`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        console.error('Similar items search failed:', response.error);
        return `Failed to find similar items: ${response.error}`;
      }

      const similarItems = (response.data as any) || [];
      
      if (similarItems.length === 0) {
        return `No similar backlog items found for item #${validated.backlog_id}.`;
      }

      console.log(`Found ${similarItems.length} similar backlog items`);

      // Format the results
      const formattedResults = `**Found ${similarItems.length} Similar Items** for #${validated.backlog_id}:

${similarItems.map((result: any, index: number) => {
  const item = result.backlog;
  const similarity = (result.similarity_score * 100).toFixed(1);
  const itemType = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const priority = item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
  
  // Determine similarity level
  let similarityLevel = '';
  if (result.similarity_score >= 0.9) similarityLevel = 'Very High (Potential Duplicate)';
  else if (result.similarity_score >= 0.8) similarityLevel = 'High (Closely Related)';
  else if (result.similarity_score >= 0.7) similarityLevel = 'Medium (Related)';
  else similarityLevel = 'Low (Loosely Related)';
  
  return `${index + 1}. **${itemType} #${item.id}** - ${similarity}% similar
   ${similarityLevel}
   **"${item.title}"**
   - **Priority**: ${priority} | **Status**: ${item.status.replace('_', ' ')} | **Points**: ${item.story_point || 'Not estimated'}${item.description ? `\n   - **Description**: ${item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description}` : ''}`;
}).join('\n\n')}

**Analysis Summary**:
- **High Similarity (≥80%)**: ${similarItems.filter((result: any) => result.similarity_score >= 0.8).length} items (potential duplicates or closely related)
- **Medium Similarity (70-79%)**: ${similarItems.filter((result: any) => result.similarity_score >= 0.7 && result.similarity_score < 0.8).length} items (related features)
- **Low Similarity (60-69%)**: ${similarItems.filter((result: any) => result.similarity_score >= 0.6 && result.similarity_score < 0.7).length} items (loosely related)

**Recommendations**:
${similarItems.some((result: any) => result.similarity_score >= 0.9) ? 'Review for Duplicates: Items with >90% similarity may be duplicates that should be merged.' : ''}
${similarItems.some((result: any) => result.similarity_score >= 0.8 && result.similarity_score < 0.9) ? 'Group Related Items: Items with 80-90% similarity should be considered for epic grouping or sprint planning together.' : ''}
${similarItems.length > 3 ? 'Consider Refactoring: Many similar items suggest this area might benefit from consolidation or clearer requirements.' : ''}`;

      return formattedResults;

    } catch (error) {
      console.error('Error in findSimilarBacklogTool:', error);
      return `Failed to find similar items: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Enhanced semantic backlog management tools collection
 * These complement the existing backlog management tools with AI-powered capabilities
 */
export const semanticBacklogManagementTools = {
  semanticSearchBacklog: semanticSearchBacklogTool,
  bm25SearchBacklog: bm25SearchBacklogTool,
  hybridSearchBacklog: hybridSearchBacklogTool,
  findSimilarBacklog: findSimilarBacklogTool
};

/**
 * Type definition for semantic tools
 */
export type SemanticBacklogManagementTools = typeof semanticBacklogManagementTools;

// Individual tools are already exported above with their declarations

