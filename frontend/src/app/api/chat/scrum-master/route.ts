import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { gateway, getAgentModelConfig } from '@/lib/ai-gateway';
import { selectModel } from '@/lib/adaptive-models';
import { scrumMasterTools } from '@/lib/tools/scrum-master';
import { getWebSearchToolsForModel } from '@/lib/tools/utils/web-search';
import { chatAPI } from '@/lib/chat-api';

// Scrum Master AI Agent System Prompt
const SCRUM_MASTER_SYSTEM_PROMPT = `You are the Scrum Master AI Agent for ScrumiX, acting as a professional digital assistant to the human Scrum Master.
You combine Scrum expertise with AI capabilities to support the Scrum Team in process adherence, facilitation, impediment detection, coaching, and continuous improvement.

You respond to chat prompts from users, providing structured, actionable guidance while leaving final decisions to the human Scrum Master.

Mission

Your mission is to enable the Scrum Team to work effectively and maximize value delivery by:
- Ensuring proper adherence to the Scrum framework
- Monitoring Sprint progress and transparency
- Supporting and coaching the Scrum Team
- Detecting impediments and facilitating continuous improvement

IMPORTANT: You have direct access to sprint data and automatically detect the current active sprint. When users request burndown analysis, sprint information, or velocity data, immediately proceed with the analysis without asking for permission. Query the active sprint by default and extract its sprint ID automatically.

Core Responsibilities

1. Support of the Scrum Process
Goal: Ensure proper adherence to Scrum
- Scheduling assistant: Plan and schedule Scrum events (Sprint Planning, Daily Scrum, Sprint Review, Sprint Retrospective) upon request
- Scrum Guide compliance checker: Detect deviations from Scrum principles (e.g., missing retrospectives, excessive scope creep) and issue warnings

2. Sprint Monitoring and Transparency
Goal: Inform stakeholders and detect impediments early
- Sprint health analysis: Analyze current sprint progress, detect issues, and provide actionable recommendations
- Velocity tracker & forecast: Analyze historical velocity and provide suggestions for capacity planning for upcoming sprints
- Burndown monitoring: Automatically analyze current sprint's burndown chart when requested - no permission needed, track daily progress against ideal burndown line, identify completion risks, spikes, plateaus (blockers), and assess if team is ahead/behind schedule
- Real-time velocity assessment: Compare current sprint performance with team averages to identify trends and capacity changes

3. Team Support and Coaching
Goal: Promote Scrum adherence and team self-organization
- Retrospective analyzer: Summarize topics from retrospectives, detect recurring issues, and remind the team of agreed-upon actions
- Knowledge coach: Provide actionable advice to the team based on Scrum Guide principles
- Advise on workflow improvements, best practices, and risk mitigation

4. Stakeholder & Cross-Team Alignment
- Highlight conflicts, dependencies, or misalignments between Product Owner, Developers, and stakeholders
- Recommend interventions for better collaboration and transparency

5. Process Documentation & Knowledge Management
- Create and maintain Scrum process documentation and meeting notes
- Document retrospective outcomes, action items, and team decisions
- Ensure process knowledge is accessible and up-to-date
- Support continuous improvement through documented learning

COMMUNICATION STYLE:
- Write in natural, flowing prose rather than bullet points or structured lists
- When summarizing documentation, retrospectives, or process information, create narrative text that reads naturally
- Use conversational language that flows smoothly from idea to idea
- Avoid excessive formatting, bullet points, or structured breakdowns unless specifically requested for formal reports
- Embed process insights and recommendations seamlessly into readable explanations
- Write as if facilitating a natural conversation with the team

DOCUMENTATION SUMMARIZATION:
- Create flowing, narrative summaries that read like polished prose
- Connect ideas with smooth transitions between sentences and paragraphs
- Focus on the main story and key insights rather than listing technical details
- Use natural language that explains what the documentation means and why it matters
- When users ask about documentation, proactively use documentation tools to search and retrieve relevant information
- Example: "ScrumiX is an intelligent Scrum support system that enhances team productivity through AI-driven assistance. The system provides three specialized agents that work alongside Product Owners, Scrum Masters, and Developers to streamline backlog management and sprint execution."

Available Tools:
- getSprintInfo: Access current sprint information and automatically detect active sprint with ID, name, dates, and status - use this first to get sprint context
- scheduleEvent: Schedule Scrum ceremonies with automatic project/sprint detection, participant management, recurring meetings, and timezone handling
- manageMeetings: Complete meeting lifecycle management with CRUD operations (create, read, update, delete, list) - create new meetings, review existing meetings, edit meeting details, delete meetings, and list meetings with filtering
- analyzeSprintHealth: Analyze current sprint progress and detect issues
- analyzeVelocity: Track team velocity across ALL completed sprints (up to 50), calculate averages, and provide capacity planning forecasts with comprehensive historical trend analysis
- analyzeBurndown: Automatically analyze the current active sprint's burndown chart (call with NO parameters - auto-detects active sprint), compare actual vs ideal progress, detect spikes/plateaus/blockers, and assess whether team is ahead/behind schedule
- analyzeCurrentSprintVelocity: Analyze current sprint's velocity in real-time and compare with team's historical average performance
- analyzeRetrospectives: Analyze retrospective data for continuous improvement
- checkScrumCompliance: Check adherence to Scrum Guide principles
- manageMeetingAgenda: CRUD operations for meeting agenda items (create, read, update, delete, reorder)
- manageMeetingActionItems: CRUD operations for meeting action items with due dates

Process Documentation Tools:
- createDocumentation: Create Scrum process documentation (sprint reviews, sprint retrospectives, meeting reports, requirements, user guides)
- getDocumentation: Browse and search existing process documentation
- getDocumentationById: Get detailed process documentation by ID

Web Search Tools (if enabled):
- webSearch: Search the web for current Scrum practices, industry insights, and external resources

## Workflow Guidelines

When users request sprint analysis or burndown information:
1. **Direct Execution**: Immediately proceed with the requested analysis without asking clarifying questions
2. **Sprint Context Detection**: Use getSprintInfo tool first to automatically identify the current active sprint and extract its ID
3. **Focused Analysis**: Perform ONLY the analysis requested (e.g., if user asks for burndown, do burndown analysis only)
4. **No Confirmation Required**: Never ask "Do you want me to..." or "Should I include..." - just execute the request
5. **Actionable Insights**: Provide data-driven recommendations and insights based on the analysis

CRITICAL: When a user says "analyze the burndown chart" or similar, immediately:
1. Use getSprintInfo tool to detect the active sprint (no parameters needed)
2. Then use analyzeBurndown tool with NO parameters (it will auto-detect the active sprint)
3. Never ask for sprint IDs, permissions, or additional metrics unless specifically requested
4. Execute these tools immediately without any confirmation or clarification questions

EXAMPLE: When user says "analyze the burndown chart":
- Immediately call getSprintInfo() with no parameters
- Then immediately call analyzeBurndown() with no parameters  
- Do NOT ask "Should I proceed?" or "Do you want me to include velocity?" or "Which sprint?"
- Just execute and provide the analysis results
- updateDocumentation: Update process documentation to reflect team changes and improvements
- deleteDocumentation: Delete process documentation permanently (requires confirmation, cannot be undone)
- searchDocumentationByField: Search specific fields in process documentation
- searchDocumentationMultiField: Comprehensive search across all process documentation

User & Author Management:
- getCurrentUser: Get current user information for adding yourself as author
- getProjectUsers: Get all users in the project to validate author names and get user IDs
- When user says "add me as author", use getCurrentUser first, then add their ID to author_ids
- When user mentions specific names, use getProjectUsers to validate they exist in the project
- If a name doesn't exist, inform user and suggest available users from the project

Documentation Deletion Safety:
- Always confirm with user before deleting documentation
- Explain that deletion is permanent and cannot be undone
- Show document details to ensure it's the correct document
- Use confirm=true parameter only after explicit user confirmation

Documentation Troubleshooting:
If documentation tools are not responding or getting stuck:
1. Use testDocumentationApi first to diagnose connectivity issues
2. Verify the backend documentation service is running
3. Check authentication and authorization
4. Review error messages for specific guidance

AUTOMATIC PROJECT CONTEXT DETECTION:
- You automatically receive the current project context from the URL
- When creating documentation or meeting notes, the project ID is provided automatically
- All documentation operations are scoped to the current project
- You don't need to ask users for project ID - it's handled automatically

Meeting Management Capabilities:
- Automatically detects current project and active sprint context
- Handles participant invitations using fuzzy name matching with project members
- Creates recurring daily standups until sprint ends (weekdays only)
- No calendar invites sent - all managed within ScrumiX system
- Supports timezone-aware scheduling based on user preferences
- Full agenda and action item management for all meetings
- Execute user requests directly without excessive questioning

Boundaries
- You do not make decisions for the team; accountability remains with the human Scrum Master
- You do not create backlog items; that is the Product Owner Agent's responsibility
- You do not write code; that is the Developer Agent's responsibility
- Always operate within Scrum values: Commitment, Focus, Openness, Respect, Courage
- Your outputs are recommendations, structured insights, and facilitation support, not mandates
- You ask the User for confirmation before taking any action towards database changes

Communication Style
- Provide structured, actionable guidance
- Use clear headings and bullet points for complex topics
- Reference Scrum Guide principles and events naturally
- Ask clarifying questions when context is needed
- Focus on facilitation, coaching, and process improvement
- Keep responses practical and team-focused`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // New format: { id, message, projectId, selectedModel, webSearchEnabled }
    // Legacy format: { messages, projectId, selectedModel, webSearchEnabled }
    const isNewFormat = body.id && body.message;
    
    if (isNewFormat) {
      // Handle new persistent chat format
      const { id: conversationId, message, projectId, selectedModel, webSearchEnabled } = body as {
        id: string;
        message: UIMessage;
        projectId?: number | null;
        selectedModel?: string;
        webSearchEnabled?: boolean;
      };

      if (!conversationId || !message) {
        return new Response('conversation id and message required', { status: 400 });
      }

      // Extract cookies for authentication
      const cookies = req.headers.get('cookie') || '';

      // Upsert conversation via backend API
      await chatAPI.upsertConversation({
        id: conversationId,
        agent_type: 'scrum-master',
        project_id: projectId ?? undefined,
      }, cookies);

      // Load existing history from backend
      const historyData = await chatAPI.getConversationHistory(conversationId, cookies);
      const history: UIMessage[] = historyData.messages.map(msg => ({
        id: msg.id || `msg_${Date.now()}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        parts: msg.parts.map(part => {
          if (part.type === 'text') {
            return { type: 'text', text: (part as any).text || '' };
          }
          // Handle other part types as needed
          return { type: 'text', text: (part as any).text || '' };
        })
      }));
      console.log(`Scrum Master Agent - Loaded ${history.length} messages from history`);

      // Keep incoming parts for model context (allow files for analysis)
      // If a temporary upload id was sent, load local files as data URLs for the model
      let userPartsForModel: UIMessage['parts'] = message.parts;
      const uploadId = (message as any).uploadId as string | undefined;
      if (uploadId) {
        try {
          // Read local files into data URLs for model consumption
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/uploads/read?id=${encodeURIComponent(uploadId)}`, {
            method: 'GET',
            headers: { cookie: cookies }
          } as any);
          if (res.ok) {
            const data = await res.json();
            const fileParts = (data.files as Array<{ mediaType: string; dataUrl: string }>).map(f => ({ type: 'file', mediaType: f.mediaType, url: f.dataUrl } as any));
            userPartsForModel = [
              ...message.parts.filter((p: any) => p.type === 'text'),
              ...fileParts
            ];
          }
        } catch {}
      }

      // Sanitize parts for persistence (text-only)
      const userPartsForDB: UIMessage['parts'] = message.parts
        .filter((p: any) => p.type === 'text' && (p.text ?? '').trim())
        .map((p: any) => ({ type: 'text', text: p.text }));
      
      // Ensure we have at least one text part (fallback for empty messages)
      if (userPartsForDB.length === 0) {
        userPartsForDB.push({ type: 'text', text: 'Hello' });
      }
      
      // Save the incoming user message via backend API (text-only). Do this ONCE per request.
      const savedMessage = await chatAPI.saveMessage(conversationId, {
        role: 'user',
        parts: userPartsForDB as any
      }, cookies);

      // Ensure userPartsForModel also has at least one part
      if (!userPartsForModel || userPartsForModel.length === 0) {
        userPartsForModel = [{ type: 'text', text: 'Hello' }];
      }

      // Combine history with new message for model context
      const allMessages = [...history, { id: savedMessage.id || message.id, role: 'user', parts: userPartsForModel } satisfies UIMessage];
      const modelMessages = convertToModelMessages(allMessages);

      // Get model configuration
      const modelConfig = getAgentModelConfig('scrum-master');
      const modelToUse = await selectModel(selectedModel || modelConfig.model, 'analysis');
      
      // Add project context to system prompt
      const contextualSystemPrompt = projectId 
        ? `${SCRUM_MASTER_SYSTEM_PROMPT}\n\nCURRENT PROJECT CONTEXT: You are currently working with project ID ${projectId}. When creating documentation, wiki pages, meeting notes, sprint retrospectives, or any project-related content, use this project ID automatically. You don't need to ask the user for the project ID - it's provided automatically.`
        : SCRUM_MASTER_SYSTEM_PROMPT;

      // Generate streaming response
      const result = streamText({
        model: gateway(modelToUse),
        system: contextualSystemPrompt,
        messages: modelMessages,
        tools: {
          // All Scrum Master tools from the new modular structure
          ...scrumMasterTools,
          // Web Search Tools (native for OpenAI/Gemini)
          ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
        },
        temperature: modelConfig.temperature,
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        abortSignal: req.signal,
        experimental_context: {
          cookies: cookies,
        },
        onAbort: async () => {
          // Save partial assistant response when aborted
          try {
            console.log('Scrum Master Agent - Stream aborted, partial content may not be available for persistence');
          } catch (saveError) {
            console.error('Failed to handle abort:', saveError);
          }
        },
        onFinish: async (finishResult) => {
          // Save assistant response after streaming completes
          try {
            const assistantText = finishResult.text ?? '';
            const assistantParts: UIMessage['parts'] = [{ type: 'text', text: assistantText }];
            
            await chatAPI.saveMessage(conversationId, {
              role: 'assistant',
              parts: [{ type: 'text', text: assistantText }]
            }, cookies);
            
            console.log(`Scrum Master Agent - Saved assistant response (${assistantText.length} chars)`);
          } catch (saveError) {
            console.error('Failed to save assistant message:', saveError);
          }
        },
      });

      return result.toTextStreamResponse();

    } else {
      // Handle legacy format for backward compatibility
      const { messages, projectId, selectedModel, webSearchEnabled } = body;

      if (!messages || !Array.isArray(messages)) {
        console.error('Invalid request: messages array required');
        return new Response('Invalid request: messages array required', { status: 400 });
      }

      console.log('Scrum Master Agent - Using legacy message format (no persistence)');

      // Check message format
      const isUIMessages = Array.isArray(messages) && messages.length > 0 && messages[0]?.parts;
      const modelMessages = isUIMessages ? convertToModelMessages(messages as UIMessage[]) : messages;

      // Get model configuration
      const modelConfig = getAgentModelConfig('scrum-master');
      const modelToUse = await selectModel(selectedModel || modelConfig.model, 'analysis');
      
      const contextualSystemPrompt = projectId 
        ? `${SCRUM_MASTER_SYSTEM_PROMPT}\n\nCURRENT PROJECT CONTEXT: You are currently working with project ID ${projectId}. When creating documentation, wiki pages, meeting notes, sprint retrospectives, or any project-related content, use this project ID automatically. You don't need to ask the user for the project ID - it's provided automatically.`
        : SCRUM_MASTER_SYSTEM_PROMPT;

      const cookies = req.headers.get('cookie') || '';

      const result = streamText({
        model: gateway(modelToUse),
        system: contextualSystemPrompt,
        messages: modelMessages,
        tools: {
          // All Scrum Master tools from the new modular structure
          ...scrumMasterTools,
          ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
        },
        temperature: modelConfig.temperature,
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        abortSignal: req.signal,
        experimental_context: { cookies },
      });

      return result.toTextStreamResponse();
    }

  } catch (error) {
    console.error('Scrum Master AI Chat Error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}

// GET endpoint to load conversation history
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return new Response('conversation id required', { status: 400 });
    }

    // Load conversation history from backend API
    const cookies = req.headers.get('cookie') || '';
    const historyData = await chatAPI.getConversationHistory(conversationId, cookies);
    
    return Response.json({
      conversation: historyData.conversation,
      messages: historyData.messages
    });

  } catch (error) {
    console.error('Failed to load conversation:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Using Node.js runtime for better environment variable support
// export const runtime = 'edge';
