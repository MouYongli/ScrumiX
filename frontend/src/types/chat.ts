export type AgentType = 'product-owner' | 'scrum-master' | 'developer' | 'support';
export type ProjectAgentType = 'product-owner' | 'scrum-master' | 'developer';

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  accentColor: string;
  expertise: string[];
  defaultModel?: string;
}

export interface ProjectAgent {
  id: ProjectAgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  accentColor: string;
  expertise: string[];
  defaultModel?: string;
}

export interface MessagePart {
  type: 'text' | 'file';
  text?: string;
  mediaType?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'agent';
  agentType?: AgentType;
  model?: string;
  isTyping?: boolean;
  // New multimodal support
  parts?: MessagePart[];
  sessionData?: {
    fileParts?: Array<{ type: string; mediaType: string; url: string }>;
  };
}

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
}

export interface ChatState {
  isOpen: boolean;
  activeAgent: AgentType;
  messages: ChatMessage[];
  isTyping: boolean;
  selectedModel?: string;
}

export interface AgentChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
  selectedModel?: string;
  isStreaming?: boolean;
  abortController?: AbortController;
  loadingState?: 'thinking' | 'searching' | 'tool-call' | 'generating' | 'using-tool' | 'processing-tool-result';
  currentTool?: string;
  pendingConfirmations?: Set<string>;
  confirmedMessages?: Set<string>;
  files?: FileList;
}