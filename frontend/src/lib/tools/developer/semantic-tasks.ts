/**
 * Developer Semantic Task Search Tools
 * Semantic search and similarity matching for tasks
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestWithAuth, AuthContext } from '../utils/http';

/**
 * Semantic search for tasks by meaning and concept
 */
export const semanticSearchTasks = tool({
  description: `Search tasks by meaning and concept, not just exact keywords. Find tasks related to specific functionality, technologies, or development areas.
    Use this to find tasks like "authentication", "database", "frontend components", etc.`,
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project'),
    query: z.string()
      .min(1, 'Search query is required')
      .max(500, 'Search query must be 500 characters or less')
      .describe('What you\'re looking for (e.g., "authentication tasks", "database setup", "UI components")'),
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .optional()
      .describe('Filter to specific sprint (optional - will use active sprint if not provided)'),
    limit: z.number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(50, 'Limit cannot exceed 50')
      .default(10)
      .describe('Maximum number of results to return'),
    similarity_threshold: z.number()
      .min(0, 'Similarity threshold must be between 0 and 1')
      .max(1, 'Similarity threshold must be between 0 and 1')
      .default(0.7)
      .describe('Minimum similarity score (0.7 = good matches, 0.5 = broader matches)')
  }),
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
        experimental_context
      );

      if (response.error) {
        return `Failed to search tasks: ${response.error}`;
      }

      const data = response.data || {};
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
      summary += `**Search Info**: Found ${data.total || results.length} results with similarity ≥ ${input.similarity_threshold}`;

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
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project'),
    task_id: z.number()
      .int('Task ID must be a whole number')
      .positive('Task ID must be a positive integer')
      .describe('The ID of the task to find similar tasks for'),
    limit: z.number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(20, 'Limit cannot exceed 20')
      .default(5)
      .describe('Maximum number of similar tasks to return'),
    similarity_threshold: z.number()
      .min(0, 'Similarity threshold must be between 0 and 1')
      .max(1, 'Similarity threshold must be between 0 and 1')
      .default(0.6)
      .describe('Minimum similarity score (0.6 = good matches, 0.4 = broader matches)')
  }),
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
        experimental_context
      );

      if (response.error) {
        return `Failed to find similar tasks: ${response.error}`;
      }

      const data = response.data || {};
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

