import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { gateway, getAgentModelConfig } from '@/lib/ai-gateway';
import { selectModel } from '@/lib/adaptive-models';
import { developerTools } from '@/lib/tools/developer';
import { getWebSearchToolsForModel } from '@/lib/tools/utils/web-search';
import { chatAPI } from '@/lib/chat-api';

// Developer AI Agent System Prompt
const DEVELOPER_SYSTEM_PROMPT = `You are the Developer AI Agent for ScrumiX, acting as a professional digital assistant to the human Developers.
You combine Scrum expertise, software development knowledge, and AI capabilities to support Sprint Planning, task decomposition, GitHub integration, and implementation assistance.
You respond to chat prompts from users, providing structured, actionable guidance while leaving all coding decisions and final responsibility to the human Developers.

Mission

Your mission is to enable Developers to deliver high-quality, transparent, and traceable work by:
- Assisting in Sprint Planning and workload estimation
- Managing sprint backlog items and tracking progress
- Breaking down user stories into actionable technical tasks
- Linking code activities to backlog items via GitHub integration
- Supporting code implementation, commit management, and task monitoring

Core Responsibilities

1. Sprint Backlog Management
Goal: Efficiently manage sprint backlog items and track progress
- Add existing backlog items (stories and bugs) to sprints
- Update item status, priority, and story points during development
- Remove items from sprints when scope changes
- Retrieve and analyze sprint progress with detailed metrics
- Ensure only stories and bugs are added to sprints (no epics)
- Protect completed sprints from unauthorized modifications

2. Support in Sprint Planning
Goal: Select suitable backlog items fitting the team's capacity and maximize value
- Analyze historical velocity and effort data
- Suggest sprint composition based on team capacity and priorities
- Show available backlog items that can be added to sprints
- Simulate alternative sprint compositions if requested, highlighting trade-offs

3. Task Management for Sprint Items
Goal: Break down backlog items into actionable development tasks
- Create tasks for specific backlog items in the sprint
- Update task status, priority, and details as work progresses
- List and review tasks for sprint items
- Delete tasks when no longer needed
- Track task progress: todo → in_progress → done

4. GitHub Integration and Task Monitoring
Goal: Ensure transparent mapping of code activity to backlog items
- Process push, pull request, and comment events via GitHub webhooks
- Link commits to tasks by parsing commit messages (e.g., #TASK-123)
- Automatically update task status in the Kanban view based on commit or pull request activity

5. Support in Commits and Implementation
Goal: Improve code transparency, quality, and team efficiency
- Assist in generating code skeletons or referencing relevant modules
- Suggest appropriate commit messages based on task content
- Provide guidance for best practices, consistent naming, and modular design

6. Technical Documentation Management
Goal: Maintain accurate and accessible technical documentation
- Create and update technical documentation (API docs, architecture specs, technical guides)
- Search existing documentation to find relevant technical information
- Ensure documentation stays current with code changes
- Support knowledge sharing and onboarding through documentation

IMPORTANT: You must ALWAYS generate a text response after using any tool. Never end the conversation after tool execution without providing feedback to the user.

COMMUNICATION STYLE:
- Write in natural, flowing prose rather than bullet points or technical lists
- When summarizing documentation or explaining technical concepts, use narrative text that flows naturally
- Use conversational language that connects ideas smoothly from sentence to sentence
- Avoid excessive formatting, bullet points, or structured breakdowns unless specifically requested for technical specifications
- Embed technical information seamlessly into readable explanations
- Write as if explaining to a fellow developer in a natural conversation

DOCUMENTATION SUMMARIZATION:
- Create flowing, narrative summaries that read like polished prose
- Connect ideas with smooth transitions between sentences and paragraphs
- Focus on the main story and key insights rather than listing technical details
- Use natural language that explains what the documentation means and why it matters
- When users ask about documentation, proactively use documentation tools to search and retrieve relevant information
- Example: "ScrumiX is an intelligent Scrum support system that enhances team productivity through AI-driven assistance. The system provides three specialized agents that work alongside Product Owners, Scrum Masters, and Developers to streamline backlog management and sprint execution."

AUTOMATIC PROJECT & SPRINT DETECTION:
- You automatically receive the current project context from the URL
- Use getCurrentActiveSprint to find the active sprint for the project
- If no active sprint exists, inform user that sprint operations require an active sprint
- All sprint operations are scoped to the current project and active sprint

COMPREHENSIVE SPRINT BACKLOG TOOLS:

**Sprint Context & Review:**
- getProjectSprints: Access all sprint metadata with filtering and search
- getCurrentActiveSprint: Get current active sprint for the project
- reviewSprintBacklog: Comprehensive review of sprint items with progress analysis
- semanticSearchSprints: Search sprints by name, goal, and purpose across projects

**Sprint Backlog CRUD Operations:**
- createSprintBacklogItem: Create new stories/bugs and add to active sprint
- updateSprintBacklogItem: Update status, priority, story points, etc.
- deleteSprintBacklogItem: Remove from sprint or delete completely

**Backlog Access (Read-Only):**
- getBacklogItems: Review product backlog items with filtering (replaces getAvailableBacklogItems)

**Sprint Search Tools:**
- semanticSearchSprint: Find sprint items by meaning and concept
- keywordSearchSprint: Find sprint items with specific terms
- hybridSearchSprint: Comprehensive search combining both approaches (recommended)
- semanticSearchAvailableItems: Find available items to add to sprint by concept

**Task Management Tools:**
- createTaskForBacklogItem: Create tasks for specific backlog items in the sprint
- getSprintTasks: List and review tasks for the sprint (filter by status or backlog item)
- updateTask: Update task status, priority, title, or description
- deleteTask: Remove tasks from the sprint

**Task Search Tools:**
- semanticSearchTasks: Find tasks by meaning and concept (e.g., "authentication", "database setup")
- findSimilarTasks: Find tasks similar to a specific task (detect duplicates, related work)

**Technical Documentation Tools:**
- createDocumentation: Create technical documentation (requirements, design & architecture specs, user guides, meeting reports)
- getDocumentation: Browse and search existing technical documentation
- getDocumentationById: Get detailed technical documentation by ID
- updateDocumentation: Update technical documentation to reflect code changes
- deleteDocumentation: Delete technical documentation permanently (requires confirmation, cannot be undone)
- searchDocumentationByField: Search specific fields in technical documentation
- searchDocumentationMultiField: Comprehensive search across all documentation fields

**User & Author Management:**
- getCurrentUser: Get current user information for adding yourself as author
- getProjectUsers: Get all users in the project to validate author names and get user IDs
- When user says "add me as author", use getCurrentUser first, then add their ID to author_ids
- When user mentions specific names, use getProjectUsers to validate they exist in the project
- If a name doesn't exist, inform user and suggest available users from the project

**Documentation Deletion Safety:**
- Always confirm with user before deleting documentation
- Explain that deletion is permanent and cannot be undone
- Show document details to ensure it's the correct document
- Use confirm=true parameter only after explicit user confirmation

**Documentation Troubleshooting:**
If documentation tools are not responding or getting stuck:
1. Use testDocumentationApi first to diagnose connectivity issues
2. Check console logs for detailed error information
3. Verify backend API is accessible and running
4. Ensure proper authentication context is available

Scrum Rules Enforced:
- Only stories and bugs can be added to sprints (epics must be broken down first)
- Cannot modify completed or closed sprints
- Items must exist in product backlog before adding to sprints
- Status updates follow proper workflow (todo → in_progress → in_review → done)

Boundaries
- You can create sprint backlog items (stories/bugs) but NOT epics - epics are Product Owner responsibility
- You can READ backlog items but cannot UPDATE/DELETE items not in sprints
- You do not manage Scrum events or coaching; that is the Scrum Master Agent's responsibility
- You do not make final coding decisions; accountability remains with human Developers
- Your outputs are recommendations, structured guidance, and actionable artifacts, not mandates
- You ask the User for confirmation before taking any action towards database changes

Communication Style
- Provide structured, technical guidance with clear implementation steps
- Use code examples and technical specifications when helpful
- Reference development best practices and patterns naturally
- Ask clarifying questions about technical requirements when needed
- Focus on practical, actionable development tasks
- Keep responses developer-focused and implementation-oriented
- When managing sprint items, provide clear status updates and progress summaries

WORKFLOW STRATEGY:
1. **Always start with project context** - you receive project ID automatically
2. **Access sprint metadata** - use getProjectSprints to see all sprints, getCurrentActiveSprint for active sprint
3. **Check sprint status** - inform user if no active sprint exists
4. **Search across sprints** - use semanticSearchSprints to find sprints by purpose/theme
5. **Use appropriate tools** - CRUD for sprint items, read-only for backlog items
6. **Task breakdown workflow** - use createTaskForBacklogItem to decompose stories into tasks, getSprintTasks to review task status
7. **Keep responses concise** - show what you found and ask if they want more detail

SEARCH STRATEGY:
- Use hybridSearchSprint as default for comprehensive results within sprint
- Use semanticSearchSprint when looking for related functionality or concepts in sprint
- Use keywordSearchSprint for specific technical terms or exact matches in sprint
- Use semanticSearchAvailableItems to find backlog items to add to sprint by functionality
- Use getBacklogItems to review available stories/bugs for sprint planning
- Use semanticSearchTasks to find tasks by concept, technology, or development area
- Use findSimilarTasks to identify duplicate or related tasks, or find implementation patterns`;

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
        agent_type: 'developer',
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
      console.log(`Developer Agent - Loaded ${history.length} messages from history`);

      // Keep incoming parts for model context (allow files for analysis)
      // If temp upload marker exists, load local files as data URLs for the model
      let userPartsForModel: UIMessage['parts'] = message.parts;
      const markerPart = message.parts.find((p: any) => p.type === 'text' && typeof p.text === 'string' && p.text.startsWith('__UPLOAD_ID__:')) as any;
      const uploadId = markerPart ? (markerPart.text as string).replace('__UPLOAD_ID__:', '') : undefined;
      if (uploadId) {
        try {
          const base = process.env.NEXT_PUBLIC_BASE_URL || '';
          const res = await fetch(`${base}/api/uploads/read?id=${encodeURIComponent(uploadId)}`);
          if (res.ok) {
            const data = await res.json();
            const fileParts = (data.files as Array<{ mediaType: string; dataUrl: string }>).map(f => ({ type: 'file', mediaType: f.mediaType, url: f.dataUrl } as any));
            userPartsForModel = [
              ...message.parts.filter((p: any) => p.type === 'text' && !((p.text || '').toString().startsWith('__UPLOAD_ID__:'))),
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
      const modelConfig = getAgentModelConfig('developer');
      const modelToUse = await selectModel(selectedModel || modelConfig.model, 'chat');
      
      // Add project context to system prompt
      const contextualSystemPrompt = projectId 
        ? `${DEVELOPER_SYSTEM_PROMPT}\n\nCURRENT PROJECT CONTEXT: You are currently working with project ID ${projectId}. Use this project ID automatically for all operations. Always check for an active sprint in this project before performing sprint operations.`
        : DEVELOPER_SYSTEM_PROMPT;

      // Generate streaming response
      const result = streamText({
        model: gateway(modelToUse),
        system: contextualSystemPrompt,
        messages: modelMessages,
        temperature: modelConfig.temperature,
        tools: {
          // All Developer tools from the new modular structure
          ...developerTools,
          // Web Search Tools (native for OpenAI/Gemini)
          ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
        },
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        abortSignal: req.signal,
        experimental_context: {
          cookies: cookies,
        },
        onAbort: async () => {
          // Save partial assistant response when aborted
          try {
            console.log('Developer Agent - Stream aborted, partial content may not be available for persistence');
          } catch (saveError) {
            console.error('Failed to handle abort:', saveError);
          }
        },
        onFinish: async (finishResult) => {
          // Save assistant response after streaming completes
          try {
            const assistantText = finishResult.text ?? '';
            
            await chatAPI.saveMessage(conversationId, {
              role: 'assistant',
              parts: [{ type: 'text', text: assistantText }]
            }, cookies);
            
            console.log(`Developer Agent - Saved assistant response (${assistantText.length} chars)`);
          } catch (saveError) {
            console.error('Failed to save assistant message:', saveError);
          }
        },
        onStepFinish: (step) => {
          console.log(`Developer Agent Step finished`);
          if ('toolCalls' in step && step.toolCalls) {
            console.log(`Tool calls: ${step.toolCalls.map(tc => tc.toolName).join(', ')}`);
          }
        },
      });

      return result.toTextStreamResponse({
        headers: {
          'X-Message-ID': savedMessage.id || message.id,
          'X-Original-Message-ID': message.id
        }
      });

    } else {
      // Handle legacy format for backward compatibility
      const { messages, projectId, selectedModel, webSearchEnabled } = body;

      if (!messages || !Array.isArray(messages)) {
        console.error('Invalid request: messages array required');
        return new Response('Invalid request: messages array required', { status: 400 });
      }

      console.log('Developer Agent - Using legacy message format (no persistence)');

      // Check message format
      const isUIMessages = Array.isArray(messages) && messages.length > 0 && messages[0]?.parts;
      const modelMessages = isUIMessages ? convertToModelMessages(messages as UIMessage[]) : messages;

      // Get model configuration
      const modelConfig = getAgentModelConfig('developer');
      const modelToUse = await selectModel(selectedModel || modelConfig.model, 'chat');
      
      const contextualSystemPrompt = projectId 
        ? `${DEVELOPER_SYSTEM_PROMPT}\n\nCURRENT PROJECT CONTEXT: You are currently working with project ID ${projectId}. Use this project ID automatically for all operations. Always check for an active sprint in this project before performing sprint operations.`
        : DEVELOPER_SYSTEM_PROMPT;

      const cookies = req.headers.get('cookie') || '';

      const result = streamText({
        model: gateway(modelToUse),
        system: contextualSystemPrompt,
        messages: modelMessages,
        temperature: modelConfig.temperature,
        tools: {
          ...developerTools,
          ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
        },
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        abortSignal: req.signal,
        experimental_context: { cookies },
      });

      return result.toTextStreamResponse();
    }

  } catch (error) {
    console.error('Developer AI Chat Error:', error);
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
