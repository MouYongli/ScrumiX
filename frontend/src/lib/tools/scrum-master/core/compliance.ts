import { tool } from 'ai';
import { complianceCheckSchema } from '../../schemas/scrum';
import { requestWithAuth, type AuthContext } from '../../utils';

/**
 * Tool for Scrum Guide compliance checking
 */
export const checkScrumComplianceTool = tool({
  description: `Check adherence to Scrum Guide principles and detect deviations such as missing retrospectives, 
    irregular events, or scope creep. This tool helps Scrum Masters ensure proper Scrum implementation 
    and identify areas for process improvement.`,
  inputSchema: complianceCheckSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = complianceCheckSchema.parse(input);
      console.log('Checking Scrum compliance for project:', validated.project_id);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (validated.check_period_days * 24 * 60 * 60 * 1000));

      // Get project sprints in the period
      const sprintsResponse = await requestWithAuth(
        `/sprints/?project_id=${validated.project_id}&limit=50`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      if (sprintsResponse.error) {
        return `Failed to retrieve sprint data: ${sprintsResponse.error}`;
      }

      const allSprints = (sprintsResponse.data as any[]) || [];
      const recentSprints = allSprints.filter((sprint: any) => {
        const sprintStartDate = sprint.start_date || sprint.startDate;
        if (!sprintStartDate) return false;
        const sprintStart = new Date(sprintStartDate);
        return sprintStart >= startDate;
      });

      // Get meetings for the period
      const meetingsResponse = await requestWithAuth(
        `/meetings/?date_from=${startDate.toISOString()}&date_to=${endDate.toISOString()}&limit=200`,
        { method: 'GET' },
        experimental_context as AuthContext
      );

      const allMeetings = (meetingsResponse.data as any)?.meetings || [];
      const projectMeetings = allMeetings.filter((meeting: any) => meeting.project_id === validated.project_id);

      // Analyze compliance areas
      const complianceIssues = [];
      const complianceScore = { total: 0, passed: 0 };

      // 1. Sprint Planning compliance
      complianceScore.total++;
      const sprintPlannings = projectMeetings.filter((m: any) => m.meeting_type === 'sprint_planning');
      const activeSprints = recentSprints.filter((s: any) => s.status === 'active' || s.status === 'completed');
      
      if (sprintPlannings.length < activeSprints.length) {
        complianceIssues.push({
          area: 'Sprint Planning',
          severity: 'High',
          issue: `Missing Sprint Planning meetings (${sprintPlannings.length} meetings for ${activeSprints.length} sprints)`,
          recommendation: 'Schedule Sprint Planning meeting for each sprint to define Sprint Goal and select backlog items'
        });
      } else {
        complianceScore.passed++;
      }

      // 2. Daily Scrum compliance
      complianceScore.total++;
      const dailyScrums = projectMeetings.filter((m: any) => m.meeting_type === 'daily_standup');
      const expectedDailyScrums = activeSprints.reduce((total: number, sprint: any) => {
        const sprintStartDate = sprint.start_date || sprint.startDate;
        const sprintEndDate = sprint.end_date || sprint.endDate;
        if (!sprintStartDate || !sprintEndDate) return total;
        
        const sprintStart = new Date(sprintStartDate);
        const sprintEnd = new Date(sprintEndDate);
        const workingDays = Math.max(1, Math.floor((Math.min(sprintEnd.getTime(), endDate.getTime()) - Math.max(sprintStart.getTime(), startDate.getTime())) / (24 * 60 * 60 * 1000)));
        return total + Math.max(0, workingDays - 2); // Exclude weekends roughly
      }, 0);

      if (dailyScrums.length < expectedDailyScrums * 0.8) { // Allow some flexibility
        complianceIssues.push({
          area: 'Daily Scrum',
          severity: 'Medium',
          issue: `Insufficient Daily Scrums (${dailyScrums.length} vs expected ~${expectedDailyScrums})`,
          recommendation: 'Ensure Daily Scrum occurs every working day during active sprints'
        });
      } else {
        complianceScore.passed++;
      }

      // 3. Sprint Review compliance
      complianceScore.total++;
      const sprintReviews = projectMeetings.filter((m: any) => m.meeting_type === 'sprint_review');
      const completedSprints = recentSprints.filter((s: any) => s.status === 'completed');

      if (sprintReviews.length < completedSprints.length) {
        complianceIssues.push({
          area: 'Sprint Review',
          severity: 'High',
          issue: `Missing Sprint Reviews (${sprintReviews.length} reviews for ${completedSprints.length} completed sprints)`,
          recommendation: 'Schedule Sprint Review at the end of each sprint to inspect the Increment'
        });
      } else {
        complianceScore.passed++;
      }

      // 4. Sprint Retrospective compliance
      complianceScore.total++;
      const retrospectives = projectMeetings.filter((m: any) => m.meeting_type === 'sprint_retrospective');

      if (retrospectives.length < completedSprints.length) {
        complianceIssues.push({
          area: 'Sprint Retrospective',
          severity: 'High',
          issue: `Missing Retrospectives (${retrospectives.length} retrospectives for ${completedSprints.length} completed sprints)`,
          recommendation: 'Schedule Sprint Retrospective after each sprint to identify improvement opportunities'
        });
      } else {
        complianceScore.passed++;
      }

      // 5. Sprint length consistency
      complianceScore.total++;
      if (recentSprints.length > 1) {
        const sprintLengths = recentSprints.map((sprint: any) => {
          const sprintStartDate = sprint.start_date || sprint.startDate;
          const sprintEndDate = sprint.end_date || sprint.endDate;
          if (!sprintStartDate || !sprintEndDate) return 14; // Default 2 weeks
          
          const start = new Date(sprintStartDate);
          const end = new Date(sprintEndDate);
          return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        });

        const avgLength = sprintLengths.reduce((sum: number, len: number) => sum + len, 0) / sprintLengths.length;
        const hasInconsistentLength = sprintLengths.some((len: number) => Math.abs(len - avgLength) > 3);

        if (hasInconsistentLength) {
          complianceIssues.push({
            area: 'Sprint Consistency',
            severity: 'Medium',
            issue: `Inconsistent sprint lengths detected (${Math.min(...sprintLengths)}-${Math.max(...sprintLengths)} days)`,
            recommendation: 'Maintain consistent sprint duration (typically 1-4 weeks) for better predictability'
          });
        } else {
          complianceScore.passed++;
        }
      } else {
        complianceScore.passed++; // Not enough data to assess
      }

      // 6. Scope creep analysis
      complianceScore.total++;
      let scopeCreepDetected = false;
      
      for (const sprint of activeSprints) {
        const backlogResponse = await requestWithAuth(
          `/sprints/${sprint.id}/backlog`,
          { method: 'GET' },
          experimental_context as AuthContext
        );

        if (!backlogResponse.error) {
          const backlogItems = (backlogResponse.data as any[]) || [];
          const recentlyAdded = backlogItems.filter((item: any) => {
            const createdDate = new Date(item.created_at);
            const sprintStartDate = sprint.start_date || sprint.startDate;
            if (!sprintStartDate) return false;
            const sprintStart = new Date(sprintStartDate);
            return createdDate > sprintStart;
          });

          if (recentlyAdded.length > backlogItems.length * 0.3) { // More than 30% added mid-sprint
            scopeCreepDetected = true;
            break;
          }
        }
      }

      if (scopeCreepDetected) {
        complianceIssues.push({
          area: 'Scope Management',
          severity: 'Medium',
          issue: 'Significant scope changes detected during sprint execution',
          recommendation: 'Protect sprint scope; handle new requirements in Sprint Backlog refinement for future sprints'
        });
      } else {
        complianceScore.passed++;
      }

      // Calculate overall compliance score
      const overallScore = (complianceScore.passed / complianceScore.total) * 100;
      const complianceLevel = overallScore >= 90 ? 'Excellent' :
                             overallScore >= 75 ? 'Good' :
                             overallScore >= 60 ? 'Needs Improvement' : 'Critical';

      // Generate report
      const report = `# Scrum Compliance Analysis

## Overall Compliance Score: ${overallScore.toFixed(1)}% (${complianceLevel})
**Analysis Period:** ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
**Sprints Analyzed:** ${recentSprints.length}

## Compliance Areas Assessed
- ✅ Sprint Planning: ${sprintPlannings.length} meetings
- ✅ Daily Scrums: ${dailyScrums.length} meetings  
- ✅ Sprint Reviews: ${sprintReviews.length} meetings
- ✅ Sprint Retrospectives: ${retrospectives.length} meetings
- ✅ Sprint Consistency: ${recentSprints.length > 1 ? 'Evaluated' : 'Insufficient data'}
- ✅ Scope Management: ${scopeCreepDetected ? 'Issues detected' : 'Compliant'}

${complianceIssues.length > 0 ? `## 🚨 Compliance Issues Found

${complianceIssues.map((issue, index) => `### ${index + 1}. ${issue.area} (${issue.severity} Priority)
**Issue:** ${issue.issue}
**Recommendation:** ${issue.recommendation}
`).join('\n')}` : '## ✅ No Major Compliance Issues Detected'}

## Scrum Events Summary
| Event Type | Count | Expected | Status |
|------------|-------|----------|---------|
| Sprint Planning | ${sprintPlannings.length} | ${activeSprints.length} | ${sprintPlannings.length >= activeSprints.length ? '✅' : '⚠️'} |
| Daily Scrums | ${dailyScrums.length} | ~${expectedDailyScrums} | ${dailyScrums.length >= expectedDailyScrums * 0.8 ? '✅' : '⚠️'} |
| Sprint Reviews | ${sprintReviews.length} | ${completedSprints.length} | ${sprintReviews.length >= completedSprints.length ? '✅' : '⚠️'} |
| Retrospectives | ${retrospectives.length} | ${completedSprints.length} | ${retrospectives.length >= completedSprints.length ? '✅' : '⚠️'} |

${validated.include_recommendations ? `## 🎯 Recommendations for Improvement

### Immediate Actions
${complianceIssues.filter(i => i.severity === 'High').map(issue => `- ${issue.recommendation}`).join('\n')}

### Process Improvements  
${complianceIssues.filter(i => i.severity === 'Medium').map(issue => `- ${issue.recommendation}`).join('\n')}

### Best Practices to Maintain
- Keep sprint events timeboxed and focused
- Ensure all team members participate in Scrum events
- Document and track retrospective action items
- Maintain transparency through proper artifacts
- Protect sprint goals from mid-sprint scope changes` : ''}

## Next Steps for Scrum Master
1. Address high-priority compliance issues immediately
2. Schedule missing Scrum events for upcoming sprints
3. Review compliance weekly and adjust processes as needed
4. Share compliance insights with team and stakeholders
5. Use retrospectives to discuss process adherence

**Compliance Check Date:** ${new Date().toLocaleString()}
**Next Recommended Check:** ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`;

      return report;

    } catch (error) {
      console.error('Error in checkScrumComplianceTool:', error);
      return `Failed to check Scrum compliance: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

