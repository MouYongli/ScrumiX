import { tool } from 'ai';
import { z } from 'zod';
import { sprintMetricsSchema } from '../../schemas/scrum';
import { makeAuthenticatedRequest, getCurrentProjectContext } from '../utils';

/**
 * Schema for sprint access and information retrieval
 */
const sprintAccessSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project to query sprints for (auto-detected if not provided)'),
  
  status: z.enum(['active', 'completed', 'planning', 'all'])
    .default('active')
    .describe('Filter sprints by status - defaults to active sprints'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .positive('Limit must be positive')
    .max(50)
    .default(10)
    .describe('Maximum number of sprints to return')
});

/**
 * Tool for accessing sprint information and automatically detecting active sprints
 */
export const getSprintInfoTool = tool({
  description: `Access sprint information including current active sprint details. Automatically detects the active sprint 
    and provides sprint ID, name, dates, and status. Use this tool to get sprint context before performing other analyses.`,
  inputSchema: sprintAccessSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = sprintAccessSchema.parse(input);
      
      // Auto-detect project if not provided
      let projectId = validated.project_id;
      let projectName = '';
      
      if (!projectId) {
        const projectContext = await getCurrentProjectContext(experimental_context);
        if (!projectContext) {
          return `Unable to determine the current project context. Please provide a project_id or ensure you're working within a project.`;
        }
        projectId = projectContext.project_id;
        projectName = projectContext.project_name;
      }

      console.log('Accessing sprint information for project:', projectId);

      // Build query parameters
      const queryParams = new URLSearchParams({
        project_id: projectId.toString(),
        limit: validated.limit.toString()
      });

      if (validated.status !== 'all') {
        queryParams.append('status', validated.status);
      }

      // Get sprints
      const sprintsResponse = await makeAuthenticatedRequest(
        `/sprints/?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintsResponse.error) {
        return `Failed to retrieve sprint information: ${sprintsResponse.error}`;
      }

      const sprints = sprintsResponse.data || [];

      if (sprints.length === 0) {
        return `No sprints found for ${projectName || `project ${projectId}`} with status: ${validated.status}`;
      }

      // Find active sprint specifically
      const activeSprint = sprints.find((sprint: any) => 
        sprint.status === 'active' || sprint.status === 'in_progress'
      );

      // Format sprint information
      const sprintInfo = sprints.map((sprint: any) => {
        const startDate = new Date(sprint.start_date || sprint.startDate);
        const endDate = new Date(sprint.end_date || sprint.endDate);
        const isActive = sprint.status === 'active' || sprint.status === 'in_progress';
        
        return `${isActive ? '🎯 **ACTIVE**' : '📋'} **${sprint.sprint_name || sprint.sprintName}** (ID: ${sprint.id || sprint.sprint_id})
- Status: ${sprint.status}
- Duration: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
- Sprint Goal: ${sprint.sprint_goal || sprint.goal || 'Not specified'}`;
      }).join('\n\n');

      const report = `# Sprint Information - ${projectName || `Project ${projectId}`}

## Sprint Overview
${validated.status === 'active' ? 'Showing active sprints' : `Showing ${validated.status} sprints`} (${sprints.length} found)

${sprintInfo}

${activeSprint ? `
## Current Active Sprint Details
- **Sprint ID:** ${activeSprint.id || activeSprint.sprint_id}
- **Sprint Name:** ${activeSprint.sprint_name || activeSprint.sprintName}
- **Status:** ${activeSprint.status}
- **Start Date:** ${new Date(activeSprint.start_date || activeSprint.startDate).toLocaleDateString()}
- **End Date:** ${new Date(activeSprint.end_date || activeSprint.endDate).toLocaleDateString()}
- **Sprint Goal:** ${activeSprint.sprint_goal || activeSprint.goal || 'Not specified'}

*This active sprint will be used automatically for burndown analysis and velocity calculations.*
` : validated.status === 'active' ? '\n⚠️ **No active sprint found** - Create and start a sprint to enable automatic analysis.' : ''}

**Query Date:** ${new Date().toLocaleString()}`;

      return report;

    } catch (error) {
      console.error('Error in getSprintInfoTool:', error);
      return `Failed to access sprint information: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for comprehensive sprint health analysis and monitoring
 */
export const analyzeSprintHealthTool = tool({
  description: `Analyze current sprint health with comprehensive metrics including burndown data, velocity tracking, 
    and team performance indicators. Use this tool to assess sprint progress, detect anomalies, and provide 
    data-driven recommendations to the Scrum Master.`,
  inputSchema: sprintMetricsSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = sprintMetricsSchema.parse(input);
      console.log('Analyzing sprint health for sprint:', validated.sprint_id);

      // Get sprint details
      const sprintResponse = await makeAuthenticatedRequest(
        `/sprints/${validated.sprint_id}`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintResponse.error) {
        return `Failed to retrieve sprint details: ${sprintResponse.error}`;
      }

      const sprint = sprintResponse.data;

      // Get sprint backlog and statistics
      const [backlogResponse, statsResponse] = await Promise.all([
        makeAuthenticatedRequest(
          `/sprints/${validated.sprint_id}/backlog`,
          { method: 'GET' },
          experimental_context
        ),
        makeAuthenticatedRequest(
          `/sprints/${validated.sprint_id}/statistics`,
          { method: 'GET' },
          experimental_context
        )
      ]);

      if (backlogResponse.error) {
        return `Failed to retrieve sprint backlog: ${backlogResponse.error}`;
      }

      const backlogItems = backlogResponse.data || [];
      const stats = statsResponse.error ? {} : (statsResponse.data || {});

      // Calculate sprint progress metrics
      const totalItems = backlogItems.length;
      const completedItems = backlogItems.filter((item: any) => item.status === 'done').length;
      const inProgressItems = backlogItems.filter((item: any) => item.status === 'in_progress').length;
      const todoItems = backlogItems.filter((item: any) => item.status === 'todo').length;
      
      const totalStoryPoints = backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const completedStoryPoints = backlogItems
        .filter((item: any) => item.status === 'done')
        .reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);

      // Calculate sprint timeline - handle both field name formats
      const sprintStartDate = sprint.start_date || sprint.startDate;
      const sprintEndDate = sprint.end_date || sprint.endDate;
      
      if (!sprintStartDate || !sprintEndDate) {
        return `Sprint dates are missing from the API response. Available fields: ${Object.keys(sprint).join(', ')}`;
      }
      
      const sprintStart = new Date(sprintStartDate);
      const sprintEnd = new Date(sprintEndDate);
      const now = new Date();
      const sprintDuration = sprintEnd.getTime() - sprintStart.getTime();
      const elapsed = now.getTime() - sprintStart.getTime();
      const progressPercentage = Math.min(100, Math.max(0, (elapsed / sprintDuration) * 100));

      // Detect potential issues
      const issues = [];
      const recommendations = [];

      // Progress vs time analysis
      const expectedProgress = progressPercentage;
      const actualProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      const progressDelta = actualProgress - expectedProgress;

      if (progressDelta < -20) {
        issues.push('Sprint is significantly behind schedule');
        recommendations.push('Consider daily standup focus on impediments and consider scope adjustment');
      } else if (progressDelta < -10) {
        issues.push('Sprint is falling behind schedule');
        recommendations.push('Increase focus on completing in-progress items before starting new work');
      }

      // Work distribution analysis
      if (inProgressItems > totalItems * 0.5) {
        issues.push('Too many items in progress simultaneously');
        recommendations.push('Encourage team to focus on completing items rather than starting new ones');
      }

      // Story points analysis
      const storyPointProgress = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;
      if (Math.abs(storyPointProgress - actualProgress) > 15) {
        issues.push('Story point completion differs significantly from item completion');
        recommendations.push('Review story point estimates and consider refinement in next retrospective');
      }

      // Generate comprehensive health report
      const healthScore = Math.max(0, Math.min(100, 
        (actualProgress * 0.4) + 
        (Math.max(0, 100 + progressDelta) * 0.3) + 
        (Math.max(0, 100 - (inProgressItems / totalItems * 100)) * 0.3)
      ));

      const healthStatus = healthScore >= 80 ? 'Excellent' : 
                          healthScore >= 60 ? 'Good' : 
                          healthScore >= 40 ? 'At Risk' : 'Critical';

      const report = `# Sprint Health Analysis - ${sprint.sprint_name}

## Overall Health Score: ${healthScore.toFixed(1)}/100 (${healthStatus})

### Sprint Overview
- **Sprint Goal:** ${sprint.sprint_goal || 'Not specified'}
${statsResponse.error ? '- **Note:** Advanced statistics temporarily unavailable' : ''}
- **Duration:** ${sprintStart.toLocaleDateString()} - ${sprintEnd.toLocaleDateString()}
- **Status:** ${sprint.status}
- **Time Progress:** ${progressPercentage.toFixed(1)}% elapsed

### Progress Metrics
- **Items Completed:** ${completedItems}/${totalItems} (${actualProgress.toFixed(1)}%)
- **Story Points Completed:** ${completedStoryPoints}/${totalStoryPoints} (${storyPointProgress.toFixed(1)}%)
- **Items In Progress:** ${inProgressItems}
- **Items Remaining:** ${todoItems}

### Work Distribution
${backlogItems.map((item: any, index: number) => {
  const statusDisplay = item.status.replace('_', ' ').split(' ').map((word: string) => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  const priorityDisplay = item.priority.charAt(0).toUpperCase() + item.priority.slice(1).toLowerCase();
  
  return `${index + 1}. **${item.title}** (${item.story_point || 0} pts)
   - Status: ${statusDisplay} | Priority: ${priorityDisplay}`;
}).join('\n')}

${issues.length > 0 ? `### 🚨 Issues Detected
${issues.map(issue => `- ${issue}`).join('\n')}` : '### ✅ No Critical Issues Detected'}

${recommendations.length > 0 ? `### 💡 Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}` : ''}

### Next Actions
- Review progress in next Daily Scrum
- Address any impediments blocking in-progress items
- Consider scope adjustment if timeline risk persists
- Schedule retrospective items based on identified patterns

**Last Updated:** ${now.toLocaleString()}`;

      return report;

    } catch (error) {
      console.error('Error in analyzeSprintHealthTool:', error);
      return `Failed to analyze sprint health: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});
