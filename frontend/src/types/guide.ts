export interface GuideMessage {
  id: string;
  content: string;
  timestamp: string;
  sender: 'user' | 'guide';
  isTyping?: boolean;
}

export interface GuideState {
  isOpen: boolean;
  messages: GuideMessage[];
  isTyping: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: 'navigate' | 'help' | 'guide';
  target?: string;
}

export interface GuideResponse {
  content: string;
  quickActions?: QuickAction[];
}
