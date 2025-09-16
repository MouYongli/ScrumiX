/**
 * Chat API client for communicating with backend chat endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface ChatMessagePart {
  type: string;
  text?: string;
  file_url?: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  parts: ChatMessagePart[];
  tool_name?: string;
  tool_call_id?: string;
  created_at?: string;
}

export interface ChatConversation {
  id: string;
  user_id?: number;
  project_id?: number;
  agent_type: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  summary?: string;
}

export interface ChatHistoryResponse {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

class ChatAPI {
  private async fetchWithAuth(url: string, options: RequestInit = {}, cookies?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    // If cookies are provided (from server-side), use them instead of credentials
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    
    const response = await fetch(url, {
      ...options,
      credentials: cookies ? undefined : 'include', // Use credentials only for client-side
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} - ${url}`, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  async upsertConversation(conversationData: {
    id: string;
    agent_type: string;
    project_id?: number;
    title?: string;
  }, cookies?: string): Promise<ChatConversation> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/upsert`, {
      method: 'POST',
      body: JSON.stringify(conversationData),
    }, cookies);
    return response.json();
  }

  async getConversationHistory(conversationId: string, cookies?: string): Promise<ChatHistoryResponse> {
    try {
      const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}`, {}, cookies);
      return response.json();
    } catch (error) {
      // If conversation doesn't exist, return empty history
      if (error instanceof Error && error.message.includes('404')) {
        return {
          conversation: {
            id: conversationId,
            user_id: undefined,
            project_id: undefined,
            agent_type: 'unknown',
            title: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
            summary: undefined
          },
          messages: []
        };
      }
      throw error;
    }
  }

  async saveMessage(conversationId: string, message: ChatMessage, cookies?: string): Promise<ChatMessage> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        role: message.role,
        parts: message.parts.map(part => ({
          type: part.type,
          text: part.text,
          file_url: part.file_url
        })),
        tool_name: message.tool_name,
        tool_call_id: message.tool_call_id,
      }),
    }, cookies);
    return response.json();
  }

  async getUserConversations(agentType?: string, cookies?: string): Promise<ChatConversation[]> {
    const params = new URLSearchParams();
    if (agentType) {
      params.set('agent_type', agentType);
    }
    
    const url = `${API_BASE_URL}/chat/conversations${params.toString() ? '?' + params.toString() : ''}`;
    const response = await this.fetchWithAuth(url, {}, cookies);
    return response.json();
  }

  async deleteConversation(conversationId: string, cookies?: string): Promise<{message: string}> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    }, cookies);
    return response.json();
  }

  async deleteConversationMessages(conversationId: string, cookies?: string): Promise<{message: string}> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'DELETE',
    }, cookies);
    return response.json();
  }

  async updateConversation(conversationId: string, updates: {title?: string}, cookies?: string): Promise<ChatConversation> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, cookies);
    return response.json();
  }
}

export const chatAPI = new ChatAPI();
