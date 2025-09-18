/**
 * Semantic Search Tools for Sprint Backlog Management (Developer Agent)
 * These tools enable semantic search within sprint backlogs and available items
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function for semantic search API calls with authentication
 */
async function semanticSearchWithAuth(searchData: any, endpoint: string, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to semantic search tool');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(searchData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Search request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in semantic search:', error);
    return { error: error instanceof Error ? error.message : 'Search failed' };
  }
}

/**
 * Helper function to detect potential duplicates in search results
 */
function detectDuplicates(results: any[]): Array<[any, any]> {
  const duplicates: Array<[any, any]> = [];
  
  for (let i = 0; i < results.length - 1; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const item1 = results[i].backlog;
      const item2 = results[j].backlog;
      
      if (item1 && item2) {
        const title1Words = new Set(item1.title.toLowerCase().split(/\s+/).filter((word: string) => word.length > 3));
        const title2Words = new Set(item2.title.toLowerCase().split(/\s+/).filter((word: string) => word.length > 3));
        const intersection = new Set([...title1Words].filter(word => title2Words.has(word)));
        const union = new Set([...title1Words, ...title2Words]);
        
        if (intersection.size > 0 && intersection.size / union.size > 0.4) {
          duplicates.push([item1, item2]);
        }
      }
    }
  }
  
  return duplicates.slice(0, 3); // Limit to 3 duplicate pairs
}

/**
 * Tool for semantic search within sprint backlog items
 */
export const semanticSearchSprintTool = tool({
  description: `Search sprint backlog items by meaning and concept, not just keywords. 
    Use this when looking for items by intent, functionality, or related concepts within the current sprint.
    Perfect for finding related work, similar features, or items that address similar user needs.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint to search within'),
    
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .max(500, 'Query must be 500 characters or less')
      .describe('What you are looking for (describe the concept, feature, or functionality)'),
    
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
        sprint_id: input.sprint_id,
        limit: input.limit
      };

      console.log(`Performing semantic search in sprint ${validated.sprint_id} for: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        sprint_id: validated.sprint_id,
        limit: validated.limit
      };

      const response = await semanticSearchWithAuth(
        searchData, 
        '/semantic-search/sprint-backlog', 
        experimental_context
      );

      if (response.error) {
        return `Search failed: ${response.error}`;
      }

      const results = response.data || [];

      if (results.length === 0) {
        return `No items found in sprint ${validated.sprint_id} related to "${validated.query}".`;
      }

      console.log(`Found ${results.length} semantically similar items in sprint`);

      // Detect potential duplicates
      const duplicates = detectDuplicates(results);

      // Format results concisely
      const formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} in Sprint ${validated.sprint_id} related to "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${statusDisplay})`;
}).join('\n\n')}`;

      // Add duplicate detection note if found
      let finalResult = formattedResults;
      if (duplicates.length > 0) {
        finalResult += `\n\n👉 **Note**: #${duplicates[0][0].id} and #${duplicates[0][1].id} look similar and might be duplicates.`;
      }

      return finalResult;

    } catch (error) {
      console.error('Error in semanticSearchSprintTool:', error);
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for keyword search within sprint backlog items
 */
export const keywordSearchSprintTool = tool({
  description: `Search sprint backlog items using specific keywords and terms.
    Use this when looking for items with exact terms, technical names, or specific phrases within the current sprint.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint to search within'),
    
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .max(500, 'Query must be 500 characters or less')
      .describe('Keywords or phrases to search for'),
    
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
        sprint_id: input.sprint_id,
        limit: input.limit
      };

      console.log(`Performing keyword search in sprint ${validated.sprint_id} for: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        sprint_id: validated.sprint_id,
        limit: validated.limit
      };

      const response = await semanticSearchWithAuth(
        searchData, 
        '/semantic-search/sprint-backlog/bm25', 
        experimental_context
      );

      if (response.error) {
        return `Search failed: ${response.error}`;
      }

      const results = response.data || [];

      if (results.length === 0) {
        return `No items found in sprint ${validated.sprint_id} with keywords "${validated.query}".`;
      }

      console.log(`Found ${results.length} items with keyword search in sprint`);

      // Format results concisely
      const formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} in Sprint ${validated.sprint_id} with keywords "${validated.query}":

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
      console.error('Error in keywordSearchSprintTool:', error);
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for hybrid search within sprint backlog items
 */
export const hybridSearchSprintTool = tool({
  description: `Comprehensive search combining semantic understanding with keyword matching for sprint backlog items.
    This is the most thorough search method - use when you want to find all relevant items in the sprint.`,
  inputSchema: z.object({
    sprint_id: z.number()
      .int('Sprint ID must be a whole number')
      .positive('Sprint ID must be a positive integer')
      .describe('The ID of the sprint to search within'),
    
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .max(500, 'Query must be 500 characters or less')
      .describe('What you are looking for (combines concept and keyword search)'),
    
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
        sprint_id: input.sprint_id,
        limit: input.limit
      };

      console.log(`Performing hybrid search in sprint ${validated.sprint_id} for: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        sprint_id: validated.sprint_id,
        limit: validated.limit,
        use_rrf: true
      };

      const response = await semanticSearchWithAuth(
        searchData, 
        '/semantic-search/sprint-backlog/hybrid', 
        experimental_context
      );

      if (response.error) {
        return `Search failed: ${response.error}`;
      }

      const results = response.data || [];

      if (results.length === 0) {
        return `No items found in sprint ${validated.sprint_id} related to "${validated.query}".`;
      }

      console.log(`Found ${results.length} items with hybrid search in sprint`);

      // Detect potential duplicates
      const duplicates = detectDuplicates(results);

      // Format results concisely
      const formattedResults = `Found ${results.length} item${results.length === 1 ? '' : 's'} in Sprint ${validated.sprint_id} related to "${validated.query}":

${results.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${statusDisplay})`;
}).join('\n\n')}`;

      // Add duplicate detection note if found
      let finalResult = formattedResults;
      if (duplicates.length > 0) {
        finalResult += `\n\n👉 **Note**: #${duplicates[0][0].id} and #${duplicates[0][1].id} look similar and might be duplicates.`;
      }

      return finalResult;

    } catch (error) {
      console.error('Error in hybridSearchSprintTool:', error);
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for semantic search within available backlog items (not in any sprint)
 */
export const semanticSearchAvailableItemsTool = tool({
  description: `Search available backlog items (not in any sprint) by meaning and concept.
    Use this to find items that could be added to the current sprint based on functionality or user needs.`,
  inputSchema: z.object({
    project_id: z.number()
      .int('Project ID must be a whole number')
      .positive('Project ID must be a positive integer')
      .describe('The ID of the project to search within'),
    
    query: z.string()
      .min(1, 'Search query cannot be empty')
      .max(500, 'Query must be 500 characters or less')
      .describe('What you are looking for (describe the concept, feature, or functionality)'),
    
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

      console.log(`Performing semantic search for available items in project ${validated.project_id} for: "${validated.query}"`);

      const searchData = {
        query: validated.query,
        project_id: validated.project_id,
        limit: validated.limit,
        exclude_sprint_items: true // Only search items not in any sprint
      };

      const response = await semanticSearchWithAuth(
        searchData, 
        '/semantic-search/backlogs', 
        experimental_context
      );

      if (response.error) {
        return `Search failed: ${response.error}`;
      }

      const results = response.data || [];

      if (results.length === 0) {
        return `No available items found in project ${validated.project_id} related to "${validated.query}".`;
      }

      // Filter to only stories and bugs (no epics in sprints)
      const sprintEligible = results.filter((result: any) => 
        result.backlog.item_type === 'story' || result.backlog.item_type === 'bug'
      );

      if (sprintEligible.length === 0) {
        return `Found items related to "${validated.query}", but none are sprint-eligible (stories or bugs).`;
      }

      console.log(`Found ${sprintEligible.length} available sprint-eligible items`);

      // Detect potential duplicates
      const duplicates = detectDuplicates(sprintEligible);

      // Format results concisely
      const formattedResults = `Found ${sprintEligible.length} available item${sprintEligible.length === 1 ? '' : 's'} related to "${validated.query}" that can be added to sprint:

${sprintEligible.map((result: any, index: number) => {
  const item = result.backlog;
  const itemTypeDisplay = item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
  const priorityDisplay = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
  
  return `${itemTypeDisplay} #${item.id} — ${item.title} (${priorityDisplay} priority, ${item.story_point || 'not estimated'} points)`;
}).join('\n\n')}`;

      // Add duplicate detection note if found
      let finalResult = formattedResults;
      if (duplicates.length > 0) {
        finalResult += `\n\n👉 **Note**: #${duplicates[0][0].id} and #${duplicates[0][1].id} look similar and might be duplicates.`;
      }

      return finalResult;

    } catch (error) {
      console.error('Error in semanticSearchAvailableItemsTool:', error);
      return `Search failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Collection of semantic search tools for sprint management
 */
export const semanticSprintTools = {
  semanticSearchSprint: semanticSearchSprintTool,
  keywordSearchSprint: keywordSearchSprintTool,
  hybridSearchSprint: hybridSearchSprintTool,
  semanticSearchAvailableItems: semanticSearchAvailableItemsTool
};

/**
 * Type definition for the semantic sprint tools
 */
export type SemanticSprintTools = typeof semanticSprintTools;
