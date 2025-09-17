/**
 * React hook for managing persistent chat history
 * Implements the Vercel AI SDK pattern with PostgreSQL backend via API
 */
import { useState, useEffect, useCallback } from 'react';
import type { UIMessage } from 'ai';
import { nanoid } from 'nanoid';
import { chatAPI, ChatMessage, ChatConversation as BackendConversation } from '@/lib/chat-api';
import { convertFilesToDataURLs } from '@/utils/multimodal';

export interface ChatConversation {
  id: string;
  agentType: 'product-owner' | 'scrum-master' | 'developer';
  projectId?: number | null;
  title?: string | null;
  messages: UIMessage[];
}

export interface UseChatHistoryOptions {
  agentType: 'product-owner' | 'scrum-master' | 'developer';
  projectId?: number | null;
  userId?: number | null;
  onMessagesUpdated?: (messages: UIMessage[]) => void;
}

export function useChatHistory(options: UseChatHistoryOptions) {
  const { agentType, projectId, userId, onMessagesUpdated } = options;
  
  const [conversations, setConversations] = useState<Record<string, ChatConversation>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a stable conversation ID based on context
  const generateConversationId = useCallback((agent: string, project?: number | null, user?: number | null): string => {
    const parts = [agent];
    if (project) parts.push(`proj-${project}`);
    if (user) parts.push(`user-${user}`);
    return parts.join(':');
  }, []);

  // Get or create conversation for current context
  const getCurrentConversation = useCallback((): ChatConversation => {
    const conversationId = generateConversationId(agentType, projectId, userId);
    
    if (!conversations[conversationId]) {
      const newConversation: ChatConversation = {
        id: conversationId,
        agentType,
        projectId,
        messages: []
      };
      setConversations(prev => ({ ...prev, [conversationId]: newConversation }));
      return newConversation;
    }
    
    return conversations[conversationId];
  }, [agentType, projectId, userId, conversations, generateConversationId]);

  // Load conversation history from backend API
  const loadConversation = useCallback(async (conversationId: string): Promise<UIMessage[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await chatAPI.getConversationHistory(conversationId); // No cookies - client-side will use credentials: 'include'
      
      // Convert backend messages to UIMessage format
      const messages: UIMessage[] = data.messages.map(msg => ({
        id: msg.id || `msg_${nanoid()}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        parts: msg.parts.map(part => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text || '' };
          }
          // Handle other part types as needed
          return { type: 'text', text: part.text || '' };
        })
      }));
      
      // Update local state
      setConversations(prev => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          id: conversationId,
          agentType,
          projectId,
          messages,
          title: data.conversation?.title || null
        }
      }));
      
      // Notify parent component of message updates
      if (onMessagesUpdated) {
        onMessagesUpdated(messages);
      }
      
      return messages;
    } catch (err) {
      // Don't treat missing conversations as errors - just return empty
      if (err instanceof Error && err.message.includes('404')) {
        console.log('Conversation not found, starting fresh:', conversationId);
        return [];
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to load conversation:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [agentType, projectId]);

  // Send a message using the backend API
  const sendMessage = useCallback(async (
    message: string,
    selectedModel?: string,
    webSearchEnabled?: boolean,
    files?: File[],
    abortSignal?: AbortSignal
  ): Promise<ReadableStream<Uint8Array> | null> => {
    const conversation = getCurrentConversation();
    setError(null);

    try {
      // Ensure conversation exists in backend
      await chatAPI.upsertConversation({
        id: conversation.id,
        agent_type: agentType,
        project_id: projectId || undefined,
        title: conversation.title || undefined
      }); // No cookies - client-side will use credentials: 'include'

      // Create UIMessage with proper parts, including files (as data URLs) when present
      const parts: UIMessage['parts'] = [{ type: 'text', text: message }];
      if (files && files.length > 0) {
        try {
          const dt = new DataTransfer();
          for (const f of files) dt.items.add(f);
          const fileList = dt.files;
          const fileParts = await convertFilesToDataURLs(fileList);
          parts.push(...(fileParts as any));
        } catch (e) {
          console.warn('Failed to convert files to data URLs, proceeding without attachments', e);
        }
      }

      const userMessage: UIMessage = {
        id: `msg_${nanoid()}`,
        role: 'user',
        parts
      };

      // Do NOT save the user message here.
      // The frontend API route persists the user message once per request to prevent duplicates.
      // We also avoid adding to local state here (AIChat handles optimistic UI).

      // Send to frontend API for AI processing (still uses frontend routes for streaming)
      const apiEndpoint = getApiEndpoint(agentType);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: conversation.id,
          message: userMessage,
          projectId,
          selectedModel,
          webSearchEnabled
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Return the stream directly - let the caller handle message updates
      return response.body;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to send message:', err);
      return null;
    }
  }, [agentType, projectId, getCurrentConversation]);

  // Add assistant message to local state (called after streaming completes)
  const addAssistantMessage = useCallback((text: string, conversationId?: string) => {
    const targetConversationId = conversationId || getCurrentConversation().id;
    
    const assistantMessage: UIMessage = {
      id: `msg_${nanoid()}`,
      role: 'assistant',
      parts: [{ type: 'text', text }]
    };

    setConversations(prev => ({
      ...prev,
      [targetConversationId]: {
        ...prev[targetConversationId],
        messages: [...(prev[targetConversationId]?.messages || []), assistantMessage]
      }
    }));
  }, [getCurrentConversation]);

  // Initialize conversation on mount - only run once per agent/project/user combination
  useEffect(() => {
    const conversationId = generateConversationId(agentType, projectId, userId);
    loadConversation(conversationId);
  }, [agentType, projectId, userId, generateConversationId, loadConversation]);

  const currentConversation = getCurrentConversation();

  return {
    conversation: currentConversation,
    conversations: Object.values(conversations),
    isLoading,
    error,
    sendMessage,
    addAssistantMessage,
    loadConversation,
    clearError: () => setError(null)
  };
}

// Helper function to get API endpoint for agent type
function getApiEndpoint(agentType: 'product-owner' | 'scrum-master' | 'developer'): string {
  switch (agentType) {
    case 'product-owner': return '/api/chat/product-owner';
    case 'scrum-master': return '/api/chat/scrum-master';
    case 'developer': return '/api/chat/developer';
    default: return '/api/chat/product-owner';
  }
}
