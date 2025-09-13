/**
 * Example Integration: Scrum Master AI Agent
 * 
 * This file demonstrates how to integrate the Scrum Master tools
 * into an AI agent using Vercel AI SDK 5
 */

import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { scrumMasterTools } from './scrum-master';
import { backlogManagementTools } from './backlog-management';

/**
 * Example: Scrum Master Agent with comprehensive tooling
 */
export async function createScrumMasterAgent() {
  // Combine all available tools for the Scrum Master
  const tools = {
    ...scrumMasterTools,
    // Can also include backlog tools for cross-functional support
    getBacklogItems: backlogManagementTools.getBacklogItems,
  };

  return {
    tools,
    systemPrompt: `You are an experienced Scrum Master AI assistant with deep knowledge of the Scrum Guide and agile best practices. Your role is to:

1. **Facilitate Scrum Events**: Help schedule and prepare for Sprint Planning, Daily Scrums, Sprint Reviews, and Sprint Retrospectives
2. **Monitor Sprint Health**: Continuously analyze sprint progress, detect impediments, and provide actionable recommendations
3. **Coach the Team**: Provide guidance on Scrum practices, help resolve conflicts, and foster continuous improvement
4. **Ensure Compliance**: Monitor adherence to Scrum principles and guide the team back on track when deviations occur
5. **Support Data-Driven Decisions**: Use velocity analysis and metrics to help with capacity planning and forecasting

## Your Capabilities:

### Sprint Monitoring
- Analyze sprint health with burndown tracking and progress assessment
- Detect anomalies like scope creep, work distribution issues, or timeline risks
- Provide early warnings and specific recommendations for course correction

### Event Facilitation
- Schedule Scrum events with proper timing and preparation guidelines
- Provide event-specific facilitation tips and agenda recommendations
- Ensure all ceremonies serve their intended purpose per the Scrum Guide

### Team Coaching
- Analyze retrospective patterns and action item completion
- Identify recurring issues and suggest systematic improvements
- Provide coaching on Scrum roles, events, and artifacts

### Compliance Monitoring
- Check adherence to Scrum Guide principles and practices
- Detect missing ceremonies or process deviations
- Provide specific recommendations for improving Scrum implementation

## Communication Style:
- Be supportive and coaching-oriented, not prescriptive
- Use data to back up recommendations and insights
- Focus on continuous improvement and team empowerment
- Provide specific, actionable next steps
- Acknowledge team successes and progress

## When Using Tools:
- Always provide context for why you're analyzing specific data
- Explain the insights in terms of Scrum principles and team benefit
- Connect findings to actionable improvements the team can implement
- Use multiple tools together to provide comprehensive analysis when helpful

Remember: Your goal is to help the team become more effective at delivering value while following Scrum principles. Be a servant leader who facilitates, coaches, and removes impediments.`
  };
}

/**
 * Example: Sprint Health Check Workflow
 */
export async function performSprintHealthCheck(
  sprintId: number,
  context: { cookies: string }
) {
  const agent = await createScrumMasterAgent();

  const result = await generateText({
    model: openai('gpt-4-turbo'),
    tools: agent.tools,
    system: agent.systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Please perform a comprehensive health check on sprint ${sprintId}. I want to understand how we're progressing, if there are any risks, and what actions we should take.`
      }
    ],
    experimental_context: context,
  });

  return result;
}

/**
 * Example: Weekly Scrum Master Report
 */
export async function generateWeeklyReport(
  projectId: number,
  context: { cookies: string }
) {
  const agent = await createScrumMasterAgent();

  const result = await generateText({
    model: openai('gpt-4-turbo'),
    tools: agent.tools,
    system: agent.systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate a comprehensive weekly Scrum Master report for project ${projectId}. Include:
        1. Sprint health analysis for any active sprints
        2. Velocity trends and forecasting
        3. Recent retrospective insights and action item progress
        4. Scrum compliance assessment
        5. Recommended actions for the upcoming week
        
        Make this actionable for both the team and stakeholders.`
      }
    ],
    experimental_context: context,
  });

  return result;
}

/**
 * Example: Streaming Sprint Analysis
 */
export async function streamSprintAnalysis(
  sprintId: number,
  context: { cookies: string }
) {
  const agent = await createScrumMasterAgent();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    tools: agent.tools,
    system: agent.systemPrompt,
    messages: [
      {
        role: 'user',
        content: `I need a detailed analysis of sprint ${sprintId}. Please analyze the sprint health, check our velocity against historical data, and provide coaching recommendations. Stream the results as you analyze different aspects.`
      }
    ],
    experimental_context: context,
  });

  return result;
}

/**
 * Example: Interactive Scrum Master Chat
 */
export class ScrumMasterChat {
  private agent: Awaited<ReturnType<typeof createScrumMasterAgent>>;
  private context: { cookies: string };
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(context: { cookies: string }) {
    this.context = context;
  }

  async initialize() {
    this.agent = await createScrumMasterAgent();
  }

  async sendMessage(message: string) {
    if (!this.agent) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    this.conversationHistory.push({ role: 'user', content: message });

    const result = await generateText({
      model: openai('gpt-4-turbo'),
      tools: this.agent.tools,
      system: this.agent.systemPrompt,
      messages: this.conversationHistory,
      experimental_context: this.context,
    });

    this.conversationHistory.push({ role: 'assistant', content: result.text });
    
    return {
      text: result.text,
      toolResults: result.toolResults,
      usage: result.usage
    };
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

/**
 * Example usage patterns for different scenarios
 */
export const usageExamples = {
  // Quick sprint check
  sprintHealthCheck: async (sprintId: number, context: { cookies: string }) => {
    return await performSprintHealthCheck(sprintId, context);
  },

  // Comprehensive weekly analysis
  weeklyReport: async (projectId: number, context: { cookies: string }) => {
    return await generateWeeklyReport(projectId, context);
  },

  // Interactive coaching session
  startCoachingSession: async (context: { cookies: string }) => {
    const chat = new ScrumMasterChat(context);
    await chat.initialize();
    return chat;
  },

  // Streaming analysis for real-time feedback
  realtimeAnalysis: async (sprintId: number, context: { cookies: string }) => {
    return await streamSprintAnalysis(sprintId, context);
  }
};

/**
 * Type definitions for integration
 */
export type ScrumMasterAgent = Awaited<ReturnType<typeof createScrumMasterAgent>>;
export type ScrumMasterResponse = Awaited<ReturnType<typeof performSprintHealthCheck>>;
export type WeeklyReportResponse = Awaited<ReturnType<typeof generateWeeklyReport>>;

/**
 * Utility function to handle common error scenarios
 */
export function handleScrumMasterError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('Authentication context missing')) {
      return 'Please ensure you are logged in to access Scrum Master features.';
    }
    if (error.message.includes('Sprint not found')) {
      return 'The specified sprint could not be found. Please check the sprint ID.';
    }
    if (error.message.includes('Project not found')) {
      return 'The specified project could not be found. Please check the project ID.';
    }
    return `An error occurred: ${error.message}`;
  }
  return 'An unexpected error occurred while processing your request.';
}
