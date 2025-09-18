import { tool } from 'ai';
import { burndownAnalysisSchema } from '../../schemas/scrum';
import { makeAuthenticatedRequest, getCurrentProjectContext } from '../utils';

/**
 * Tool for detailed burndown chart analysis and sprint progress monitoring
 */
export const analyzeBurndownTool = tool({
  description: `Automatically analyze the current active sprint's burndown chart without requiring any parameters. 
    The tool auto-detects the active sprint, compares actual vs ideal progress, identifies spikes/plateaus/blockers, 
    and assesses if the team is ahead/behind schedule. Call this tool immediately when users request burndown analysis.`,
  inputSchema: burndownAnalysisSchema,
  execute: async (input, { experimental_context }) => {
    try {
    const validated = burndownAnalysisSchema.parse(input);
      
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

      // Auto-detect sprint if not provided
      let sprintId = validated.sprint_id;
      let sprint = null;

      if (!sprintId) {
        // Try to find active sprint first
    const activeSprintResponse = await makeAuthenticatedRequest(
      `/sprints/?project_id=${projectId}&status=active&limit=1`,
      { method: 'GET' },
      experimental_context
    );

        if (!activeSprintResponse.error && activeSprintResponse.data && activeSprintResponse.data.length > 0) {
          sprint = activeSprintResponse.data[0];
          sprintId = sprint.id;
          console.log('Auto-detected active sprint:', sprintId);
        } else {
          // No active sprint, check if sprint title was provided
          if (validated.sprint_title) {
            const allSprintsResponse = await makeAuthenticatedRequest(
              `/sprints/?project_id=${projectId}&limit=20`,
              { method: 'GET' },
              experimental_context
            );

            if (!allSprintsResponse.error && allSprintsResponse.data) {
              const matchingSprint = allSprintsResponse.data.find((s: any) => 
                s.sprint_name?.toLowerCase().includes(validated.sprint_title!.toLowerCase()) ||
                s.sprintName?.toLowerCase().includes(validated.sprint_title!.toLowerCase())
              );

              if (matchingSprint) {
                sprint = matchingSprint;
                sprintId = sprint.id;
              } else {
                return `No sprint found with title containing "${validated.sprint_title}". Please check the sprint title.`;
              }
            }
          } else {
            // No active sprint and no title provided, ask user to specify
            const allSprintsResponse = await makeAuthenticatedRequest(
              `/sprints/?project_id=${projectId}&limit=10`,
              { method: 'GET' },
              experimental_context
            );

            if (!allSprintsResponse.error && allSprintsResponse.data && allSprintsResponse.data.length > 0) {
              const availableSprints = allSprintsResponse.data
                .filter((s: any) => s.status !== 'planning')
                .map((s: any) => `- **${s.sprint_name || s.sprintName}** (Status: ${s.status})`)
                .join('\n');

              return `No active sprint found. Please specify which sprint's burndown chart to analyze:\n\n${availableSprints}\n\nYou can specify the sprint by saying something like: "Analyze burndown for Sprint 1"`;
            } else {
              return `No sprints found for ${projectName || `project ${projectId}`}. Please create a sprint first.`;
            }
          }
        }
      } else {
        // Sprint ID provided, get sprint details
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

      console.log('Analyzing burndown for sprint:', sprintId);

      // Get burndown chart data
      const chartParams = new URLSearchParams();
      if (validated.start_date) chartParams.append('start_date', validated.start_date);
      if (validated.end_date) chartParams.append('end_date', validated.end_date);
      const queryString = chartParams.toString() ? `?${chartParams.toString()}` : '';

    const burndownResponse = await makeAuthenticatedRequest(
        `/velocity/sprint/${sprintId}/burndown${queryString}`,
        { method: 'GET' },
        experimental_context
      );

      if (burndownResponse.error) {
        return `Failed to retrieve burndown data: ${burndownResponse.error}`;
      }

      const burndownData = burndownResponse.data;

      // Get trend analysis if requested
      let trendData = null;
      if (validated.include_trend_analysis) {
        const trendResponse = await makeAuthenticatedRequest(
          `/velocity/sprint/${sprintId}/burndown/trend`,
      { method: 'GET' },
      experimental_context
    );
        
        if (!trendResponse.error) {
          trendData = trendResponse.data;
        }
      }

      // Calculate sprint timeline
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

      // Analyze burndown data
      const { dates, remaining_points, completed_points } = burndownData;
      const currentRemaining = remaining_points[remaining_points.length - 1] || 0;
      const currentCompleted = completed_points[completed_points.length - 1] || 0;
      const initialTotal = burndownData.initial_total_points || 0;

      // Enhanced ideal vs actual comparison
      let idealComparison = '';
      if (validated.include_ideal_comparison && initialTotal > 0 && dates.length > 0) {
        const idealRemainingAtCurrentTime = Math.max(0, initialTotal - (initialTotal * (elapsed / sprintDuration)));
        const idealVsActual = currentRemaining - idealRemainingAtCurrentTime;
        const tolerance = Math.max(2, idealRemainingAtCurrentTime * 0.1);
        
        let performanceStatus, statusIcon;
        if (idealVsActual > tolerance) {
          performanceStatus = 'Behind Schedule';
          statusIcon = '🔴';
        } else if (idealVsActual < -tolerance) {
          performanceStatus = 'Ahead of Schedule';
          statusIcon = '🟢';
        } else {
          performanceStatus = 'On Track';
          statusIcon = '🔵';
        }

        const actualCompletionRate = initialTotal > 0 ? (currentCompleted / initialTotal * 100) : 0;
        const idealCompletionRate = (elapsed / sprintDuration) * 100;
        const completionRateDifference = actualCompletionRate - idealCompletionRate;

        idealComparison = `
### 📊 Ideal vs Actual Progress Comparison

**Current Status: ${statusIcon} ${performanceStatus}**

#### Remaining Work Analysis
- **Ideal Remaining (Day ${elapsed}):** ${idealRemainingAtCurrentTime.toFixed(1)} story points
- **Actual Remaining:** ${currentRemaining} story points
- **Variance:** ${idealVsActual > 0 ? '+' : ''}${idealVsActual.toFixed(1)} story points

#### Completion Rate Analysis
- **Actual Completion Rate:** ${actualCompletionRate.toFixed(1)}% (${currentCompleted}/${initialTotal} points)
- **Ideal Completion Rate:** ${idealCompletionRate.toFixed(1)}% for Day ${elapsed}
- **Rate Difference:** ${completionRateDifference > 0 ? '+' : ''}${completionRateDifference.toFixed(1)}%`;
      }

      // Generate trend analysis
      let trendAnalysis = '';
      if (trendData && validated.include_trend_analysis) {
        const projectedCompletion = trendData.projected_completion ? 
          new Date(trendData.projected_completion).toLocaleDateString() : 'Unknown';
        
        trendAnalysis = `
### 📈 Trend Analysis
- **Current Velocity:** ${trendData.velocity.toFixed(1)} story points per day
- **Trend Direction:** ${trendData.trend}
- **On Track:** ${trendData.is_on_track ? 'Yes ✅' : 'No ⚠️'}
- **Projected Completion:** ${projectedCompletion}
- **Data Points:** ${trendData.total_snapshots} snapshots`;
      }

      // Calculate completion percentages
      const completionPercentage = initialTotal > 0 ? (currentCompleted / initialTotal * 100).toFixed(1) : '0';
      const remainingPercentage = initialTotal > 0 ? (currentRemaining / initialTotal * 100).toFixed(1) : '0';

      // Pattern analysis
      let patternAnalysis = '';
      if (validated.include_pattern_analysis && remaining_points.length > 2) {
        const patterns = [];
        const insights = [];

        // Check for spikes
        const spikes = [];
        for (let i = 1; i < remaining_points.length; i++) {
          const change = remaining_points[i] - remaining_points[i - 1];
          const percentChange = remaining_points[i - 1] > 0 ? (change / remaining_points[i - 1]) * 100 : 0;
          
          if (change > 0 && percentChange > 15) {
            spikes.push({
              day: i + 1,
              increase: change,
              percentChange: percentChange.toFixed(1)
            });
          }
        }

        if (spikes.length > 0) {
          patterns.push(`**Spikes Detected:** ${spikes.length} significant increases in remaining work`);
          insights.push('Work spikes detected - may indicate scope creep or task breakdown issues');
        }

        // Check for plateaus
        const plateaus = [];
        let plateauStart = -1;
        let plateauLength = 0;
        
        for (let i = 1; i < remaining_points.length; i++) {
          if (remaining_points[i] === remaining_points[i - 1] && remaining_points[i] > 0) {
            if (plateauStart === -1) {
              plateauStart = i - 1;
              plateauLength = 2;
            } else {
              plateauLength++;
            }
          } else {
            if (plateauLength >= 3) {
              plateaus.push({
                startDay: plateauStart + 1,
                length: plateauLength,
                remainingWork: remaining_points[plateauStart]
              });
            }
            plateauStart = -1;
            plateauLength = 0;
          }
        }

        if (plateaus.length > 0) {
          patterns.push(`**Plateaus Detected:** ${plateaus.length} periods of stagnant progress`);
          insights.push('Extended plateaus suggest potential blockers or impediments');
        }

        patternAnalysis = `
### 📊 Burndown Pattern Analysis
${patterns.length > 0 ? patterns.join('\n') : '**No significant patterns detected** - Burndown appears normal'}

${insights.length > 0 ? `**Pattern Insights:**\n${insights.map(i => `- ${i}`).join('\n')}` : ''}`;
      }

      // Generate visualization
      const burndownVisualization = dates.map((date: string, index: number) => {
        const remaining = remaining_points[index];
        const completed = completed_points[index];
        const dateObj = new Date(date);
        const shortDate = dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        
        return `${shortDate}: ${'█'.repeat(Math.max(1, Math.round(completed / 2)))}${'░'.repeat(Math.max(1, Math.round(remaining / 2)))} (${completed}/${completed + remaining})`;
      }).join('\n');

      const report = `# Burndown Analysis Report - ${sprint.sprint_name || sprint.sprintName}

## Sprint Overview
- **Sprint Goal:** ${sprint.sprint_goal || sprint.sprintGoal || 'Not specified'}
- **Duration:** ${sprintStart.toLocaleDateString()} - ${sprintEnd.toLocaleDateString()}
- **Days Elapsed:** ${elapsed} of ${sprintDuration} days (${progressPercentage.toFixed(1)}%)
- **Status:** ${sprint.status}

## Current Progress
- **Total Story Points:** ${initialTotal}
- **Completed:** ${currentCompleted} points (${completionPercentage}%)
- **Remaining:** ${currentRemaining} points (${remainingPercentage}%)

${idealComparison}${trendAnalysis}${patternAnalysis}

## Burndown Progress Visualization
\`\`\`
${burndownVisualization}
\`\`\`
Legend: █ = Completed work, ░ = Remaining work

## Sprint Health Assessment
${parseFloat(remainingPercentage) <= progressPercentage + 10 ? 
  '✅ **Healthy:** Sprint progress aligns well with timeline' :
  parseFloat(remainingPercentage) <= progressPercentage + 25 ?
  '⚠️ **At Risk:** Sprint may need scope adjustment or impediment removal' :
  '🚨 **Critical:** Significant intervention needed to meet sprint goals'
}

**Analysis Date:** ${new Date().toLocaleString()}
**Sprint Day:** ${elapsed} of ${sprintDuration}
**Data Source:** ScrumiX Burndown Tracking API`;

      return report;

    } catch (error) {
      console.error('Error in analyzeBurndownTool:', error);
      return `Failed to analyze burndown: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});
