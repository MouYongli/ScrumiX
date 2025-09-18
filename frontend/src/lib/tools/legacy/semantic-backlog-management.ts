/**
 * Enhanced Semantic Backlog Management Tools for Product Owner Agent
 * These tools leverage pgvector embeddings for intelligent semantic search
 * and complement the existing backlog management tools
 */

import { tool } from 'ai';
import { z } from 'zod';


/**
 * Helper function for semantic search API calls with authentication
 */
async function semanticSearchWithAuth(searchData: any, endpoint: string, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided for semantic search');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/semantic-search/${endpoint}`, {
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
    console.error(`Error in semantic search (${endpoint}):`, error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Schema for semantic search of backlog items
 */
const semanticBacklogSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Natural language search query to find relevant backlog items'),
  
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
 * Tool for intelligent semantic search of backlog items
 * This tool uses AI embeddings to understand the meaning behind queries
 * and find relevant items even when exact keywords don't match
 */
export const semanticSearchBacklogTool = tool({
  description: `Perform intelligent semantic search on backlog items using AI embeddings. 
    This tool understands the meaning and context of your search query, not just keywords.
    Perfect for finding related user stories, similar features, or conceptually related work items.
    Use this when you need to find items by concept, intent, or meaning rather than exact text matches.`,
  inputSchema: semanticBacklogSearchSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = semanticBacklogSearchSchema.parse(input);
      
      console.log('Performing semantic search:', validated);

      const response = await semanticSearchWithAuth(validated, 'semantic-search', experimental_context);

      if (response.error) {
        console.error('Semantic search failed:', response.error);
        return `Semantic search failed: ${response.error}`;
      }

      const results = response.data || [];
      
      if (results.length === 0) {
        return `No semantically similar backlog items found for "${validated.query}" with similarity threshold ${validated.similarity_threshold}.
        
Try:
- Lowering the similarity threshold (e.g., 0.5 or 0.6)
- Using different keywords or phrases
- Broadening your search terms`;
      }

      console.log(`Found ${results.length} semantically similar items`);

      // Format results in a concise, conversational way
      const formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} related to "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${statusDisplay})`;
}).join('\n\n')}`;

      return formattedResults;

    } catch (error) {
      console.error('Error in semanticSearchBacklogTool:', error);
      return `Failed to perform semantic search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for BM25 keyword search
 */
const bm25BacklogSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Keyword search query for precise term matching'),
  
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
    .describe('Maximum number of results to return (default: 10)')
});

/**
 * Schema for hybrid search combining semantic and BM25 keyword approaches
 */
const hybridBacklogSearchSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(500, 'Query must be 500 characters or less')
    .describe('Search query combining both semantic meaning and keyword matching'),
  
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
  
  semantic_weight: z.number()
    .min(0.0, 'Semantic weight must be between 0 and 1')
    .max(1.0, 'Semantic weight must be between 0 and 1')
    .default(0.7)
    .describe('Weight for semantic search (used in weighted mode, default: 0.7)'),
  
  keyword_weight: z.number()
    .min(0.0, 'Keyword weight must be between 0 and 1')
    .max(1.0, 'Keyword weight must be between 0 and 1')
    .default(0.3)
    .describe('Weight for BM25 keyword search (used in weighted mode, default: 0.3)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.5)
    .describe('Minimum semantic similarity score (0-1, default: 0.5)'),
  
  use_rrf: z.boolean()
    .default(true)
    .describe('Use Reciprocal Rank Fusion (recommended) vs weighted scoring (default: true)')
});

/**
 * Tool for BM25 keyword search with precise term matching
 */
export const bm25SearchBacklogTool = tool({
  description: `Perform precise BM25 keyword search on backlog items using industry-standard ranking algorithm.
    Perfect for finding items with specific terms like "login", "payment", "API", "authentication".
    Uses BM25 scoring which handles term frequency, document length normalization, and inverse document frequency.
    This solves the problem where semantic search might miss exact keyword matches.`,
  inputSchema: bm25BacklogSearchSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = bm25BacklogSearchSchema.parse(input);
      
      console.log('Performing BM25 keyword search:', validated);

      const response = await semanticSearchWithAuth(validated, 'bm25-search', experimental_context);

      if (response.error) {
        console.error('BM25 search failed:', response.error);
        return `BM25 keyword search failed: ${response.error}`;
      }

      const results = response.data || [];
      
      if (results.length === 0) {
        return `No backlog items found with BM25 keyword search for "${validated.query}".
        
BM25 search looks for exact keyword matches with intelligent scoring based on:
- Term frequency in documents
- Document length normalization  
- Inverse document frequency across corpus

Try:
- Using different or broader keywords
- Checking spelling of search terms
- Using the hybrid search tool for combined semantic + keyword approach`;
      }

      console.log(`Found ${results.length} items with BM25 keyword search`);

      // Format results concisely
      const formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} with keywords "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${statusDisplay})`;
}).join('\n\n')}`;

      return formattedResults;

    } catch (error) {
      console.error('Error in bm25SearchBacklogTool:', error);
      return `Failed to perform BM25 search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for hybrid search combining semantic understanding with BM25 keyword matching
 * This provides the best of both worlds - AI understanding and precise keyword search
 */
export const hybridSearchBacklogTool = tool({
  description: `Perform industry-standard hybrid search combining semantic AI with BM25 keyword search.
    
    Two modes available:
    1. **RRF (Reciprocal Rank Fusion)** - Recommended production approach that combines rankings
    2. **Weighted Scoring** - Legacy mode with configurable semantic/keyword weights
    
    RRF solves the "authentication" vs "login" problem by combining semantic understanding 
    with precise keyword matching using the formula: RRF = Σ(1/(k + rank_i))
    
    This is the industry standard used by ElasticSearch, OpenSearch, and Pinecone.`,
  inputSchema: hybridBacklogSearchSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = hybridBacklogSearchSchema.parse(input);
      
      // Validate weights sum to 1.0 only in weighted mode
      if (!validated.use_rrf) {
        const totalWeight = validated.semantic_weight + validated.keyword_weight;
        if (Math.abs(totalWeight - 1.0) > 0.001) {
          return `Error: When using weighted scoring (use_rrf=false), semantic weight (${validated.semantic_weight}) and keyword weight (${validated.keyword_weight}) must sum to 1.0. Current total: ${totalWeight}`;
        }
      }
      
      console.log('Performing hybrid search:', validated);

      const response = await semanticSearchWithAuth(validated, 'hybrid-search', experimental_context);

      if (response.error) {
        console.error('Hybrid search failed:', response.error);
        return `Hybrid search failed: ${response.error}`;
      }

      const results = response.data || [];
      
      if (results.length === 0) {
        return `No backlog items found for "${validated.query}" using hybrid search.
        
The search combined:
- **Semantic search** (${(validated.semantic_weight * 100).toFixed(0)}% weight): AI understanding of meaning
- **Keyword search** (${(validated.keyword_weight * 100).toFixed(0)}% weight): Traditional text matching

Try adjusting the search approach or using different terms.`;
      }

      console.log(`Found ${results.length} items using hybrid search`);

      // Detect potential duplicates by similar titles
      const duplicates = [];
      const titleWords = new Set();
      
      for (let i = 0; i < results.length; i++) {
        const item1 = results[i].backlog;
        const words1 = new Set(item1.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
        
        for (let j = i + 1; j < results.length; j++) {
          const item2 = results[j].backlog;
          const words2 = new Set(item2.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
          
          // Check for significant word overlap
          const intersection = new Set([...words1].filter(x => words2.has(x)));
          const union = new Set([...words1, ...words2]);
          const similarity = intersection.size / Math.min(words1.size, words2.size);
          
          if (similarity > 0.6 && intersection.size >= 2) {
            duplicates.push([item1, item2]);
          }
        }
      }

      // Format results concisely with duplicate detection
      let formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} related to "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${statusDisplay})`;
}).join('\n\n')}`;

      // Add duplicate detection note if found
      if (duplicates.length > 0) {
        formattedResults += `\n\n👉 **Note**: #${duplicates[0][0].id} and #${duplicates[0][1].id} look similar and might be duplicates.`;
      }

      return formattedResults;

    } catch (error) {
      console.error('Error in hybridSearchBacklogTool:', error);
      return `Failed to perform hybrid search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for finding similar backlog items
 */
const findSimilarBacklogSchema = z.object({
  backlog_id: z.number()
    .int('Backlog ID must be a whole number')
    .positive('Backlog ID must be a positive integer')
    .describe('ID of the reference backlog item to find similar items for'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Maximum number of similar items to return (default: 5)'),
  
  similarity_threshold: z.number()
    .min(0.0, 'Similarity threshold must be between 0 and 1')
    .max(1.0, 'Similarity threshold must be between 0 and 1')
    .default(0.6)
    .describe('Minimum similarity score for related items (0-1, default: 0.6)')
});

/**
 * Tool for finding similar or related backlog items
 * Useful for discovering dependencies, related work, or potential duplicates
 */
export const findSimilarBacklogTool = tool({
  description: `Find backlog items that are semantically similar to a specific item.
    Perfect for discovering related user stories, potential dependencies, or duplicate work.
    Uses AI embeddings to understand conceptual relationships between backlog items.
    Helpful for backlog organization, sprint planning, and avoiding duplicate efforts.`,
  inputSchema: findSimilarBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = findSimilarBacklogSchema.parse(input);
      
      console.log('Finding similar backlog items:', validated);

      const response = await semanticSearchWithAuth(
        validated, 
        `similar/${validated.backlog_id}?limit=${validated.limit}&similarity_threshold=${validated.similarity_threshold}`, 
        experimental_context
      );

      if (response.error) {
        console.error('Similar items search failed:', response.error);
        return `Failed to find similar items: ${response.error}`;
      }

      const results = response.data || [];
      
      if (results.length === 0) {
        return `No similar backlog items found for item #${validated.backlog_id} with similarity threshold ${validated.similarity_threshold}.
        
This could mean:
- The item is unique in its project
- The similarity threshold is too high (try 0.4 or 0.5)
- The item doesn't have sufficient content for comparison

Try lowering the similarity threshold to find more loosely related items.`;
      }

      console.log(`Found ${results.length} similar items`);

      // Format results concisely
      const formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} similar to #${validated.backlog_id}:

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${statusDisplay})`;
}).join('\n\n')}`;

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
