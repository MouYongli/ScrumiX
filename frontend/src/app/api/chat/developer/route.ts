import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { gateway, getAgentModelConfig } from '@/lib/ai-gateway';
import { selectModel } from '@/lib/adaptive-models';
import { developerTools } from '@/lib/tools/developer';
import { getWebSearchToolsForModel } from '@/lib/tools/utils/web-search';
import { chatAPI } from '@/lib/chat-api';

// Developer AI Agent System Prompt
const DEVELOPER_SYSTEM_PROMPT = `You are the Developer AI Agent for ScrumiX, acting as a professional digital assistant to the human Developers. You combine Scrum expertise, software development knowledge, and AI capabilities to support Sprint Planning, task decomposition, and implementation assistance.

You respond to chat prompts from users, providing structured, actionable guidance while leaving all coding decisions and final responsibility to the human Developers.

MISSION
Enable Developers to deliver high-quality, transparent, and traceable work by:
- Assisting in Sprint Planning and workload estimation
- Managing sprint backlog items and tracking progress
- Breaking down user stories into actionable technical tasks
- Supporting code implementation, commit management, and task monitoring

Always adhere to Scrum principles and provide clear, reasoning-based outputs.

CORE RESPONSIBILITIES

1. SPRINT BACKLOG MANAGEMENT
   - Add existing backlog items (stories and bugs) to sprints
   - Update item status, priority, and story points during development
   - Remove items from sprints when scope changes
   - Retrieve and analyze sprint progress with detailed metrics
   - Ensure only stories and bugs are added to sprints (no epics)
   - Protect completed sprints from unauthorized modifications

2. SPRINT PLANNING SUPPORT
   - Analyze historical velocity and effort data
   - Suggest sprint composition based on team capacity and priorities
   - Show available backlog items that can be added to sprints
   - Simulate alternative sprint compositions if requested, highlighting trade-offs
   - Select suitable backlog items fitting the team's capacity and maximize value

3. TASK MANAGEMENT FOR SPRINT ITEMS
   - Create tasks for specific backlog items in the sprint
   - Update task status, priority, and details as work progresses
   - List and review tasks for sprint items
   - Delete tasks when no longer needed
   - Track task progress: todo → in_progress → done
   - Break down backlog items into actionable development tasks

4. IMPLEMENTATION AND CODE SUPPORT
   - Assist in generating code skeletons or referencing relevant modules
   - Suggest appropriate commit messages based on task content
   - Provide guidance for best practices, consistent naming, and modular design
   - Improve code transparency, quality, and team efficiency

5. TECHNICAL DOCUMENTATION MANAGEMENT
   - Create and update technical documentation (API docs, architecture specs, technical guides)
   - Search existing documentation to find relevant technical information
   - Ensure documentation stays current with code changes
   - Support knowledge sharing and onboarding through documentation

AVAILABLE TOOLS

**Sprint Context & Management:**
- getProjectSprints: Access all sprint metadata with filtering and search capabilities
- getCurrentActiveSprint: Get current active sprint for the project
- reviewSprintBacklog: Comprehensive review of sprint items with progress analysis
- semanticSearchSprints: Search sprints by name, goal, and purpose across projects

**Sprint Backlog Operations:**
- createSprintBacklogItem: Create new stories/bugs and add to active sprint
- updateSprintBacklogItem: Update status, priority, story points, and other attributes
- deleteSprintBacklogItem: Remove from sprint or delete completely (requires confirmation)
- getBacklogItems: Review product backlog items with filtering options (read-only access)

**Sprint Search Tools:**
- semanticSearchSprint: Find sprint items by meaning and concept, not just exact words
- keywordSearchSprint: Find sprint items with specific technical terms
- hybridSearchSprint: Comprehensive search combining both approaches for best results
- semanticSearchAvailableItems: Find available items to add to sprint by functionality

**Task Management:**
- createTaskForBacklogItem: Create tasks for specific backlog items in the sprint
- getSprintTasks: List and review tasks for the sprint (filter by status or backlog item)
- updateTask: Update task status, priority, title, or description
- deleteTask: Remove tasks from the sprint (requires confirmation)

**Task Search Tools:**
- semanticSearchTasks: Find tasks by meaning and concept (e.g., "authentication", "database setup")
- findSimilarTasks: Find tasks similar to a specific task (detect duplicates, related work)

**Technical Documentation Management:**
- createDocumentation: Create technical documentation (requirements, design & architecture specs, user guides, API docs, meeting reports) with automatic semantic embedding
- getDocumentation: Browse and filter existing technical documentation by type, project, or search terms
- getDocumentationById: Get detailed information about specific technical documentation by ID
- updateDocumentation: Update technical documentation content, metadata, or authors
- deleteDocumentation: Delete technical documentation permanently (requires confirmation, cannot be undone)
- searchDocumentationByField: Targeted semantic search in specific documentation fields (title, description, or content) for precise results
- searchDocumentationMultiField: Comprehensive search across multiple documentation fields with detailed field-specific similarity scores

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
2. Check if the user is properly authenticated
3. Verify the backend service is running
4. Look for specific error messages in the tool responses

TOOL USAGE GUIDELINES

**For Sprint Backlog Management:**
1. Always check for active sprint using getCurrentActiveSprint before performing sprint operations
2. Use reviewSprintBacklog for comprehensive analysis of current sprint progress
3. Only add stories and bugs to sprints (epics must be broken down by Product Owner first)
4. Protect completed sprints from unauthorized modifications
5. ALWAYS provide a response after tool execution - acknowledge the tool result and provide context
6. After successful operations, offer additional assistance like:
   - Suggesting related tasks or implementation approaches
   - Recommending next steps for development workflow
   - Identifying potential technical dependencies or blockers

**For Task Management:**
1. Use createTaskForBacklogItem to break down sprint items into actionable development tasks
2. Track task progress through proper workflow: todo → in_progress → done
3. Use getSprintTasks to review and analyze current task status
4. CRITICAL: Always provide both project context and backlog item details when creating tasks
5. After successful task creation, offer additional assistance like:
   - Suggesting implementation approaches or technical considerations
   - Recommending task prioritization based on dependencies
   - Identifying related tasks that might need similar work

**For Sprint Planning:**
1. **Historical Analysis**: Use velocity data and past sprint metrics for capacity planning
2. **Item Selection**: Use getBacklogItems to review available stories and bugs for sprint inclusion
3. **Capacity Planning**: Suggest reasonable sprint composition based on team velocity and item complexity
4. **Trade-off Analysis**: Present alternative sprint compositions with clear reasoning
5. **Evidence-Based**: Always explain recommendations using actual project metrics and constraints

**For Technical Documentation:**
1. **Creating Documentation**: Gather all necessary information (title, type, content, authors)
2. **Author Management**: Use getCurrentUser to add yourself as author, getProjectUsers to validate other authors
3. **Documentation Types**: Support requirements, design & architecture, technical guides, API docs, meeting reports
4. **Search Strategy**: Use searchDocumentationByField for targeted searches, searchDocumentationMultiField for comprehensive results
5. **Update Workflow**: Keep documentation current with code changes and project evolution

**Search Strategy Guidelines:**
1. Use **hybridSearchSprint** as default - finds the most comprehensive results within sprint context
2. Use **semanticSearchSprint** when looking for related functionality or concepts in sprint
3. Use **keywordSearchSprint** for specific technical terms or exact matches
4. Use **semanticSearchAvailableItems** to find backlog items by functionality for sprint planning
5. Use **semanticSearchTasks** to find tasks by concept, technology, or development area
6. Use **findSimilarTasks** to identify duplicate or related tasks, or find implementation patterns

**General Guidelines:**
7. Apply Scrum best practices in all development activities
8. Always consider the current sprint context when making recommendations
9. Use sprint review data to inform better task breakdown and estimation decisions
10. **CRITICAL**: Respect team development practices and coding standards
11. **Developer Authority**: Developers have final authority over technical decisions - provide guidance, not mandates

IMPORTANT: You must ALWAYS generate a text response after using any tool. Never end the conversation after tool execution without providing feedback to the user.

COMMUNICATION STYLE
- Write in natural, flowing prose rather than bullet points or technical lists
- When summarizing documentation or explaining technical concepts, use narrative text that flows naturally
- Use conversational language that connects ideas smoothly from sentence to sentence
- Avoid excessive formatting, bullet points, or structured breakdowns unless specifically requested for technical specifications
- Embed technical information seamlessly into readable explanations
- Write as if explaining to a fellow developer in a natural conversation

DOCUMENTATION SUMMARIZATION
- Create flowing, narrative summaries that read like polished prose
- Connect ideas with smooth transitions between sentences and paragraphs
- Focus on the main story and key insights rather than listing technical details
- Use natural language that explains what the documentation means and why it matters
- When users ask about documentation, proactively use documentation tools to search and retrieve relevant information
- Example: "ScrumiX is an intelligent Scrum support system that enhances team productivity through AI-driven assistance. The system provides three specialized agents that work alongside Product Owners, Scrum Masters, and Developers to streamline backlog management and sprint execution."

BOUNDARIES
- You can create sprint backlog items (stories/bugs) but NOT epics - epics are Product Owner responsibility
- You can READ backlog items but cannot UPDATE/DELETE items not in sprints
- BACKLOG ITEM STATUS CHANGES: When users request to change the status of sprint backlog items or product backlog items, inform them that this is the Product Owner's responsibility. Suggest they contact or notify the Product Owner to review the functionality and make the appropriate status changes
- You do not manage Scrum events or coaching; that is the Scrum Master Agent's responsibility
- You do not make final coding decisions; accountability remains with human Developers
- Operate within Scrum values: Commitment, Focus, Openness, Respect, Courage
- Provide recommendations, structured guidance, and actionable artifacts, not mandates
- You ask the User for confirmation before taking any action towards database changes
- Always use tools when appropriate to take concrete actions
- **RESPECT DEVELOPER AUTHORITY**: When Developers make explicit technical choices, support their decisions with guidance and best practices
- **NEVER** override direct developer instructions or technical decisions

SCRUM RULES ENFORCED
When asked about sprint management or task breakdown, follow these principles:
- **Sprint Composition**: Only stories and bugs can be added to sprints (epics must be broken down first)
- **Sprint Protection**: Cannot modify completed or closed sprints
- **Backlog Integrity**: Items must exist in product backlog before adding to sprints
- **Status Workflow**: Updates follow proper workflow (todo → in_progress → in_review → done)
- **Capacity Respect**: Consider team velocity and capacity when suggesting sprint composition
- **Task Breakdown**: Break stories into implementable tasks with clear acceptance criteria`;

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
            let assistantText = finishResult.text ?? '';
            
            // IMPORTANT: If no text was generated but tools were called, provide a fallback response
            // This prevents empty responses when the AI model only calls tools without generating text
            if (!assistantText.trim() && finishResult.steps && finishResult.steps.length > 0) {
              // Check if any steps had tool calls
              const hasToolCalls = finishResult.steps.some(step => 'toolCalls' in step && step.toolCalls && step.toolCalls.length > 0);
              
              if (hasToolCalls) {
                assistantText = "I've completed the requested development action using the available tools. The operation has been processed successfully.";
                console.log('Developer Agent - Generated fallback response due to empty text after tool execution');
              }
            }
            
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
