/**
 * Velocity Management Tools for Product Owner Agent
 * These tools enable the AI agent to view velocity data and calculate average velocity for sprint capacity planning
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function to get sprint velocity with authentication context
 */
async function getSprintVelocityWithAuth(sprintId: number, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/velocity/sprint/${sprintId}/velocity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in getSprintVelocityWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to get project average velocity with authentication context
 */
async function getProjectAverageVelocityWithAuth(projectId: number, excludeSprintId: number | undefined, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (excludeSprintId) params.append('exclude_sprint_id', excludeSprintId.toString());

    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/velocity/project/${projectId}/velocity/average?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in getProjectAverageVelocityWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to get project velocity metrics with authentication context
 */
async function getProjectVelocityMetricsWithAuth(projectId: number, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/velocity/project/${projectId}/velocity/metrics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in getProjectVelocityMetricsWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

/**
 * Helper function to get project velocity trend with authentication context
 */
async function getProjectVelocityTrendWithAuth(projectId: number, limit: number, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to tool');
    return { error: 'Authentication context missing' };
  }

  try {
    // Make direct API call to backend with cookies
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${baseUrl}/velocity/project/${projectId}/velocity/trend?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward the cookies for authentication
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      return { error: error.detail || `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error in getProjectVelocityTrendWithAuth:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Define the Zod schema for sprint velocity retrieval
const getSprintVelocitySchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to get velocity for (can also be called sprintId or id)')
});

// Define the Zod schema for project average velocity
const getProjectAverageVelocitySchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to calculate average velocity for (can also be called projectId)'),
  
  exclude_sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('Optional sprint ID to exclude from the average calculation (can also be called excludeSprintId)')
});

// Define the Zod schema for project velocity metrics
const getProjectVelocityMetricsSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get comprehensive velocity metrics for (can also be called projectId)')
});

// Define the Zod schema for project velocity trend
const getProjectVelocityTrendSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to get velocity trend for (can also be called projectId)'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .default(5)
    .describe('Number of recent sprints to include in the trend (default: 5, max: 20)')
});

/**
 * Tool for getting velocity points of a specific sprint
 */
export const getSprintVelocityTool = tool({
  description: `Get the velocity points (completed story points) for a specific sprint. 
    This shows how many story points were actually completed during the sprint.
    Velocity is automatically calculated based on completed user stories and bugs.
    
    Supports various naming aliases:
    - Sprint ID: sprint_id, sprintId, id`,
  inputSchema: getSprintVelocitySchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = getSprintVelocitySchema.parse(input);

      console.log('Getting sprint velocity for sprint ID:', validated.sprint_id);

      // Call the API to get sprint velocity
      const response = await getSprintVelocityWithAuth(validated.sprint_id, experimental_context);

      if (response.error) {
        console.error('Failed to get sprint velocity:', response.error);
        return `Failed to get sprint velocity: ${response.error}`;
      }

      const velocityData = response.data;
      if (!velocityData) {
        return `No velocity data found for sprint ID ${validated.sprint_id}.`;
      }

      console.log('Successfully retrieved sprint velocity:', velocityData);

      // Format the response with velocity details
      const velocityMessage = `**Sprint Velocity Details**

**Sprint ID:** #${velocityData.sprint_id}
**Completed Story Points:** ${velocityData.velocity_points} points

This represents the total story points from user stories and bugs that were completed during this sprint. Velocity is automatically calculated when backlog items are marked as "Done".

${velocityData.velocity_points === 0 
  ? '⚠️ **Note:** No story points have been completed yet in this sprint.' 
  : velocityData.velocity_points >= 20 
    ? '🎯 **Great velocity!** This sprint achieved high productivity.' 
    : velocityData.velocity_points >= 10 
      ? '✅ **Good velocity!** This sprint had solid progress.' 
      : '📝 **Note:** This sprint had lower velocity - consider reviewing sprint scope or team capacity.'
}

You can use this velocity data to help plan future sprint capacities and estimate team productivity.`;

      return velocityMessage;

    } catch (error) {
      console.error('Error in getSprintVelocityTool:', error);
      return `Failed to get sprint velocity: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for calculating average velocity across completed sprints in a project
 */
export const getProjectAverageVelocityTool = tool({
  description: `Calculate the average velocity across all completed sprints in a project. 
    This is extremely useful for sprint capacity planning as it provides data-driven insights 
    based on the team's historical performance. You can optionally exclude a specific sprint 
    from the calculation (useful when planning a new sprint).
    
    Supports various naming aliases:
    - Project ID: project_id, projectId
    - Exclude Sprint ID: exclude_sprint_id, excludeSprintId`,
  inputSchema: getProjectAverageVelocitySchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = getProjectAverageVelocitySchema.parse(input);

      console.log('Getting project average velocity for project ID:', validated.project_id);

      // Call the API to get average velocity
      const response = await getProjectAverageVelocityWithAuth(
        validated.project_id, 
        validated.exclude_sprint_id, 
        experimental_context
      );

      if (response.error) {
        console.error('Failed to get project average velocity:', response.error);
        return `Failed to get project average velocity: ${response.error}`;
      }

      const velocityData = response.data;
      if (!velocityData) {
        return `No velocity data found for project ID ${validated.project_id}.`;
      }

      console.log('Successfully retrieved project average velocity:', velocityData);

      // Format the response with average velocity details
      const averageVelocity = velocityData.average_velocity;
      const excludeText = validated.exclude_sprint_id 
        ? ` (excluding sprint #${validated.exclude_sprint_id})` 
        : '';

      const velocityMessage = `**Project Average Velocity**

**Project ID:** ${velocityData.project_id}
**Average Velocity:** ${averageVelocity} story points per sprint${excludeText}

**Sprint Capacity Recommendations:**
${averageVelocity === 0 
  ? '⚠️ **No completed sprints yet** - Start with a conservative capacity of 10-15 story points for the first sprint.'
  : averageVelocity >= 25 
    ? `🚀 **High-performing team!** Consider sprint capacities of ${Math.round(averageVelocity * 0.9)}-${Math.round(averageVelocity * 1.1)} story points.`
    : averageVelocity >= 15 
      ? `✅ **Solid team velocity!** Consider sprint capacities of ${Math.round(averageVelocity * 0.9)}-${Math.round(averageVelocity * 1.1)} story points.`
      : averageVelocity >= 8 
        ? `📈 **Growing team!** Consider sprint capacities of ${Math.round(averageVelocity * 0.8)}-${Math.round(averageVelocity * 1.2)} story points.`
        : `🎯 **Starting team!** Consider sprint capacities of ${Math.round(averageVelocity * 0.8)}-${Math.round(averageVelocity * 1.3)} story points.`
}

**Planning Tips:**
- Use this average as a baseline for sprint capacity planning
- Allow for 10-20% variance based on sprint complexity and team availability
- Consider external factors like holidays, team changes, or technical complexity
- Track velocity trends over time to adjust capacity planning

This data-driven approach helps ensure realistic sprint goals and better predictability.`;

      return velocityMessage;

    } catch (error) {
      console.error('Error in getProjectAverageVelocityTool:', error);
      return `Failed to get project average velocity: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for getting comprehensive velocity metrics for a project
 */
export const getProjectVelocityMetricsTool = tool({
  description: `Get comprehensive velocity metrics for a project including average velocity, min/max velocity, 
    velocity trends, and total completed sprints. This provides a complete picture of team performance 
    and helps with advanced sprint planning and capacity management.
    
    Supports various naming aliases:
    - Project ID: project_id, projectId`,
  inputSchema: getProjectVelocityMetricsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = getProjectVelocityMetricsSchema.parse(input);

      console.log('Getting project velocity metrics for project ID:', validated.project_id);

      // Call the API to get velocity metrics
      const response = await getProjectVelocityMetricsWithAuth(validated.project_id, experimental_context);

      if (response.error) {
        console.error('Failed to get project velocity metrics:', response.error);
        return `Failed to get project velocity metrics: ${response.error}`;
      }

      const metricsData = response.data;
      if (!metricsData) {
        return `No velocity metrics found for project ID ${validated.project_id}.`;
      }

      console.log('Successfully retrieved project velocity metrics:', metricsData);

      // Format the comprehensive response
      const metrics = metricsData;
      const velocityRange = metrics.max_velocity - metrics.min_velocity;
      const consistency = velocityRange <= (metrics.average_velocity * 0.5) ? 'High' : 
                         velocityRange <= (metrics.average_velocity * 1.0) ? 'Medium' : 'Low';

      let metricsMessage = `**Comprehensive Velocity Metrics**

**Project ID:** ${metrics.project_id}

**Overall Statistics:**
- **Total Completed Sprints:** ${metrics.total_completed_sprints}
- **Average Velocity:** ${metrics.average_velocity} story points per sprint
- **Minimum Velocity:** ${metrics.min_velocity} story points
- **Maximum Velocity:** ${metrics.max_velocity} story points
- **Total Story Points Delivered:** ${metrics.total_story_points} points
- **Velocity Consistency:** ${consistency}

`;

      // Add velocity trend analysis if available
      if (metrics.velocity_trend && metrics.velocity_trend.length > 0) {
        metricsMessage += `**Recent Velocity Trend (Last ${metrics.velocity_trend.length} Sprints):**
${metrics.velocity_trend.map((trend, index) => {
  const trendIcon = index === 0 ? '📊' : 
                   trend.velocity_points > metrics.velocity_trend[index - 1].velocity_points ? '📈' :
                   trend.velocity_points < metrics.velocity_trend[index - 1].velocity_points ? '📉' : '➡️';
  return `${trendIcon} **${trend.sprint_name}:** ${trend.velocity_points} points${trend.end_date ? ` (${new Date(trend.end_date).toLocaleDateString()})` : ''}`;
}).join('\n')}

`;
      }

      // Add capacity planning recommendations
      metricsMessage += `**Sprint Capacity Planning Recommendations:**

${metrics.total_completed_sprints === 0 
  ? '⚠️ **No completed sprints yet** - Start with 10-15 story points for initial sprint planning.'
  : `🎯 **Recommended Sprint Capacity Range:** ${Math.round(metrics.average_velocity * 0.8)}-${Math.round(metrics.average_velocity * 1.2)} story points

**Planning Considerations:**
- **Conservative Planning:** Use ${Math.round(metrics.average_velocity * 0.9)} story points for sprints with high uncertainty
- **Aggressive Planning:** Use ${Math.round(metrics.average_velocity * 1.1)} story points for well-defined work
- **Consistency Level:** ${consistency} - ${
  consistency === 'High' ? 'Team delivers predictably, safe to plan near average' :
  consistency === 'Medium' ? 'Some variation expected, plan with 15-20% buffer' :
  'High variation, consider team capacity factors and plan conservatively'
}

**Team Performance Insights:**
${metrics.average_velocity >= 20 ? '🚀 High-performing team with strong delivery capability' :
  metrics.average_velocity >= 12 ? '✅ Solid team performance with good productivity' :
  metrics.average_velocity >= 6 ? '📈 Developing team with room for growth' :
  '🎯 Early-stage team, focus on process improvement and skill development'
}`
}`;

      return metricsMessage;

    } catch (error) {
      console.error('Error in getProjectVelocityMetricsTool:', error);
      return `Failed to get project velocity metrics: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for getting velocity trend for a project
 */
export const getProjectVelocityTrendTool = tool({
  description: `Get velocity trend data for a project showing recent sprint performance. 
    This helps identify patterns, improvements, or declines in team velocity over time.
    Useful for understanding team performance trends and making informed capacity decisions.
    
    Supports various naming aliases:
    - Project ID: project_id, projectId`,
  inputSchema: getProjectVelocityTrendSchema,
  execute: async (input, { experimental_context }) => {
    try {
      // Parse/validate input with Zod
      const validated = getProjectVelocityTrendSchema.parse(input);

      console.log('Getting project velocity trend for project ID:', validated.project_id);

      // Call the API to get velocity trend
      const response = await getProjectVelocityTrendWithAuth(
        validated.project_id, 
        validated.limit, 
        experimental_context
      );

      if (response.error) {
        console.error('Failed to get project velocity trend:', response.error);
        return `Failed to get project velocity trend: ${response.error}`;
      }

      const trendData = response.data;
      if (!trendData || !trendData.velocity_trend) {
        return `No velocity trend data found for project ID ${validated.project_id}.`;
      }

      console.log('Successfully retrieved project velocity trend:', trendData);

      const trends = trendData.velocity_trend;
      if (trends.length === 0) {
        return `No completed sprints found for project ID ${validated.project_id} to show velocity trends.`;
      }

      // Analyze the trend
      let trendAnalysis = '';
      if (trends.length >= 3) {
        const recent = trends.slice(-3);
        const isIncreasing = recent.every((sprint, index) => 
          index === 0 || sprint.velocity_points >= recent[index - 1].velocity_points
        );
        const isDecreasing = recent.every((sprint, index) => 
          index === 0 || sprint.velocity_points <= recent[index - 1].velocity_points
        );
        
        if (isIncreasing && !isDecreasing) {
          trendAnalysis = '📈 **Improving Trend:** Team velocity is increasing over recent sprints!';
        } else if (isDecreasing && !isIncreasing) {
          trendAnalysis = '📉 **Declining Trend:** Team velocity has been decreasing recently. Consider investigating impediments.';
        } else {
          trendAnalysis = '➡️ **Stable Trend:** Team velocity is relatively consistent across recent sprints.';
        }
      }

      // Format the response with trend details
      const trendMessage = `**Project Velocity Trend Analysis**

**Project ID:** ${trendData.project_id}
**Recent Sprints Analyzed:** ${trends.length}

**Velocity Trend (Chronological Order):**
${trends.map((trend, index) => {
  const position = index + 1;
  const trendIcon = index === 0 ? '📊' : 
                   trend.velocity_points > trends[index - 1].velocity_points ? '📈' :
                   trend.velocity_points < trends[index - 1].velocity_points ? '📉' : '➡️';
  return `${position}. ${trendIcon} **${trend.sprint_name}:** ${trend.velocity_points} story points${trend.end_date ? ` (${new Date(trend.end_date).toLocaleDateString()})` : ''}`;
}).join('\n')}

${trendAnalysis}

**Trend Insights:**
- **Highest Velocity:** ${Math.max(...trends.map(t => t.velocity_points))} story points
- **Lowest Velocity:** ${Math.min(...trends.map(t => t.velocity_points))} story points
- **Average (Recent ${trends.length} Sprints):** ${Math.round(trends.reduce((sum, t) => sum + t.velocity_points, 0) / trends.length)} story points

**Planning Recommendations:**
${trends.length >= 2 ? `
- **Next Sprint Capacity:** Consider ${Math.round(trends[trends.length - 1].velocity_points * 0.9)}-${Math.round(trends[trends.length - 1].velocity_points * 1.1)} story points based on most recent performance
- **Trend Consideration:** ${
  trendAnalysis.includes('Improving') ? 'Team is gaining momentum - consider slightly higher capacity' :
  trendAnalysis.includes('Declining') ? 'Team may be facing challenges - consider lower capacity until issues are resolved' :
  'Consistent performance - use recent average for capacity planning'
}` : '- Use the available sprint data as a baseline for future planning'}

Use this trend analysis to make informed decisions about sprint capacity and identify opportunities for process improvement.`;

      return trendMessage;

    } catch (error) {
      console.error('Error in getProjectVelocityTrendTool:', error);
      return `Failed to get project velocity trend: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Collection of all velocity management tools
 * Export this to use in the Product Owner Agent
 */
export const velocityManagementTools = {
  getSprintVelocity: getSprintVelocityTool,
  getProjectAverageVelocity: getProjectAverageVelocityTool,
  getProjectVelocityMetrics: getProjectVelocityMetricsTool,
  getProjectVelocityTrend: getProjectVelocityTrendTool,
};

/**
 * Type definition for the tools object
 * This ensures type safety when using the tools in the AI agent
 */
export type VelocityManagementTools = typeof velocityManagementTools;
