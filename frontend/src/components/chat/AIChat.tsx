'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User,
  Settings,
  Code2,
  Send,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Clock,
  Trash2,
  Download,
  Filter,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Upload,
  Globe,
  Copy,
  Check,
  Edit3,
  CheckCircle,
  XCircle,
  ChevronDown,
  History,
  Plus,
  ArrowUp,
  MoreHorizontal,
  Square
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProjectAgent, ProjectAgentType, ChatMessage, AgentChatState, UIMessage, MessagePart } from '@/types/chat';
import { getAgentModelConfig, AI_MODELS } from '@/lib/ai-gateway';
import { getPreferredModel, setPreferredModel } from '@/lib/model-preferences';
import { hasNativeWebSearch } from '@/lib/tools/web-search';
import { convertFilesToDataURLs, validateFile, formatFileSize, getFileCategory, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, getSupportedFormatsString } from '@/utils/multimodal';
import { useChatHistory } from '@/hooks/useChatHistory';
import { chatAPI } from '@/lib/chat-api';
import ModelSelector from './ModelSelector';

// Agent definitions with Scrum-specific roles
const AGENTS: Record<ProjectAgentType, ProjectAgent> = {
  'product-owner': {
    id: 'product-owner',
    name: 'Product Owner',
    description: 'Helps with backlog management, user stories, and product vision',
    icon: 'User',
    color: 'bg-emerald-500',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    expertise: ['User Stories', 'Backlog Prioritization', 'Acceptance Criteria', 'Stakeholder Management'],
    defaultModel: getAgentModelConfig('product-owner').model
  },
  'scrum-master': {
    id: 'scrum-master',
    name: 'Scrum Master',
    description: 'Assists with ceremonies, impediment removal, and process improvement',
    icon: 'Settings',
    color: 'bg-blue-500',
    accentColor: 'text-blue-600 dark:text-blue-400',
    expertise: ['Sprint Planning', 'Daily Standups', 'Retrospectives', 'Impediment Resolution'],
    defaultModel: getAgentModelConfig('scrum-master').model
  },
  'developer': {
    id: 'developer',
    name: 'Developer',
    description: 'Provides technical guidance, code reviews, and implementation advice',
    icon: 'Code2',
    color: 'bg-purple-500',
    accentColor: 'text-purple-600 dark:text-purple-400',
    expertise: ['Code Review', 'Technical Debt', 'Architecture', 'Best Practices'],
    defaultModel: getAgentModelConfig('developer').model
  }
};

const getAgentIcon = (agentType: ProjectAgentType) => {
  switch (agentType) {
    case 'product-owner':
      return User;
    case 'scrum-master':
      return Settings;
    case 'developer':
      return Code2;
    default:
      return User;
  }
};

interface AIChatProps {
  projectId: string;
}

interface SessionData {
  fileParts?: MessagePart[];
  tempUploadId?: string;
}

// Utility function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

interface EnhancedChatMessage extends ChatMessage {
  sessionData?: SessionData;
}

interface AgentChatStateWithFiles extends AgentChatState {
  messages: EnhancedChatMessage[];
  files?: FileList;
  isDragOver?: boolean;
  loadingState?: 'thinking' | 'searching' | 'tool-call' | 'generating' | 'using-tool' | 'processing-tool-result';
  currentTool?: string;
  pendingConfirmations?: Set<string>; // Message IDs that need confirmation
  confirmedMessages?: Set<string>; // Message IDs that have been confirmed/declined
  isStreaming?: boolean;
  abortController?: AbortController;
}


const AIChat: React.FC<AIChatProps> = ({ projectId }) => {
  const [activeAgent, setActiveAgent] = useState<ProjectAgentType>('product-owner');
  const [isClient, setIsClient] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showPlusDropdown, setShowPlusDropdown] = useState(false);
  const [allConversations, setAllConversations] = useState<Record<string, any[]>>({});
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState<string | null>(null);
  const [renamingChat, setRenamingChat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    show: boolean;
    conversationId: string;
    conversationTitle: string;
    agentType: string;
  } | null>(null);
  const [currentConversationIds, setCurrentConversationIds] = useState<Record<ProjectAgentType, string>>({
    'product-owner': '',
    'scrum-master': '',
    'developer': ''
  });
  
  // Track the currently selected conversation for highlighting - with persistence
  const [selectedConversationIds, setSelectedConversationIds] = useState<Record<ProjectAgentType, string>>(() => {
    // Try to restore from localStorage on initial load
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`chat-selected-conversations-${projectId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            'product-owner': parsed['product-owner'] || '',
            'scrum-master': parsed['scrum-master'] || '',
            'developer': parsed['developer'] || ''
          };
        }
      } catch (error) {
        console.warn('Failed to restore selected conversations from localStorage:', error);
      }
    }
    return {
      'product-owner': '',
      'scrum-master': '',
      'developer': ''
    };
  });
  const [agentStates, setAgentStates] = useState<Record<ProjectAgentType, AgentChatStateWithFiles>>({
    'product-owner': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: getPreferredModel('product-owner'),
      pendingConfirmations: new Set(),
      confirmedMessages: new Set()
    },
    'scrum-master': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: getPreferredModel('scrum-master'),
      pendingConfirmations: new Set(),
      confirmedMessages: new Set()
    },
    'developer': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: getPreferredModel('developer'),
      pendingConfirmations: new Set(),
      confirmedMessages: new Set()
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<ProjectAgentType, HTMLTextAreaElement | null>>({
    'product-owner': null,
    'scrum-master': null,
    'developer': null
  });
  const fileInputRefs = useRef<Record<ProjectAgentType, HTMLInputElement | null>>({
    'product-owner': null,
    'scrum-master': null,
    'developer': null
  });

  // Track if we're currently sending a message to avoid state conflicts
  const [sendingStates, setSendingStates] = useState<Record<ProjectAgentType, boolean>>({
    'product-owner': false,
    'scrum-master': false,
    'developer': false
  });

  // Track initial loading to prevent duplication during page load
  const [initialLoadingStates, setInitialLoadingStates] = useState<Record<ProjectAgentType, boolean>>({
    'product-owner': true,
    'scrum-master': true,
    'developer': true
  });

  // Track last sync time for periodic reconciliation
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<ProjectAgentType, number>>({
    'product-owner': 0,
    'scrum-master': 0,
    'developer': 0
  });

  // Chat history hooks for persistent storage
  const productOwnerChat = useChatHistory({
    agentType: 'product-owner',
    projectId: projectId ? parseInt(projectId, 10) : null,
    selectedConversationId: selectedConversationIds['product-owner'],
    onMessagesUpdated: (messages) => {
      // Only perform full sync during initial load
      if (initialLoadingStates['product-owner']) {
        // Initial load - set all messages as enhanced messages (no session data from backend)
        const chatMessages: EnhancedChatMessage[] = messages.map(msg => ({
          id: msg.id,
          content: msg.parts?.find(p => p.type === 'text')?.text || '',
          timestamp: new Date().toISOString(),
          sender: msg.role === 'user' ? 'user' as const : 'agent' as const,
          parts: (msg.parts || []).filter(p => p.type === 'text').map(p => ({ type: 'text', text: (p as any).text || '' })),
          agentType: msg.role === 'assistant' ? 'product-owner' as const : undefined,
          sessionData: undefined // No session data from backend
        }));
        updateAgentState('product-owner', { messages: chatMessages });
        setInitialLoadingStates(prev => ({ ...prev, 'product-owner': false }));
        setLastSyncTimes(prev => ({ ...prev, 'product-owner': Date.now() }));
      }
      // For all other cases, ignore - we'll handle message updates locally
    }
  });
  
  const scrumMasterChat = useChatHistory({
    agentType: 'scrum-master',
    projectId: projectId ? parseInt(projectId, 10) : null,
    selectedConversationId: selectedConversationIds['scrum-master'],
    onMessagesUpdated: (messages) => {
      // Only perform full sync during initial load
      if (initialLoadingStates['scrum-master']) {
        // Initial load - set all messages as enhanced messages (no session data from backend)
        const chatMessages: EnhancedChatMessage[] = messages.map(msg => ({
          id: msg.id,
          content: msg.parts?.find(p => p.type === 'text')?.text || '',
          timestamp: new Date().toISOString(),
          sender: msg.role === 'user' ? 'user' as const : 'agent' as const,
          parts: (msg.parts || []).filter(p => p.type === 'text').map(p => ({ type: 'text', text: (p as any).text || '' })),
          agentType: msg.role === 'assistant' ? 'scrum-master' as const : undefined,
          sessionData: undefined // No session data from backend
        }));
        updateAgentState('scrum-master', { messages: chatMessages });
        setInitialLoadingStates(prev => ({ ...prev, 'scrum-master': false }));
        setLastSyncTimes(prev => ({ ...prev, 'scrum-master': Date.now() }));
      }
      // For all other cases, ignore - we'll handle message updates locally
    }
  });
  
  const developerChat = useChatHistory({
    agentType: 'developer',
    projectId: projectId ? parseInt(projectId, 10) : null,
    selectedConversationId: selectedConversationIds['developer'],
    onMessagesUpdated: (messages) => {
      // Only perform full sync during initial load
      if (initialLoadingStates['developer']) {
        // Initial load - set all messages as enhanced messages (no session data from backend)
        const chatMessages: EnhancedChatMessage[] = messages.map(msg => ({
          id: msg.id,
          content: msg.parts?.find(p => p.type === 'text')?.text || '',
          timestamp: new Date().toISOString(),
          sender: msg.role === 'user' ? 'user' as const : 'agent' as const,
          parts: (msg.parts || []).filter(p => p.type === 'text').map(p => ({ type: 'text', text: (p as any).text || '' })),
          agentType: msg.role === 'assistant' ? 'developer' as const : undefined,
          sessionData: undefined // No session data from backend
        }));
        updateAgentState('developer', { messages: chatMessages });
        setInitialLoadingStates(prev => ({ ...prev, 'developer': false }));
        setLastSyncTimes(prev => ({ ...prev, 'developer': Date.now() }));
      }
      // For all other cases, ignore - we'll handle message updates locally
    }
  });

  // Helper to get chat history hook for agent
  const getChatHistory = (agentType: ProjectAgentType) => {
    switch (agentType) {
      case 'product-owner': return productOwnerChat;
      case 'scrum-master': return scrumMasterChat;
      case 'developer': return developerChat;
      default: return productOwnerChat;
    }
  };

  // Load all conversations for the sidebar
  const loadAllConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const conversations = await chatAPI.getUserConversations();
      
      // Group conversations by agent type
      const groupedConversations: Record<string, any[]> = {};
      conversations.forEach((conv: any) => {
        if (!groupedConversations[conv.agent_type]) {
          groupedConversations[conv.agent_type] = [];
        }
        groupedConversations[conv.agent_type].push(conv);
      });
      
      // Sort conversations by last message time (most recent first)
      Object.keys(groupedConversations).forEach(agentType => {
        groupedConversations[agentType].sort((a, b) => 
          new Date(b.last_message_at || b.updated_at || b.created_at).getTime() - 
          new Date(a.last_message_at || a.updated_at || a.created_at).getTime()
        );
      });
      
      setAllConversations(groupedConversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Create a new chat session
  const createNewChat = useCallback(() => {
    // Generate a unique conversation ID using a timestamp-based approach
    // This ensures we create a truly new conversation separate from the default one
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const newConversationId = `${activeAgent}-new-${timestamp}-${randomSuffix}`;
    
    // Clear the current agent's messages to start fresh
    updateAgentState(activeAgent, { 
      messages: [], 
      inputValue: '', 
      files: undefined,
      isTyping: false,
      loadingState: undefined,
      currentTool: undefined,
      pendingConfirmations: new Set(),
      confirmedMessages: new Set()
    });
    
    // Store the new conversation ID for this agent session
    // This will be used when sending the first message
    setCurrentConversationIds(prev => ({
      ...prev,
      [activeAgent]: newConversationId
    }));
    
    // Clear the selected conversation ID since this is a new chat
    setSelectedConversationIds(prev => ({
      ...prev,
      [activeAgent]: ''
    }));
    
    console.log(`Started new chat for ${activeAgent} with ID: ${newConversationId}`);
  }, [activeAgent, projectId]);

  // Start renaming a chat
  const startRenaming = useCallback((conversationId: string, currentTitle: string) => {
    setRenamingChat(conversationId);
    setRenameValue(currentTitle || '');
    setShowChatMenu(null);
  }, []);

  // Save renamed chat
  const saveRename = useCallback(async (conversationId: string) => {
    if (!renameValue.trim()) return;
    
    try {
      // Update the conversation title via API
      await chatAPI.updateConversation(conversationId, {
        title: renameValue.trim()
      });
      
      // Refresh conversations list
      await loadAllConversations();
      
      setRenamingChat(null);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  }, [renameValue, loadAllConversations]);

  // Cancel renaming
  const cancelRename = useCallback(() => {
    setRenamingChat(null);
    setRenameValue('');
  }, []);

  // Show delete confirmation modal
  const showDeleteConfirmation = useCallback((conversationId: string, conversationTitle: string, agentType: string) => {
    setDeleteConfirmModal({
      show: true,
      conversationId,
      conversationTitle,
      agentType
    });
    setShowChatMenu(null);
  }, []);

  // Delete a chat conversation
  const deleteChat = useCallback(async () => {
    if (!deleteConfirmModal) return;
    
    try {
      await chatAPI.deleteConversation(deleteConfirmModal.conversationId);
      
      // Refresh conversations list
      await loadAllConversations();
      
      // If the deleted conversation was the current one, clear the current chat
      const currentConversationId = getChatHistory(activeAgent).conversation.id;
      if (deleteConfirmModal.conversationId === currentConversationId) {
        updateAgentState(activeAgent, { 
          messages: [], 
          inputValue: '', 
          files: undefined,
          isTyping: false,
          loadingState: undefined,
          currentTool: undefined,
          pendingConfirmations: new Set(),
          confirmedMessages: new Set()
        });
      }
      
      setDeleteConfirmModal(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  }, [deleteConfirmModal, activeAgent, loadAllConversations, getChatHistory]);

  // Cancel delete confirmation
  const cancelDelete = useCallback(() => {
    setDeleteConfirmModal(null);
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string, agentType: ProjectAgentType) => {
    try {
      // Prevent auto-scroll during conversation load and agent switch
      suppressAutoScrollRef.current = true;
      // Switch to the appropriate agent
      setActiveAgent(agentType);
      
      // Update the selected conversation ID for highlighting
      setSelectedConversationIds(prev => ({
        ...prev,
        [agentType]: conversationId
      }));
      
      // Clear any pending new conversation ID since we're loading an existing one
      setCurrentConversationIds(prev => ({
        ...prev,
        [agentType]: ''
      }));
      
      // Load the conversation and update the UI
      const chatHistory = getChatHistory(agentType);
      const backendMessages = await chatHistory.loadConversation(conversationId);
      
      // Convert backend messages to enhanced messages for the UI
      const enhancedMessages: EnhancedChatMessage[] = backendMessages.map(msg => ({
        id: msg.id,
        content: msg.parts?.find(p => p.type === 'text')?.text || '',
        timestamp: new Date().toISOString(),
        sender: msg.role === 'user' ? 'user' as const : 'agent' as const,
        parts: (msg.parts || []).filter(p => p.type === 'text').map(p => ({ 
          type: 'text' as const, 
          text: (p as any).text || '' 
        })),
        agentType: msg.role === 'assistant' ? agentType : undefined,
        sessionData: undefined // Fresh load, no session data
      }));
      
      // Update the agent state with the loaded messages
      updateAgentState(agentType, { 
        messages: enhancedMessages,
        pendingConfirmations: new Set(),
        confirmedMessages: new Set(),
        isTyping: false,
        loadingState: undefined,
        currentTool: undefined
      });
      
      console.log(`Loaded conversation ${conversationId} for ${agentType} with ${enhancedMessages.length} messages`);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [getChatHistory]);

  // Helper function to get API endpoint for agent type
  const getApiEndpoint = (agentType: ProjectAgentType): string => {
    switch (agentType) {
      case 'product-owner': return '/api/chat/product-owner';
      case 'scrum-master': return '/api/chat/scrum-master';
      case 'developer': return '/api/chat/developer';
      default: return '/api/chat/product-owner';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Helpers for deduplication and merging (id first, role+content fallback)
  const upsertMessage = (existing: EnhancedChatMessage[], incoming: EnhancedChatMessage): EnhancedChatMessage[] => {
    const idx = existing.findIndex(m => m.id === incoming.id);
    if (idx !== -1) {
      const copy = existing.slice();
      copy[idx] = incoming;
      return copy;
    }
    const key = `${incoming.sender}:${incoming.content}`;
    const existsByContent = existing.some(m => `${m.sender}:${m.content}` === key);
    if (existsByContent) return existing;
    return [...existing, incoming];
  };

  const mergeMessages = (existing: EnhancedChatMessage[], incoming: EnhancedChatMessage[]): EnhancedChatMessage[] => {
    let result = existing.slice();
    for (const msg of incoming) {
      result = upsertMessage(result, msg);
    }
    return result;
  };

  // Explicit refresh function - only called when user explicitly needs fresh data
  const refreshConversation = async (agentType: ProjectAgentType) => {
    // Don't refresh if currently sending a message
    if (sendingStates[agentType]) {
      return;
    }

    try {
      const chatHistory = getChatHistory(agentType);
      const backendMessages = await chatHistory.loadConversation(chatHistory.conversation.id);
      const currentMessages = agentStates[agentType].messages;

      // Merge backend messages with preserved session data
      const enhancedMessages: EnhancedChatMessage[] = backendMessages.map(msg => {
        // Find existing local message to preserve session data
        const existingLocal = currentMessages.find(local => local.id === msg.id);
        
        return {
          id: msg.id,
          content: msg.parts?.find(p => p.type === 'text')?.text || '',
          timestamp: new Date().toISOString(),
          sender: msg.role === 'user' ? 'user' as const : 'agent' as const,
          parts: msg.parts || [], // Backend parts (text-only)
          agentType: msg.role === 'assistant' ? agentType : undefined,
          sessionData: existingLocal?.sessionData // Preserve session data (files, etc.)
        } as EnhancedChatMessage;
      });

      // Only update if there are actually new messages
      if (enhancedMessages.length > currentMessages.length) {
        updateAgentState(agentType, { messages: enhancedMessages });
        console.log(`Refreshed conversation: ${enhancedMessages.length - currentMessages.length} new messages for ${agentType}`);
      }
    } catch (error) {
      console.warn(`Failed to refresh conversation for ${agentType}:`, error);
    }
  };

  // New persistent chat message sender
  const sendPersistentMessage = async (agentType: ProjectAgentType) => {
    const currentState = agentStates[agentType];
    if (!currentState.inputValue.trim() && !currentState.files?.length) return;

    // Create abort controller for this request
    const abortController = new AbortController();

    // Mark as sending to prevent state conflicts
    setSendingStates(prev => ({ ...prev, [agentType]: true }));

    // Get the chat history instance to access its conversation ID
    const chatHistory = getChatHistory(agentType);
    
    // Use the new conversation ID if we're starting a new chat, otherwise use the existing one from chatHistory
    // This ensures we maintain conversation continuity
    const conversationId = currentConversationIds[agentType] || chatHistory.conversation.id;
    
    // If we have a new conversation ID, we need to create the conversation first
    if (currentConversationIds[agentType]) {
      try {
        await chatAPI.upsertConversation({
          id: conversationId,
          agent_type: agentType,
          project_id: projectId ? parseInt(projectId, 10) : undefined,
          title: `${AGENTS[agentType].name} Chat`
        });
      } catch (error) {
        console.error('Failed to create new conversation:', error);
      }
    }

    // Store the message content before clearing the input
    let messageContent = currentState.inputValue;
    const messageFiles = currentState.files;
    
    // Show user message immediately with file previews (non-blocking)
    let fileParts: MessagePart[] = [];
    if (messageFiles && messageFiles.length > 0) {
      try {
        fileParts = await convertFilesToDataURLs(messageFiles);
      } catch (e) {
        console.warn('Failed to convert files to data URLs', e);
      }
    }

    // Create user message with session data for files
    const userMessage: EnhancedChatMessage = {
      id: `user-${Date.now()}`,
      content: messageContent,
      timestamp: new Date().toISOString(),
      sender: 'user',
      parts: [{ type: 'text', text: messageContent }], // Only text in parts
      sessionData: fileParts.length > 0 ? { fileParts } : undefined // Files in session data
    };

    // Clear input and show user message immediately
    updateAgentState(agentType, {
      messages: [...currentState.messages, userMessage],
      inputValue: '',
      files: undefined,
      isTyping: true,
      loadingState: webSearchEnabled ? 'searching' : 'thinking',
      isStreaming: true,
      abortController: abortController
    });

    // Clear file input
    const fileInput = fileInputRefs.current[agentType];
    if (fileInput) {
      fileInput.value = '';
    }

    try {
      // Start file upload in parallel while showing message
      let uploadPromise: Promise<string | null> = Promise.resolve(null);
      if (messageFiles && messageFiles.length > 0) {
        uploadPromise = (async () => {
          try {
            const form = new FormData();
            Array.from(messageFiles).forEach(f => form.append('files', f));
            const res = await fetch('/api/uploads/temp', { method: 'POST', body: form });
            if (res.ok) {
              const data = await res.json();
              return data.uploadId;
            }
          } catch (e) {
            console.warn('Temp upload error', e);
          }
          return null;
        })();
      }

      // Wait for upload to complete, then send with uploadId
      const uploadId = await uploadPromise;
      if (uploadId) {
        // Inject uploadId into the message for server-side file access
        userMessage.parts = [
          ...(userMessage.parts || []),
          { type: 'text', text: `__UPLOAD_ID__:${uploadId}` }
        ];
      }

      // For new conversations, we need to send directly to API with the new conversation ID
      let responseStream;
      if (currentConversationIds[agentType]) {
        // Send to API directly with the new conversation ID
        const apiEndpoint = getApiEndpoint(agentType);
        const userMessage = {
          id: `msg_${Date.now()}`,
          role: 'user' as const,
          parts: [{ type: 'text', text: messageContent }]
        };

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: conversationId,
            message: userMessage,
            projectId: projectId ? parseInt(projectId, 10) : null,
            selectedModel: currentState.selectedModel,
            webSearchEnabled
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        responseStream = response.body;
        
        // Update the chat history to use this conversation ID for future messages
        // Don't clear the currentConversationIds yet - we need it for subsequent messages
      } else {
        // Use existing chat history method for ongoing conversations
        responseStream = await chatHistory.sendMessage(
          messageContent,
          currentState.selectedModel,
          webSearchEnabled,
          messageFiles ? Array.from(messageFiles) : undefined,
          abortController.signal
        );
      }

      if (!responseStream) {
        throw new Error('No response stream received');
      }

      // Process the streaming response
      const reader = responseStream.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';
      let hasStartedGenerating = false;
      let messageId = `agent-${Date.now()}`;
      const startTime = Date.now();
      const MIN_LOADING_TIME = 800; // Minimum loading time to prevent flashing

      // Set initial thinking state immediately for short responses
      updateAgentState(agentType, {
        isTyping: true,
        loadingState: webSearchEnabled ? 'searching' : 'thinking'
      });

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Try to parse chunk for tool usage information
          try {
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.trim().startsWith('data: ')) {
                const data = line.replace('data: ', '');
                if (data && data !== '[DONE]') {
                  const parsed = JSON.parse(data);
                  
                  // Check for tool calls
                  if (parsed.type === 'tool-call' || parsed.toolName) {
                    const toolName = parsed.toolName || parsed.tool?.name || 'tool';
                    updateAgentState(agentType, {
                      isTyping: true,
                      loadingState: 'using-tool',
                      currentTool: toolName
                    });
                  }
                  
                  // Check for tool results
                  if (parsed.type === 'tool-result') {
                    updateAgentState(agentType, {
                      isTyping: true,
                      loadingState: 'processing-tool-result'
                    });
                  }
                  
                  // Check for text generation
                  if (parsed.type === 'text-delta' || parsed.delta) {
                    if (!hasStartedGenerating) {
                      hasStartedGenerating = true;
                      updateAgentState(agentType, {
                        isTyping: true,
                        loadingState: 'generating'
                      });
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Ignore parsing errors for non-JSON chunks
            if (!hasStartedGenerating && chunk.trim()) {
              hasStartedGenerating = true;
              updateAgentState(agentType, {
                isTyping: true,
                loadingState: 'generating'
              });
            }
          }
          
          aiResponse += chunk;
          
          // Update the agent message in real-time during streaming
          const agentMessage: ChatMessage = {
            id: messageId,
            content: aiResponse,
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: agentType,
            model: currentState.selectedModel
          };

          // Check if this agent message contains a confirmation request
          const needsConfirmation = isConfirmationRequest(agentMessage.content);
          const newPendingConfirmations = needsConfirmation 
            ? new Set([...currentState.pendingConfirmations!, agentMessage.id])
            : currentState.pendingConfirmations;

          // Update using functional state to avoid stale snapshots and dedupe by id/content
          setAgentStates(prev => {
            const prevState = prev[agentType];
            const merged = upsertMessage(prevState.messages, agentMessage as EnhancedChatMessage);
            return {
              ...prev,
              [agentType]: {
                ...prevState,
                messages: merged,
                isTyping: true, // Keep typing true during streaming
                loadingState: 'generating', // Keep generating state during streaming
                currentTool: undefined,
                pendingConfirmations: newPendingConfirmations
              }
            };
          });
        }
      } catch (streamError) {
        // Handle streaming errors (including aborts)
        const isAbortError = streamError instanceof Error && (
          streamError.name === 'AbortError' || 
          streamError.message.includes('aborted') ||
          streamError.message.includes('AbortError')
        );

        if (isAbortError) {
          console.log('Stream was aborted during reading, preserving partial response');
          
          // If we have any partial response, preserve it
          if (aiResponse.trim()) {
            const partialMessage: ChatMessage = {
              id: messageId,
              content: aiResponse.trim(),
              timestamp: new Date().toISOString(),
              sender: 'agent',
              agentType: agentType,
              model: currentState.selectedModel
            };

            // Update with the partial response
            setAgentStates(prev => {
              const prevState = prev[agentType];
              const merged = upsertMessage(prevState.messages, partialMessage as EnhancedChatMessage);
              return {
                ...prev,
                [agentType]: {
                  ...prevState,
                  messages: merged,
                  isTyping: false,
                  loadingState: undefined,
                  currentTool: undefined,
                  isStreaming: false,
                  abortController: undefined
                }
              };
            });
          } else {
            // No partial response, just clean up state
            updateAgentState(agentType, {
              isTyping: false,
              loadingState: undefined,
              currentTool: undefined,
              isStreaming: false,
              abortController: undefined
            });
          }
          
          // Don't throw the error further, we've handled it
          return;
        } else {
          // Re-throw non-abort errors
          throw streamError;
        }
      }

      // Clean up the response by removing SSE formatting and normalize to final text
      const cleanResponse = aiResponse
        .split('\n')
        .filter(line => !line.startsWith('data: '))
        .join('\n')
        .trim();

      // Finalize: ensure the streamed agent message content matches persisted text to avoid duplicates
      const finalized: EnhancedChatMessage = {
        id: messageId,
        content: cleanResponse,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: agentType,
        model: currentState.selectedModel
      } as EnhancedChatMessage;

      // Calculate remaining time to meet minimum loading duration
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

      // Update messages immediately but delay clearing loading state if needed
      setAgentStates(prev => {
        const prevState = prev[agentType];
        const merged = upsertMessage(prevState.messages, finalized);
        return {
          ...prev,
          [agentType]: {
            ...prevState,
            messages: merged,
            isTyping: remainingTime > 0, // Keep typing if we need more time
            loadingState: remainingTime > 0 ? 'generating' : undefined,
            currentTool: undefined,
          }
        };
      });

      // Clear loading state after minimum time if needed
      if (remainingTime > 0) {
        setTimeout(() => {
          updateAgentState(agentType, {
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined
          });
        }, remainingTime);
      } else {
        // Clear streaming state immediately if no delay needed
        updateAgentState(agentType, {
          isStreaming: false,
          abortController: undefined
        });
      }

      // Check if this was a new conversation that needs to be highlighted
      const wasNewConversation = currentConversationIds[agentType];
      
      // Refresh conversations list to show the new chat in history (non-blocking)
      loadAllConversations().then(() => {
        // If this was a new conversation, automatically select it for highlighting
        if (wasNewConversation) {
          setSelectedConversationIds(prev => ({
            ...prev,
            [agentType]: conversationId
          }));
          
          // Now that the conversation is fully established and visible in the sidebar,
          // we can clear the currentConversationIds to allow normal flow
          setCurrentConversationIds(prev => ({
            ...prev,
            [agentType]: ''
          }));
          
          console.log(`Auto-selected new conversation ${conversationId} for ${agentType}`);
        }
      }).catch(error => {
        console.warn('Failed to refresh conversations after message:', error);
      });


    } catch (error) {
      console.error('Error sending persistent message:', error);
      
      // Check if this was an abort operation (user clicked stop)
      const isAbortError = error instanceof Error && (
        error.name === 'AbortError' || 
        error.message.includes('aborted') ||
        error.message.includes('AbortError')
      );

      if (isAbortError) {
        // For abort operations, just clean up state without showing error message
        // The user message should already be visible from the optimistic update
        console.log('Stream was aborted by user, cleaning up state');
        updateAgentState(agentType, {
          isTyping: false,
          loadingState: undefined,
          currentTool: undefined,
          isStreaming: false,
          abortController: undefined
        });
      } else {
        // Only show error message for actual errors (not aborts)
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agentType: agentType
        };

        updateAgentState(agentType, {
          messages: [...currentState.messages, errorMessage],
          isTyping: false,
          loadingState: undefined,
          currentTool: undefined,
          isStreaming: false,
          abortController: undefined
        });
      }
    } finally {
      // Always reset sending state and clear streaming state when done
      setSendingStates(prev => ({ ...prev, [agentType]: false }));
      updateAgentState(agentType, {
        isStreaming: false,
        abortController: undefined
      });
    }
  };

  // Track previous message count to only scroll when new messages are added
  const suppressAutoScrollRef = useRef(false);
  const prevMessageCountRef = useRef<{[key in ProjectAgentType]: number}>({
    'product-owner': 0,
    'scrum-master': 0,
    'developer': 0
  });

  useEffect(() => {
    const currentMessages = agentStates[activeAgent].messages;
    const currentCount = currentMessages.length;
    const prevCount = prevMessageCountRef.current[activeAgent];

    // Suppress auto-scroll if flagged (e.g., when switching agents or loading a conversation)
    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
    } else if (currentCount > prevCount) {
      // Only scroll if messages were actually added (not just switching agents)
      scrollToBottom();
    }

    // Update the count for this agent
    prevMessageCountRef.current[activeAgent] = currentCount;
  }, [activeAgent, agentStates[activeAgent].messages]);

  // Message updates are now handled by the useChatHistory hook callbacks

  // Persist selected conversation IDs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`chat-selected-conversations-${projectId}`, JSON.stringify(selectedConversationIds));
      } catch (error) {
        console.warn('Failed to persist selected conversations to localStorage:', error);
      }
    }
  }, [selectedConversationIds, projectId]);

  useEffect(() => {
    setIsClient(true);
    // Load all conversations for the sidebar
    loadAllConversations();
    
    // If we have a selected conversation ID from localStorage, load it for each agent
    Object.entries(selectedConversationIds).forEach(([agentType, conversationId]) => {
      if (conversationId) {
        console.log(`Restoring conversation ${conversationId} for ${agentType} from localStorage`);
        // The useChatHistory hook will automatically load this conversation due to the selectedConversationId prop
      }
    });
  }, [loadAllConversations]);

  // Reload conversations when active agent changes
  useEffect(() => {
    if (isClient) {
      loadAllConversations();
    }
  }, [activeAgent, isClient, loadAllConversations]);

  useEffect(() => {
    // Focus input when switching agents without scrolling the viewport
    const inputRef = inputRefs.current[activeAgent];
    if (inputRef) {
      try {
        (inputRef as any).focus({ preventScroll: true });
      } catch {
        inputRef.focus();
      }
    }
  }, [activeAgent]);

  // Manual refresh when page becomes visible (optional - only if user was away for a while)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Optional: Only refresh if user was away for more than 5 minutes
        const now = Date.now();
        const lastActivity = Math.max(...Object.values(lastSyncTimes));
        if (now - lastActivity > 5 * 60 * 1000) {
          console.log('User returned after extended absence, refreshing current conversation');
          refreshConversation(activeAgent);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeAgent, lastSyncTimes]);

  useEffect(() => {
    // Reset textarea height when input is cleared
    const inputRef = inputRefs.current[activeAgent];
    if (inputRef && !agentStates[activeAgent].inputValue) {
      inputRef.style.height = '48px'; // Reset to min-height
    }
  }, [activeAgent, agentStates]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showAgentDropdown && !target.closest('.agent-dropdown')) {
        setShowAgentDropdown(false);
      }
      
      if (showPlusDropdown && !target.closest('.plus-dropdown')) {
        setShowPlusDropdown(false);
      }
      
      // Improved chat menu handling - check for both the menu button and dropdown
      if (showChatMenu && !target.closest('.chat-menu') && !target.closest('[data-chat-dropdown]')) {
        setShowChatMenu(null);
      }
    };

    // Use 'click' instead of 'mousedown' to avoid interfering with hover interactions
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showAgentDropdown, showPlusDropdown, showChatMenu]);

  const updateAgentState = (agentType: ProjectAgentType, updates: Partial<AgentChatStateWithFiles>) => {
    setAgentStates(prev => ({
      ...prev,
      [agentType]: { ...prev[agentType], ...updates }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, agentType: ProjectAgentType) => {
    const files = e.target.files;
    if (!files) return;

    // Validate each file
    const validationErrors: string[] = [];
    Array.from(files).forEach((file, index) => {
      const validation = validateFile(file);
      if (!validation.isValid && validation.error) {
        validationErrors.push(`File ${index + 1}: ${validation.error}`);
      }
    });

    if (validationErrors.length > 0) {
      alert(`File validation errors:\n${validationErrors.join('\n')}`);
      e.target.value = ''; // Clear the input
      return;
    }

    updateAgentState(agentType, { files });
  };

  const removeFiles = (agentType: ProjectAgentType) => {
    updateAgentState(agentType, { files: undefined });
    const fileInput = fileInputRefs.current[agentType];
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDragOverChat = (e: React.DragEvent, agentType: ProjectAgentType) => {
    handleDragOver(e);
    if (!agentStates[agentType].isDragOver) {
      updateAgentState(agentType, { isDragOver: true });
    }
  };

  const handleDragEnterChat = (e: React.DragEvent, agentType: ProjectAgentType) => {
    handleDragEnter(e);
    updateAgentState(agentType, { isDragOver: true });
  };

  const handleDragLeaveChat = (e: React.DragEvent, agentType: ProjectAgentType) => {
    handleDragLeave(e);
    // Only set isDragOver to false if we're leaving the chat area completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      updateAgentState(agentType, { isDragOver: false });
    }
  };

  const handleDropChat = (e: React.DragEvent, agentType: ProjectAgentType) => {
    const droppedFiles = handleDrop(e);
    updateAgentState(agentType, { isDragOver: false });
    
    if (droppedFiles) {
      // Validate each file
      const validationErrors: string[] = [];
      Array.from(droppedFiles).forEach((file, index) => {
        const validation = validateFile(file);
        if (!validation.isValid && validation.error) {
          validationErrors.push(`File ${index + 1}: ${validation.error}`);
        }
      });

      if (validationErrors.length > 0) {
        alert(`File validation errors:\n${validationErrors.join('\n')}`);
        return;
      }

      // Merge with existing files if any
      const currentFiles = agentStates[agentType].files;
      if (currentFiles && currentFiles.length > 0) {
        const dt = new DataTransfer();
        // Add existing files
        Array.from(currentFiles).forEach(file => dt.items.add(file));
        // Add new files
        Array.from(droppedFiles).forEach(file => dt.items.add(file));
        updateAgentState(agentType, { files: dt.files });
      } else {
        updateAgentState(agentType, { files: droppedFiles });
      }
    }
  };

  const stopGeneration = (agentType: ProjectAgentType) => {
    const currentState = agentStates[agentType];
    if (currentState.abortController) {
      currentState.abortController.abort();
      updateAgentState(agentType, {
        isStreaming: false,
        isTyping: false,
        loadingState: undefined,
        abortController: undefined
      });
    }
  };

  const sendMessage = async (agentType: ProjectAgentType) => {
    const currentState = agentStates[agentType];
    if (!currentState.inputValue.trim() && !currentState.files?.length) return;

    // Convert files to data URLs if present
    const fileParts: MessagePart[] = currentState.files && currentState.files.length > 0
      ? await convertFilesToDataURLs(currentState.files)
      : [];

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: currentState.inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user',
      parts: [
        { type: 'text', text: currentState.inputValue },
        ...fileParts
      ]
    };

    // Create abort controller for this request
    const abortController = new AbortController();

    // Add user message and clear input
    updateAgentState(agentType, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      inputValue: '',
      files: undefined,
      loadingState: webSearchEnabled ? 'searching' : 'thinking',
      isStreaming: true,
      abortController: abortController
    });

    // Clear file input
    const fileInput = fileInputRefs.current[agentType];
    if (fileInput) {
      fileInput.value = '';
    }

    if (agentType === 'product-owner' || agentType === 'scrum-master' || agentType === 'developer') {
      // Use real AI for Product Owner, Scrum Master, and Developer
      const getApiEndpoint = (type: ProjectAgentType) => {
        switch (type) {
          case 'product-owner': return '/api/chat/product-owner';
          case 'scrum-master': return '/api/chat/scrum-master';
          case 'developer': return '/api/chat/developer';
          default: return '/api/chat/product-owner'; // fallback
        }
      };
      const apiEndpoint = getApiEndpoint(agentType);
      
      try {
        // Prepare messages for API - use multimodal format if files are present
        const hasFiles = fileParts.length > 0;
        const apiMessages = hasFiles
          ? // Use UI message format for multimodal
            [...currentState.messages, userMessage].map(msg => ({
              id: msg.id,
              role: msg.sender === 'user' ? 'user' : 'assistant',
              parts: msg.parts || [{ type: 'text', text: msg.content }]
            } as UIMessage))
          : // Use legacy format for text-only
            [...currentState.messages, userMessage].map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            }));

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            projectId: projectId ? parseInt(projectId, 10) : null,
            selectedModel: currentState.selectedModel,
            webSearchEnabled: webSearchEnabled
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response stream available');
        }

        let aiResponse = '';
        const decoder = new TextDecoder();
        let messageId = `agent-${Date.now()}`;
        let hasStartedGenerating = false;
        const startTime = Date.now();
        const MIN_LOADING_TIME = 800; // Minimum loading time to prevent flashing
        
        // Set initial thinking state immediately for short responses
        updateAgentState(agentType, {
          messages: [...currentState.messages, userMessage],
          isTyping: true,
          loadingState: webSearchEnabled ? 'searching' : 'thinking'
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // Try to parse chunk for tool usage information
            try {
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                  const data = line.replace('data: ', '');
                  if (data && data !== '[DONE]') {
                    const parsed = JSON.parse(data);
                    
                    // Check for tool calls
                    if (parsed.type === 'tool-call' || parsed.toolName) {
                      const toolName = parsed.toolName || parsed.tool?.name || 'tool';
                      updateAgentState(agentType, {
                        messages: [...currentState.messages, userMessage],
                        isTyping: true,
                        loadingState: 'tool-call',
                        currentTool: toolName
                      });
                      continue;
                    }
                    
                    // Check for text generation
                    if (parsed.type === 'text-delta' || parsed.delta || parsed.content) {
                      if (!hasStartedGenerating) {
                        hasStartedGenerating = true;
                        updateAgentState(agentType, {
                          messages: [...currentState.messages, userMessage],
                          isTyping: true,
                          loadingState: 'generating'
                        });
                      }
                    }
                  }
                }
              }
            } catch (e) {
              // If chunk is not JSON, it's likely text content
              if (!hasStartedGenerating && chunk.trim()) {
                hasStartedGenerating = true;
                updateAgentState(agentType, {
                  messages: [...currentState.messages, userMessage],
                  isTyping: true,
                  loadingState: 'generating'
                });
              }
            }
            
            aiResponse += chunk;
            
            // Update the agent message in real-time
            const agentMessage: ChatMessage = {
              id: messageId,
              content: aiResponse,
              timestamp: new Date().toISOString(),
              sender: 'agent',
              agentType: agentType,
              model: currentState.selectedModel
            };

            // Check if this agent message contains a confirmation request
            const needsConfirmation = isConfirmationRequest(agentMessage.content);
            const newPendingConfirmations = needsConfirmation 
              ? new Set([...currentState.pendingConfirmations!, agentMessage.id])
              : currentState.pendingConfirmations;

            // Calculate remaining time to meet minimum loading duration
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

            updateAgentState(agentType, {
              messages: [...currentState.messages, userMessage, agentMessage],
              isTyping: remainingTime > 0,
              loadingState: remainingTime > 0 ? 'generating' : undefined,
              currentTool: undefined,
              pendingConfirmations: newPendingConfirmations
            });

            // Clear loading state after minimum time if needed
            if (remainingTime > 0) {
              setTimeout(() => {
                updateAgentState(agentType, {
                  isTyping: false,
                  loadingState: undefined,
                  currentTool: undefined,
                  isStreaming: false,
                  abortController: undefined
                });
              }, remainingTime);
            } else {
              // Clear streaming state immediately if no delay needed
              updateAgentState(agentType, {
                isStreaming: false,
                abortController: undefined
              });
            }
          }
        } catch (streamError) {
          // Handle streaming errors (including aborts)
          const isAbortError = streamError instanceof Error && (
            streamError.name === 'AbortError' || 
            streamError.message.includes('aborted') ||
            streamError.message.includes('AbortError')
          );

          if (isAbortError) {
            console.log('Legacy stream was aborted during reading, preserving partial response');
            
            // If we have any partial response, preserve it
            if (aiResponse.trim()) {
              const partialMessage: ChatMessage = {
                id: messageId,
                content: aiResponse.trim(),
                timestamp: new Date().toISOString(),
                sender: 'agent',
                agentType: agentType,
                model: currentState.selectedModel
              };

              // Update with the partial response
              updateAgentState(agentType, {
                messages: [...currentState.messages, userMessage, partialMessage],
                isTyping: false,
                loadingState: undefined,
                currentTool: undefined,
                isStreaming: false,
                abortController: undefined
              });
            } else {
              // No partial response, just preserve user message and clean up state
              updateAgentState(agentType, {
                messages: [...currentState.messages, userMessage],
                isTyping: false,
                loadingState: undefined,
                currentTool: undefined,
                isStreaming: false,
                abortController: undefined
              });
            }
            
            // Don't throw the error further, we've handled it
            return;
          } else {
            // Re-throw non-abort errors
            throw streamError;
          }
        }
        
        // Refresh conversations list after AI response is complete (non-blocking)
        loadAllConversations().catch(error => {
          console.warn('Failed to refresh conversations after message:', error);
        });
      } catch (error) {
        console.error('AI Chat Error:', error);
        
        // Check if this was an abort operation (user clicked stop)
        const isAbortError = error instanceof Error && (
          error.name === 'AbortError' || 
          error.message.includes('aborted') ||
          error.message.includes('AbortError')
        );

        if (isAbortError) {
          // For abort operations, just clean up state without showing error message
          // The user message should already be visible from the optimistic update
          console.log('Stream was aborted by user, cleaning up state');
          updateAgentState(agentType, {
            messages: [...currentState.messages, userMessage],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined
          });
        } else {
          // Only show error message for actual errors (not aborts)
          const errorMessage: ChatMessage = {
            id: `agent-${Date.now()}`,
            content: `I apologize, but I encountered an error while processing your request. Please check the console for more details and ensure your OpenAI API key is configured correctly.`,
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: agentType
          };

          updateAgentState(agentType, {
            messages: [...currentState.messages, userMessage, errorMessage],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined
          });
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, agentType: ProjectAgentType) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow line break with Shift + Enter
        return;
      } else {
        // Send message with Enter
        e.preventDefault();
        if (!agentStates[agentType].isTyping) {
          sendPersistentMessage(agentType);
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>, agentType: ProjectAgentType) => {
    const textarea = e.target;
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`; // max-height: 128px (8rem)
    
    updateAgentState(agentType, { inputValue: textarea.value });
  };

  const clearChatHistory = (agentType: ProjectAgentType) => {
    updateAgentState(agentType, { messages: [] });
  };

  const exportChatHistory = (agentType: ProjectAgentType) => {
    const messages = agentStates[agentType].messages;
    const chatData = {
      projectId,
      agentType: agentType,
      agentName: AGENTS[agentType].name,
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${AGENTS[agentType].name.replace(' ', '_')}_chat_${projectId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const getLoadingMessage = (state: AgentChatStateWithFiles, agentName: string) => {
    switch (state.loadingState) {
      case 'searching':
        return 'Searching the web';
      case 'thinking':
        return 'Scrumming through ideas';
      case 'tool-call':
        if (state.currentTool) {
          // Make tool names more user-friendly
          const toolDisplayNames: Record<string, string> = {
            'createBacklogItem': 'Creating backlog item',
            'getBacklogItems': 'Reviewing backlog',
            'semanticSearchBacklog': 'Searching backlog',
            'hybridSearchBacklog': 'Searching backlog',
            'bm25SearchBacklog': 'Searching backlog',
            'findSimilarBacklog': 'Finding similar items',
            'createDocumentation': 'Creating documentation',
            'getDocumentation': 'Reviewing documentation',
            'searchDocumentationByField': 'Searching documentation',
            'web_search_preview': 'Searching the web',
            'google_search': 'Searching the web'
          };
          const displayName = toolDisplayNames[state.currentTool] || `Using ${state.currentTool}`;
          return `${displayName}...`;
        }
        return 'Processing...';
      case 'generating':
        return 'Generating response...';
      default:
        return 'Thinking...';
    }
  };

  const copyToClipboard = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const isConfirmationRequest = (content: string): boolean => {
    // Only detect true binary yes/no questions, not suggestions or multiple choices
    const binaryQuestionPatterns = [
      // Direct action requests
      /would you like me to (?:create|add|update|delete|remove|generate|implement|build|set up|configure)\b/i,
      /should I (?:create|add|update|delete|remove|generate|implement|build|set up|configure|proceed with)\b/i,
      /do you want me to (?:create|add|update|delete|remove|generate|implement|build|set up|configure)\b/i,
      /shall I (?:create|add|update|delete|remove|generate|implement|build|set up|configure|proceed with)\b/i,
      /(?:can|may) I (?:create|add|update|delete|remove|generate|implement|build|set up|configure|proceed)\b/i,
      
      // Confirmation requests for specific actions
      /please confirm.*(?:create|add|update|delete|remove|generate|implement|build|set up|configure)/i,
      /is this correct.*(?:create|add|update|delete|remove|generate|implement|build|set up|configure)/i,
      /does this look (?:good|correct|right).*(?:create|add|update|delete|remove|generate|implement|build)/i,
      /ready to (?:create|add|update|delete|remove|generate|implement|build|set up|configure|proceed)/i,
      
      // Story/item creation specific
      /shall I create (?:this|the) (?:story|item|task|epic|feature)/i,
      /would you like me to create (?:this|the) (?:story|item|task|epic|feature)/i,
      /do you want me to create (?:this|the) (?:story|item|task|epic|feature)/i,
      
      // Proceed with specific action
      /shall I proceed with (?:creating|adding|updating|implementing)/i,
      /ready to proceed with (?:creating|adding|updating|implementing)/i
    ];
    
    // Exclude patterns that suggest multiple options or open-ended questions
    const exclusionPatterns = [
      // Multiple question indicators - count question marks
      /\?.*\?.*\?/,  // Three or more question marks in the content
      
      // Open-ended questions
      /how would you like/i,
      /what would you like/i,
      /which (?:one|option|approach|way)/i,
      /where would you like/i,
      /when would you like/i,
      /what should (?:the|this|it)/i,
      /how should (?:the|this|it)/i,
      
      // Multiple choice indicators
      /(?:or|,)\s*(?:add|create|update|delete|remove|you could|alternatively)/i,
      /multiple (?:options|ways|approaches|choices)/i,
      /several (?:ways|options|approaches|alternatives)/i,
      /different (?:approaches|ways|options)/i,
      /various (?:options|ways|approaches)/i,
      /(?:another|other) (?:option|way|approach)/i,
      
      // Suggestion language
      /you could (?:also )?(?:add|create|update|delete|remove)/i,
      /(?:options|choices) include/i,
      /alternatives/i,
      /suggestions/i,
      /recommendations/i,
      /here are (?:some|a few)/i,
      /(?:some|a few) (?:options|suggestions|ideas)/i,
      
      // Non-committal language
      /might want to/i,
      /consider (?:adding|creating|updating)/i,
      /perhaps/i,
      /maybe/i,
      /possibly/i,
      
      // Lists or enumeration
      /\d+\./,  // Numbered lists like "1.", "2."
      /^\s*[-•*]/m,  // Bullet points
      /first.*second/i,
      /next.*then/i,
      
      // Multiple separate questions (common patterns)
      /\?\s*(?:what|how|which|where|when|should|would|could|do you|can you)/i,  // Question followed by another question word
      /(?:what|how|which|where|when|should|would|could).*\?.*(?:what|how|which|where|when|should|would|could)/i,  // Two question patterns
      /(?:also|additionally|furthermore|moreover|and).*\?/i,  // Additional questions
    ];
    
    // Count question marks to detect multiple questions
    const questionMarkCount = (content.match(/\?/g) || []).length;
    
    // If there are multiple question marks, it's likely multiple questions
    if (questionMarkCount > 1) {
      return false;
    }
    
    // Check if it's a binary question
    const isBinaryQuestion = binaryQuestionPatterns.some(pattern => pattern.test(content));
    
    // Check if it contains exclusion patterns (suggestions/multiple choices)
    const hasExclusions = exclusionPatterns.some(pattern => pattern.test(content));
    
    // Only return true for binary questions without exclusion patterns
    return isBinaryQuestion && !hasExclusions;
  };

  const handleConfirmation = async (agentType: ProjectAgentType, messageId: string, accepted: boolean) => {
    const currentState = agentStates[agentType];
    
    // Mark this message as confirmed
    const newConfirmedMessages = new Set(currentState.confirmedMessages);
    newConfirmedMessages.add(messageId);
    
    const newPendingConfirmations = new Set(currentState.pendingConfirmations);
    newPendingConfirmations.delete(messageId);
    
    updateAgentState(agentType, {
      confirmedMessages: newConfirmedMessages,
      pendingConfirmations: newPendingConfirmations
    });

    // Send the confirmation response as a user message
    const confirmationMessage = accepted ? "Yes, please proceed." : "No, please don't proceed.";
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: confirmationMessage,
      timestamp: new Date().toISOString(),
      sender: 'user',
      parts: [{ type: 'text', text: confirmationMessage }]
    };

    // Add user message and trigger AI response
    updateAgentState(agentType, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      loadingState: 'thinking'
    });

    // Send to AI for response (similar to regular sendMessage logic)
    await sendConfirmationResponse(agentType, userMessage);
  };

  const sendConfirmationResponse = async (agentType: ProjectAgentType, userMessage: ChatMessage) => {
    const currentState = agentStates[agentType];
    const getApiEndpoint = (type: ProjectAgentType) => {
      switch (type) {
        case 'product-owner': return '/api/chat/product-owner';
        case 'scrum-master': return '/api/chat/scrum-master';
        case 'developer': return '/api/chat/developer';
        default: return '/api/chat/product-owner';
      }
    };

    try {
      const apiEndpoint = getApiEndpoint(agentType);
      const apiMessages = [...currentState.messages, userMessage].map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          projectId: projectId ? parseInt(projectId, 10) : null,
          selectedModel: currentState.selectedModel,
          webSearchEnabled: webSearchEnabled
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      let aiResponse = '';
      const decoder = new TextDecoder();
      let messageId = `agent-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;
        
        const agentMessage: ChatMessage = {
          id: messageId,
          content: aiResponse,
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agentType: agentType,
          model: currentState.selectedModel
        };

        updateAgentState(agentType, {
          messages: [...currentState.messages, userMessage, agentMessage],
          isTyping: false,
          loadingState: undefined,
          currentTool: undefined
        });
      }
    } catch (error) {
      console.error('Confirmation response error:', error);
      const errorMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: `I apologize, but I encountered an error processing your confirmation.`,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: agentType
      };

      updateAgentState(agentType, {
        messages: [...currentState.messages, userMessage, errorMessage],
        isTyping: false,
        loadingState: undefined,
        currentTool: undefined
      });
    }
  };

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
    
    // Auto-resize textarea after it's rendered
    setTimeout(() => {
      const textarea = document.querySelector(`textarea[placeholder="Edit your message..."]`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(48, Math.min(textarea.scrollHeight, 200))}px`;
      }
    }, 0);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const saveEditedMessage = async (agentType: ProjectAgentType, messageId: string) => {
    if (!editingContent.trim()) return;

    const currentState = agentStates[agentType];
    const messageIndex = currentState.messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;

    try {
      // Get the conversation ID for this agent
      const chatHistory = getChatHistory(agentType);
      const conversationId = selectedConversationIds[agentType] || chatHistory.conversation.id;

      // Update message in backend
      await chatAPI.updateMessage(messageId, editingContent.trim());

      // Delete all messages after this one in backend
      await chatAPI.deleteMessagesAfter(conversationId, messageId);

      // Create updated message for UI
      const updatedMessage: ChatMessage = {
        ...currentState.messages[messageIndex],
        content: editingContent.trim(),
        timestamp: new Date().toISOString()
      };

      // Remove all messages after the edited one (including agent responses)
      const messagesUpToEdit = currentState.messages.slice(0, messageIndex);
      const updatedMessages = [...messagesUpToEdit, updatedMessage];

      // Update state with edited message and removed subsequent messages
      updateAgentState(agentType, {
        messages: updatedMessages,
        isTyping: true,
        loadingState: webSearchEnabled ? 'searching' : 'thinking'
      });

      // Clear editing state
      setEditingMessageId(null);
      setEditingContent('');

      // Regenerate conversation from the edited message
      await regenerateConversationFromMessage(agentType, updatedMessages, updatedMessage);
    } catch (error) {
      console.error('Failed to save edited message:', error);
      
      // Clear editing state even on error
      setEditingMessageId(null);
      setEditingContent('');
      
      // Show error message to user
      alert('Failed to save edited message. Please try again.');
    }
  };

  const regenerateConversationFromMessage = async (agentType: ProjectAgentType, messages: ChatMessage[], editedMessage: ChatMessage) => {
    const getApiEndpoint = (type: ProjectAgentType) => {
      switch (type) {
        case 'product-owner': return '/api/chat/product-owner';
        case 'scrum-master': return '/api/chat/scrum-master';
        case 'developer': return '/api/chat/developer';
        default: return '/api/chat/product-owner';
      }
    };

    // Create abort controller for this regeneration request
    const abortController = new AbortController();

    try {
      const currentState = agentStates[agentType];
      const apiEndpoint = getApiEndpoint(agentType);
      
      // Update state to include abort controller and streaming status
      updateAgentState(agentType, {
        isStreaming: true,
        abortController: abortController
      });
      
      // Prepare messages for API
      const apiMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          projectId: projectId ? parseInt(projectId, 10) : null,
          selectedModel: currentState.selectedModel,
          webSearchEnabled: webSearchEnabled
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      let aiResponse = '';
      const decoder = new TextDecoder();
      let messageId = `agent-${Date.now()}`;
      let hasStartedGenerating = false;

      // Set initial thinking state after a short delay if web search is not enabled
      if (!webSearchEnabled) {
        setTimeout(() => {
          updateAgentState(agentType, {
            messages: messages,
            isTyping: true,
            loadingState: 'thinking'
          });
        }, 500);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Try to parse chunk for tool usage information
        try {
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const data = line.replace('data: ', '');
              if (data && data !== '[DONE]') {
                const parsed = JSON.parse(data);
                
                // Check for tool calls
                if (parsed.type === 'tool-call' || parsed.toolName) {
                  const toolName = parsed.toolName || parsed.tool?.name || 'tool';
                  updateAgentState(agentType, {
                    messages: messages,
                    isTyping: true,
                    loadingState: 'tool-call',
                    currentTool: toolName
                  });
                  continue;
                }
                
                // Check for text generation
                if (parsed.type === 'text-delta' || parsed.delta || parsed.content) {
                  if (!hasStartedGenerating) {
                    hasStartedGenerating = true;
                    updateAgentState(agentType, {
                      messages: messages,
                      isTyping: true,
                      loadingState: 'generating'
                    });
                  }
                }
              }
            }
          }
        } catch (e) {
          // If chunk is not JSON, it's likely text content
          if (!hasStartedGenerating && chunk.trim()) {
            hasStartedGenerating = true;
            updateAgentState(agentType, {
              messages: messages,
              isTyping: true,
              loadingState: 'generating'
            });
          }
        }
        
        aiResponse += chunk;
        
        // Update the agent message in real-time during streaming
        const agentMessage: ChatMessage = {
          id: messageId,
          content: aiResponse,
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agentType: agentType,
          model: currentState.selectedModel
        };

        // Update using functional state to avoid stale snapshots and dedupe by id/content
        setAgentStates(prev => {
          const prevState = prev[agentType];
          const merged = upsertMessage([...messages, agentMessage] as EnhancedChatMessage[], agentMessage as EnhancedChatMessage);
          return {
            ...prev,
            [agentType]: {
              ...prevState,
              messages: merged,
              isTyping: true, // Keep typing true during streaming
              loadingState: 'generating', // Keep generating state during streaming
              currentTool: undefined
            }
          };
        });
      }

      // Final cleanup - ensure streaming state is properly cleared
      updateAgentState(agentType, {
        isTyping: false,
        loadingState: undefined,
        currentTool: undefined
      });

      // Save the final complete AI response to backend (outside the streaming loop)
      try {
        const chatHistory = getChatHistory(agentType);
        const conversationId = selectedConversationIds[agentType] || chatHistory.conversation.id;
        
        await chatAPI.saveMessage(conversationId, {
          id: messageId,
          role: 'assistant',
          parts: [{ type: 'text', text: aiResponse }]
        });
      } catch (saveError) {
        console.error('Failed to save AI response to backend:', saveError);
        // Don't show error to user for this, as the message is visible in UI
      }
    } catch (error) {
      console.error('Regenerate conversation error:', error);
      const errorMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: `I apologize, but I encountered an error while processing your edited request.`,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: agentType
      };

      updateAgentState(agentType, {
        messages: [...messages, errorMessage],
        isTyping: false,
        loadingState: undefined,
        currentTool: undefined
      });
    }
  };

  const currentAgent = AGENTS[activeAgent];
  const currentState = agentStates[activeAgent];
  const AgentIcon = getAgentIcon(activeAgent);

  return (
     <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 p-4">
       {/* Unified Complete Container */}
       <div className="flex flex-col flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
         
         {/* Navigation Header */}
         <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href={`/project/${projectId}/dashboard`}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-blue-600" />
                AI Assistants
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Chat with specialized Scrum agents for Project {projectId}
              </p>
             </div>
            </div>
          </div>
          
           {/* AI Assistant Header */}
           <div className="border-b border-gray-200 dark:border-gray-700 p-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-4">
                  {/* Agent Dropdown */}
                  <div className="relative agent-dropdown">
            <button
                      onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                      className="flex items-center space-x-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <div className={`w-8 h-8 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                        <AgentIcon className="w-4 h-4 text-white" />
          </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                     {currentAgent.name}
        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                     {currentAgent.description}
      </div>
          </div>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAgentDropdown ? 'rotate-180' : ''}`} />
                    </button>
          
                    {/* Dropdown Menu */}
                    {showAgentDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {Object.values(AGENTS).map((agent) => {
              const IconComponent = getAgentIcon(agent.id);
              const isActive = activeAgent === agent.id;
              const agentState = agentStates[agent.id];
              return (
                            <button
                  key={agent.id}
                              onClick={() => {
                                // Prevent auto-scroll on first-time switch to this agent
                                suppressAutoScrollRef.current = true;
                                setActiveAgent(agent.id);
                                setShowAgentDropdown(false);
                              }}
                              className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 ${agent.color} rounded-lg flex items-center justify-center`}>
                                  <IconComponent className="w-4 h-4 text-white" />
                    </div>
                                <div className="flex-1">
                      <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {agent.name}
                                    </span>
                      </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {agent.description}
                      </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                 </div>

                 {/* AI Model Selector */}

                 <div>
                   <ModelSelector
                     selectedModel={currentState.selectedModel || currentAgent.defaultModel || AI_MODELS.CHAT}
                     onModelChange={(modelId) => {
                       updateAgentState(activeAgent, { selectedModel: modelId });
                       setPreferredModel(activeAgent, modelId);
                     }}
                     agentType={activeAgent}
                     className="min-w-[220px]"
                   />
                 </div>
               </div>
               
               {/* Export Button */}
               <div>
                 <button
                   onClick={() => exportChatHistory(activeAgent)}
                   className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
                   disabled={currentState.messages.length === 0}
                 >
                   <Download className="w-4 h-4" />
                   <span>Export</span>
                 </button>
                      </div>
                    </div>
                  </div>

           {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
           {/* Chat History Sidebar */}
           <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <History className="w-5 h-5 mr-2" />
              Chat History
            </h2>
              <button
                onClick={createNewChat}
                className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                title="Start a new chat"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your recent conversations with AI agents
            </p>
          </div>
          
                          <div className="flex-1 p-4 space-y-3 overflow-y-auto relative" style={{ zIndex: 1 }}>
            {/* Real Chat History Items */}
            {loadingConversations ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm">Loading conversations...</p>
                    </div>
            ) : (
              <>
                {/* Show conversations for the currently selected agent only */}
                {allConversations[activeAgent]?.map((conversation, index) => {
                    const agent = AGENTS[activeAgent];
                    const AgentIcon = getAgentIcon(activeAgent);
                    const timeAgo = formatTimeAgo(conversation.last_message_at || conversation.updated_at || conversation.created_at);
                    
                    // Check if this conversation is currently selected
                    const isActiveConversation = conversation.id === selectedConversationIds[activeAgent];
                    
                    // Determine dropdown position based on item position in list
                    const isFirstItem = index === 0;
                    const dropdownPositionClass = isFirstItem ? 'top-full mt-1' : 'bottom-full mb-1';
                    
                    return (
                      <div 
                        key={conversation.id}
                        className={`group p-3 rounded-lg border-2 transition-all duration-200 relative min-h-[60px] ${
                          isActiveConversation 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400 shadow-md ring-2 ring-blue-200 dark:ring-blue-800 transform scale-[1.02] border-l-4 border-l-blue-600 dark:border-l-blue-400' 
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        style={{ zIndex: showChatMenu === conversation.id ? 100000 : 'auto' }}
                      >
                        {renamingChat === conversation.id ? (
                          // Rename Mode
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 ${agent?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <AgentIcon className="w-4 h-4 text-white" />
                </div>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    saveRename(conversation.id);
                                  } else if (e.key === 'Escape') {
                                    cancelRename();
                                  }
                                }}
                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                  </div>
                            <button
                              onClick={() => saveRename(conversation.id)}
                              className="p-1 text-green-600 hover:text-green-700"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelRename}
                              className="p-1 text-gray-500 hover:text-gray-700"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                </div>
                        ) : (
                          // Normal Display Mode
                          <>
                            <div 
                              className="cursor-pointer relative h-full"
                              onClick={() => {
                                // Load the specific conversation
                                loadConversation(conversation.id, activeAgent);
                              }}
                            >
                              <div className="flex items-center h-full">
                                <div className={`w-8 h-8 ${agent?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center flex-shrink-0 mr-3 ${
                                  isActiveConversation ? 'ring-2 ring-white dark:ring-gray-800 shadow-sm' : ''
                                }`}>
                                  <AgentIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 flex items-center justify-start pl-2 pr-16">
                                  <h4 className={`text-base font-medium truncate ${
                                    isActiveConversation 
                                      ? 'text-blue-700 dark:text-blue-300 font-semibold' 
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {conversation.title || `${agent?.name || activeAgent} Chat`}
                                  </h4>
                                </div>
                              </div>
                            </div>
                            
                            {/* Timestamp positioned relative to the main container */}
                            <span className={`absolute bottom-1 right-1 text-xs px-1 rounded ${
                              isActiveConversation 
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 font-medium' 
                                : 'text-gray-500 bg-white dark:bg-gray-800'
                            }`}>{timeAgo}</span>

                            {/* Three-dot menu */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="relative chat-menu">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowChatMenu(showChatMenu === conversation.id ? null : conversation.id);
                                  }}
                                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                  title="More options"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                
                                {/* Dropdown Menu - Positioned with higher z-index */}
                                {showChatMenu === conversation.id && (
                                  <div 
                                    className={`absolute right-0 ${dropdownPositionClass} w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden`}
                                    data-chat-dropdown="true"
                                    style={{ 
                                      zIndex: 99999,
                                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                                      position: 'absolute'
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChatMenu(null);
                                        startRenaming(conversation.id, conversation.title);
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg flex items-center space-x-2"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Rename</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowChatMenu(null);
                                        showDeleteConfirmation(
                                          conversation.id, 
                                          conversation.title || `${agent?.name || activeAgent} Chat`,
                                          activeAgent
                                        );
                                      }}
                                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors last:rounded-b-lg flex items-center space-x-2"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
              </div>
                    );
                  }) || []}

            {/* Empty State */}
                {(!allConversations[activeAgent] || allConversations[activeAgent].length === 0) && !loadingConversations && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className={`w-12 h-12 ${AGENTS[activeAgent].color} rounded-full flex items-center justify-center mx-auto mb-3 opacity-50`}>
                      {React.createElement(getAgentIcon(activeAgent), { className: "w-6 h-6 text-white" })}
            </div>
                    <p className="text-sm">No {AGENTS[activeAgent].name} conversations yet</p>
                    <p className="text-xs mt-1">Start chatting to see your history here</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div 
             className={`flex-1 flex flex-col relative min-w-0 ${
            currentState.isDragOver 
                 ? 'bg-blue-50 dark:bg-blue-900/20' 
              : ''
          }`}
          onDragOver={(e) => handleDragOverChat(e, activeAgent)}
          onDragEnter={(e) => handleDragEnterChat(e, activeAgent)}
          onDragLeave={(e) => handleDragLeaveChat(e, activeAgent)}
          onDrop={(e) => handleDropChat(e, activeAgent)}
        >
          {/* Drag overlay */}
          {currentState.isDragOver && (
            <div className="absolute inset-0 bg-blue-50/95 dark:bg-gray-800/95 border-2 border-dashed border-blue-400 dark:border-blue-300 z-10 flex items-center justify-center">
              <div className="text-center p-8 bg-white/90 dark:bg-gray-700/90 rounded-xl border border-blue-200 dark:border-blue-400 shadow-lg">
                <Upload className="w-16 h-16 text-blue-500 dark:text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-blue-700 dark:text-white mb-2">
                  Drop files to attach
                </h3>
                <p className="text-sm text-blue-600 dark:text-gray-300 max-w-md">
                  {getSupportedFormatsString()}
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
           <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 max-w-full bg-gray-50 dark:bg-gray-900">
            {currentState.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-20 h-20 ${currentAgent.color} rounded-full flex items-center justify-center mb-4`}>
                  <AgentIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Chat with {currentAgent.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
                  {currentAgent.description}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentAgent.expertise.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-sm rounded-full text-gray-600 dark:text-gray-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {currentState.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="flex items-start space-x-3 max-w-2xl">
                      {message.sender === 'agent' && (
                        <div className={`w-8 h-8 ${currentAgent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <AgentIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className="relative">
                         {editingMessageId === message.id ? (
                           /* Edit Mode */
                           <div className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-blue-500" style={{ width: '600px', maxWidth: '90vw' }}>
                             <textarea
                               value={editingContent}
                               onChange={(e) => {
                                 setEditingContent(e.target.value);
                                 // Auto-resize textarea
                                 const textarea = e.target;
                                 textarea.style.height = 'auto';
                                 textarea.style.height = `${Math.max(48, Math.min(textarea.scrollHeight, 200))}px`;
                               }}
                               onKeyPress={(e) => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                   e.preventDefault();
                                   saveEditedMessage(activeAgent, message.id);
                                 }
                               }}
                               className="w-full bg-transparent text-gray-900 dark:text-white text-sm resize-none border-none outline-none min-h-[48px] overflow-hidden"
                               placeholder="Edit your message..."
                               autoFocus
                               style={{ height: 'auto', minHeight: '48px' }}
                             />
                             <div className="flex justify-end space-x-2 mt-2">
                               <button
                                 onClick={cancelEditingMessage}
                                 className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                               >
                                 Cancel
                               </button>
                               <button
                                 onClick={() => saveEditedMessage(activeAgent, message.id)}
                                 disabled={!editingContent.trim()}
                                 className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-1"
                               >
                                 <Send className="w-4 h-4" />
                                 <span>Send</span>
                               </button>
                             </div>
                           </div>
                        ) : (
                          /* Normal Message Display */
                          <>
                            <div
                              className={`px-4 py-2 rounded-xl ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="text-sm prose prose-sm max-w-none prose-slate dark:prose-invert">
                          {/* Display file attachments from session data */}
                          {message.sessionData?.fileParts && message.sessionData.fileParts.length > 0 && (
                            <div className="mb-3">
                              {message.sessionData.fileParts.map((part, partIndex) => {
                                if (part.type === 'file' && part.url) {
                                  const fileCategory = getFileCategory(part.mediaType || '');
                                  
                                  if (fileCategory === 'image') {
                                    return (
                                      <div key={partIndex} className="mb-2">
                                        <Image
                                          src={part.url}
                                          alt={`Attachment ${partIndex + 1}`}
                                          width={300}
                                          height={200}
                                          className="rounded-lg border border-gray-200 dark:border-gray-600 max-w-full h-auto"
                                          style={{ objectFit: 'contain' }}
                                        />
                                      </div>
                                    );
                                  } else if (fileCategory === 'pdf') {
                                    return (
                                      <div key={partIndex} className="mb-2 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                                        <div className="flex items-center space-x-2 mb-2">
                                          <FileText className="w-4 h-4 text-red-500" />
                                          <span className="text-sm font-medium">PDF Document</span>
                                        </div>
                                        <iframe
                                          src={part.url}
                                          width="100%"
                                          height="400"
                                          className="border border-gray-200 dark:border-gray-600 rounded"
                                          title={`PDF attachment ${partIndex + 1}`}
                                        />
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })}
                            </div>
                          )}
                          
                          {/* Display text content */}
                          {message.content.split('\n').map((line, index) => {
                            if (line.trim() === '') return <br key={index} />;
                            
                            // Handle markdown links [text](url) first - convert to React elements
                            const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                            const parts: (string | React.ReactElement)[] = [];
                            let lastIndex = 0;
                            let match: RegExpExecArray | null;
                            
                            while ((match = linkRegex.exec(line)) !== null) {
                              // Add text before the link
                              if (match.index > lastIndex) {
                                parts.push(line.slice(lastIndex, match.index));
                              }
                              
                              const linkText = match[1];
                              const linkUrl = match[2];
                              
                              // Add the link as a React element
                              parts.push(
                                <a
                                  key={`link-${index}-${match.index}`}
                                  href={linkUrl}
                                  className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer underline font-medium"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = linkUrl;
                                  }}
                                >
                                  {linkText}
                                </a>
                              );
                              
                              lastIndex = match.index + match[0].length;
                            }
                            
                            // Add remaining text
                            if (lastIndex < line.length) {
                              parts.push(line.slice(lastIndex));
                            }
                            
                            // If no links found, process normally
                            if (parts.length === 0) {
                              parts.push(line);
                            }
                            
                            // Process the parts for other markdown
                            const processedParts = parts.map((part, partIndex) => {
                              if (typeof part === 'string') {
                                // Handle bold text **text**
                                const boldRegex = /\*\*(.*?)\*\*/g;
                                return part.replace(boldRegex, '<strong>$1</strong>');
                              }
                              return part;
                            });
                            
                            // Handle list items starting with -
                            if (line.trim().startsWith('- ')) {
                              return (
                                <li key={index} className="ml-4">
                                  {processedParts.map((part, partIndex) => 
                                    typeof part === 'string' ? 
                                      <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.replace(/^- /, '') }} /> : 
                                      part
                                  )}
                                </li>
                              );
                            }
                            
                            // Handle numbered lists
                            const numberedListMatch = line.match(/^(\d+)\.\s+(.+)/);
                            if (numberedListMatch) {
                              return (
                                <li key={index} className="ml-4">
                                  {processedParts.map((part, partIndex) => 
                                    typeof part === 'string' ? 
                                      <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.replace(/^\d+\.\s+/, '') }} /> : 
                                      part
                                  )}
                                </li>
                              );
                            }
                            
                            // Handle headings
                            if (line.startsWith('### ')) {
                              return (
                                <h3 key={index} className="text-base font-semibold mt-2 mb-1">
                                  {processedParts.map((part, partIndex) => 
                                    typeof part === 'string' ? 
                                      <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.replace('### ', '') }} /> : 
                                      part
                                  )}
                                </h3>
                              );
                            }
                            if (line.startsWith('## ')) {
                              return (
                                <h2 key={index} className="text-lg font-semibold mt-2 mb-1">
                                  {processedParts.map((part, partIndex) => 
                                    typeof part === 'string' ? 
                                      <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.replace('## ', '') }} /> : 
                                      part
                                  )}
                                </h2>
                              );
                            }
                            
                            return (
                              <p key={index} className="mb-1">
                                {processedParts.map((part, partIndex) => 
                                  typeof part === 'string' ? 
                                    <span key={partIndex} dangerouslySetInnerHTML={{ __html: part }} /> : 
                                    part
                                )}
                              </p>
                            );
                          })}
                        </div>
                           </div>
                           
                           {/* Confirmation Buttons - Show for agent messages that need confirmation */}
                           {message.sender === 'agent' && 
                            currentState.pendingConfirmations?.has(message.id) && 
                            !currentState.confirmedMessages?.has(message.id) && (
                             <div className="flex space-x-3 mt-3 justify-center">
                               <button
                                 onClick={() => handleConfirmation(activeAgent, message.id, true)}
                                 className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                               >
                                 <CheckCircle className="w-4 h-4" />
                                 <span>Accept</span>
                               </button>
                               <button
                                 onClick={() => handleConfirmation(activeAgent, message.id, false)}
                                 className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                               >
                                 <XCircle className="w-4 h-4" />
                                 <span>Decline</span>
                               </button>
                             </div>
                           )}
                           </>
                         )}
                         
                         {/* Action Buttons - Show below message on hover */}
                         {editingMessageId !== message.id && (
                           <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2 mt-2 ${
                             message.sender === 'user' ? 'justify-end' : 'justify-start'
                           }`}>
                             {/* Edit Button - Only show for user messages */}
                             {message.sender === 'user' && (
                               <button
                                 onClick={() => startEditingMessage(message.id, message.content)}
                                 className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                 title="Edit message"
                               >
                                 <Edit3 className="w-4 h-4" />
                               </button>
                             )}
                             
                             {/* Copy Button */}
                             <button
                               onClick={() => copyToClipboard(message.id, message.content)}
                               className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                               title="Copy message"
                             >
                               {copiedMessageId === message.id ? (
                                 <Check className="w-4 h-4" />
                               ) : (
                                 <Copy className="w-4 h-4" />
                               )}
                             </button>
                           </div>
                         )}
                      </div>
                      
                      {message.sender === 'user' && (
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {currentState.isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                        <AgentIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-xl">
                        <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                            {getLoadingMessage(currentState, currentAgent.name)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
           <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {/* File Preview */}
            {currentState.files && currentState.files.length > 0 && (
              <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentState.files.length} file{currentState.files.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => removeFiles(activeAgent)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {Array.from(currentState.files).map((file, index) => {
                    const fileCategory = getFileCategory(file.type);
                    const getFileIcon = () => {
                      switch (fileCategory) {
                        case 'image': return <ImageIcon className="w-4 h-4 text-green-500" />;
                        case 'pdf': return <FileText className="w-4 h-4 text-red-500" />;
                        default: return <File className="w-4 h-4 text-gray-500" />;
                      }
                    };
                    
                    return (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        {getFileIcon()}
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Hidden File Input */}
              <input
                ref={(el) => {
                  fileInputRefs.current[activeAgent] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                multiple
                onChange={(e) => handleFileChange(e, activeAgent)}
                className="hidden"
              />

            {/* Integrated Input Field with Buttons */}
            <div className="relative flex items-center bg-gray-100 dark:bg-gray-700 rounded-2xl border-0 focus-within:bg-gray-200 dark:focus-within:bg-gray-600 transition-colors">
              {/* Plus Button with Dropdown */}
              <div className="relative plus-dropdown">
              <button
                  onClick={() => setShowPlusDropdown(!showPlusDropdown)}
                  className="p-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center"
                  title="More options"
              >
                  <Plus className="w-4 h-4" />
              </button>

                {/* Dropdown Menu (appears above button) */}
                {showPlusDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                    {/* Upload File Option */}
                    <button
                      onClick={() => {
                        fileInputRefs.current[activeAgent]?.click();
                        setShowPlusDropdown(false);
                      }}
                      className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg flex items-center space-x-3"
                    >
                      <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">Upload file</span>
                    </button>

                    {/* Web Search Option */}
              {isClient && hasNativeWebSearch(currentState.selectedModel || currentAgent.defaultModel || '') && (
                <button
                  onClick={() => {
                    setWebSearchEnabled(!webSearchEnabled);
                          setShowPlusDropdown(false);
                  }}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors last:rounded-b-lg flex items-center space-x-3"
                      >
                        <Globe className={`w-4 h-4 ${
                    webSearchEnabled
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`} />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {webSearchEnabled ? 'Disable web search' : 'Search online'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Active Functionality Indicators (next to plus button) */}
              {(currentState.files?.length || webSearchEnabled) && (
                <div className="flex items-center space-x-2 ml-1">
                  {/* Web Search Indicator */}
                  {isClient && webSearchEnabled && hasNativeWebSearch(currentState.selectedModel || currentAgent.defaultModel || '') && (
                    <div className="group relative">
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs">
                        <Globe className="w-3 h-3" />
                        <span>Search</span>
                      </div>
                      {/* Hover X to disable */}
                      <button
                        onClick={() => setWebSearchEnabled(false)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                      >
                        <X className="w-2.5 h-2.5" />
                </button>
                    </div>
                  )}

                  {/* File Upload Indicator */}
                  {currentState.files && currentState.files.length > 0 && (
                    <div className="group relative">
                      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs">
                        <Upload className="w-3 h-3" />
                        <span>{currentState.files.length}</span>
                      </div>
                      {/* Hover X to remove */}
                      <button
                        onClick={() => removeFiles(activeAgent)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Text Input */}
              <textarea
                ref={(el) => {
                  inputRefs.current[activeAgent] = el;
                }}
                value={currentState.inputValue}
                onChange={(e) => handleInputChange(e, activeAgent)}
                onKeyPress={(e) => handleKeyPress(e, activeAgent)}
                placeholder={`Ask ${currentAgent.name} anything about your project...`}
                className="flex-1 px-3 py-3 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-0 focus:outline-none resize-none min-h-[48px] max-h-32 overflow-y-auto"
                rows={1}
              />
              
              {/* Send/Stop Button */}
              {currentState.isStreaming ? (
                <button
                  onClick={() => stopGeneration(activeAgent)}
                  className="p-2 m-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                  title="Stop generation"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => sendPersistentMessage(activeAgent)}
                  disabled={(!currentState.inputValue.trim() && !currentState.files?.length) || currentState.isTyping}
                  className="p-2 m-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Conversation
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete this conversation?
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border-l-4 border-red-500">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`w-4 h-4 ${AGENTS[deleteConfirmModal.agentType as ProjectAgentType]?.color || 'bg-gray-500'} rounded`}></div>
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {deleteConfirmModal.conversationTitle}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {AGENTS[deleteConfirmModal.agentType as ProjectAgentType]?.name || deleteConfirmModal.agentType} conversation
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteChat}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;

