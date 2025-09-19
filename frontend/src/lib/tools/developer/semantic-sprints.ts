/**
 * Developer Semantic Sprint Search Tools
 * Semantic search for sprints by name, goal, and metadata
 */

import { tool } from 'ai';
import { requestWithAuth, AuthContext } from '../utils/http';
import { 
  semanticSearchSprintsSchema,
  bm25SearchSprintsSchema,
  hybridSearchSprintsSchema,
  findSimilarSprintsSchema
} from '../schemas/semantic-sprint';

/**
 * Semantic search for sprints by name, goal, and metadata
 */
export const semanticSearchSprints = tool({
  description: `Search sprints using semantic understanding of sprint names, goals, and metadata.
    Use this to find sprints by concept, purpose, or related themes across projects.`,
  inputSchema: semanticSearchSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = {
        query: input.query.trim(),
        project_id: input.project_id,
        limit: input.limit
      };

      console.log(`Performing semantic search for sprints: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        project_id: validated.project_id,
        limit: validated.limit
      };

      const response = await requestWithAuth(
        '/semantic-search/sprints',
        {
          method: 'POST',
          body: JSON.stringify(searchData),
        },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Sprint search failed: ${response.error}`;
      }

      const results = (response.data as any[]) || [];

      if (results.length === 0) {
        return `No sprints found related to "${validated.query}".`;
      }

      console.log(`Found ${results.length} semantically similar sprints`);

      // Format results concisely
      const formattedResults = `Found ${results.length} sprint${results.length === 1 ? '' : 's'} related to "${validated.query}":

${results.map((result: any, index: number) => {
  const sprint = result.sprint || result;
  const score = result.similarity_score ? ` (${(result.similarity_score * 100).toFixed(0)}% match)` : '';
  const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = (sprint.startDate || sprint.start_date) ? new Date(sprint.startDate || sprint.start_date).toLocaleDateString() : 'Not set';
  const endDate = (sprint.endDate || sprint.end_date) ? new Date(sprint.endDate || sprint.end_date).toLocaleDateString() : 'Not set';
  
  let sprintInfo = `**Sprint ${sprint.id}**: "${sprint.sprintName || sprint.sprint_name || 'Unnamed Sprint'}"${score}
   - **Status**: ${statusDisplay}
   - **Duration**: ${startDate} - ${endDate}
   - **Project**: ${sprint.projectId || sprint.project_id}`;
   
  if (sprint.sprintGoal || sprint.sprint_goal) {
    sprintInfo += `\n   - **Goal**: ${sprint.sprintGoal || sprint.sprint_goal}`;
  }
  
  return sprintInfo;
}).join('\n\n')}`;

      return formattedResults;

    } catch (error) {
      console.error('Error in semanticSearchSprints:', error);
      return `Sprint search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * BM25 keyword search for sprints
 */
export const bm25SearchSprints = tool({
  description: `Perform precise BM25 keyword search on sprints using industry-standard ranking algorithm.
    Perfect for finding sprints with specific terms like "authentication", "payment", "API", "refactoring".
    Uses BM25 scoring which handles term frequency, document length normalization, and inverse document frequency.`,
  inputSchema: bm25SearchSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = bm25SearchSprintsSchema.parse(input);
      
      console.log(`Performing BM25 search for sprints: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        project_id: validated.project_id,
        limit: validated.limit
      };

      const response = await requestWithAuth(
        '/semantic-search/sprints/bm25-search',
        {
          method: 'POST',
          body: JSON.stringify(searchData),
        },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Sprint BM25 search failed: ${response.error}`;
      }

      const results = (response.data as any[]) || [];

      if (results.length === 0) {
        return `No sprints found with BM25 keyword search for "${validated.query}".

BM25 search looks for exact keyword matches with intelligent scoring based on:
- Term frequency in sprint names and goals
- Document length normalization  
- Inverse document frequency across corpus

Try:
- Using different or broader keywords
- Checking spelling of search terms
- Using the hybrid search for combined semantic + keyword approach`;
      }

      console.log(`Found ${results.length} keyword-matching sprints`);

      const formattedResults = `Found ${results.length} sprint${results.length === 1 ? '' : 's'} with keywords "${validated.query}":

${results.map((result: any, index: number) => {
  const sprint = result.sprint || result;
  const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = (sprint.startDate || sprint.start_date) ? new Date(sprint.startDate || sprint.start_date).toLocaleDateString() : 'Not set';
  const endDate = (sprint.endDate || sprint.end_date) ? new Date(sprint.endDate || sprint.end_date).toLocaleDateString() : 'Not set';
  
  let sprintInfo = `**Sprint ${sprint.id}**: "${sprint.sprintName || sprint.sprint_name || 'Unnamed Sprint'}"
   - **Status**: ${statusDisplay}
   - **Duration**: ${startDate} - ${endDate}
   - **Project**: ${sprint.projectId || sprint.project_id}`;
   
  if (sprint.sprintGoal || sprint.sprint_goal) {
    sprintInfo += `\n   - **Goal**: ${sprint.sprintGoal || sprint.sprint_goal}`;
  }
  
  return sprintInfo;
}).join('\n\n')}`;

      return formattedResults;

    } catch (error) {
      console.error('Error in bm25SearchSprints:', error);
      return `Sprint BM25 search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Hybrid search combining semantic and keyword approaches for sprints
 */
export const hybridSearchSprints = tool({
  description: `Perform industry-standard hybrid search combining semantic AI with BM25 keyword search for sprints.
    
    Two modes available:
    1. **RRF (Reciprocal Rank Fusion)** - Recommended production approach that combines rankings
    2. **Weighted Scoring** - Legacy mode with configurable semantic/keyword weights
    
    RRF solves the "authentication" vs "login" problem by combining semantic understanding 
    with precise keyword matching using the formula: RRF = Σ(1/(k + rank_i))
    
    This is the industry standard used by ElasticSearch, OpenSearch, and Pinecone.`,
  inputSchema: hybridSearchSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = hybridSearchSprintsSchema.parse(input);
      
      // Validate weights sum to 1.0 only in weighted mode
      if (!validated.use_rrf) {
        const totalWeight = validated.semantic_weight + validated.keyword_weight;
        if (Math.abs(totalWeight - 1.0) > 0.001) {
          return `Error: When using weighted scoring (use_rrf=false), semantic weight (${validated.semantic_weight}) and keyword weight (${validated.keyword_weight}) must sum to 1.0. Current total: ${totalWeight}`;
        }
      }
      
      console.log(`Performing hybrid search for sprints: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        project_id: validated.project_id,
        semantic_weight: validated.semantic_weight,
        keyword_weight: validated.keyword_weight,
        similarity_threshold: validated.similarity_threshold,
        use_rrf: validated.use_rrf,
        limit: validated.limit
      };

      const response = await requestWithAuth(
        '/semantic-search/sprints/hybrid-search',
        {
          method: 'POST',
          body: JSON.stringify(searchData),
        },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Sprint hybrid search failed: ${response.error}`;
      }

      const results = (response.data as any[]) || [];

      if (results.length === 0) {
        return `No sprints found for "${validated.query}" using hybrid search.
        
The search combined:
- **Semantic search** (${(validated.semantic_weight * 100).toFixed(0)}% weight): AI understanding of meaning
- **Keyword search** (${(validated.keyword_weight * 100).toFixed(0)}% weight): Traditional text matching

Try adjusting the search approach or using different terms.`;
      }

      console.log(`Found ${results.length} hybrid-matching sprints`);

      // Detect potential duplicates by similar names/goals
      const duplicates = [];
      
      for (let i = 0; i < results.length; i++) {
        const sprint1 = results[i].sprint || results[i];
        const name1 = (sprint1.sprintName || sprint1.sprint_name || '').toLowerCase();
        const goal1 = (sprint1.sprintGoal || sprint1.sprint_goal || '').toLowerCase();
        const words1 = new Set([...name1.split(/\s+/), ...goal1.split(/\s+/)].filter(w => w.length > 3));
        
        for (let j = i + 1; j < results.length; j++) {
          const sprint2 = results[j].sprint || results[j];
          const name2 = (sprint2.sprintName || sprint2.sprint_name || '').toLowerCase();
          const goal2 = (sprint2.sprintGoal || sprint2.sprint_goal || '').toLowerCase();
          const words2 = new Set([...name2.split(/\s+/), ...goal2.split(/\s+/)].filter(w => w.length > 3));
          
          const intersection = new Set([...words1].filter(x => words2.has(x)));
          const similarity = intersection.size / Math.min(words1.size, words2.size);
          
          if (similarity > 0.6 && intersection.size >= 2) {
            duplicates.push([sprint1, sprint2]);
          }
        }
      }

      let formattedResults = `Found ${results.length} sprint${results.length === 1 ? '' : 's'} related to "${validated.query}":

${results.map((result: any, index: number) => {
  const sprint = result.sprint || result;
  const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = (sprint.startDate || sprint.start_date) ? new Date(sprint.startDate || sprint.start_date).toLocaleDateString() : 'Not set';
  const endDate = (sprint.endDate || sprint.end_date) ? new Date(sprint.endDate || sprint.end_date).toLocaleDateString() : 'Not set';
  
  let sprintInfo = `**Sprint ${sprint.id}**: "${sprint.sprintName || sprint.sprint_name || 'Unnamed Sprint'}"
   - **Status**: ${statusDisplay}
   - **Duration**: ${startDate} - ${endDate}
   - **Project**: ${sprint.projectId || sprint.project_id}`;
   
  if (sprint.sprintGoal || sprint.sprint_goal) {
    sprintInfo += `\n   - **Goal**: ${sprint.sprintGoal || sprint.sprint_goal}`;
  }
  
  return sprintInfo;
}).join('\n\n')}`;

      // Add duplicate detection note if found
      if (duplicates.length > 0) {
        formattedResults += `\n\n👉 **Note**: Sprint ${duplicates[0][0].id} and Sprint ${duplicates[0][1].id} look similar and might be related.`;
      }

      return formattedResults;

    } catch (error) {
      console.error('Error in hybridSearchSprints:', error);
      return `Sprint hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Find sprints similar to a specific sprint
 */
export const findSimilarSprints = tool({
  description: `Find sprints that are semantically similar to a specific sprint.
    Perfect for discovering related sprints, sprint patterns, or similar project phases.
    Uses AI embeddings to understand conceptual relationships between sprints.`,
  inputSchema: findSimilarSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = findSimilarSprintsSchema.parse(input);
      
      console.log(`Finding similar sprints for sprint ${validated.sprint_id}`);

      const response = await requestWithAuth(
        `/semantic-search/sprints/${validated.sprint_id}/similar?limit=${validated.limit}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Failed to find similar sprints: ${response.error}`;
      }

      const results = (response.data as any[]) || [];

      if (results.length === 0) {
        return `No similar sprints found for sprint ${validated.sprint_id}.
        
This could mean:
- The sprint is unique in its project/organization
- The sprint doesn't have sufficient content for comparison
- There are no other sprints with similar goals or themes

Try searching for sprints with similar keywords or themes manually.`;
      }

      console.log(`Found ${results.length} similar sprints`);

      const formattedResults = `Found ${results.length} sprint${results.length === 1 ? '' : 's'} similar to Sprint ${validated.sprint_id}:

${results.map((result: any, index: number) => {
  const sprint = result.sprint || result;
  const score = result.similarity_score ? ` (${(result.similarity_score * 100).toFixed(0)}% similar)` : '';
  const statusDisplay = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = (sprint.startDate || sprint.start_date) ? new Date(sprint.startDate || sprint.start_date).toLocaleDateString() : 'Not set';
  const endDate = (sprint.endDate || sprint.end_date) ? new Date(sprint.endDate || sprint.end_date).toLocaleDateString() : 'Not set';
  
  let sprintInfo = `**Sprint ${sprint.id}**: "${sprint.sprintName || sprint.sprint_name || 'Unnamed Sprint'}"${score}
   - **Status**: ${statusDisplay}
   - **Duration**: ${startDate} - ${endDate}
   - **Project**: ${sprint.projectId || sprint.project_id}`;
   
  if (sprint.sprintGoal || sprint.sprint_goal) {
    sprintInfo += `\n   - **Goal**: ${sprint.sprintGoal || sprint.sprint_goal}`;
  }
  
  return sprintInfo;
}).join('\n\n')}`;

      return formattedResults;

    } catch (error) {
      console.error('Error in findSimilarSprints:', error);
      return `Failed to find similar sprints: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

