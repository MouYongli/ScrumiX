export type AgentType = 'product-owner' | 'scrum-master' | 'developer';

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

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'agent';
  agentType?: AgentType;
  model?: string;
  isTyping?: boolean;
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
}
