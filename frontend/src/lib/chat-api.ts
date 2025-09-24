/**
 * Chat API client for communicating with backend chat endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
const AI_GATEWAY_BASE_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_BASE_URL || '';

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
  private serviceToken: string | null = null;
  private serviceTokenExpiry: number | null = null;

  private async getServiceToken(): Promise<string> {
    // Deprecated for backend calls. Keep for potential AI Gateway usage only.
    if (this.serviceToken && this.serviceTokenExpiry && Date.now() < this.serviceTokenExpiry) {
      return this.serviceToken;
    }
    throw new Error('Service token not configured');
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}, cookies?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    const isBackendUrl = url.startsWith(API_BASE_URL) || url.startsWith('/api/');
    const isAiGatewayUrl = !!AI_GATEWAY_BASE_URL && url.startsWith(AI_GATEWAY_BASE_URL);

    // Default: no Authorization header for backend requests; rely on cookies/session
    if ('Authorization' in headers) {
      delete (headers as any)['Authorization'];
    }

    // Server-side: forward incoming cookies to backend and attach user JWT as Authorization
    if (cookies && isBackendUrl) {
      headers['Cookie'] = cookies;
      // Extract session token from cookies (HttpOnly cookie is still visible to the server via header)
      const match = cookies.match(/(^|;\s*)scrumix_session=([^;]+)/);
      const accessToken = match ? decodeURIComponent(match[2]) : undefined;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    // Only attach Authorization for external AI Gateway calls (never for backend)
    if (isAiGatewayUrl && process.env.AI_GATEWAY_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.AI_GATEWAY_API_KEY}`;
    }

    const response = await fetch(url, {
      ...options,
      // Include credentials only when calling backend from the browser (no manual cookies passed)
      credentials: !cookies && isBackendUrl ? 'include' : undefined,
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
    const payload = {
      id: conversationData.id,
      agent_type: conversationData.agent_type,
      project_id: typeof conversationData.project_id === 'number'
        ? conversationData.project_id
        : (conversationData.project_id ? Number(conversationData.project_id) : null),
      title: conversationData.title ?? null,
    } as any;
    console.log('[Upsert Payload]', payload);
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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

  async updateMessage(messageId: string, content: string, cookies?: string): Promise<ChatMessage> {
    const response = await this.fetchWithAuth(`${API_BASE_URL}/chat/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }, cookies);
    return response.json();
  }

  async deleteMessagesAfter(conversationId: string, messageId: string, cookies?: string): Promise<void> {
    await this.fetchWithAuth(`${API_BASE_URL}/chat/conversations/${conversationId}/messages/after/${messageId}`, {
      method: 'DELETE',
    }, cookies);
  }
}

export const chatAPI = new ChatAPI();
