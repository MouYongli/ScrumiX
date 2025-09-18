/**
 * Semantic Backlog Management Tools for Product Owner Agent
 * These tools provide AI-powered semantic search and similarity matching for backlog items
 * Built on top of pgvector semantic search infrastructure
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestWithAuth, type AuthContext } from '../../utils/http';
import {
  semanticSearchBacklogSchema,
  bm25SearchBacklogSchema,
  hybridSearchBacklogSchema,
  findSimilarBacklogSchema
} from '@/lib/tools/schemas/semantic-backlog';


/**
 * Tool for semantic search of backlog items
 * Uses AI embeddings to find contextually relevant items based on meaning
 */
const semanticSearchBacklogTool = tool({
  description: `Perform intelligent semantic search on backlog items using AI embeddings. 
    This tool understands the meaning and context of your search query, not just keywords.
    Perfect for finding related user stories, similar features, or conceptually related work items.
    Use this when you need to find items by concept, intent, or meaning rather than exact text matches.`,
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
            similarity_threshold: validated.similarity_threshold
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
        return `No semantically similar backlog items found for "${validated.query}" with similarity threshold ${validated.similarity_threshold}.
        
Try:
- Lowering the similarity threshold (e.g., 0.5 or 0.6)
- Using different keywords or phrases
- Broadening your search terms`;
      }

      console.log(`Found ${results.length} semantically similar backlog items`);

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
 * Tool for BM25 keyword-based search of backlog items
 * Uses traditional keyword matching with relevance scoring
 */
const bm25SearchBacklogTool = tool({
  description: `Perform precise BM25 keyword search on backlog items using industry-standard ranking algorithm.
    Perfect for finding items with specific terms like "login", "payment", "API", "authentication".
    Uses BM25 scoring which handles term frequency, document length normalization, and inverse document frequency.
    This solves the problem where semantic search might miss exact keyword matches.`,
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

      console.log(`Found ${results.length} keyword-matching backlog items`);

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
 * Tool for hybrid search combining semantic and keyword approaches
 * Provides the best of both semantic understanding and keyword precision
 */
const hybridSearchBacklogTool = tool({
  description: `Perform industry-standard hybrid search combining semantic AI with BM25 keyword search.
    
    Two modes available:
    1. **RRF (Reciprocal Rank Fusion)** - Recommended production approach that combines rankings
    2. **Weighted Scoring** - Legacy mode with configurable semantic/keyword weights
    
    RRF solves the "authentication" vs "login" problem by combining semantic understanding 
    with precise keyword matching using the formula: RRF = Σ(1/(k + rank_i))
    
    This is the industry standard used by ElasticSearch, OpenSearch, and Pinecone.`,
  inputSchema: hybridSearchBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = hybridSearchBacklogSchema.parse(input);
      
      // Validate weights sum to 1.0 only in weighted mode
      if (!validated.use_rrf) {
        const totalWeight = validated.semantic_weight + validated.keyword_weight;
        if (Math.abs(totalWeight - 1.0) > 0.001) {
          return `Error: When using weighted scoring (use_rrf=false), semantic weight (${validated.semantic_weight}) and keyword weight (${validated.keyword_weight}) must sum to 1.0. Current total: ${totalWeight}`;
        }
      }
      
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
            keyword_weight: validated.keyword_weight,
            similarity_threshold: validated.similarity_threshold,
            use_rrf: validated.use_rrf,
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
        return `No backlog items found for "${validated.query}" using hybrid search.
        
The search combined:
- **Semantic search** (${(validated.semantic_weight * 100).toFixed(0)}% weight): AI understanding of meaning
- **Keyword search** (${(validated.keyword_weight * 100).toFixed(0)}% weight): Traditional text matching

Try adjusting the search approach or using different terms.`;
      }

      console.log(`Found ${results.length} hybrid-matching backlog items`);

      // Detect potential duplicates by similar titles
      const duplicates = [];
      
      for (let i = 0; i < results.length; i++) {
        const item1 = results[i].backlog;
        const words1 = new Set(item1.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
        
        for (let j = i + 1; j < results.length; j++) {
          const item2 = results[j].backlog;
          const words2 = new Set(item2.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3));
          
          // Check for significant word overlap
          const intersection = new Set([...words1].filter(x => words2.has(x)));
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
 * Tool for finding similar backlog items based on an existing item
 * Uses semantic similarity to discover related or duplicate items
 */
const findSimilarBacklogTool = tool({
  description: `Find backlog items that are semantically similar to a specific item.
    Perfect for discovering related user stories, potential dependencies, or duplicate work.
    Uses AI embeddings to understand conceptual relationships between backlog items.
    Helpful for backlog organization, sprint planning, and avoiding duplicate efforts.`,
  inputSchema: findSimilarBacklogSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = findSimilarBacklogSchema.parse(input);
      
      console.log('Finding similar backlog items for:', validated.backlog_id);

      // Call the similar items API
      const response = await requestWithAuth(
        `/semantic-search/similar/${validated.backlog_id}?limit=${validated.limit}&similarity_threshold=${validated.similarity_threshold}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        console.error('Similar items search failed:', response.error);
        return `Failed to find similar items: ${response.error}`;
      }

      const similarItems = (response.data as any) || [];
      
      if (similarItems.length === 0) {
        return `No similar backlog items found for item #${validated.backlog_id} with similarity threshold ${validated.similarity_threshold}.
        
This could mean:
- The item is unique in its project
- The similarity threshold is too high (try 0.4 or 0.5)
- The item doesn't have sufficient content for comparison

Try lowering the similarity threshold to find more loosely related items.`;
      }

      console.log(`Found ${similarItems.length} similar backlog items`);

      // Format results concisely
      const formattedResults = `Found ${similarItems.length} item${similarItems.length === 1 ? '' : 's'} similar to #${validated.backlog_id}:

${similarItems.map((result: any, index: number) => {
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

// Export individual tools
export {
  semanticSearchBacklogTool,
  bm25SearchBacklogTool,
  hybridSearchBacklogTool,
  findSimilarBacklogTool
};

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

