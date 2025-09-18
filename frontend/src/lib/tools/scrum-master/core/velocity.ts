import { tool } from 'ai';
import { velocityAnalysisSchema, currentSprintVelocitySchema } from '../../schemas/scrum';
import { makeAuthenticatedRequest, getCurrentProjectContext } from '../utils';

/**
 * Tool for velocity tracking and capacity planning with enhanced API integration
 */
export const analyzeVelocityTool = tool({
  description: `Analyze team velocity based on ALL completed sprints (up to 50) and provide capacity planning forecasts. 
    This tool helps Scrum Masters understand team performance trends and make data-driven decisions 
    for sprint planning and capacity management. Uses dedicated velocity tracking APIs for accurate metrics.
    By default, analyzes the last 20 completed sprints, but can analyze up to 50 for comprehensive historical analysis.`,
  inputSchema: velocityAnalysisSchema,
  execute: async (input, { experimental_context }) => {
    try {
    const validated = velocityAnalysisSchema.parse(input);
      
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

      console.log('Analyzing velocity for project:', projectId);

      // Get project average velocity using dedicated API
    const avgVelocityResponse = await makeAuthenticatedRequest(
      `/velocity/project/${projectId}/velocity/average`,
      { method: 'GET' },
      experimental_context
    );

      // Get project velocity metrics
    const metricsResponse = await makeAuthenticatedRequest(
      `/velocity/project/${projectId}/velocity/metrics`,
      { method: 'GET' },
      experimental_context
    );

      // Get recent completed sprints for detailed analysis
    const sprintsResponse = await makeAuthenticatedRequest(
      `/sprints/?project_id=${projectId}&status=completed&limit=${validated.sprint_count}`,
      { method: 'GET' },
      experimental_context
    );

      if (sprintsResponse.error) {
        return `Failed to retrieve sprint data: ${sprintsResponse.error}`;
      }

    const sprints = sprintsResponse.data || [];
      
      if (sprints.length === 0) {
        return `No completed sprints found for ${projectName || `project ${projectId}`}. Velocity analysis requires at least one completed sprint.`;
      }

      // Check if we might have more completed sprints available
      let additionalSprintsNote = '';
      if (sprints.length === validated.sprint_count && validated.sprint_count < 50) {
        const allSprintsResponse = await makeAuthenticatedRequest(
          `/sprints/?project_id=${projectId}&status=completed&limit=50`,
          { method: 'GET' },
          experimental_context
        );
        
        if (!allSprintsResponse.error && allSprintsResponse.data && allSprintsResponse.data.length > validated.sprint_count) {
          const totalCompleted = allSprintsResponse.data.length;
          additionalSprintsNote = `\n\n**Note:** This analysis includes ${validated.sprint_count} of ${totalCompleted} total completed sprints. For more comprehensive historical analysis, you can increase the sprint_count parameter up to ${Math.min(50, totalCompleted)}.`;
        }
      }

      // Get individual sprint velocity data
      const sprintVelocityData = await Promise.all(
        sprints.map(async (sprint: any) => {
          const velocityResponse = await makeAuthenticatedRequest(
            `/velocity/sprint/${sprint.id}/velocity`,
            { method: 'GET' },
            experimental_context
          );
          
          const backlogResponse = await makeAuthenticatedRequest(
            `/sprints/${sprint.id}/backlog`,
            { method: 'GET' },
            experimental_context
          );

          const velocity = velocityResponse.data?.velocity_points || 0;
          const backlogItems = backlogResponse.data || [];
          const completedItems = backlogItems.filter((item: any) => item.status === 'done');
          
          // Calculate actual completed story points (this is the correct velocity measure)
          const completedStoryPoints = completedItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
          
          return {
            sprint: sprint,
            velocityPoints: completedStoryPoints,
            completedItems: completedItems.length,
            totalItems: backlogItems.length,
            totalStoryPoints: backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0)
          };
        })
      );

      // Calculate velocity metrics
      const velocityByPoints = sprintVelocityData.map(data => data.velocityPoints);
      const velocityByItems = sprintVelocityData.map(data => data.completedItems);
      
      const totalCompletedStoryPoints = velocityByPoints.reduce((sum, v) => sum + v, 0);
      const avgVelocity = velocityByPoints.length > 0 ? totalCompletedStoryPoints / velocityByPoints.length : 0;
      const avgVelocityItems = velocityByItems.length > 0 ? velocityByItems.reduce((sum, v) => sum + v, 0) / velocityByItems.length : 0;
      
      const totalSprints = sprints.length;

      // Calculate velocity consistency (coefficient of variation)
      const pointsVariance = velocityByPoints.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocityByPoints.length;
      const pointsStdDev = Math.sqrt(pointsVariance);
      const consistencyScore = avgVelocity > 0 ? Math.max(0, 100 - (pointsStdDev / avgVelocity * 100)) : 0;

      // Identify trends
      const recentVelocity = velocityByPoints.slice(-3);
      const earlierVelocity = velocityByPoints.slice(0, -3);
      const recentAvg = recentVelocity.reduce((sum, v) => sum + v, 0) / recentVelocity.length;
      const earlierAvg = earlierVelocity.length > 0 ? earlierVelocity.reduce((sum, v) => sum + v, 0) / earlierVelocity.length : recentAvg;
      
      const trendDirection = recentAvg > earlierAvg * 1.1 ? 'Improving' : 
                            recentAvg < earlierAvg * 0.9 ? 'Declining' : 'Stable';
      const trendPercentage = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg * 100).toFixed(1) : '0';

      // Generate insights and recommendations
      const insights = [];
      const recommendations = [];

      if (consistencyScore < 60) {
        insights.push('High velocity variation detected across sprints');
        recommendations.push('Review sprint planning process and story point estimation accuracy');
      }

      if (trendDirection === 'Declining') {
        insights.push(`Velocity has been declining in recent sprints (${trendPercentage}% change)`);
        recommendations.push('Investigate potential impediments or team capacity changes');
      } else if (trendDirection === 'Improving') {
        insights.push(`Velocity is improving over recent sprints (+${trendPercentage}% change)`);
        recommendations.push('Document and share practices contributing to improved performance');
      }

      if (avgVelocity < 10) {
        insights.push('Low average velocity may indicate estimation or capacity issues');
        recommendations.push('Consider story point calibration session and capacity planning review');
      }

      // Capacity forecasting
      let forecastSection = '';
      if (validated.include_forecast) {
        const conservativeEstimate = Math.floor(avgVelocity * 0.8);
        const optimisticEstimate = Math.ceil(avgVelocity * 1.2);
        
        forecastSection = `
### 📊 Capacity Forecasting

**Next Sprint Capacity Estimates:**
- **Conservative (80% confidence):** ${conservativeEstimate} story points
- **Expected (average):** ${Math.round(avgVelocity)} story points  
- **Optimistic (best case):** ${optimisticEstimate} story points

**Planning Recommendations:**
- Plan for ${Math.round(avgVelocity)} story points as baseline
- Keep ${conservativeEstimate}-${optimisticEstimate} range in mind for scope flexibility
- Reserve 10-20% capacity for unplanned work and impediments
- Consider team capacity changes when planning future sprints`;
      }

      const report = `# Velocity Analysis Report

## Team Velocity Summary
- **Average Velocity:** ${avgVelocity.toFixed(1)} story points per sprint
- **Average Items Completed:** ${avgVelocityItems.toFixed(1)} items per sprint
- **Consistency Score:** ${consistencyScore.toFixed(1)}/100
- **Trend:** ${trendDirection} ${trendDirection !== 'Stable' ? `(${trendPercentage}%)` : ''}
- **Total Sprints Analyzed:** ${totalSprints}

## Sprint-by-Sprint Velocity Analysis
${sprintVelocityData.map((data, index) => {
  const sprint = data.sprint;
  const completionRate = data.totalItems > 0 ? (data.completedItems / data.totalItems * 100).toFixed(1) : '0';
  
  return `### Sprint ${index + 1}: ${sprint.sprint_name || sprint.sprintName}
- **Period:** ${new Date(sprint.start_date || sprint.startDate).toLocaleDateString()} - ${new Date(sprint.end_date || sprint.endDate).toLocaleDateString()}
- **Velocity:** ${data.velocityPoints} story points
- **Items Completed:** ${data.completedItems}/${data.totalItems} (${completionRate}%)
- **Total Story Points:** ${data.totalStoryPoints}
- **Sprint Goal:** ${sprint.sprint_goal || 'Not specified'}`;
}).join('\n\n')}

## Velocity Trend Visualization
${velocityByPoints.map((velocity, index) => 
  `Sprint ${index + 1}: ${'█'.repeat(Math.max(1, Math.round(velocity / 2)))} ${velocity} pts`
).join('\n')}

Average: ${'─'.repeat(Math.max(1, Math.round(avgVelocity / 2)))} ${avgVelocity.toFixed(1)} pts

${insights.length > 0 ? `## 🔍 Key Insights
${insights.map(insight => `- ${insight}`).join('\n')}` : ''}

${recommendations.length > 0 ? `## 💡 Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}` : ''}

${forecastSection}

## Actions for Scrum Master
- Share velocity trends with Product Owner for backlog planning
- Discuss capacity planning in next Sprint Planning meeting
- Consider velocity factors in team retrospectives
- Monitor for impediments affecting team performance
- Track consistency improvements over time

**Analysis Date:** ${new Date().toLocaleString()}
**Sprints Analyzed:** ${sprints.length}
**Data Source:** ScrumiX Velocity Tracking API${additionalSprintsNote}`;

      return report;

    } catch (error) {
      console.error('Error in analyzeVelocityTool:', error);
      return `Failed to analyze velocity: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for analyzing current sprint velocity and comparing with historical performance
 */
export const analyzeCurrentSprintVelocityTool = tool({
  description: `Analyze the current sprint's velocity and compare it with the team's historical average. 
    This tool helps Scrum Masters understand how the current sprint is performing relative to past sprints 
    and provides insights for capacity planning and sprint goal achievement.`,
  inputSchema: currentSprintVelocitySchema,
  execute: async (input, { experimental_context }) => {
    try {
    const validated = currentSprintVelocitySchema.parse(input);
      
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

      // Auto-detect current sprint if not provided
    let sprintId = validated.sprint_id;
      let sprint = null;

    if (!sprintId) {
      const sprintsResponse = await makeAuthenticatedRequest(
        `/sprints/?project_id=${projectId}&status=active&limit=1`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintsResponse.error || !sprintsResponse.data || sprintsResponse.data.length === 0) {
          return `No active sprint found for ${projectName || `project ${projectId}`}. Please specify a sprint_id or ensure there's an active sprint.`;
        }

        sprint = sprintsResponse.data[0];
        sprintId = sprint.id;
      } else {
        const sprintResponse = await makeAuthenticatedRequest(
          `/sprints/${sprintId}`,
          { method: 'GET' },
          experimental_context
        );

        if (sprintResponse.error) {
          return `Failed to retrieve sprint details: ${sprintResponse.error}`;
        }

        sprint = sprintResponse.data;
      }

      // Get current sprint velocity
    const currentVelocityResponse = await makeAuthenticatedRequest(
      `/velocity/sprint/${sprintId}/velocity`,
      { method: 'GET' },
      experimental_context
    );

      if (currentVelocityResponse.error) {
        return `Failed to retrieve current sprint velocity: ${currentVelocityResponse.error}`;
      }

      const currentVelocity = currentVelocityResponse.data?.velocity_points || 0;

      // Get current sprint backlog for additional insights
      const backlogResponse = await makeAuthenticatedRequest(
        `/sprints/${sprintId}/backlog`,
        { method: 'GET' },
        experimental_context
      );

      const backlogItems = backlogResponse.data || [];
      const completedItems = backlogItems.filter((item: any) => item.status === 'done');
      const inProgressItems = backlogItems.filter((item: any) => item.status === 'in_progress');
      const todoItems = backlogItems.filter((item: any) => item.status === 'todo');

      const totalStoryPoints = backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const completedStoryPoints = completedItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const inProgressStoryPoints = inProgressItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0);
      const remainingStoryPoints = totalStoryPoints - completedStoryPoints;

      // Get team average velocity for comparison
      let averageComparison = '';
      if (validated.compare_with_average) {
        const avgVelocityResponse = await makeAuthenticatedRequest(
          `/velocity/project/${projectId}/velocity/average?exclude_sprint_id=${sprintId}`,
          { method: 'GET' },
          experimental_context
        );

        if (!avgVelocityResponse.error && avgVelocityResponse.data) {
          const avgVelocity = avgVelocityResponse.data.average_velocity;
          const totalSprints = avgVelocityResponse.data.total_sprints;
          const velocityDifference = currentVelocity - avgVelocity;
          const velocityPercentage = avgVelocity > 0 ? (velocityDifference / avgVelocity * 100).toFixed(1) : '0';

          const performanceLevel = Math.abs(velocityDifference) < avgVelocity * 0.1 ? 'On Par' :
                                  velocityDifference > avgVelocity * 0.1 ? 'Above Average' : 'Below Average';

          averageComparison = `
### 📊 Velocity Comparison with Team Average

- **Current Sprint Velocity:** ${currentVelocity} story points
- **Team Average Velocity:** ${avgVelocity.toFixed(1)} story points (based on ${totalSprints} completed sprints)
- **Difference:** ${velocityDifference > 0 ? '+' : ''}${velocityDifference.toFixed(1)} story points (${parseFloat(velocityPercentage) > 0 ? '+' : ''}${velocityPercentage}%)
- **Performance Level:** ${performanceLevel}

${performanceLevel === 'Above Average' ? 
  '🚀 **Excellent!** Current sprint is exceeding the team\'s historical average.' :
  performanceLevel === 'Below Average' ?
  '⚠️ **Below Average:** Current sprint velocity is lower than typical. Consider investigating impediments.' :
  '✅ **Consistent:** Current sprint velocity aligns with team\'s historical performance.'
}`;
        }
      }

      // Calculate sprint timeline and progress
      const sprintStartDate = sprint.start_date || sprint.startDate;
      const sprintEndDate = sprint.end_date || sprint.endDate;
      
      if (!sprintStartDate || !sprintEndDate) {
        return `Sprint dates are missing from the API response. Available fields: ${Object.keys(sprint).join(', ')}`;
      }
      
      const sprintStart = new Date(sprintStartDate);
      const sprintEnd = new Date(sprintEndDate);
      const now = new Date();
      const sprintDuration = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (24 * 60 * 60 * 1000));
      const elapsed = Math.max(0, Math.ceil((now.getTime() - sprintStart.getTime()) / (24 * 60 * 60 * 1000)));
      const progressPercentage = Math.min(100, Math.max(0, (elapsed / sprintDuration) * 100));

      // Generate insights and recommendations
      const insights = [];
      const recommendations = [];

      const completionRate = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints * 100) : 0;
      const expectedProgress = progressPercentage;

      if (completionRate < expectedProgress - 15) {
        insights.push('Sprint velocity is lagging behind timeline expectations');
        recommendations.push('Investigate impediments and consider scope adjustment in upcoming Daily Scrums');
      } else if (completionRate > expectedProgress + 15) {
        insights.push('Sprint is ahead of schedule with strong velocity');
        recommendations.push('Consider adding additional scope or preparing for early completion');
      }

      if (inProgressStoryPoints > totalStoryPoints * 0.4) {
        insights.push('High amount of work in progress may impact velocity');
        recommendations.push('Encourage team to focus on completing items before starting new ones');
      }

      if (currentVelocity === 0 && elapsed > sprintDuration * 0.3) {
        insights.push('No completed story points despite significant time elapsed');
        recommendations.push('Urgent attention needed - review impediments and work breakdown');
      }

      const report = `# Current Sprint Velocity Analysis - ${sprint.sprint_name || sprint.sprintName}

## Sprint Overview
- **Sprint Goal:** ${sprint.sprint_goal || sprint.sprintGoal || 'Not specified'}
- **Duration:** ${sprintStart.toLocaleDateString()} - ${sprintEnd.toLocaleDateString()}
- **Progress:** Day ${elapsed} of ${sprintDuration} (${progressPercentage.toFixed(1)}% elapsed)
- **Status:** ${sprint.status}

## Current Velocity Metrics
- **Completed Story Points:** ${currentVelocity} points
- **Completion Rate:** ${completionRate.toFixed(1)}% of total scope
- **Remaining Story Points:** ${remainingStoryPoints} points
- **Work In Progress:** ${inProgressStoryPoints} points

## Work Distribution
- **Completed Items:** ${completedItems.length} (${completedStoryPoints} pts)
- **In Progress Items:** ${inProgressItems.length} (${inProgressStoryPoints} pts)
- **Todo Items:** ${todoItems.length} (${remainingStoryPoints - inProgressStoryPoints} pts)
- **Total Items:** ${backlogItems.length} (${totalStoryPoints} pts)

${averageComparison}

## Velocity Projection
${remainingStoryPoints > 0 ? `
- **Days Remaining:** ${sprintDuration - elapsed}
- **Required Daily Velocity:** ${((remainingStoryPoints) / Math.max(1, sprintDuration - elapsed)).toFixed(1)} story points per day
- **Current Daily Velocity:** ${elapsed > 0 ? (currentVelocity / elapsed).toFixed(1) : '0'} story points per day
` : '✅ **All story points completed!** Sprint goal achieved.'}

${insights.length > 0 ? `## 🔍 Key Insights
${insights.map(insight => `- ${insight}`).join('\n')}` : ''}

${recommendations.length > 0 ? `## 💡 Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}` : ''}

## Actions for Scrum Master
- Monitor daily velocity trends and address impediments
- Facilitate scope discussions if velocity indicates completion risk
- Share velocity insights with team during Daily Scrums
- Use current performance for future sprint capacity planning
- Document any factors affecting velocity for retrospective

## Sprint Health Assessment
${completionRate >= expectedProgress - 10 ? 
  '✅ **Healthy:** Sprint velocity is on track with timeline' :
  completionRate >= expectedProgress - 25 ?
  '⚠️ **At Risk:** Sprint velocity needs attention to meet goals' :
  '🚨 **Critical:** Immediate intervention needed for sprint success'
}

**Analysis Date:** ${new Date().toLocaleString()}
**Sprint Day:** ${elapsed} of ${sprintDuration}
**Data Source:** ScrumiX Velocity Tracking API`;

      return report;

    } catch (error) {
      console.error('Error in analyzeCurrentSprintVelocityTool:', error);
      return `Failed to analyze current sprint velocity: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});