/**
 * Developer Semantic Task Search Tools
 * Semantic search and similarity matching for tasks
 */

import { tool } from 'ai';
import { requestWithAuth, AuthContext } from '../utils/http';
import { 
  semanticSearchTasksSchema, 
  bm25SearchTasksSchema,
  hybridSearchTasksSchema,
  findSimilarTasksSchema 
} from '../schemas/semantic-task';

/**
 * Semantic search for tasks by meaning and concept
 */
export const semanticSearchTasks = tool({
  description: `Search tasks by meaning and concept, not just exact keywords. Find tasks related to specific functionality, technologies, or development areas.
    Use this to find tasks like "authentication", "database", "frontend components", etc.`,
  inputSchema: semanticSearchTasksSchema,
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Semantic search for tasks:', input);

      // Build query parameters
      const queryParams = new URLSearchParams({
        query: input.query,
        limit: input.limit.toString(),
        similarity_threshold: input.similarity_threshold.toString()
      });

      if (input.project_id) {
        queryParams.append('project_id', input.project_id.toString());
      }

      if (input.sprint_id) {
        queryParams.append('sprint_id', input.sprint_id.toString());
      }

      const response = await requestWithAuth(
        `/tasks/semantic-search?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Failed to search tasks: ${response.error}`;
      }

      const data = response.data as any || {};
      const results = data.results || [];

      if (results.length === 0) {
        return `No tasks found matching "${input.query}" with similarity threshold ${input.similarity_threshold}. Try lowering the threshold (e.g., 0.5) for broader matches.`;
      }

      // Format results
      let summary = `Found ${results.length} task${results.length === 1 ? '' : 's'} related to "${input.query}":\n\n`;

      results.forEach((result: any, index: number) => {
        const task = result.task;
        const score = result.similarity_score;
        const matchPercentage = Math.round(score * 100);
        
        summary += `${index + 1}. **Task ${task.id}**: ${task.title} (${matchPercentage}% match)\n`;
        summary += `   - **Status**: ${task.status?.replace('_', ' ') || 'Unknown'}\n`;
        summary += `   - **Priority**: ${task.priority || 'Medium'}\n`;
        
        if (task.description) {
          const shortDesc = task.description.length > 100 
            ? task.description.substring(0, 100) + '...' 
            : task.description;
          summary += `   - **Description**: ${shortDesc}\n`;
        }
        
        if (task.sprint_id) {
          summary += `   - **Sprint**: ${task.sprint_id}\n`;
        }
        
        summary += '\n';
      });

      // Add search metadata
      summary += `**Search Info**: Found ${(data as any).total || results.length} results with similarity ≥ ${input.similarity_threshold}`;

      return summary;

    } catch (error) {
      console.error('Error in semanticSearchTasks:', error);
      return `Failed to search tasks: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Find tasks similar to a specific task
 */
export const findSimilarTasks = tool({
  description: `Find tasks that are similar to a specific task. Useful for finding related work, duplicate tasks, or tasks that might have similar implementation approaches.`,
  inputSchema: findSimilarTasksSchema,
  execute: async (input, { experimental_context }) => {
    try {
      console.log('Finding similar tasks:', input);

      // Build query parameters
      const queryParams = new URLSearchParams({
        limit: input.limit.toString(),
        similarity_threshold: input.similarity_threshold.toString()
      });

      const response = await requestWithAuth(
        `/tasks/${input.task_id}/similar?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Failed to find similar tasks: ${response.error}`;
      }

      const data = response.data as any || {};
      const results = data.results || [];

      if (results.length === 0) {
        return `No similar tasks found for task ${input.task_id} with similarity threshold ${input.similarity_threshold}. Try lowering the threshold for broader matches.`;
      }

      // Format results
      let summary = `Found ${results.length} task${results.length === 1 ? '' : 's'} similar to task ${input.task_id}:\n\n`;

      results.forEach((result: any, index: number) => {
        const task = result.task;
        const score = result.similarity_score;
        const matchPercentage = Math.round(score * 100);
        
        summary += `${index + 1}. **Task ${task.id}**: ${task.title} (${matchPercentage}% similar)\n`;
        summary += `   - **Status**: ${task.status?.replace('_', ' ') || 'Unknown'}\n`;
        summary += `   - **Priority**: ${task.priority || 'Medium'}\n`;
        
        if (task.description) {
          const shortDesc = task.description.length > 80 
            ? task.description.substring(0, 80) + '...' 
            : task.description;
          summary += `   - **Description**: ${shortDesc}\n`;
        }
        
        summary += '\n';
      });

      // Add insights
      summary += `**Insights**: These tasks share similar concepts, technologies, or implementation approaches with task ${input.task_id}.`;

      return summary;

    } catch (error) {
      console.error('Error in findSimilarTasks:', error);
      return `Failed to find similar tasks: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * BM25 keyword search for tasks
 */
export const bm25SearchTasks = tool({
  description: `Perform precise BM25 keyword search on tasks using industry-standard ranking algorithm.
    Perfect for finding tasks with specific terms like "authentication", "database", "API", "testing".
    Uses BM25 scoring which handles term frequency, document length normalization, and inverse document frequency.`,
  inputSchema: bm25SearchTasksSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = bm25SearchTasksSchema.parse(input);
      
      console.log('BM25 search for tasks:', validated);

      // Build query parameters
      const queryParams = new URLSearchParams({
        query: validated.query,
        limit: validated.limit.toString()
      });

      if (validated.project_id) {
        queryParams.append('project_id', validated.project_id.toString());
      }

      if (validated.sprint_id) {
        queryParams.append('sprint_id', validated.sprint_id.toString());
      }

      const response = await requestWithAuth(
        `/tasks/bm25-search?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Failed to search tasks: ${response.error}`;
      }

      const data = response.data as any || {};
      const results = data.results || [];

      if (results.length === 0) {
        return `No tasks found with BM25 keyword search for "${validated.query}".

BM25 search looks for exact keyword matches with intelligent scoring based on:
- Term frequency in task titles and descriptions
- Document length normalization  
- Inverse document frequency across corpus

Try:
- Using different or broader keywords
- Checking spelling of search terms
- Using the hybrid search for combined semantic + keyword approach`;
      }

      // Format results
      let summary = `Found ${results.length} task${results.length === 1 ? '' : 's'} with keywords "${validated.query}":\n\n`;

      results.forEach((result: any, index: number) => {
        const task = result.task;
        
        summary += `${index + 1}. **Task ${task.id}**: ${task.title}\n`;
        summary += `   - **Status**: ${task.status?.replace('_', ' ') || 'Unknown'}\n`;
        summary += `   - **Priority**: ${task.priority || 'Medium'}\n`;
        
        if (task.description) {
          const shortDesc = task.description.length > 100 
            ? task.description.substring(0, 100) + '...' 
            : task.description;
          summary += `   - **Description**: ${shortDesc}\n`;
        }
        
        if (task.sprint_id) {
          summary += `   - **Sprint**: ${task.sprint_id}\n`;
        }
        
        summary += '\n';
      });

      // Add search metadata
      summary += `**Search Info**: Found ${(data as any).total || results.length} keyword-matching results`;

      return summary;

    } catch (error) {
      console.error('Error in bm25SearchTasks:', error);
      return `Failed to perform BM25 search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Hybrid search combining semantic and keyword approaches for tasks
 */
export const hybridSearchTasks = tool({
  description: `Perform industry-standard hybrid search combining semantic AI with BM25 keyword search for tasks.
    
    Two modes available:
    1. **RRF (Reciprocal Rank Fusion)** - Recommended production approach that combines rankings
    2. **Weighted Scoring** - Legacy mode with configurable semantic/keyword weights
    
    RRF solves the "authentication" vs "login" problem by combining semantic understanding 
    with precise keyword matching using the formula: RRF = Σ(1/(k + rank_i))
    
    This is the industry standard used by ElasticSearch, OpenSearch, and Pinecone.`,
  inputSchema: hybridSearchTasksSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = hybridSearchTasksSchema.parse(input);
      
      // Validate weights sum to 1.0 only in weighted mode
      if (!validated.use_rrf) {
        const totalWeight = validated.semantic_weight + validated.keyword_weight;
        if (Math.abs(totalWeight - 1.0) > 0.001) {
          return `Error: When using weighted scoring (use_rrf=false), semantic weight (${validated.semantic_weight}) and keyword weight (${validated.keyword_weight}) must sum to 1.0. Current total: ${totalWeight}`;
        }
      }
      
      console.log('Hybrid search for tasks:', validated);

      // Build query parameters
      const queryParams = new URLSearchParams({
        query: validated.query,
        limit: validated.limit.toString(),
        semantic_weight: validated.semantic_weight.toString(),
        keyword_weight: validated.keyword_weight.toString(),
        similarity_threshold: validated.similarity_threshold.toString(),
        use_rrf: validated.use_rrf.toString()
      });

      if (validated.project_id) {
        queryParams.append('project_id', validated.project_id.toString());
      }

      if (validated.sprint_id) {
        queryParams.append('sprint_id', validated.sprint_id.toString());
      }

      const response = await requestWithAuth(
        `/tasks/hybrid-search?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (response.error) {
        return `Failed to perform hybrid search: ${response.error}`;
      }

      const data = response.data as any || {};
      const results = data.results || [];

      if (results.length === 0) {
        return `No tasks found for "${validated.query}" using hybrid search.
        
The search combined:
- **Semantic search** (${(validated.semantic_weight * 100).toFixed(0)}% weight): AI understanding of meaning
- **Keyword search** (${(validated.keyword_weight * 100).toFixed(0)}% weight): Traditional text matching

Try adjusting the search approach or using different terms.`;
      }

      // Detect potential duplicates by similar titles
      const duplicates = [];
      
      for (let i = 0; i < results.length; i++) {
        const task1 = results[i].task;
        const title1 = task1.title.toLowerCase();
        const words1 = new Set(title1.split(/\s+/).filter((w: string) => w.length > 3));
        
        for (let j = i + 1; j < results.length; j++) {
          const task2 = results[j].task;
          const title2 = task2.title.toLowerCase();
          const words2 = new Set(title2.split(/\s+/).filter((w: string) => w.length > 3));
          
          const intersection = new Set([...words1].filter(x => words2.has(x)));
          const similarity = intersection.size / Math.min(words1.size, words2.size);
          
          if (similarity > 0.6 && intersection.size >= 2) {
            duplicates.push([task1, task2]);
          }
        }
      }

      // Format results
      let summary = `Found ${results.length} task${results.length === 1 ? '' : 's'} related to "${validated.query}":\n\n`;

      results.forEach((result: any, index: number) => {
        const task = result.task;
        const score = result.similarity_score;
        const matchPercentage = score ? Math.round(score * 100) : 'N/A';
        
        summary += `${index + 1}. **Task ${task.id}**: ${task.title}`;
        if (score) summary += ` (${matchPercentage}% match)`;
        summary += '\n';
        summary += `   - **Status**: ${task.status?.replace('_', ' ') || 'Unknown'}\n`;
        summary += `   - **Priority**: ${task.priority || 'Medium'}\n`;
        
        if (task.description) {
          const shortDesc = task.description.length > 100 
            ? task.description.substring(0, 100) + '...' 
            : task.description;
          summary += `   - **Description**: ${shortDesc}\n`;
        }
        
        if (task.sprint_id) {
          summary += `   - **Sprint**: ${task.sprint_id}\n`;
        }
        
        summary += '\n';
      });

      // Add duplicate detection note if found
      if (duplicates.length > 0) {
        summary += `👉 **Note**: Task ${duplicates[0][0].id} and Task ${duplicates[0][1].id} look similar and might be duplicates.\n\n`;
      }

      // Add search metadata
      summary += `**Search Info**: Found ${(data as any).total || results.length} results using ${validated.use_rrf ? 'RRF' : 'weighted'} hybrid approach`;

      return summary;

    } catch (error) {
      console.error('Error in hybridSearchTasks:', error);
      return `Failed to perform hybrid search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

