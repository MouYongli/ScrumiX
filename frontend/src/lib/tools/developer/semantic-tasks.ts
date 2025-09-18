/**
 * Developer Semantic Task Search Tools
 * Semantic search and similarity matching for tasks
 */

import { tool } from 'ai';
import { requestWithAuth, AuthContext } from '../utils/http';
import { semanticSearchTasksSchema, findSimilarTasksSchema } from '../schemas/semantic-task';

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

