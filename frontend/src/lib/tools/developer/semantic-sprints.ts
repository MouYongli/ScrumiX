/**
 * Developer Semantic Sprint Search Tools
 * Semantic search for sprints by name, goal, and metadata
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestWithAuth, AuthContext } from '../utils/http';

/**
 * Semantic search for sprints by name, goal, and metadata
 */
export const semanticSearchSprints = tool({
  description: `Search sprints using semantic understanding of sprint names, goals, and metadata.
    Use this to find sprints by concept, purpose, or related themes across projects.`,
  inputSchema: z.object({
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .max(500, 'Query must be 500 characters or less')
      .describe('What you are looking for (describe the sprint concept, theme, or purpose)'),
    
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .optional()
      .describe('Filter by specific project ID (optional)'),
    
    limit: z.number()
      .int('Limit must be a whole number')
      .min(1, 'Limit must be at least 1')
      .max(50, 'Limit cannot exceed 50')
      .default(10)
      .describe('Maximum number of results to return (default: 10)')
  }),
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
        experimental_context
      );

      if (response.error) {
        return `Sprint search failed: ${response.error}`;
      }

      const results = response.data || [];

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
