/**
 * Semantic Sprint Management Tools for Product Owner Agent
 * These tools provide AI-powered semantic search capabilities for sprints
 * Built on top of pgvector semantic search infrastructure
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function to make authenticated API calls to semantic search endpoints
 */
async function makeAuthenticatedSemanticCall(
  endpoint: string,
  method: 'GET' | 'POST',
  context: any,
  body?: any
) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to semantic search tool');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in makeAuthenticatedSemanticCall:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Schema for semantic search of sprints
const semanticSearchSprintsSchema = z.object({
  query: z.string()
    .min(1, 'Search query cannot be empty')
    .describe('Natural language search query to find relevant sprints'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('Project ID to scope the search (auto-detected if not provided)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Maximum number of results to return (default: 5)')
});

// Schema for finding similar sprints based on an existing sprint
const findSimilarSprintsSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('ID of the sprint to find similar sprints for'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(10, 'Limit cannot exceed 10')
    .default(3)
    .describe('Maximum number of similar sprints to return (default: 3)')
});

/**
 * Tool for semantic search of sprints
 * Uses AI embeddings to find contextually relevant sprints based on meaning
 */
export const semanticSearchSprintsTool = tool({
  description: `Search sprints using AI-powered semantic understanding. This tool finds sprints based on 
    meaning and context of sprint names, goals, and themes, not just keyword matching. Perfect for finding 
    sprints with similar objectives, themes, or focus areas.
    
    Examples:
    - "user interface improvements" → finds UI/UX focused sprints
    - "performance optimization" → finds sprints focused on speed and efficiency
    - "mobile features" → finds sprints with mobile-specific work
    - "security enhancements" → finds security-focused sprint work`,
  inputSchema: semanticSearchSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = semanticSearchSprintsSchema.parse(input);
      
      console.log('Performing semantic search for sprints:', validated);

      // Call the semantic search API for sprints
      const response = await makeAuthenticatedSemanticCall(
        '/semantic-search/sprints/search',
        'POST',
        experimental_context,
        {
          query: validated.query,
          project_id: validated.project_id,
          limit: validated.limit
        }
      );

      if (response.error) {
        console.error('Semantic sprint search failed:', response.error);
        return `Failed to perform semantic sprint search: ${response.error}`;
      }

      const results = response.data?.results || [];
      
      if (results.length === 0) {
        return `No sprints found matching the semantic query: "${validated.query}"`;
      }

      console.log(`Found ${results.length} semantically similar sprints`);

      // Format the results with semantic relevance scores
      const formattedResults = `**Semantic Sprint Search Results** for "${validated.query}":

${results.map((sprint: any, index: number) => {
  const similarity = (sprint.similarity * 100).toFixed(1);
  const status = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = new Date(sprint.start_date).toLocaleDateString();
  const endDate = new Date(sprint.end_date).toLocaleDateString();
  
  return `${index + 1}. **Sprint #${sprint.id}** (${similarity}% match)
   **"${sprint.sprint_name}"**
   - **Status**: ${status}
   - **Duration**: ${startDate} to ${endDate}
   - **Capacity**: ${sprint.sprint_capacity || 'Not set'} story points${sprint.sprint_goal ? `\n   - **Goal**: ${sprint.sprint_goal.length > 100 ? sprint.sprint_goal.substring(0, 100) + '...' : sprint.sprint_goal}` : ''}`;
}).join('\n\n')}

**Search Insights**:
- **Total Matches**: ${results.length}
- **Best Match**: ${(results[0].similarity * 100).toFixed(1)}% semantic similarity
- **Search Type**: AI-powered semantic understanding

These results are ranked by semantic similarity, meaning they match the intent and context of your query based on sprint themes and objectives.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in semanticSearchSprintsTool:', error);
      return `Failed to perform semantic sprint search: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for finding similar sprints based on an existing sprint
 * Uses semantic similarity to discover sprints with similar themes or objectives
 */
export const findSimilarSprintsTool = tool({
  description: `Find sprints that are similar to a specific existing sprint. This tool uses AI to identify 
    sprints with similar goals, themes, or focus areas. Useful for:
    - Finding sprints with similar objectives for comparison
    - Identifying patterns in sprint planning
    - Learning from previous sprints with similar goals
    - Planning future sprints based on successful similar ones`,
  inputSchema: findSimilarSprintsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = findSimilarSprintsSchema.parse(input);
      
      console.log('Finding similar sprints for:', validated.sprint_id);

      // Call the similar sprints API
      const response = await makeAuthenticatedSemanticCall(
        `/semantic-search/sprints/${validated.sprint_id}/similar?limit=${validated.limit}`,
        'GET',
        experimental_context
      );

      if (response.error) {
        console.error('Similar sprints search failed:', response.error);
        return `Failed to find similar sprints: ${response.error}`;
      }

      const data = response.data;
      const sourceSprint = data?.source_sprint;
      const similarSprints = data?.similar_sprints || [];
      
      if (!sourceSprint) {
        return `Sprint #${validated.sprint_id} not found.`;
      }

      if (similarSprints.length === 0) {
        return `No similar sprints found for Sprint #${validated.sprint_id}: "${sourceSprint.sprint_name}"`;
      }

      console.log(`Found ${similarSprints.length} similar sprints`);

      // Format the results
      const sourceStatus = sourceSprint.status.charAt(0).toUpperCase() + sourceSprint.status.slice(1);
      const sourceStartDate = new Date(sourceSprint.start_date).toLocaleDateString();
      const sourceEndDate = new Date(sourceSprint.end_date).toLocaleDateString();

      const formattedResults = `**Similar Sprints Analysis** for:
**Sprint #${sourceSprint.id}**: "${sourceSprint.sprint_name}"
- **Status**: ${sourceStatus} | **Duration**: ${sourceStartDate} to ${sourceEndDate} | **Capacity**: ${sourceSprint.sprint_capacity || 'Not set'} points${sourceSprint.sprint_goal ? `\n- **Goal**: ${sourceSprint.sprint_goal}` : ''}

**Found ${similarSprints.length} Similar Sprints**:

${similarSprints.map((sprint: any, index: number) => {
  const similarity = (sprint.similarity * 100).toFixed(1);
  const status = sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1);
  const startDate = new Date(sprint.start_date).toLocaleDateString();
  const endDate = new Date(sprint.end_date).toLocaleDateString();
  
  // Determine similarity level
  let similarityLevel = '';
  if (sprint.similarity >= 0.8) similarityLevel = '🔴 Very High (Very Similar Objectives)';
  else if (sprint.similarity >= 0.7) similarityLevel = '🟠 High (Similar Focus Areas)';
  else if (sprint.similarity >= 0.6) similarityLevel = '🟡 Medium (Related Themes)';
  else similarityLevel = '🟢 Low (Loosely Related)';
  
  return `${index + 1}. **Sprint #${sprint.id}** - ${similarity}% similar
   ${similarityLevel}
   **"${sprint.sprint_name}"**
   - **Status**: ${status} | **Duration**: ${startDate} to ${endDate} | **Capacity**: ${sprint.sprint_capacity || 'Not set'} points${sprint.sprint_goal ? `\n   - **Goal**: ${sprint.sprint_goal.length > 80 ? sprint.sprint_goal.substring(0, 80) + '...' : sprint.sprint_goal}` : ''}`;
}).join('\n\n')}

**Analysis Summary**:
- **High Similarity (≥70%)**: ${similarSprints.filter((sprint: any) => sprint.similarity >= 0.7).length} sprints (similar objectives or focus)
- **Medium Similarity (60-69%)**: ${similarSprints.filter((sprint: any) => sprint.similarity >= 0.6 && sprint.similarity < 0.7).length} sprints (related themes)
- **Low Similarity (50-59%)**: ${similarSprints.filter((sprint: any) => sprint.similarity >= 0.5 && sprint.similarity < 0.6).length} sprints (loosely related)

**Strategic Insights**:
${similarSprints.some((sprint: any) => sprint.similarity >= 0.8) ? '🎯 **Pattern Recognition**: Very similar sprints suggest consistent strategic focus areas.' : ''}
${similarSprints.some((sprint: any) => sprint.similarity >= 0.7 && sprint.similarity < 0.8) ? '📋 **Theme Consistency**: Similar focus areas indicate good strategic alignment.' : ''}
${similarSprints.length > 2 ? '🔍 **Planning Opportunity**: Review successful patterns from similar sprints for future planning.' : ''}

Use these insights to understand sprint patterns, learn from similar objectives, and improve future sprint planning.`;

      return formattedResults;

    } catch (error) {
      console.error('Error in findSimilarSprintsTool:', error);
      return `Failed to find similar sprints: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Semantic sprint management tools collection
 * These complement the existing sprint management tools with AI-powered capabilities
 */
export const semanticSprintManagementTools = {
  semanticSearchSprints: semanticSearchSprintsTool,
  findSimilarSprints: findSimilarSprintsTool
};

/**
 * Type definition for semantic sprint tools
 */
export type SemanticSprintManagementTools = typeof semanticSprintManagementTools;

// Export individual tools
export {
  semanticSearchSprintsTool,
  findSimilarSprintsTool
};
