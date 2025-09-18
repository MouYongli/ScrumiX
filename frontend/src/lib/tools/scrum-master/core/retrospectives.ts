import { tool } from 'ai';
import { retrospectiveAnalysisSchema } from '../../schemas/scrum';
import { makeAuthenticatedRequest } from '../utils';

/**
 * Tool for retrospective analysis and team coaching
 */
export const analyzeRetrospectivesTool = tool({
  description: `Analyze retrospective meetings and action items to identify recurring patterns, track improvement actions, 
    and provide coaching insights. This tool helps Scrum Masters facilitate better retrospectives and ensure 
    continuous improvement.`,
  inputSchema: retrospectiveAnalysisSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = retrospectiveAnalysisSchema.parse(input);
      console.log('Analyzing retrospectives for project:', validated.project_id);

      // Get recent retrospective meetings
      const meetingsResponse = await makeAuthenticatedRequest(
        `/meetings/?meeting_type=sprint_retrospective&limit=${validated.lookback_sprints * 2}`,
        { method: 'GET' },
        experimental_context
      );

      if (meetingsResponse.error) {
        return `Failed to retrieve retrospective meetings: ${meetingsResponse.error}`;
      }

      const allMeetings = meetingsResponse.data?.meetings || [];
      const retrospectives = allMeetings
        .filter((meeting: any) => meeting.project_id === validated.project_id)
        .slice(0, validated.lookback_sprints);

      if (retrospectives.length === 0) {
        return `No retrospective meetings found for project ${validated.project_id}. Consider scheduling regular Sprint Retrospectives to enable continuous improvement.`;
      }

      // Get detailed data for each retrospective
      const retrospectiveAnalyses = await Promise.all(
        retrospectives.map(async (meeting: any) => {
          // Get meeting notes
          const notesResponse = await makeAuthenticatedRequest(
            `/meeting-notes/?meeting_id=${meeting.id}`,
            { method: 'GET' },
            experimental_context
          );

          // Get action items
          const actionsResponse = await makeAuthenticatedRequest(
            `/meeting-action-items/?meeting_id=${meeting.id}`,
            { method: 'GET' },
            experimental_context
          );

          return {
            meeting: meeting,
            notes: notesResponse.data || [],
            actionItems: actionsResponse.data || []
          };
        })
      );

      // Analyze patterns and themes
      const allActionItems = retrospectiveAnalyses.flatMap(retro => retro.actionItems);
      const completedActions = allActionItems.filter((action: any) => action.status === 'completed');
      const pendingActions = allActionItems.filter((action: any) => action.status === 'pending');
      const overdueActions = allActionItems.filter((action: any) => {
        return action.status !== 'completed' && new Date(action.due_date) < new Date();
      });

      // Extract common themes (simplified keyword analysis)
      const allNotes = retrospectiveAnalyses.flatMap(retro => 
        retro.notes.map((note: any) => note.content.toLowerCase())
      ).join(' ');

      const commonIssues = [
        'communication', 'testing', 'deployment', 'documentation', 'technical debt',
        'meetings', 'planning', 'estimation', 'impediments', 'tools', 'process'
      ].filter(keyword => allNotes.includes(keyword));

      // Generate insights
      const insights = [];
      const recommendations = [];

      const actionCompletionRate = allActionItems.length > 0 ? 
        (completedActions.length / allActionItems.length * 100).toFixed(1) : '0';

      if (parseFloat(actionCompletionRate) < 60) {
        insights.push('Low action item completion rate indicates follow-through issues');
        recommendations.push('Implement action item tracking system and regular check-ins during Daily Scrums');
      }

      if (overdueActions.length > 0) {
        insights.push(`${overdueActions.length} action items are overdue`);
        recommendations.push('Review overdue actions in next retrospective and adjust scope or timeline');
      }

      if (commonIssues.length > 3) {
        insights.push(`Recurring themes identified: ${commonIssues.slice(0, 3).join(', ')}`);
        recommendations.push('Focus on systematic solutions for recurring issues rather than quick fixes');
      }

      // Retrospective quality assessment
      const avgActionsPerRetro = allActionItems.length / retrospectives.length;
      const qualityScore = Math.min(100, 
        (parseFloat(actionCompletionRate) * 0.4) + 
        (Math.min(100, avgActionsPerRetro * 20) * 0.3) + 
        (retrospectives.length >= 3 ? 30 : retrospectives.length * 10)
      );

      const report = `# Retrospective Analysis Report

## Overview
- **Retrospectives Analyzed:** ${retrospectives.length}
- **Total Action Items:** ${allActionItems.length}
- **Action Completion Rate:** ${actionCompletionRate}%
- **Quality Score:** ${qualityScore.toFixed(1)}/100

## Recent Retrospectives
${retrospectiveAnalyses.map((retro, index) => {
  const meeting = retro.meeting;
  const meetingDate = new Date(meeting.start_datetime);
  
  return `### ${index + 1}. ${meeting.title} - ${meetingDate.toLocaleDateString()}
- **Duration:** ${meeting.duration} minutes
- **Notes Captured:** ${retro.notes.length}
- **Action Items Created:** ${retro.actionItems.length}
- **Actions Completed:** ${retro.actionItems.filter((a: any) => a.status === 'completed').length}`;
}).join('\n\n')}

## Action Items Tracking
${validated.include_action_tracking ? `
### ✅ Completed Actions (${completedActions.length})
${completedActions.slice(0, 5).map((action: any) => 
  `- ${action.title} (Due: ${new Date(action.due_date).toLocaleDateString()})`
).join('\n')}

### ⏳ Pending Actions (${pendingActions.length})
${pendingActions.slice(0, 5).map((action: any) => 
  `- ${action.title} (Due: ${new Date(action.due_date).toLocaleDateString()})`
).join('\n')}

${overdueActions.length > 0 ? `### 🚨 Overdue Actions (${overdueActions.length})
${overdueActions.map((action: any) => 
  `- ${action.title} (Was due: ${new Date(action.due_date).toLocaleDateString()})`
).join('\n')}` : ''}` : 'Action tracking disabled'}

${commonIssues.length > 0 ? `## 🔍 Recurring Themes
${commonIssues.map(theme => `- ${theme.charAt(0).toUpperCase() + theme.slice(1)}`).join('\n')}` : ''}

${insights.length > 0 ? `## 💡 Key Insights
${insights.map(insight => `- ${insight}`).join('\n')}` : ''}

${recommendations.length > 0 ? `## 🎯 Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}` : ''}

## Facilitation Tips for Next Retrospective
- Start by reviewing previous action items and their impact
- Use different retrospective formats to keep engagement high
- Focus on 2-3 actionable improvements rather than many small items
- Ensure action items have clear owners and realistic deadlines
- Create psychological safety for honest feedback

## Continuous Improvement Metrics
- **Retrospective Frequency:** ${retrospectives.length} in last ${validated.lookback_sprints} sprints
- **Average Actions per Retro:** ${avgActionsPerRetro.toFixed(1)}
- **Team Engagement:** ${retrospectiveAnalyses.some(r => r.notes.length > 0) ? 'Good (notes captured)' : 'Needs improvement'}

**Analysis Date:** ${new Date().toLocaleString()}`;

      return report;

    } catch (error) {
      console.error('Error in analyzeRetrospectivesTool:', error);
      return `Failed to analyze retrospectives: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});
