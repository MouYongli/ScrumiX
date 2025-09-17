/**
 * Scrum Master Tools for AI Agent
 * These tools enable the Scrum Master AI agent to monitor sprints, schedule events, and provide coaching
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Helper function to make authenticated API calls with proper error handling
 */
async function makeAuthenticatedRequest(endpoint: string, options: RequestInit, context: any) {
  const cookies = context?.cookies;
  
  if (!cookies) {
    console.warn('No authentication context provided to Scrum Master tool');
    return { error: 'Authentication context missing' };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    const fullUrl = `${baseUrl}${endpoint}`;
    
    console.log('Making API request:', {
      url: fullUrl,
      method: options.method,
      hasBody: !!options.body,
      hasCookies: !!cookies
    });

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        ...options.headers,
      },
    });

    console.log('API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      let errorDetail;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorText;
      } catch {
        errorDetail = errorText || 'Request failed';
      }
      
      return { error: `HTTP ${response.status}: ${errorDetail}` };
    }

    const responseText = await response.text();
    console.log('API success response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse response as JSON:', responseText);
      return { error: 'Invalid JSON response from server' };
    }
    
    return { data };
  } catch (error) {
    console.error('Error in makeAuthenticatedRequest:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

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
 * Schema for sprint metrics retrieval
 */
const sprintMetricsSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .describe('The ID of the sprint to analyze'),
  
  include_burndown: z.boolean()
    .default(true)
    .describe('Whether to include burndown chart data'),
  
  include_velocity: z.boolean()
    .default(true)
    .describe('Whether to include velocity calculations'),
  
  include_team_performance: z.boolean()
    .default(true)
    .describe('Whether to include team performance metrics'),
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

/**
 * Schema for Scrum event scheduling
 */
const scheduleEventSchema = z.object({
  event_type: z.enum(['sprint_planning', 'daily_standup', 'sprint_review', 'sprint_retrospective'])
    .describe('Type of Scrum event to schedule'),
  
  start_datetime: z.string()
    .describe('Start date and time in ISO format (e.g., 2024-01-15T10:00:00Z)'),
  
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours')
    .optional()
    .describe('Duration of the meeting in minutes (uses defaults if not specified)'),
  
  location: z.string()
    .max(500, 'Location must be 500 characters or less')
    .optional()
    .describe('Meeting location (physical or virtual link)'),
  
  description: z.string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .describe('Additional meeting description or agenda notes'),
  
  participants: z.array(z.string())
    .optional()
    .describe('List of participant names to invite to the meeting'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (will be auto-detected if not provided)'),
  
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the sprint (will be auto-detected if not provided)'),
  
  sprint_title: z.string()
    .optional()
    .describe('The title of the sprint to schedule the meeting for (alternative to sprint_id)'),
  
  recurring: z.boolean()
    .default(false)
    .describe('Whether this should be a recurring meeting (daily standups are automatically recurring)')
});

/**
 * Schema for meeting agenda management
 */
const agendaManagementSchema = z.object({
  operation: z.enum(['create', 'read', 'update', 'delete', 'reorder'])
    .describe('The CRUD operation to perform on meeting agenda'),
  
  meeting_id: z.number()
    .int('Meeting ID must be a whole number')
    .positive('Meeting ID must be a positive integer')
    .optional()
    .describe('The ID of the meeting (will be searched if not provided)'),
  
  meeting_search: z.string()
    .optional()
    .describe('Search term to find the meeting (title, type, or date)'),
  
  agenda_id: z.number()
    .int('Agenda ID must be a whole number')
    .positive('Agenda ID must be a positive integer')
    .optional()
    .describe('The ID of the agenda item (required for update/delete)'),
  
  title: z.string()
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('The title/description of the agenda item'),
  
  agenda_items: z.array(z.string())
    .optional()
    .describe('Array of agenda item titles for bulk creation'),
  
  order_index: z.number()
    .int('Order index must be a whole number')
    .min(0, 'Order index must be non-negative')
    .optional()
    .describe('The order position of the agenda item'),
  
  agenda_ids: z.array(z.number())
    .optional()
    .describe('Array of agenda IDs for reordering')
});

/**
 * Schema for meeting action item management
 */
const actionItemManagementSchema = z.object({
  operation: z.enum(['create', 'read', 'update', 'delete'])
    .describe('The CRUD operation to perform on meeting action items'),
  
  meeting_id: z.number()
    .int('Meeting ID must be a whole number')
    .positive('Meeting ID must be a positive integer')
    .optional()
    .describe('The ID of the meeting (will be searched if not provided)'),
  
  meeting_search: z.string()
    .optional()
    .describe('Search term to find the meeting (title, type, or date)'),
  
  action_item_id: z.number()
    .int('Action item ID must be a whole number')
    .positive('Action item ID must be a positive integer')
    .optional()
    .describe('The ID of the action item (required for update/delete)'),
  
  title: z.string()
    .max(500, 'Title must be 500 characters or less')
    .optional()
    .describe('The title/description of the action item'),
  
  due_date: z.string()
    .optional()
    .describe('Due date for the action item (ISO format)')
});

/**
 * Helper function to search for meetings
 */
async function searchMeetings(searchTerm: string, context: any): Promise<any[]> {
  try {
    // Get current project context for filtering
    const projectContext = await getCurrentProjectContext(context);
    const projectId = projectContext?.project_id;

    // Search meetings with various filters
    const searchResponse = await makeAuthenticatedRequest(
      `/meetings/?search=${encodeURIComponent(searchTerm)}&limit=20`,
      { method: 'GET' },
      context
    );

    if (searchResponse.error || !searchResponse.data) {
      console.warn('Failed to search meetings:', searchResponse.error);
      return [];
    }

    let meetings = searchResponse.data.meetings || searchResponse.data || [];
    
    // Filter by current project if available
    if (projectId) {
      meetings = meetings.filter((meeting: any) => meeting.project_id === projectId);
    }

    // Additional filtering by search term
    const lowerSearchTerm = searchTerm.toLowerCase();
    meetings = meetings.filter((meeting: any) => 
      meeting.title?.toLowerCase().includes(lowerSearchTerm) ||
      meeting.meeting_type?.toLowerCase().includes(lowerSearchTerm) ||
      meeting.start_datetime?.includes(searchTerm) ||
      meeting.description?.toLowerCase().includes(lowerSearchTerm)
    );

    return meetings;
  } catch (error) {
    console.warn('Failed to search meetings:', error);
    return [];
  }
}

/**
 * Helper function to get current project context
 */
async function getCurrentProjectContext(context: any): Promise<{ project_id: number; project_name: string } | null> {
  try {
    // Get user's current projects
    const projectsResponse = await makeAuthenticatedRequest(
      '/projects/me',
      { method: 'GET' },
      context
    );

    if (projectsResponse.error || !projectsResponse.data || projectsResponse.data.length === 0) {
      return null;
    }

    // For now, use the first project as the current context
    // In a real implementation, this would be based on the current page/context
    const currentProject = projectsResponse.data[0];
    return {
      project_id: currentProject.id,
      project_name: currentProject.name
    };
  } catch (error) {
    console.warn('Failed to get current project context:', error);
    return null;
  }
}

/**
 * Helper function to get active sprint or available sprints
 */
async function getSprintContext(projectId: number, sprintTitle: string | undefined, context: any): Promise<{
  sprint_id: number;
  sprint_name: string;
  sprint_end_date?: string;
} | { available_sprints: Array<{ id: number; name: string; status: string }> }> {
  try {
    // Get sprints for the project
    const sprintsResponse = await makeAuthenticatedRequest(
      `/sprints/?project_id=${projectId}`,
      { method: 'GET' },
      context
    );

    if (sprintsResponse.error || !sprintsResponse.data) {
      throw new Error('Failed to fetch sprints');
    }

    const sprints = sprintsResponse.data;

    // If sprint title is provided, find by title
    if (sprintTitle) {
      const matchingSprint = sprints.find((sprint: any) => 
        sprint.sprintName?.toLowerCase().includes(sprintTitle.toLowerCase()) ||
        sprint.sprint_name?.toLowerCase().includes(sprintTitle.toLowerCase())
      );
      
      if (matchingSprint) {
        return {
          sprint_id: matchingSprint.id,
          sprint_name: matchingSprint.sprintName || matchingSprint.sprint_name,
          sprint_end_date: matchingSprint.endDate || matchingSprint.end_date
        };
      }
    }

    // Look for active sprint first
    const activeSprint = sprints.find((sprint: any) => 
      sprint.status === 'active' || sprint.status === 'in_progress'
    );

    if (activeSprint) {
      return {
        sprint_id: activeSprint.id,
        sprint_name: activeSprint.sprintName || activeSprint.sprint_name,
        sprint_end_date: activeSprint.endDate || activeSprint.end_date
      };
    }

    // No active sprint, return available sprints for user to choose
    const availableSprints = sprints
      .filter((sprint: any) => sprint.status !== 'completed' && sprint.status !== 'closed')
      .map((sprint: any) => ({
        id: sprint.id,
        name: sprint.sprintName || sprint.sprint_name,
        status: sprint.status
      }));

    return { available_sprints: availableSprints };
  } catch (error) {
    console.warn('Failed to get sprint context:', error);
    return { available_sprints: [] };
  }
}

/**
 * Helper function to find best matching project member using fuzzy matching
 */
function findBestMatch(inputName: string, projectMembers: any[]): any | null {
  const input = inputName.toLowerCase().trim();
  
  // Exact matches first
  let exactMatch = projectMembers.find((member: any) => 
    member.full_name?.toLowerCase() === input ||
    member.username?.toLowerCase() === input ||
    member.email?.toLowerCase() === input
  );
  if (exactMatch) return exactMatch;

  // Partial matches with scoring
  const matches = projectMembers.map((member: any) => {
    let score = 0;
    const fullName = member.full_name?.toLowerCase() || '';
    const username = member.username?.toLowerCase() || '';
    const email = member.email?.toLowerCase() || '';

    // Check if input is contained in any field
    if (fullName.includes(input) || input.includes(fullName)) score += 10;
    if (username.includes(input) || input.includes(username)) score += 8;
    if (email.includes(input) || input.includes(email)) score += 6;

    // Check for word matches (first name, last name)
    const inputWords = input.split(' ');
    const nameWords = fullName.split(' ');
    
    for (const inputWord of inputWords) {
      for (const nameWord of nameWords) {
        if (inputWord === nameWord) score += 5;
        else if (inputWord.includes(nameWord) || nameWord.includes(inputWord)) score += 3;
      }
    }

    return { member, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches.length > 0 ? matches[0].member : null;
}

/**
 * Helper function to find and add participants to a meeting using user_project relationships
 */
async function addMeetingParticipants(meetingId: number, participantNames: string[], projectId: number, context: any): Promise<string[]> {
  try {
    const addedParticipants: string[] = [];

    // Get project members with their roles from user_project relationship
    const membersResponse = await makeAuthenticatedRequest(
      `/projects/${projectId}/members`,
      { method: 'GET' },
      context
    );

    if (membersResponse.error || !membersResponse.data) {
      console.warn('Failed to get project members for participant matching');
      return [];
    }

    const projectMembers = membersResponse.data;

    for (const participantName of participantNames) {
      // Use improved matching algorithm
      const matchingMember = findBestMatch(participantName, projectMembers);

      if (matchingMember) {
        // Use the member's Scrum role from user_project relationship
        const scrumRole = matchingMember.role || 'developer'; // From user_project.role
        
        // Add as internal participant with proper role
        const participantResponse = await makeAuthenticatedRequest(
          `/meeting-participants/meeting/${meetingId}/participants`,
          {
            method: 'POST',
            body: JSON.stringify({
              user_id: matchingMember.user_id || matchingMember.id,
              role: scrumRole // Use actual Scrum role from project membership
            })
          },
          context
        );

        if (!participantResponse.error) {
          addedParticipants.push(matchingMember.full_name || matchingMember.username || participantName);
        } else {
          console.warn(`Failed to add participant ${participantName}:`, participantResponse.error);
        }
      } else {
        // Add as external participant
        const participantResponse = await makeAuthenticatedRequest(
          `/meeting-participants/meeting/${meetingId}/participants`,
          {
            method: 'POST',
            body: JSON.stringify({
              external_name: participantName,
              role: 'guest'
            })
          },
          context
        );

        if (!participantResponse.error) {
          addedParticipants.push(participantName);
        } else {
          console.warn(`Failed to add external participant ${participantName}:`, participantResponse.error);
        }
      }
    }

    return addedParticipants;
  } catch (error) {
    console.warn('Failed to add meeting participants:', error);
    return [];
  }
}

/**
 * Helper function to create recurring meetings with participants (optimized)
 */
async function createRecurringMeetings(
  baseStartDate: Date,
  sprintEndDate: string | undefined,
  meetingData: any,
  participants: string[] | undefined,
  projectId: number,
  context: any
): Promise<number[]> {
  const createdMeetingIds: number[] = [];
  
  try {
    const endDate = sprintEndDate ? new Date(sprintEndDate) : new Date(baseStartDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // Default 2 weeks
    let currentDate = new Date(baseStartDate);
    
    // Collect all meeting dates first
    const meetingDates: Date[] = [];
    while (currentDate < endDate) {
      // Skip weekends for daily standups
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        meetingDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Creating ${meetingDates.length} recurring meetings...`);

    // Create meetings in smaller batches to avoid long loading times
    const batchSize = 3; // Process 3 meetings at a time
    for (let i = 0; i < meetingDates.length; i += batchSize) {
      const batch = meetingDates.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (date) => {
        const meetingDataWithDate = {
          ...meetingData,
          start_datetime: date.toISOString()
        };

        const response = await makeAuthenticatedRequest(
          '/meetings/',
          {
            method: 'POST',
            body: JSON.stringify(meetingDataWithDate)
          },
          context
        );

        if (!response.error && response.data?.id) {
          const meetingId = response.data.id;
          
          // Add participants if specified
          if (participants && participants.length > 0) {
            await addMeetingParticipants(meetingId, participants, projectId, context);
          }
          
          return meetingId;
        }
        return null;
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      createdMeetingIds.push(...batchResults.filter(id => id !== null));
      
      // Short delay between batches to prevent overwhelming the server
      if (i + batchSize < meetingDates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Successfully created ${createdMeetingIds.length} recurring meetings`);
  } catch (error) {
    console.warn('Failed to create some recurring meetings:', error);
  }

  return createdMeetingIds;
}

/**
 * Helper function to get user's timezone and format datetime accordingly
 */
async function getUserTimezoneAndFormatDatetime(datetimeStr: string, context: any): Promise<{
  userTimezone: string;
  formattedDatetime: string;
  displayDateTime: string;
}> {
  try {
    // Get user profile to retrieve timezone setting
    const profileResponse = await makeAuthenticatedRequest(
      '/users/me/profile',
      { method: 'GET' },
      context
    );

    let userTimezone = 'UTC'; // Default fallback
    if (profileResponse.data && profileResponse.data.timezone) {
      userTimezone = profileResponse.data.timezone;
    }

    // Parse the input datetime and ensure it's in UTC for storage
    const inputDate = new Date(datetimeStr);
    let utcDatetime: string;
    
    // If the input appears to be in user's timezone, convert to UTC
    if (!datetimeStr.includes('Z') && !datetimeStr.includes('+') && !datetimeStr.includes('-')) {
      // Assume input is in user's local timezone, convert to UTC
      const localDate = new Date(datetimeStr);
      // Create a date assuming the input is in user's timezone
      const tempDate = new Date(localDate.toLocaleString('en-US', { timeZone: userTimezone }));
      const offset = tempDate.getTime() - localDate.getTime();
      const utcDate = new Date(localDate.getTime() - offset);
      utcDatetime = utcDate.toISOString();
    } else {
      // Input already has timezone info, use as-is
      utcDatetime = inputDate.toISOString();
    }

    // Format for display in user's timezone
    const displayDate = new Date(utcDatetime);
    const displayDateTime = displayDate.toLocaleString('en-US', {
      timeZone: userTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return {
      userTimezone,
      formattedDatetime: utcDatetime,
      displayDateTime
    };
  } catch (error) {
    console.warn('Failed to get user timezone, using UTC:', error);
    return {
      userTimezone: 'UTC',
      formattedDatetime: new Date(datetimeStr).toISOString(),
      displayDateTime: new Date(datetimeStr).toLocaleString()
    };
  }
}

/**
 * Tool for scheduling Scrum events
 */
export const scheduleEventTool = tool({
  description: `Schedule Scrum events including Sprint Planning, Daily Scrum, Sprint Review, and Sprint Retrospective. 
    This tool automatically detects the current project and active sprint context, handles participant invitations, 
    supports recurring meetings (especially for daily standups), and manages timezone settings. No calendar invites 
    are sent - meetings are managed within the ScrumiX system only.`,
  inputSchema: scheduleEventSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = scheduleEventSchema.parse(input);
      console.log('Scheduling Scrum event:', validated.event_type, 'with input:', validated);

      // 1. Get or detect project context
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

      // 2. Get or detect sprint context
      let sprintId = validated.sprint_id;
      let sprintName = '';
      let sprintEndDate: string | undefined;

      if (!sprintId) {
        const sprintContext = await getSprintContext(projectId!, validated.sprint_title, experimental_context);
        
        if ('available_sprints' in sprintContext) {
          if (sprintContext.available_sprints.length === 0) {
            return `No active or available sprints found for the project. Please create a sprint first or provide a specific sprint_id.`;
          }
          
          // Ask user to choose from available sprints
          const sprintOptions = sprintContext.available_sprints
            .map(sprint => `- **${sprint.name}** (Status: ${sprint.status})`)
            .join('\n');
            
          return `No active sprint found. Please specify which sprint to schedule the meeting for:

${sprintOptions}

You can specify the sprint by adding the sprint title to your request, like: "Schedule a ${validated.event_type.replace('_', ' ')} for Sprint 1"`;
        }
        
        sprintId = sprintContext.sprint_id;
        sprintName = sprintContext.sprint_name;
        sprintEndDate = sprintContext.sprint_end_date;
      }

      // 3. Get user timezone and format datetime
      const timezoneInfo = await getUserTimezoneAndFormatDatetime(
        validated.start_datetime, 
        experimental_context
      );

      // 4. Define event-specific defaults
      const eventDefaults = {
        sprint_planning: {
          title: 'Sprint Planning',
          defaultDuration: 120,
          description: 'Sprint Planning meeting to define the Sprint Goal and select Product Backlog items for the Sprint.',
          autoRecurring: false
        },
        daily_standup: {
          title: 'Daily Scrum',
          defaultDuration: 15,
          description: 'Daily Scrum to inspect progress toward the Sprint Goal and adapt the Sprint Backlog as necessary.',
          autoRecurring: true
        },
        sprint_review: {
          title: 'Sprint Review',
          defaultDuration: 90,
          description: 'Sprint Review to inspect the Increment and adapt the Product Backlog if needed.',
          autoRecurring: false
        },
        sprint_retrospective: {
          title: 'Sprint Retrospective',
          defaultDuration: 90,
          description: 'Sprint Retrospective to plan ways to increase quality and effectiveness.',
          autoRecurring: false
        }
      };

      const eventConfig = eventDefaults[validated.event_type];
      const shouldRecur = validated.recurring || eventConfig.autoRecurring;
      
      // 5. Prepare base meeting data
      const baseMeetingData = {
        title: eventConfig.title,
        meeting_type: validated.event_type,
        start_datetime: timezoneInfo.formattedDatetime,
        duration: validated.duration || eventConfig.defaultDuration,
        location: validated.location || '',
        description: validated.description || eventConfig.description,
        project_id: projectId,
        sprint_id: sprintId
      };

      console.log('Creating meeting with data:', baseMeetingData);

      let createdMeetings: any[] = [];
      let meetingIds: number[] = [];

      // 6. Create meeting(s)
      if (shouldRecur && validated.event_type === 'daily_standup') {
        // Create recurring daily standups with participants
        const baseStartDate = new Date(timezoneInfo.formattedDatetime);
        const recurringMeetingIds = await createRecurringMeetings(
          baseStartDate,
          sprintEndDate,
          baseMeetingData,
          validated.participants,
          projectId!,
          experimental_context
        );
        meetingIds = recurringMeetingIds;
        
        // Get details of the first meeting for display
        if (recurringMeetingIds.length > 0) {
          const firstMeetingResponse = await makeAuthenticatedRequest(
            `/meetings/${recurringMeetingIds[0]}`,
            { method: 'GET' },
            experimental_context
          );
          if (firstMeetingResponse.data) {
            createdMeetings.push(firstMeetingResponse.data);
          }
        }
      } else {
        // Create single meeting
      const response = await makeAuthenticatedRequest(
        '/meetings/',
        {
          method: 'POST',
            body: JSON.stringify(baseMeetingData)
        },
        experimental_context
      );

      if (response.error) {
          console.error('Meeting creation failed:', response.error);
          return `Failed to schedule ${eventConfig.title}: ${response.error}

**Debug Information:**
- Project: ${projectName} (ID: ${projectId})
- Sprint: ${sprintName} (ID: ${sprintId})
- Authentication: ${(experimental_context as any)?.cookies ? 'Available' : 'Missing'}

Please ensure you have permission to create meetings in this project.`;
        }

        if (!response.data || !response.data.id) {
          return `Failed to schedule ${eventConfig.title}: Meeting was not properly created in the system.`;
        }

        createdMeetings.push(response.data);
        meetingIds.push(response.data.id);

        // Add participants to single meeting if specified
        if (validated.participants && validated.participants.length > 0) {
          await addMeetingParticipants(response.data.id, validated.participants, projectId!, experimental_context);
        }
      }

      // 7. Prepare participant info for display
      let participantInfo = '';
      if (validated.participants && validated.participants.length > 0) {
        participantInfo = `\n- **Participants:** ${validated.participants.join(', ')}`;
      }

      // 8. Generate success message
      const mainMeeting = createdMeetings[0];
      const eventGuidance = {
        sprint_planning: `
### Sprint Planning Preparation Checklist:
- [ ] Product Backlog is refined and prioritized
- [ ] Definition of Done is clear and understood
- [ ] Team capacity is known for the sprint
- [ ] Previous sprint retrospective actions are reviewed`,
        
        daily_standup: `
### Daily Scrum Guidelines:
- Keep to 15 minutes maximum
- Focus on the three questions: What did I do yesterday? What will I do today? What impediments do I face?
- Address impediments after the meeting
- Ensure all Development Team members participate`,
        
        sprint_review: `
### Sprint Review Preparation:
- [ ] Demonstration environment is ready
- [ ] Increment meets Definition of Done
- [ ] Stakeholders are invited and prepared
- [ ] Product Owner is ready to discuss Product Backlog`,
        
        sprint_retrospective: `
### Sprint Retrospective Facilitation:
- [ ] Create a safe environment for open discussion
- [ ] Review previous retrospective action items
- [ ] Use structured format (e.g., What went well? What could improve? What will we commit to?)
- [ ] Focus on actionable improvements`
      };

      const recurringInfo = shouldRecur && validated.event_type === 'daily_standup' 
        ? `\n- **Recurring:** ${meetingIds.length} meetings created (daily until sprint ends)`
        : '';

      const successMessage = `Successfully scheduled **${eventConfig.title}**!

**Event Details:**
- **Project:** ${projectName || 'Current Project'}
- **Sprint:** ${sprintName || 'Current Sprint'}
- **Date & Time:** ${timezoneInfo.displayDateTime}
- **Duration:** ${mainMeeting.duration} minutes
- **Location:** ${mainMeeting.location || 'Not specified'}
- **Meeting ID:** #${mainMeeting.id}${participantInfo}${recurringInfo}
- **Your Timezone:** ${timezoneInfo.userTimezone}

${eventGuidance[validated.event_type]}

The meeting${meetingIds.length > 1 ? 's have' : ' has'} been added to the project calendar. Team members can view and manage ${meetingIds.length > 1 ? 'these meetings' : 'this meeting'} in the project meetings section.`;

      return successMessage;

    } catch (error) {
      console.error('Error in scheduleEventTool:', error);
      return `Failed to schedule Scrum event: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for managing meeting agenda items
 */
export const manageMeetingAgendaTool = tool({
  description: `Manage meeting agenda items with CRUD operations. Create, read, update, delete, and reorder agenda items for meetings. 
    Can search for meetings by title, type, or date if meeting_id is not provided. Just execute the requested operation without excessive questioning.`,
  inputSchema: agendaManagementSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = agendaManagementSchema.parse(input);
      
      // Find meeting ID if not provided
      let meetingId = validated.meeting_id;
      if (!meetingId && validated.meeting_search) {
        const meetings = await searchMeetings(validated.meeting_search, experimental_context);
        if (meetings.length === 0) {
          return `No meetings found matching "${validated.meeting_search}". Please check the meeting title, type, or date.`;
        }
        if (meetings.length > 1) {
          const meetingList = meetings.slice(0, 5).map((m: any) => 
            `- Meeting #${m.id}: ${m.title} (${new Date(m.start_datetime).toLocaleDateString()})`
          ).join('\n');
          return `Multiple meetings found matching "${validated.meeting_search}". Please specify which one:\n${meetingList}`;
        }
        meetingId = meetings[0].id;
      }

      if (!meetingId) {
        return `Please provide either 'meeting_id' or 'meeting_search' to identify the meeting.`;
      }

      console.log('Managing meeting agenda:', validated.operation, 'for meeting:', meetingId);

      switch (validated.operation) {
        case 'create':
          if (validated.agenda_items && validated.agenda_items.length > 0) {
            // Bulk create
            const response = await makeAuthenticatedRequest(
              `/meeting-agendas/meeting/${meetingId}/bulk`,
              {
                method: 'POST',
                body: JSON.stringify(validated.agenda_items)
              },
              experimental_context
            );

            if (response.error) {
              return `Failed to create agenda items: ${response.error}`;
            }

            return `Successfully created ${validated.agenda_items.length} agenda items:
${validated.agenda_items.map((item, index) => `${index + 1}. ${item}`).join('\n')}`;
          } else if (validated.title) {
            // Single create
            const response = await makeAuthenticatedRequest(
              '/meeting-agendas/',
              {
                method: 'POST',
                body: JSON.stringify({
                  meeting_id: meetingId,
                  title: validated.title,
                  order_index: validated.order_index
                })
              },
              experimental_context
            );

            if (response.error) {
              return `Failed to create agenda item: ${response.error}`;
            }

            return `Successfully created agenda item: "${validated.title}"`;
          } else {
            return `Please provide either 'title' for a single agenda item or 'agenda_items' for multiple items.`;
          }

        case 'read':
          const readResponse = await makeAuthenticatedRequest(
            `/meeting-agendas/meeting/${meetingId}`,
            { method: 'GET' },
            experimental_context
          );

          if (readResponse.error) {
            return `Failed to retrieve agenda items: ${readResponse.error}`;
          }

          const agendaItems = readResponse.data || [];
          if (agendaItems.length === 0) {
            return `No agenda items found for meeting #${meetingId}.`;
          }

          return `Meeting #${meetingId} Agenda (${agendaItems.length} items):
${agendaItems.map((item: any, index: number) => `${index + 1}. ${item.title}`).join('\n')}`;

        case 'update':
          if (!validated.agenda_id || !validated.title) {
            return `Please provide both 'agenda_id' and 'title' for updating an agenda item.`;
          }

          const updateResponse = await makeAuthenticatedRequest(
            `/meeting-agendas/${validated.agenda_id}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                title: validated.title,
                order_index: validated.order_index
              })
            },
            experimental_context
          );

          if (updateResponse.error) {
            return `Failed to update agenda item: ${updateResponse.error}`;
          }

          return `Successfully updated agenda item #${validated.agenda_id} to: "${validated.title}"`;

        case 'delete':
          if (!validated.agenda_id) {
            return `Please provide 'agenda_id' for deleting an agenda item.`;
          }

          const deleteResponse = await makeAuthenticatedRequest(
            `/meeting-agendas/${validated.agenda_id}`,
            { method: 'DELETE' },
            experimental_context
          );

          if (deleteResponse.error) {
            return `Failed to delete agenda item: ${deleteResponse.error}`;
          }

          return `Successfully deleted agenda item #${validated.agenda_id}.`;

        case 'reorder':
          if (!validated.agenda_ids || validated.agenda_ids.length === 0) {
            return `Please provide 'agenda_ids' array for reordering agenda items.`;
          }

          const reorderResponse = await makeAuthenticatedRequest(
            '/meeting-agendas/reorder',
            {
              method: 'POST',
              body: JSON.stringify({ agenda_ids: validated.agenda_ids })
            },
            experimental_context
          );

          if (reorderResponse.error) {
            return `Failed to reorder agenda items: ${reorderResponse.error}`;
          }

          return `Successfully reordered ${validated.agenda_ids.length} agenda items.`;

        default:
          return `Unknown operation: ${validated.operation}`;
      }

    } catch (error) {
      console.error('Error in manageMeetingAgendaTool:', error);
      return `Failed to manage meeting agenda: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Tool for managing meeting action items
 */
export const manageMeetingActionItemsTool = tool({
  description: `Manage meeting action items with CRUD operations. Create, read, update, and delete action items for meetings. 
    Can search for meetings by title, type, or date if meeting_id is not provided. Just execute the requested operation without excessive questioning.`,
  inputSchema: actionItemManagementSchema,
  execute: async (input, { experimental_context }) => {
    try {
      const validated = actionItemManagementSchema.parse(input);
      
      // Find meeting ID if not provided
      let meetingId = validated.meeting_id;
      if (!meetingId && validated.meeting_search) {
        const meetings = await searchMeetings(validated.meeting_search, experimental_context);
        if (meetings.length === 0) {
          return `No meetings found matching "${validated.meeting_search}". Please check the meeting title, type, or date.`;
        }
        if (meetings.length > 1) {
          const meetingList = meetings.slice(0, 5).map((m: any) => 
            `- Meeting #${m.id}: ${m.title} (${new Date(m.start_datetime).toLocaleDateString()})`
          ).join('\n');
          return `Multiple meetings found matching "${validated.meeting_search}". Please specify which one:\n${meetingList}`;
        }
        meetingId = meetings[0].id;
      }

      if (!meetingId) {
        return `Please provide either 'meeting_id' or 'meeting_search' to identify the meeting.`;
      }

      console.log('Managing meeting action items:', validated.operation, 'for meeting:', meetingId);

      switch (validated.operation) {
        case 'create':
          if (!validated.title) {
            return `Please provide 'title' for creating an action item.`;
          }

          const createResponse = await makeAuthenticatedRequest(
            '/meeting-action-items/',
            {
              method: 'POST',
              body: JSON.stringify({
                meeting_id: meetingId,
                title: validated.title,
                due_date: validated.due_date
              })
            },
            experimental_context
          );

          if (createResponse.error) {
            return `Failed to create action item: ${createResponse.error}`;
          }

          const dueDateInfo = validated.due_date ? ` (Due: ${new Date(validated.due_date).toLocaleDateString()})` : '';
          return `Successfully created action item: "${validated.title}"${dueDateInfo}`;

        case 'read':
          const readResponse = await makeAuthenticatedRequest(
            `/meeting-action-items/meeting/${meetingId}`,
            { method: 'GET' },
            experimental_context
          );

          if (readResponse.error) {
            return `Failed to retrieve action items: ${readResponse.error}`;
          }

          const actionItems = readResponse.data || [];
          if (actionItems.length === 0) {
            return `No action items found for meeting #${meetingId}.`;
          }

          return `Meeting #${meetingId} Action Items (${actionItems.length} items):
${actionItems.map((item: any, index: number) => {
  const dueDate = item.due_date ? ` (Due: ${new Date(item.due_date).toLocaleDateString()})` : '';
  return `${index + 1}. ${item.title}${dueDate}`;
}).join('\n')}`;

        case 'update':
          if (!validated.action_item_id || !validated.title) {
            return `Please provide both 'action_item_id' and 'title' for updating an action item.`;
          }

          const updateResponse = await makeAuthenticatedRequest(
            `/meeting-action-items/${validated.action_item_id}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                title: validated.title,
                due_date: validated.due_date
              })
            },
            experimental_context
          );

          if (updateResponse.error) {
            return `Failed to update action item: ${updateResponse.error}`;
          }

          const updateDueDateInfo = validated.due_date ? ` (Due: ${new Date(validated.due_date).toLocaleDateString()})` : '';
          return `Successfully updated action item #${validated.action_item_id} to: "${validated.title}"${updateDueDateInfo}`;

        case 'delete':
          if (!validated.action_item_id) {
            return `Please provide 'action_item_id' for deleting an action item.`;
          }

          const deleteResponse = await makeAuthenticatedRequest(
            `/meeting-action-items/${validated.action_item_id}`,
            { method: 'DELETE' },
            experimental_context
          );

          if (deleteResponse.error) {
            return `Failed to delete action item: ${deleteResponse.error}`;
          }

          return `Successfully deleted action item #${validated.action_item_id}.`;

        default:
          return `Unknown operation: ${validated.operation}`;
      }

    } catch (error) {
      console.error('Error in manageMeetingActionItemsTool:', error);
      return `Failed to manage meeting action items: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
    }
  }
});

/**
 * Schema for velocity analysis
 */
const velocityAnalysisSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project to analyze velocity for (auto-detected if not provided)'),
  
  sprint_count: z.number()
    .int('Sprint count must be a whole number')
    .min(1, 'Must analyze at least 1 sprint')
    .max(50, 'Cannot analyze more than 50 sprints at once')
    .default(20)
    .describe('Number of recent sprints to include in velocity calculation (set to high number to include all completed sprints)'),
  
  include_forecast: z.boolean()
    .default(true)
    .describe('Whether to include capacity forecasting for upcoming sprints')
});

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
        // We got exactly the limit we requested, so there might be more
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
            velocityPoints: completedStoryPoints, // Use actual completed story points, not API velocity
            completedItems: completedItems.length,
            totalItems: backlogItems.length,
            totalStoryPoints: backlogItems.reduce((sum: number, item: any) => sum + (item.story_point || 0), 0)
          };
        })
      );

      // Calculate velocity metrics from actual completed story points
      const velocityByPoints = sprintVelocityData.map(data => data.velocityPoints);
      const velocityByItems = sprintVelocityData.map(data => data.completedItems);
      
      // Calculate ACTUAL average velocity from completed story points of analyzed sprints
      const totalCompletedStoryPoints = velocityByPoints.reduce((sum, v) => sum + v, 0);
      const avgVelocity = velocityByPoints.length > 0 ? totalCompletedStoryPoints / velocityByPoints.length : 0;
      const avgVelocityItems = velocityByItems.length > 0 ? velocityByItems.reduce((sum, v) => sum + v, 0) / velocityByItems.length : 0;
      
      const totalSprints = sprints.length;
      const metrics = metricsResponse.data || {};

      console.log(`Velocity Calculation:
        - Sprints analyzed: ${velocityByPoints.length}
        - Individual completed story points: [${velocityByPoints.join(', ')}]
        - Total completed story points: ${totalCompletedStoryPoints}
        - Calculated average velocity: ${avgVelocity.toFixed(2)} story points per sprint
        - Backend API average (for comparison): ${avgVelocityResponse.data?.average_velocity || 'N/A'}`);
      
      
      // Calculate velocity consistency (coefficient of variation)
      const pointsVariance = velocityByPoints.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocityByPoints.length;
      const pointsStdDev = Math.sqrt(pointsVariance);
      const consistencyScore = avgVelocity > 0 ? Math.max(0, 100 - (pointsStdDev / avgVelocity * 100)) : 0;

      // Identify trends using recent vs earlier velocity
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
 * Schema for burndown analysis - all parameters are optional, can be called with empty object {}
 */
const burndownAnalysisSchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the sprint to analyze burndown for (auto-detected if not provided)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
  
  sprint_title: z.string()
    .optional()
    .describe('The title of the sprint to analyze (alternative to sprint_id when no active sprint)'),
  
  include_trend_analysis: z.boolean()
    .default(true)
    .describe('Whether to include trend analysis and projections'),
  
  include_ideal_comparison: z.boolean()
    .default(true)
    .describe('Whether to compare actual progress with ideal burndown line'),
  
  include_pattern_analysis: z.boolean()
    .default(true)
    .describe('Whether to analyze burndown patterns like spikes, plateaus, and blockers'),
  
  start_date: z.string()
    .optional()
    .describe('Optional start date filter for burndown data (ISO format)'),
  
  end_date: z.string()
    .optional()
    .describe('Optional end date filter for burndown data (ISO format)')
});

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
                console.log('Found sprint by title:', sprintId, sprint.sprint_name || sprint.sprintName);
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

              return `No active sprint found. Please specify which sprint's burndown chart to analyze:

${availableSprints}

You can specify the sprint by saying something like: "Analyze burndown for Sprint 1" or "Show me the burndown chart for [Sprint Name]"`;
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

      // Calculate sprint timeline - handle both field name formats
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
      const { dates, remaining_points, completed_points, total_points } = burndownData;
      const currentRemaining = remaining_points[remaining_points.length - 1] || 0;
      const currentCompleted = completed_points[completed_points.length - 1] || 0;
      const initialTotal = burndownData.initial_total_points || 0;

      // Enhanced ideal vs actual comparison with schedule status analysis
      let idealComparison = '';
      if (validated.include_ideal_comparison && initialTotal > 0 && dates.length > 0) {
        // Calculate ideal burndown for current day using same logic as frontend
        const idealRemainingAtCurrentTime = Math.max(0, initialTotal - (initialTotal * (elapsed / sprintDuration)));
        const idealVsActual = currentRemaining - idealRemainingAtCurrentTime;
        
        // Use dynamic tolerance like the frontend page: 10% of ideal points or at least 2 points
        const tolerance = Math.max(2, idealRemainingAtCurrentTime * 0.1);
        
        let performanceStatus, statusIcon, statusColor;
        if (idealVsActual > tolerance) {
          performanceStatus = 'Behind Schedule';
          statusIcon = '🔴';
          statusColor = 'RED';
        } else if (idealVsActual < -tolerance) {
          performanceStatus = 'Ahead of Schedule';
          statusIcon = '🟢';
          statusColor = 'GREEN';
        } else {
          performanceStatus = 'On Track';
          statusIcon = '🔵';
          statusColor = 'BLUE';
        }

        // Calculate completion rate vs ideal rate
        const actualCompletionRate = initialTotal > 0 ? (currentCompleted / initialTotal * 100) : 0;
        const idealCompletionRate = (elapsed / sprintDuration) * 100;
        const completionRateDifference = actualCompletionRate - idealCompletionRate;

        idealComparison = `
### 📊 Ideal vs Actual Progress Comparison

**Current Status: ${statusIcon} ${performanceStatus}** (${statusColor})

#### Remaining Work Analysis
- **Ideal Remaining (Day ${elapsed}):** ${idealRemainingAtCurrentTime.toFixed(1)} story points
- **Actual Remaining:** ${currentRemaining} story points
- **Variance:** ${idealVsActual > 0 ? '+' : ''}${idealVsActual.toFixed(1)} story points (${idealVsActual > 0 ? 'more' : 'less'} than ideal)
- **Tolerance Threshold:** ±${tolerance.toFixed(1)} story points

#### Completion Rate Analysis
- **Actual Completion Rate:** ${actualCompletionRate.toFixed(1)}% (${currentCompleted}/${initialTotal} points)
- **Ideal Completion Rate:** ${idealCompletionRate.toFixed(1)}% for Day ${elapsed}
- **Rate Difference:** ${completionRateDifference > 0 ? '+' : ''}${completionRateDifference.toFixed(1)}%

#### Schedule Assessment
${idealVsActual > tolerance ? 
  `⚠️ **BEHIND SCHEDULE**: The team is ${Math.abs(idealVsActual).toFixed(1)} points behind the ideal burndown line.
  
  **Recommended Actions:**
  - Review current impediments and blockers
  - Consider scope adjustment or story prioritization
  - Increase daily focus on completing current work
  - Hold team retrospective to identify process improvements` :
  idealVsActual < -tolerance ?
  `✅ **AHEAD OF SCHEDULE**: The team is ${Math.abs(idealVsActual).toFixed(1)} points ahead of the ideal burndown line.
  
  **Team Performance:**
  - Excellent progress and velocity
  - Consider adding additional scope if capacity allows
  - Document what's working well for future sprints
  - Team is demonstrating strong delivery capability` :
  `📈 **ON TRACK**: The team is closely following the ideal burndown trajectory.
  
  **Current Status:**
  - Progress is within acceptable variance (±${tolerance.toFixed(1)} points)
  - Maintain current pace and focus
  - Continue monitoring daily progress
  - Good alignment between planned and actual delivery`
}`;
      }

      // Generate trend analysis section
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
- **Data Points:** ${trendData.total_snapshots} snapshots

${!trendData.is_on_track ? 
  '⚠️ **Warning:** Current trend suggests sprint may not complete on time. Consider scope adjustment or impediment removal.' :
  '✅ **Good news:** Current trend indicates sprint is on track for completion.'
}`;
      }

      // Calculate completion percentage
      const completionPercentage = initialTotal > 0 ? (currentCompleted / initialTotal * 100).toFixed(1) : '0';
      const remainingPercentage = initialTotal > 0 ? (currentRemaining / initialTotal * 100).toFixed(1) : '0';

      // Enhanced pattern analysis
      let patternAnalysis = '';
      if (validated.include_pattern_analysis && remaining_points.length > 2) {
        const patterns = [];
        const patternInsights = [];
        const patternRecommendations = [];

        // Analyze for spikes (sudden increases in remaining work)
        const spikes = [];
        for (let i = 1; i < remaining_points.length; i++) {
          const change = remaining_points[i] - remaining_points[i - 1];
          const percentChange = remaining_points[i - 1] > 0 ? (change / remaining_points[i - 1]) * 100 : 0;
          
          if (change > 0 && percentChange > 15) { // Significant increase
            spikes.push({
              day: i + 1,
              date: dates[i],
              increase: change,
              percentChange: percentChange.toFixed(1)
            });
          }
        }

        if (spikes.length > 0) {
          patterns.push(`**Spikes Detected:** ${spikes.length} significant increases in remaining work`);
          spikes.forEach(spike => {
            patterns.push(`  - Day ${spike.day} (${new Date(spike.date).toLocaleDateString()}): +${spike.increase} points (+${spike.percentChange}%)`);
          });
          patternInsights.push('Work spikes detected - may indicate scope creep or task breakdown issues');
          patternRecommendations.push('Review what caused work increases and improve initial task estimation');
        }

        // Analyze for plateaus (periods of no progress)
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
            if (plateauLength >= 3) { // 3+ days of no progress
              plateaus.push({
                startDay: plateauStart + 1,
                endDay: plateauStart + plateauLength,
                startDate: dates[plateauStart],
                endDate: dates[plateauStart + plateauLength - 1],
                length: plateauLength,
                remainingWork: remaining_points[plateauStart]
              });
            }
            plateauStart = -1;
            plateauLength = 0;
          }
        }

        // Check for plateau at the end
        if (plateauLength >= 3) {
          plateaus.push({
            startDay: plateauStart + 1,
            endDay: plateauStart + plateauLength,
            startDate: dates[plateauStart],
            endDate: dates[plateauStart + plateauLength - 1],
            length: plateauLength,
            remainingWork: remaining_points[plateauStart]
          });
        }

        if (plateaus.length > 0) {
          patterns.push(`**Plateaus Detected:** ${plateaus.length} periods of stagnant progress`);
          plateaus.forEach(plateau => {
            patterns.push(`  - Days ${plateau.startDay}-${plateau.endDay}: ${plateau.length} days with no progress (${plateau.remainingWork} points remaining)`);
          });
          patternInsights.push('Extended plateaus suggest potential blockers or impediments');
          patternRecommendations.push('Identify and address impediments causing work stagnation in Daily Scrums');
        }

        // Analyze burndown smoothness (velocity consistency)
        const dailyProgress = [];
        for (let i = 1; i < remaining_points.length; i++) {
          const progress = remaining_points[i - 1] - remaining_points[i];
          if (progress >= 0) dailyProgress.push(progress);
        }

        if (dailyProgress.length > 0) {
          const avgDailyProgress = dailyProgress.reduce((sum, p) => sum + p, 0) / dailyProgress.length;
          const progressVariance = dailyProgress.reduce((sum, p) => sum + Math.pow(p - avgDailyProgress, 2), 0) / dailyProgress.length;
          const progressStdDev = Math.sqrt(progressVariance);
          const consistencyRatio = avgDailyProgress > 0 ? progressStdDev / avgDailyProgress : 0;

          if (consistencyRatio > 1.5) {
            patterns.push(`**Irregular Progress:** High variability in daily progress (${consistencyRatio.toFixed(2)} ratio)`);
            patternInsights.push('Inconsistent daily progress indicates uneven work distribution or varying task complexity');
            patternRecommendations.push('Consider better task breakdown and work distribution across team members');
          } else if (consistencyRatio < 0.3) {
            patterns.push(`**Steady Progress:** Very consistent daily progress (${consistencyRatio.toFixed(2)} ratio)`);
          }
        }

        // Schedule adherence analysis
        const scheduleAnalysis = [];
        if (initialTotal > 0 && elapsed > 0) {
          const expectedDailyBurn = initialTotal / sprintDuration;
          const actualDailyBurn = (initialTotal - currentRemaining) / elapsed;
          const scheduleRatio = actualDailyBurn / expectedDailyBurn;

          if (scheduleRatio > 1.2) {
            scheduleAnalysis.push('**Ahead of Schedule:** Team is burning down work faster than planned');
            patternInsights.push('Team is exceeding expected velocity - excellent progress');
          } else if (scheduleRatio < 0.8) {
            scheduleAnalysis.push('**Behind Schedule:** Team is burning down work slower than planned');
            patternInsights.push('Team velocity is below expectations - may need intervention');
            patternRecommendations.push('Investigate capacity issues and consider scope adjustment');
          } else {
            scheduleAnalysis.push('**On Schedule:** Team progress aligns well with sprint timeline');
          }

          // Analyze trajectory
          if (remaining_points.length >= 3) {
            const recentTrend = remaining_points.slice(-3);
            const recentSlope = (recentTrend[0] - recentTrend[2]) / 2; // Average daily progress over last 3 days
            const remainingDays = sprintDuration - elapsed;
            const projectedRemaining = currentRemaining - (recentSlope * remainingDays);

            if (projectedRemaining > currentRemaining * 0.1) {
              scheduleAnalysis.push(`**Completion Risk:** At current pace, ${projectedRemaining.toFixed(1)} points may remain unfinished`);
              patternInsights.push('Current trajectory suggests sprint goal may not be fully achieved');
              patternRecommendations.push('Focus on highest priority items and consider scope reduction');
            } else if (projectedRemaining < -currentRemaining * 0.1) {
              scheduleAnalysis.push('**Early Completion Likely:** Current pace suggests early sprint completion');
            }
          }
        }

        patternAnalysis = `
### 📊 Burndown Pattern Analysis

${patterns.length > 0 ? patterns.join('\n') + '\n' : '**No significant patterns detected** - Burndown appears normal\n'}

${scheduleAnalysis.length > 0 ? scheduleAnalysis.join('\n') + '\n' : ''}

${patternInsights.length > 0 ? `**Pattern Insights:**
${patternInsights.map(insight => `- ${insight}`).join('\n')}

` : ''}${patternRecommendations.length > 0 ? `**Pattern-Based Recommendations:**
${patternRecommendations.map(rec => `- ${rec}`).join('\n')}` : ''}`;
      }

      // Generate burndown visualization
      const burndownVisualization = dates.map((date: string, index: number) => {
        const remaining = remaining_points[index];
        const completed = completed_points[index];
        const dateObj = new Date(date);
        const dayOfWeek = dateObj.toLocaleDateString('en', { weekday: 'short' });
        const shortDate = dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' });
        
        return `${dayOfWeek} ${shortDate}: ${'█'.repeat(Math.max(1, Math.round(completed / 2)))}${'░'.repeat(Math.max(1, Math.round(remaining / 2)))} (${completed}/${completed + remaining})`;
      }).join('\n');

      // Generate insights and recommendations
      const insights = [];
      const recommendations = [];

      if (progressPercentage > 75 && parseFloat(remainingPercentage) > 30) {
        insights.push('Sprint is in final quarter but significant work remains');
        recommendations.push('Focus on completing highest priority items and consider scope reduction');
      }

      if (burndownData.snapshots_with_data < elapsed * 0.6) {
        insights.push('Limited burndown data available for accurate trend analysis');
        recommendations.push('Ensure daily updates to backlog item status for better tracking');
      }

      if (trendData && !trendData.is_on_track && progressPercentage > 50) {
        insights.push('Sprint trend indicates potential completion risk');
        recommendations.push('Conduct team discussion on impediments and consider scope adjustment');
      }

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
- **Data Points Collected:** ${burndownData.snapshots_with_data} of ${burndownData.sprint_duration_days} possible

${idealComparison}

${trendAnalysis}

${patternAnalysis}

## Burndown Progress Visualization
\`\`\`
${burndownVisualization}
\`\`\`

Legend: █ = Completed work, ░ = Remaining work

${insights.length > 0 ? `## 🔍 Key Insights
${insights.map(insight => `- ${insight}`).join('\n')}` : ''}

${recommendations.length > 0 ? `## 💡 Recommendations
${recommendations.map(rec => `- ${rec}`).join('\n')}` : ''}

## Actions for Scrum Master
- Monitor daily progress and update burndown chart
- Address any impediments blocking remaining work
- Investigate spikes and plateaus identified in pattern analysis
- Facilitate scope discussions if trend indicates completion risk
- Use burndown insights in Daily Scrum discussions
- Consider velocity factors for future sprint planning

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

/**
 * Schema for current sprint velocity analysis
 */
const currentSprintVelocitySchema = z.object({
  sprint_id: z.number()
    .int('Sprint ID must be a whole number')
    .positive('Sprint ID must be a positive integer')
    .optional()
    .describe('The ID of the current sprint (auto-detected if not provided)'),
  
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .optional()
    .describe('The ID of the project (auto-detected if not provided)'),
  
  compare_with_average: z.boolean()
    .default(true)
    .describe('Whether to compare current sprint velocity with team average')
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

      console.log('Analyzing current sprint velocity for sprint:', sprintId);

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

      // Calculate sprint timeline and progress - handle both field name formats
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

/**
 * Schema for retrospective analysis
 */
const retrospectiveAnalysisSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to analyze retrospectives for'),
  
  lookback_sprints: z.number()
    .int('Lookback sprints must be a whole number')
    .min(1, 'Must analyze at least 1 sprint')
    .max(6, 'Cannot analyze more than 6 sprints retrospectives')
    .default(3)
    .describe('Number of recent sprints to analyze retrospective patterns'),
  
  include_action_tracking: z.boolean()
    .default(true)
    .describe('Whether to track action items from previous retrospectives')
});

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

/**
 * Schema for Scrum compliance checking
 */
const complianceCheckSchema = z.object({
  project_id: z.number()
    .int('Project ID must be a whole number')
    .positive('Project ID must be a positive integer')
    .describe('The ID of the project to check Scrum compliance for'),
  
  check_period_days: z.number()
    .int('Check period must be a whole number')
    .min(7, 'Check period must be at least 7 days')
    .max(90, 'Check period cannot exceed 90 days')
    .default(30)
    .describe('Number of days to analyze for compliance patterns'),
  
  include_recommendations: z.boolean()
    .default(true)
    .describe('Whether to include specific recommendations for compliance improvements')
});

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
      const sprintsResponse = await makeAuthenticatedRequest(
        `/sprints/?project_id=${validated.project_id}&limit=50`,
        { method: 'GET' },
        experimental_context
      );

      if (sprintsResponse.error) {
        return `Failed to retrieve sprint data: ${sprintsResponse.error}`;
      }

      const allSprints = sprintsResponse.data || [];
      const recentSprints = allSprints.filter((sprint: any) => {
        const sprintStartDate = sprint.start_date || sprint.startDate;
        if (!sprintStartDate) return false;
        const sprintStart = new Date(sprintStartDate);
        return sprintStart >= startDate;
      });

      // Get meetings for the period
      const meetingsResponse = await makeAuthenticatedRequest(
        `/meetings/?date_from=${startDate.toISOString()}&date_to=${endDate.toISOString()}&limit=200`,
        { method: 'GET' },
        experimental_context
      );

      const allMeetings = meetingsResponse.data?.meetings || [];
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
        const backlogResponse = await makeAuthenticatedRequest(
          `/sprints/${sprint.id}/backlog`,
          { method: 'GET' },
          experimental_context
        );

        if (!backlogResponse.error) {
          const backlogItems = backlogResponse.data || [];
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

/**
 * Collection of all Scrum Master tools
 */
export const scrumMasterTools = {
  getSprintInfo: getSprintInfoTool,
  analyzeSprintHealth: analyzeSprintHealthTool,
  scheduleEvent: scheduleEventTool,
  analyzeVelocity: analyzeVelocityTool,
  analyzeBurndown: analyzeBurndownTool,
  analyzeCurrentSprintVelocity: analyzeCurrentSprintVelocityTool,
  analyzeRetrospectives: analyzeRetrospectivesTool,
  checkScrumCompliance: checkScrumComplianceTool,
  manageMeetingAgenda: manageMeetingAgendaTool,
  manageMeetingActionItems: manageMeetingActionItemsTool
};

/**
 * Type definition for the Scrum Master tools object
 */
export type ScrumMasterTools = typeof scrumMasterTools;
