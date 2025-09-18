/**
 * Sprint information and health analysis tools for Scrum Master
 */

import { tool } from 'ai';
import { z } from 'zod';

// Import shared schemas and utilities from parent scrum-master.ts
// We'll need to import these from the main file temporarily until we can refactor schemas
const sprintAccessSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
  
  status: z.enum(['all', 'active', 'completed', 'planned'])
    .default('active')
    .describe('Filter sprints by status'),
  
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10)
    .describe('Maximum number of sprints to return')
});

const sprintMetricsSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to analyze'),
  
  include_team_metrics: z.boolean()
    .default(true)
    .describe('Whether to include team performance metrics'),
});

// Import shared utilities
import { requestWithAuth, getCurrentProjectContext, type AuthContext } from '../../utils';

/**
 * Tool for accessing sprint information including current active sprint details
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
        const projectContext = await getCurrentProjectContext(experimental_context as AuthContext);
        if (!projectContext) {
          return `Unable to determine the current project context. Please provide a project_id or ensure you're working within a project.`;
        }
        projectId = projectContext.project_id;
        projectName = projectContext.project_name;
      }

      console.log('Accessing sprint information for project:', projectId);

      // Build query parameters
      const queryParams = new URLSearchParams({
        project_id: projectId!.toString(),
        limit: validated.limit.toString()
      });

      if (validated.status !== 'all') {
        queryParams.append('status', validated.status);
      }

      // Get sprints
      const sprintsResponse = await requestWithAuth(
        `/sprints/?${queryParams.toString()}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (sprintsResponse.error) {
        return `Failed to retrieve sprint information: ${sprintsResponse.error}`;
      }

      const sprints = (sprintsResponse.data as any[]) || [];

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
-- Status: ${sprint.status}
-- Duration: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
-- Sprint Goal: ${sprint.sprint_goal || sprint.goal || 'Not specified'}`;
      }).join('\n\n');

      const report = `# Sprint Information - ${projectName || `Project ${projectId}`}

## Sprint Overview
${validated.status === 'active' ? 'Showing active sprints' : `Showing ${validated.status} sprints`} (${sprints.length} found)

${sprintInfo}

${activeSprint ? `
## Current Active Sprint Details
-- **Sprint ID:** ${activeSprint.id || activeSprint.sprint_id}
-- **Sprint Name:** ${activeSprint.sprint_name || activeSprint.sprintName}
-- **Status:** ${activeSprint.status}
-- **Start Date:** ${new Date(activeSprint.start_date || activeSprint.startDate).toLocaleDateString()}
-- **End Date:** ${new Date(activeSprint.end_date || activeSprint.endDate).toLocaleDateString()}
-- **Sprint Goal:** ${activeSprint.sprint_goal || activeSprint.goal || 'Not specified'}

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
 * Tool for analyzing current sprint health with comprehensive metrics
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
      const sprintResponse = await requestWithAuth(
        `/sprints/${validated.sprint_id}`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (sprintResponse.error) {
        return `Failed to retrieve sprint details: ${sprintResponse.error}`;
      }

      const sprint = sprintResponse.data as any;

      // Get sprint backlog and statistics
      const [backlogResponse, statsResponse] = await Promise.all([
        requestWithAuth(
          `/sprints/${validated.sprint_id}/backlog`,
          { method: 'GET' },
          experimental_context as AuthContext
        ),
        requestWithAuth(
          `/sprints/${validated.sprint_id}/statistics`,
          { method: 'GET' },
          experimental_context as AuthContext
        )
      ]);

      if (backlogResponse.error) {
        return `Failed to retrieve sprint backlog: ${backlogResponse.error}`;
      }

      const backlogItems = (backlogResponse.data as any[]) || [];
      const stats = statsResponse.error ? {} : (statsResponse.data as any) || {};

      // Calculate sprint progress metrics
      const totalItems = backlogItems.length;
      const completedItems = backlogItems.filter((item: any) => item.status === 'done').length;
      const inProgressItems = backlogItems.filter((item: any) => item.status === 'in_progress').length;
      const todoItems = backlogItems.filter((item: any) => item.status === 'todo').length;
      
      const totalStoryPoints = backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const completedStoryPoints = backlogItems
        .filter((item: any) => item.status === 'done')
        .reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);

      // Calculate sprint timeline
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
      const healthReport = `# Sprint Health Analysis - ${sprint.sprint_name || sprint.sprintName}

## Sprint Overview
- **Sprint ID:** ${sprint.id || sprint.sprint_id}
- **Status:** ${sprint.status}
- **Duration:** ${sprintStart.toLocaleDateString()} - ${sprintEnd.toLocaleDateString()}
- **Sprint Goal:** ${sprint.sprint_goal || sprint.goal || 'Not specified'}
- **Time Progress:** ${progressPercentage.toFixed(1)}% complete

## Progress Metrics
- **Items:** ${completedItems}/${totalItems} completed (${actualProgress.toFixed(1)}%)
- **Story Points:** ${completedStoryPoints}/${totalStoryPoints} completed (${storyPointProgress.toFixed(1)}%)
- **Work Distribution:**
  - ✅ Done: ${completedItems} items
  - 🔄 In Progress: ${inProgressItems} items
  - 📋 Todo: ${todoItems} items

## Health Assessment
${issues.length > 0 ? `
### ⚠️ Issues Detected
${issues.map(issue => `- ${issue}`).join('\n')}

### 💡 Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}
` : '✅ Sprint appears to be on track with no major issues detected.'}

**Analysis Date:** ${new Date().toLocaleString()}`;

      return healthReport;

    } catch (error) {
      console.error('Error in analyzeSprintHealthTool:', error);
      return `Failed to analyze sprint health: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});
