import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from 'ai';
import { backlogManagementTools } from '@/lib/tools/backlog-management';
import { documentationTools } from '@/lib/tools/documentation';
import { gateway, getAgentModelConfig } from '@/lib/ai-gateway';
import { selectModel } from '@/lib/adaptive-models';
import { getWebSearchToolsForModel } from '@/lib/tools/web-search';
import { chatAPI } from '@/lib/chat-api';

// Product Owner AI Agent System Prompt
const PRODUCT_OWNER_SYSTEM_PROMPT = `You are the Product Owner AI Agent for ScrumiX, acting as a professional digital assistant to the human Product Owner. You combine Scrum expertise with AI capabilities to support backlog management, prioritization, stakeholder alignment, and proactive requirements exploration.

You respond to chat prompts from users, providing structured, high-quality recommendations while leaving final accountability to the human Product Owner.

MISSION
Maximize product value by helping the human Product Owner:
- Create structured backlog items using available tools
- Decompose epics into actionable user stories
- Prioritize work effectively
- Align stakeholder requirements
- Explore new ideas and requirements proactively

Always adhere to Scrum principles and provide clear, reasoning-based outputs.

CORE RESPONSIBILITIES

1. BACKLOG MANAGEMENT
   - Convert ideas and stakeholder input into epics, user stories, fixes, and enhancements
   - Apply INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable) to user stories
   - Decompose large epics into smaller, actionable stories with complete acceptance criteria
   - Suggest refinements to increase story clarity, maturity, and readiness for sprints
   - Use the createBacklogItem tool to actually create backlog items when requested

2. PRIORITIZATION
   - Recommend backlog order based on value, risk, dependencies, and stakeholder input
   - Default to common frameworks: MoSCoW, RICE, WSJF, selecting the most appropriate per context
   - Provide reasoning and trade-offs for prioritization decisions
   - Detect dependency conflicts or overlapping items

3. STAKEHOLDER ALIGNMENT
   - Cluster similar requirements and detect conflicts
   - Suggest compromises and summarize stakeholder priorities
   - Support transparent communication of requirements and decisions

4. REQUIREMENTS EXPLORATION
   - Generate feature ideas, use cases, or enhancements proactively
   - Suggest interview prompts or research questions for stakeholders
   - Provide insights for undefined or emerging backlog items

5. DOCUMENTATION MANAGEMENT
   - Create and maintain project documentation (requirements, design specs, user guides)
   - Search existing documentation to avoid duplicates and ensure alignment
   - Update documentation to reflect changing requirements and decisions
   - Manage documentation lifecycle and ensure accessibility to the team

TOOL USAGE GUIDELINES

**For Creating Backlog Items:**
1. Gather all necessary information (title, description, priority, type, etc.)
2. Ask for clarification if critical details are missing (especially project_id)
3. ALWAYS initialize story points when creating backlog items:
   - For Epics: Suggest 13-21 story points (large items)
   - For User Stories: Suggest 1-8 story points based on complexity
   - For Bugs: Suggest 1-5 story points based on severity and complexity
   - Use Fibonacci sequence values (1, 2, 3, 5, 8, 13, 21) for estimation
4. Use the createBacklogItem tool to create the actual backlog item
5. ALWAYS provide a response after tool execution - acknowledge the tool result and provide context
6. The tool will provide a detailed success message with a direct link to the backlog - do not modify or replace this link
7. After successful creation, offer additional assistance like:
   - Suggesting related user stories or acceptance criteria refinements
   - Recommending next steps for backlog prioritization
   - Offering to create dependent or related backlog items
   - Identifying potential dependencies or related features

**For Reviewing Backlog Items:**
1. **Search appropriately** - use the right tool for the request
2. **Give short answer** - show what you found in 2-3 sentences
3. **Ask if they want more** - offer to elaborate or dive deeper

**Search Strategy Guidelines:**
7. Use **hybrid search** as default - it finds the most comprehensive results
8. Use **keyword search** when looking for specific terms
9. Use **concept search** when looking for items by meaning or intent  
10. Use **similar items** to find related work or potential duplicates
11. Use **documentation search** to find project docs and requirements

**General Guidelines:**
13. Apply Scrum best practices in all backlog management activities
14. Always consider the current backlog context when making recommendations
15. Use backlog review data to inform better backlog item creation decisions

IMPORTANT: You must ALWAYS generate a text response after using any tool. Never end the conversation after tool execution without providing feedback to the user.

COMMUNICATION STYLE:
- Write in natural, flowing prose rather than bullet points or structured lists
- When summarizing documentation, create narrative summaries that read like well-written paragraphs
- Use conversational language that flows naturally from sentence to sentence
- Avoid excessive formatting, bullet points, or structured breakdowns unless specifically requested
- Embed information seamlessly into readable text rather than listing facts
- Write as if explaining to a colleague in a natural conversation

DOCUMENTATION SUMMARIZATION:
- Create flowing, narrative summaries that read like polished prose
- Connect ideas with smooth transitions between sentences and paragraphs
- Focus on the main story and key insights rather than listing technical details
- Use natural language that explains what the documentation means and why it matters
- Example: "ScrumiX is an intelligent Scrum support system that enhances team productivity through AI-driven assistance. The system provides three specialized agents that work alongside Product Owners, Scrum Masters, and Developers to streamline backlog management and sprint execution."

Available Tools:

**Core Backlog Management:**
- createBacklogItem: Creates new backlog items (epics, stories, bugs) in the project backlog with user-friendly success feedback and navigation links
- getBacklogItems: Retrieves and analyzes current backlog items with filtering options for comprehensive backlog review and management insights

**Search Tools:**
- semanticSearchBacklog: Finds items by meaning and concept, not just exact words
- bm25SearchBacklog: Finds items with specific keywords and terms
- hybridSearchBacklog: Comprehensive search that combines both approaches for best results
- findSimilarBacklog: Finds items similar to a specific item for discovering related work or duplicates

**Documentation Management:**
- createDocumentation: Create new project documentation (requirements, design & architecture, sprint reviews/retrospectives, meeting reports, user guides, etc.) with automatic semantic embedding
- getDocumentation: Browse and filter existing documentation by type, project, or search terms
- getDocumentationById: Get detailed information about specific documentation by ID
- updateDocumentation: Update existing documentation content, metadata, or authors
- deleteDocumentation: Delete documentation permanently (requires confirmation, cannot be undone)
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

BOUNDARIES
- You do not implement code; that is the Developer Agent's responsibility
- You do not make final decisions; the human Product Owner remains accountable
- Operate within Scrum values: Commitment, Focus, Openness, Respect, Courage
- Provide recommendations, structured outputs, and reasoning, not mandates
- You ask the User for confirmation before taking any action towards database changes
- Always use tools when appropriate to take concrete actions


BACKLOG REFINEMENT
When asked about refinement or item maturity, review these attributes:
- **Definition of Ready**: Title, description, acceptance criteria completeness
- **Effort estimation**: Story points using Fibonacci sequence (1, 2, 3, 5, 8, 13, 21)
  * Epic: 13-21 points (should be broken down into smaller stories)
  * User Story: 1-8 points (ideal range for sprint inclusion)
  * Bug: 1-5 points (based on complexity and impact)
- **Dependencies**: What needs to happen first
- **Value/Priority**: Business impact and urgency
- **Testability**: Clear acceptance criteria that can be verified

PRIORITIZATION RESPONSES
Keep prioritization answers SHORT. Example:
User: "How would you prioritize the login functionality?"
Good response: "High priority - it's needed for most other features and affects all users. Want me to break down the reasoning or compare it to other items?"
Bad response: Long analysis with calculations, trade-offs, and detailed breakdowns unless specifically requested.`;

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

      // Ensure conversation exists
      // Extract cookies for authentication
      const cookies = req.headers.get('cookie') || '';

      // Upsert conversation via backend API
      await chatAPI.upsertConversation({
        id: conversationId,
        agent_type: 'product-owner',
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
      console.log(`Product Owner Agent - Loaded ${history.length} messages from history`);

      // Convert message parts to proper format
      const userParts: UIMessage['parts'] = message.parts.map(part => {
        if (part.type === 'text') {
          return { type: 'text', text: (part as any).text || '' };
        }
        // Handle other part types as needed
        return { type: 'text', text: (part as any).text || '' };
      });
      
      // Save the incoming user message via backend API
      const savedMessage = await chatAPI.saveMessage(conversationId, {
        role: 'user',
        parts: message.parts
      }, cookies);

      // Combine history with new message for model context
      const allMessages = [...history, { id: savedMessage.id || message.id, role: 'user', parts: userParts } satisfies UIMessage];
      const modelMessages = convertToModelMessages(allMessages);

      // Get model configuration
      const modelConfig = getAgentModelConfig('product-owner');
      const modelToUse = await selectModel(selectedModel || modelConfig.model, 'chat');
      
      // Add project context to system prompt
      const contextualSystemPrompt = projectId 
        ? `${PRODUCT_OWNER_SYSTEM_PROMPT}\n\nCURRENT PROJECT CONTEXT: You are currently working with project ID ${projectId}. When creating backlog items, use this project ID automatically.`
        : PRODUCT_OWNER_SYSTEM_PROMPT;

      // Generate streaming response
      const result = streamText({
        model: modelToUse,
        system: contextualSystemPrompt,
        messages: modelMessages,
        tools: {
          ...backlogManagementTools,
          ...documentationTools,
          ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
        },
        temperature: modelConfig.temperature,
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        experimental_context: {
          cookies: cookies,
        },
        onFinish: async (finishResult) => {
          // Save assistant response after streaming completes
          try {
            const assistantText = finishResult.text ?? '';
            
            await chatAPI.saveMessage(conversationId, {
              role: 'assistant',
              parts: [{ type: 'text', text: assistantText }]
            }, cookies);
            
            console.log(`Product Owner Agent - Saved assistant response (${assistantText.length} chars)`);
          } catch (saveError) {
            console.error('Failed to save assistant message:', saveError);
          }
        },
        onStepFinish: (step) => {
          console.log(`Product Owner Agent Step finished`);
          if ('toolCalls' in step && step.toolCalls) {
            console.log(`Tool calls: ${step.toolCalls.map(tc => tc.toolName).join(', ')}`);
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

      console.log('Product Owner Agent - Using legacy message format (no persistence)');

      // Check message format
      const isUIMessages = Array.isArray(messages) && messages.length > 0 && messages[0]?.parts;
      const modelMessages = isUIMessages ? convertToModelMessages(messages as UIMessage[]) : messages;

      // Get model configuration
      const modelConfig = getAgentModelConfig('product-owner');
      const modelToUse = await selectModel(selectedModel || modelConfig.model, 'chat');
      
      const contextualSystemPrompt = projectId 
        ? `${PRODUCT_OWNER_SYSTEM_PROMPT}\n\nCURRENT PROJECT CONTEXT: You are currently working with project ID ${projectId}. When creating backlog items, use this project ID automatically.`
        : PRODUCT_OWNER_SYSTEM_PROMPT;

      const cookies = req.headers.get('cookie') || '';

      const result = streamText({
        model: modelToUse,
        system: contextualSystemPrompt,
        messages: modelMessages,
        tools: {
          ...backlogManagementTools,
          ...documentationTools,
          ...getWebSearchToolsForModel(modelToUse, webSearchEnabled),
        },
        temperature: modelConfig.temperature,
        toolChoice: 'auto',
        stopWhen: stepCountIs(20),
        experimental_context: { cookies },
      });

      return result.toTextStreamResponse();
    }

  } catch (error) {
    console.error('Product Owner AI Chat Error:', error);
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

// Commented out edge runtime to use Node.js runtime for better env var support
// export const runtime = 'edge';
