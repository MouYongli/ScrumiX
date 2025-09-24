'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User,
  Settings,
  Code2,
  Send,
  MessageSquare,
  X,
  Minimize2,
  ExternalLink,
  Plus,
  Upload,
  Globe,
  Square,
  ChevronDown,
  Clock,
  CheckCircle,
  Copy,
  Check,
  Edit3,
  XCircle,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProjectAgent, ProjectAgentType, ChatMessage, AgentChatState, UIMessage } from '@/types/chat';
import { getAgentModelConfig, AI_MODELS } from '@/lib/ai-gateway';
import { getPreferredModel, setPreferredModel } from '@/lib/model-preferences';
import { hasNativeWebSearch } from '@/lib/tools/legacy/web-search';
import { chatAPI, ChatConversation } from '@/lib/chat-api';
import { nanoid } from 'nanoid';
import ModelSelector from './ModelSelector';

// Agent definitions with Scrum-specific roles
const AGENTS: Record<ProjectAgentType, ProjectAgent> = {
  'product-owner': {
    id: 'product-owner',
    name: 'Product Owner',
    description: 'Helps with backlog management, user stories, product vision, and backlog item updates',
    icon: 'User',
    color: 'bg-emerald-500',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    expertise: ['User Stories', 'Backlog Prioritization', 'Acceptance Criteria', 'Stakeholder Management', 'Backlog Updates'],
    defaultModel: AI_MODELS.GEMINI_FLASH
  },
  'scrum-master': {
    id: 'scrum-master',
    name: 'Scrum Master',
    description: 'Assists with ceremonies, impediment removal, and process improvement',
    icon: 'Settings',
    color: 'bg-blue-500',
    accentColor: 'text-blue-600 dark:text-blue-400',
    expertise: ['Sprint Planning', 'Daily Standups', 'Retrospectives', 'Impediment Resolution'],
    defaultModel: AI_MODELS.GEMINI_FLASH
  },
  'developer': {
    id: 'developer',
    name: 'Developer',
    description: 'Provides technical guidance, code reviews, and implementation advice',
    icon: 'Code2',
    color: 'bg-purple-500',
    accentColor: 'text-purple-600 dark:text-purple-400',
    expertise: ['Code Review', 'Technical Debt', 'Architecture', 'Best Practices'],
    defaultModel: AI_MODELS.GEMINI_FLASH
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

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<ProjectAgentType>('product-owner');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showPlusDropdown, setShowPlusDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [recentChats, setRecentChats] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string>('');
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const isFetchingChatsRef = useRef(false);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<ProjectAgentType, AgentChatState>>({
    'product-owner': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: AI_MODELS.GEMINI_FLASH,
      loadingState: undefined,
      currentTool: undefined,
      pendingConfirmations: new Set(),
      confirmedMessages: new Set(),
      files: undefined
    },
    'scrum-master': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: AI_MODELS.GEMINI_FLASH,
      loadingState: undefined,
      currentTool: undefined,
      pendingConfirmations: new Set(),
      confirmedMessages: new Set(),
      files: undefined
    },
    'developer': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: AI_MODELS.GEMINI_FLASH,
      loadingState: undefined,
      currentTool: undefined,
      pendingConfirmations: new Set(),
      confirmedMessages: new Set(),
      files: undefined
    }
  });
  
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  
  // Get project ID from current path
  const projectId = pathname?.startsWith('/project/') ? pathname.split('/')[2] : null;

  // Helper function to get API endpoint for agent type
  const getApiEndpoint = (agentType: ProjectAgentType): string => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
    switch (agentType) {
      case 'product-owner':
        return `${base}/chat/conversations/upsert`;
      case 'scrum-master':
        return `${base}/chat/conversations/upsert`;
      case 'developer':
        return `${base}/chat/conversations/upsert`;
      default:
        return `${base}/chat/conversations/upsert`;
    }
  };

  // Helper function to get loading messages (aligned with AIChat)
  const getLoadingMessage = (loadingState?: string, currentTool?: string): string => {
    switch (loadingState) {
      case 'searching':
        return 'Searching the web';
      case 'thinking':
        return 'Scrumming through ideas';
      case 'tool-call':
        if (currentTool) {
          // Make tool names more user-friendly (same as AIChat + additional tools)
          const toolDisplayNames: Record<string, string> = {
            // Backlog management tools
            'createBacklogItem': 'Creating backlog item',
            'getBacklogItems': 'Reviewing backlog',
            'semanticSearchBacklog': 'Searching backlog',
            'hybridSearchBacklog': 'Searching backlog',
            'bm25SearchBacklog': 'Searching backlog',
            'findSimilarBacklog': 'Finding similar items',
            
            // Sprint management tools
            'createSprint': 'Creating sprint',
            'updateSprint': 'Updating sprint',
            'deleteSprint': 'Deleting sprint',
            'getSprints': 'Reviewing sprints',
            'getSprintById': 'Getting sprint details',
            'createSprintBacklogItem': 'Creating sprint item',
            'updateSprintBacklogItem': 'Updating sprint item',
            'deleteSprintBacklogItem': 'Removing sprint item',
            
            // Analysis tools
            'analyzeVelocity': 'Analyzing velocity',
            'analyzeBurndown': 'Analyzing burndown',
            'analyzeSprintHealth': 'Analyzing sprint health',
            'analyzeCurrentSprintVelocity': 'Analyzing current velocity',
            
            // Documentation tools
            'createDocumentation': 'Creating documentation',
            'getDocumentation': 'Reviewing documentation',
            'searchDocumentationByField': 'Searching documentation',
            
            // Search tools
            'web_search_preview': 'Searching the web',
            'google_search': 'Searching the web'
          };
          const displayName = toolDisplayNames[currentTool] || `Using ${currentTool}`;
          return `${displayName}...`;
        }
        return 'Processing...';
      case 'generating':
        return 'Generating response...';
      default:
        return 'Thinking...';
    }
  };

  // Load recent chats for current agent (stable callback to avoid effect thrashing)
  const loadRecentChats = useCallback(async (agentType: ProjectAgentType) => {
    if (isFetchingChatsRef.current) return;
    isFetchingChatsRef.current = true;
    setIsLoadingChats(true);
    try {
      const conversations = await chatAPI.getUserConversations(agentType);
      // Filter by current project when in a project context
      const pid = projectId ? parseInt(projectId, 10) : null;
      const scopedConversations = pid != null
        ? conversations.filter((conv: ChatConversation) => conv.project_id === pid)
        : conversations;
      const sortedChats = scopedConversations
        .sort((a, b) => new Date(b.last_message_at || b.updated_at || '').getTime() - new Date(a.last_message_at || a.updated_at || '').getTime());
      setRecentChats(sortedChats);
    } catch (error) {
      console.error('Failed to load recent chats:', error);
      setRecentChats([]);
    } finally {
      setIsLoadingChats(false);
      isFetchingChatsRef.current = false;
    }
  }, []);

  const startRenamingChat = (chatId: string, currentTitle?: string) => {
    setRenamingChatId(chatId);
    setRenameValue(currentTitle || '');
  };

  const cancelRenamingChat = () => {
    setRenamingChatId(null);
    setRenameValue('');
  };

  const saveRenamedChat = async (chatId: string) => {
    if (!renameValue.trim()) {
      cancelRenamingChat();
      return;
    }
    try {
      await chatAPI.updateConversation(chatId, { title: renameValue.trim() });
      await loadRecentChats(activeAgent);
      setRenamingChatId(null);
      setRenameValue('');
    } catch (e) {
      console.error('Failed to rename chat:', e);
      alert('Failed to rename conversation. Please try again.');
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await chatAPI.deleteConversation(chatId);
      // If we are currently in this chat, clear messages
      if (currentConversationId === chatId) {
        updateAgentState(activeAgent, { messages: [] });
        setCurrentConversationId('');
      }
      await loadRecentChats(activeAgent);
    } catch (e) {
      console.error('Failed to delete chat:', e);
      alert('Failed to delete conversation.');
    }
  };


  // Load conversation history
  const loadConversation = useCallback(async (conversationId: string) => {
    try {
      const historyData = await chatAPI.getConversationHistory(conversationId);
      
      // Convert backend messages to ChatMessage format
      const messages: ChatMessage[] = historyData.messages.map(msg => ({
        id: msg.id || `msg_${Date.now()}`,
        content: msg.parts.find(p => p.type === 'text')?.text || '',
        timestamp: msg.created_at || new Date().toISOString(),
        sender: msg.role === 'user' ? 'user' : 'agent',
        agentType: activeAgent
      }));
      
      updateAgentState(activeAgent, { messages });
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }, [activeAgent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateAgentState = (agentType: ProjectAgentType, updates: Partial<AgentChatState>) => {
    setAgentStates(prev => ({
      ...prev,
      [agentType]: { ...prev[agentType], ...updates }
    }));
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [agentStates[activeAgent].messages, isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, activeAgent]);

  // Load recent chats when opening or switching agents
  useEffect(() => {
    if (isOpen) {
      loadRecentChats(activeAgent);
    }
  }, [isOpen, activeAgent]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showPlusDropdown && !target.closest('.plus-dropdown')) {
        setShowPlusDropdown(false);
      }
      if (showAgentDropdown && !target.closest('.agent-dropdown')) {
        setShowAgentDropdown(false);
      }
      if (showChatDropdown && !target.closest('.chat-dropdown')) {
        setShowChatDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlusDropdown, showAgentDropdown, showChatDropdown]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    
    // Clear chat history for all agents
    setAgentStates(prev => {
      const clearedStates: Record<ProjectAgentType, AgentChatState> = {} as Record<ProjectAgentType, AgentChatState>;
      
      Object.keys(prev).forEach(agentType => {
        const agent = agentType as ProjectAgentType;
        clearedStates[agent] = {
          ...prev[agent],
          messages: [],
          isTyping: false,
          inputValue: '',
          files: undefined
        };
      });
      
      return clearedStates;
    });
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  const switchAgent = (agentType: ProjectAgentType) => {
    setActiveAgent(agentType);
    setCurrentConversationId(''); // Reset conversation when switching agents
    setShowAgentDropdown(false);
    // Clear messages for the new agent to start fresh
    updateAgentState(agentType, { messages: [], files: undefined });
  };

  const stopGeneration = (agentType: ProjectAgentType) => {
    const currentState = agentStates[agentType];
    console.log('ChatWidget stop generation requested for agent:', agentType);
    
    // Abort any ongoing request
    if (currentState.abortController) {
      console.log('ChatWidget aborting ongoing request...');
      currentState.abortController.abort();
    }
    
    // Force clear all loading states regardless of abort controller existence
    updateAgentState(agentType, {
      isStreaming: false,
      isTyping: false,
      loadingState: undefined,
      currentTool: undefined,
      abortController: undefined
    });
    
    console.log('ChatWidget generation stopped and states cleared for agent:', agentType);
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

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingContent(content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const saveEditedMessage = async (messageId: string) => {
    if (!editingContent.trim()) return;

    const currentState = agentStates[activeAgent];
    const messageIndex = currentState.messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;

    try {
      
      // Update the existing message in backend
      await chatAPI.updateMessage(messageId, editingContent.trim());

      // Delete all messages after this one in backend
      if (currentConversationId) {
        await chatAPI.deleteMessagesAfter(currentConversationId, messageId);
      }

      // Create updated message
      const updatedMessage: ChatMessage = {
        ...currentState.messages[messageIndex],
        content: editingContent.trim(),
        timestamp: new Date().toISOString()
      };

      // Remove all messages after the edited one (including agent responses)
      const messagesUpToEdit = currentState.messages.slice(0, messageIndex);
      const updatedMessages = [...messagesUpToEdit, updatedMessage];

      // Update state with edited message and removed subsequent messages
      updateAgentState(activeAgent, {
        messages: updatedMessages,
        isTyping: true,
        loadingState: webSearchEnabled ? 'searching' : 'thinking'
      });

      // Clear editing state
      setEditingMessageId(null);
      setEditingContent('');

      // Regenerate conversation from the edited message
      await regenerateConversationFromMessage(updatedMessages, updatedMessage);
    } catch (error) {
      console.error('Failed to save edited message:', error);
      
      // Check if this is a 404 error (message not found)
      if (error instanceof Error && error.message.includes('404')) {
        console.warn('ChatWidget - Message ID sync issue detected for message:', messageId);
        
        // Try to reload the conversation to get the latest message IDs
        if (currentConversationId) {
          try {
            await loadConversation(currentConversationId);
            alert('Message IDs were out of sync. Please try editing again.');
          } catch (reloadError) {
            console.error('Failed to reload conversation:', reloadError);
            alert('Failed to save edited message due to synchronization issues. Please refresh the page and try again.');
          }
        } else {
          alert('Failed to save edited message due to synchronization issues. Please refresh the page and try again.');
        }
      } else {
        // Show generic error message for other errors
        alert('Failed to save edited message. Please try again.');
      }
      
      // Clear editing state
      setEditingMessageId(null);
      setEditingContent('');
    }
  };

  const regenerateConversationFromMessage = async (messages: ChatMessage[], editedMessage: ChatMessage) => {
    try {
    // Create abort controller for this request
    const abortController = new AbortController();
      const apiEndpoint = getApiEndpoint(activeAgent);
      const currentState = agentStates[activeAgent];
      
      // Update state with abort controller
      updateAgentState(activeAgent, {
        isStreaming: true,
        abortController: abortController
      });

      // Create or use existing conversation ID
      const conversationId = currentConversationId || nanoid();
      if (!currentConversationId) {
        setCurrentConversationId(conversationId);
        
        // Upsert conversation in backend
        await chatAPI.upsertConversation({
          id: conversationId,
          agent_type: activeAgent,
          project_id: projectId ? parseInt(projectId, 10) : undefined,
          title: `${AGENTS[activeAgent].name} Chat`
        });
      }

      // Prepare messages for API (using legacy format for regeneration)
      // This avoids duplicate message saves since we handle persistence manually
      const apiMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          projectId: projectId ? parseInt(projectId, 10) : null,
          selectedModel: currentState.selectedModel,
          webSearchEnabled
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Process streaming response (similar to sendMessage)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream received');
      }

      const decoder = new TextDecoder();
      let aiResponse = '';
      let messageId = `agent-${Date.now()}`;
      let hasStartedGenerating = false;
      const startTime = Date.now();
      const MIN_LOADING_TIME = 800;

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
                    updateAgentState(activeAgent, {
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
                      updateAgentState(activeAgent, {
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
              updateAgentState(activeAgent, {
                isTyping: true,
                loadingState: 'generating'
              });
            }
          }
          
          aiResponse += chunk;
          
          // Update the agent message in real-time during streaming
          const aiMessage: ChatMessage = {
            id: messageId,
            content: aiResponse,
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: activeAgent
          };

          // Update messages with the streaming content
          updateAgentState(activeAgent, {
            messages: [...messages, aiMessage],
            isTyping: true,
            loadingState: hasStartedGenerating ? 'generating' : (webSearchEnabled ? 'searching' : 'thinking')
          });
        }
        
        // Stream completed successfully - ensure final state cleanup for regeneration
        console.log('ChatWidget regeneration stream completed, performing final cleanup');
        
        // Make sure we have a final message if we received any content
        if (aiResponse.trim()) {
          const finalMessage: ChatMessage = {
            id: messageId,
            content: aiResponse.trim(),
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: activeAgent
          };

          const needsConfirmation = isConfirmationRequest(finalMessage.content);
          const finalPendingConfirmations = needsConfirmation 
            ? new Set([...(currentState.pendingConfirmations || new Set()), finalMessage.id])
            : currentState.pendingConfirmations;

          updateAgentState(activeAgent, {
            messages: [...messages, finalMessage],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined,
            pendingConfirmations: finalPendingConfirmations
          });
          
          // Save the final message to database
          try {
            await chatAPI.saveMessage(conversationId, {
              id: messageId,
              role: 'assistant',
              parts: [{ type: 'text', text: finalMessage.content }]
            });
            console.log(`ChatWidget regeneration saved final AI response (${finalMessage.content.length} chars) to database`);
          } catch (saveError) {
            console.warn('Failed to save ChatWidget regeneration final AI message to database:', saveError);
          }
        } else {
          // No content received, just clean up state
          updateAgentState(activeAgent, {
            messages: [...messages],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined
          });
        }
        
        // Return early to avoid any potential duplicate processing
        return;
        
      } catch (streamError) {
        // Handle streaming errors (including aborts)
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log('Stream aborted by user, preserving partial response');
          
          // If we have any partial response, preserve it and save to database
          if (aiResponse.trim()) {
            const partialMessage: ChatMessage = {
              id: messageId,
              content: aiResponse.trim(),
              timestamp: new Date().toISOString(),
              sender: 'agent',
              agentType: activeAgent
            };

            // Update with the partial response
            updateAgentState(activeAgent, {
              messages: [...messages, partialMessage],
              isTyping: false,
              loadingState: undefined,
              currentTool: undefined,
              isStreaming: false,
              abortController: undefined
            });

            // Save the interrupted partial response to database
            // Note: For regeneration with legacy format, we need to manually save partial responses
            try {
              if (conversationId) {
                await chatAPI.saveMessage(conversationId, {
                  id: messageId,
                  role: 'assistant',
                  parts: [{ type: 'text', text: aiResponse.trim() }]
                });
                
                console.log(`Saved interrupted AI response (${aiResponse.trim().length} chars) to database`);
              }
            } catch (saveError) {
              console.error('Failed to save interrupted AI response to backend:', saveError);
              // Don't show error to user for this, as the message is visible in UI
            }
          } else {
            // No partial response, just clean up state
            updateAgentState(activeAgent, {
              isTyping: false,
              loadingState: undefined,
              currentTool: undefined,
              isStreaming: false,
              abortController: undefined
            });
          }
          
          return; // Don't throw the error further, we've handled it
        }
        throw streamError;
      }

      // Ensure minimum loading time has passed before completing
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
      }

      // Final update when streaming is complete
      const finalAiMessage: ChatMessage = {
        id: messageId,
        content: aiResponse,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: activeAgent
      };

      updateAgentState(activeAgent, {
        messages: [...messages, finalAiMessage],
        isTyping: false,
        isStreaming: false,
        abortController: undefined,
        loadingState: undefined,
        currentTool: undefined
      });

      // Save the final complete AI response to backend (using legacy format requires manual save)
      try {
        if (conversationId) {
          await chatAPI.saveMessage(conversationId, {
            id: finalAiMessage.id,
            role: 'assistant',
            parts: [{ type: 'text', text: aiResponse }]
          });
        }
      } catch (saveError) {
        console.error('Failed to save AI response to backend:', saveError);
        // Don't show error to user for this, as the message is visible in UI
      }

    } catch (error) {
      console.error('Failed to regenerate conversation:', error);
      
      // Show error message to user
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'Sorry, I encountered an error while regenerating the response. Please try again.',
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: activeAgent
      };

      updateAgentState(activeAgent, {
        messages: [...messages, errorMessage],
        isTyping: false,
        isStreaming: false,
        abortController: undefined,
        loadingState: undefined,
        currentTool: undefined
      });
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

  const handleConfirmation = async (messageId: string, accepted: boolean) => {
    const currentState = agentStates[activeAgent];
    
    // Mark this message as confirmed
    const newConfirmedMessages = new Set(currentState.confirmedMessages);
    newConfirmedMessages.add(messageId);
    
    const newPendingConfirmations = new Set(currentState.pendingConfirmations);
    newPendingConfirmations.delete(messageId);
    
    updateAgentState(activeAgent, {
      confirmedMessages: newConfirmedMessages,
      pendingConfirmations: newPendingConfirmations
    });

    // Send the confirmation response as a user message
    const confirmationMessage = accepted ? "Yes, please proceed." : "No, please don't proceed.";

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: confirmationMessage,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };

    // Add user message and trigger AI response
    updateAgentState(activeAgent, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      loadingState: 'thinking'
    });

    // Send to AI for response (similar to regular sendMessage logic)
    await sendConfirmationResponse(userMessage);
  };

  // File handling functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    console.log('File input changed, files:', files);
    if (files && files.length > 0) {
      console.log('Setting files for agent:', activeAgent, files);
      updateAgentState(activeAgent, { files: files });
    }
  };

  const handleFileDrop = (files: FileList) => {
    if (files && files.length > 0) {
      updateAgentState(activeAgent, { files: files });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileDrop(files);
    }
  };

  const removeFile = (index: number) => {
    const currentFiles = agentStates[activeAgent].files;
    if (currentFiles) {
      const newFiles = Array.from(currentFiles).filter((_, i) => i !== index);
      const fileList = new DataTransfer();
      newFiles.forEach((file: File) => fileList.items.add(file));
      updateAgentState(activeAgent, { files: fileList.files.length > 0 ? fileList.files : undefined });
    }
  };

  const convertFilesToDataURLs = async (files: FileList): Promise<Array<{ type: string; mediaType: string; url: string }>> => {
    const fileParts: Array<{ type: string; mediaType: string; url: string }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        
        fileParts.push({
          type: 'file',
          mediaType: file.type || 'application/octet-stream',
          url: dataUrl
        });
      } catch (error) {
        console.error('Failed to convert file to data URL:', error);
      }
    }
    
    return fileParts;
  };

  const sendConfirmationResponse = async (userMessage: ChatMessage) => {
    const currentState = agentStates[activeAgent];
    
    try {
      // Create abort controller for this request
      const abortController = new AbortController();
      const apiEndpoint = getApiEndpoint(activeAgent);
      
      // Update state with abort controller
      updateAgentState(activeAgent, {
      isStreaming: true,
      abortController: abortController
    });

      // Create or use existing conversation ID
      const conversationId = currentConversationId || nanoid();
      if (!currentConversationId) {
        setCurrentConversationId(conversationId);
        
        // Upsert conversation in backend
        await chatAPI.upsertConversation({
          id: conversationId,
          agent_type: activeAgent,
          project_id: projectId ? parseInt(projectId, 10) : undefined,
          title: `${AGENTS[activeAgent].name} Chat`
        });
      }

      const userUIMessage: UIMessage = {
        id: userMessage.id,
        role: 'user',
        parts: [{ type: 'text', text: userMessage.content }]
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: conversationId,
          message: userUIMessage,
          projectId: projectId ? parseInt(projectId, 10) : null,
          selectedModel: currentState.selectedModel,
          webSearchEnabled
        }),
        signal: abortController.signal,
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
          agentType: activeAgent
        };

        updateAgentState(activeAgent, {
          messages: [...currentState.messages, userMessage, agentMessage],
          isTyping: false,
          loadingState: undefined,
          currentTool: undefined,
          isStreaming: false,
          abortController: undefined
        });
      }
    } catch (error) {
      console.error('Confirmation response error:', error);
      const errorMessage: ChatMessage = {
          id: `agent-${Date.now()}`,
        content: `I apologize, but I encountered an error processing your confirmation.`,
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agentType: activeAgent
        };

        updateAgentState(activeAgent, {
        messages: [...currentState.messages, userMessage, errorMessage],
          isTyping: false,
        loadingState: undefined,
        currentTool: undefined,
          isStreaming: false,
          abortController: undefined
        });
      }
  };

  const sendMessage = async () => {
    const currentState = agentStates[activeAgent];
    if (!currentState.inputValue.trim() && !currentState.files?.length) return;

    // Generate message ID early to avoid scoping issues
    const userMessageId = `user-${Date.now()}`;
    
    // Create abort controller for this request
    const abortController = new AbortController();
    const messageContent = currentState.inputValue.trim();
    const messageFiles = currentState.files;

    // Show user message immediately with file previews (non-blocking)
    let fileParts: Array<{ type: string; mediaType: string; url: string }> = [];
    if (messageFiles && messageFiles.length > 0) {
      try {
        fileParts = await convertFilesToDataURLs(messageFiles);
      } catch (e) {
        console.warn('Failed to convert files to data URLs', e);
      }
    }

    const userMessage: ChatMessage = {
      id: userMessageId,
      content: messageContent,
      timestamp: new Date().toISOString(),
      sender: 'user',
      parts: [{ type: 'text', text: messageContent }], // Only text in parts
      sessionData: fileParts.length > 0 ? { fileParts } : undefined // Files in session data
    };

    // Clear input and add user message immediately
    updateAgentState(activeAgent, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      inputValue: '',
      files: undefined,
      isStreaming: true,
      abortController: abortController,
      loadingState: webSearchEnabled ? 'searching' : 'thinking'
    });

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Start file upload in parallel while showing message
      let uploadPromise: Promise<string | null> = Promise.resolve(null);
      if (messageFiles && messageFiles.length > 0) {
        uploadPromise = (async () => {
          try {
            const form = new FormData();
            Array.from(messageFiles).forEach((f: File) => form.append('files', f));
            const res = await fetch('/api/uploads/temp', { method: 'POST', body: form });
            if (res.ok) {
              const data = await res.json();
              console.log(`ChatWidget - Upload completed with ID: ${data.uploadId}`);
              return data.uploadId;
            }
          } catch (e) {
            console.warn('ChatWidget - Temp upload error', e);
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
      } else if (messageFiles && messageFiles.length > 0) {
        console.warn('ChatWidget - Files were selected but upload failed');
      }

      // Create or use existing conversation ID
      const conversationId = currentConversationId || nanoid();
      if (!currentConversationId) {
        setCurrentConversationId(conversationId);
        
        // Upsert conversation in backend
        await chatAPI.upsertConversation({
          id: conversationId,
          agent_type: activeAgent,
          project_id: projectId ? parseInt(projectId, 10) : undefined,
          title: `${AGENTS[activeAgent].name} Chat`
        });
      }

      // Send message to API
      const apiEndpoint = getApiEndpoint(activeAgent);
      const userUIMessage: any = {
        id: userMessage.id,
        role: 'user',
        // Include the same parts we show in UI, which may contain the upload marker
        parts: userMessage.parts
      };
      // Provide uploadId on the message object for routes that read it directly
      if (uploadId) {
        userUIMessage.uploadId = uploadId;
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: conversationId,
          message: userUIMessage,
          projectId: projectId ? parseInt(projectId, 10) : null,
          selectedModel: currentState.selectedModel,
          webSearchEnabled
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Get the backend-generated message ID from response headers
      const backendMessageId = response.headers.get('X-Message-ID');
      const originalMessageId = response.headers.get('X-Original-Message-ID');
      
      // Keep minimal logging for production debugging if needed
      if (backendMessageId && originalMessageId && backendMessageId !== originalMessageId) {
        console.log('ChatWidget - Syncing message ID:', originalMessageId, '→', backendMessageId);
      }
      
      // Update the user message ID in state if we got a new ID from backend
      if (backendMessageId && originalMessageId && backendMessageId !== originalMessageId) {
        // Get the current messages (which includes the user message we just added)
        const currentMessages = agentStates[activeAgent].messages;
        updateAgentState(activeAgent, {
          messages: currentMessages.map(msg => 
            msg.id === originalMessageId ? { ...msg, id: backendMessageId } : msg
          )
        });
        
        // Also update the userMessage reference for consistency
        userMessage.id = backendMessageId;
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream received');
      }

      const decoder = new TextDecoder();
      let aiResponse = '';
      let messageId = `agent-${Date.now()}`;
      let hasStartedGenerating = false;
      const startTime = Date.now();
      const MIN_LOADING_TIME = 800; // Minimum loading time to prevent flashing

      // Set initial loading state with delay for short responses
      setTimeout(() => {
        if (!hasStartedGenerating && !abortController.signal.aborted) {
          updateAgentState(activeAgent, {
            loadingState: 'thinking'
          });
        }
      }, 500);

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
                    updateAgentState(activeAgent, {
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
                      updateAgentState(activeAgent, {
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
              updateAgentState(activeAgent, {
                isTyping: true,
                loadingState: 'generating'
              });
            }
          }
          
          aiResponse += chunk;
          
          // Update the agent message in real-time during streaming
          const aiMessage: ChatMessage = {
            id: messageId,
            content: aiResponse,
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: activeAgent
          };

          // Check if this agent message contains a confirmation request
          const needsConfirmation = isConfirmationRequest(aiMessage.content);
          const newPendingConfirmations = needsConfirmation 
            ? new Set([...(currentState.pendingConfirmations || new Set()), aiMessage.id])
            : currentState.pendingConfirmations;

          // Update messages with the streaming content
          updateAgentState(activeAgent, {
            messages: [...currentState.messages, userMessage, aiMessage],
            isTyping: true,
            loadingState: hasStartedGenerating ? 'generating' : (webSearchEnabled ? 'searching' : 'thinking'),
            pendingConfirmations: newPendingConfirmations
          });
        }
        
        // Stream completed successfully - ensure final state cleanup
        console.log('ChatWidget stream completed, performing final cleanup');
        
        // Make sure we have a final message if we received any content
        if (aiResponse.trim()) {
          const finalMessage: ChatMessage = {
            id: messageId,
            content: aiResponse.trim(),
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: activeAgent
          };

          const needsConfirmation = isConfirmationRequest(finalMessage.content);
          const finalPendingConfirmations = needsConfirmation 
            ? new Set([...(currentState.pendingConfirmations || new Set()), finalMessage.id])
            : currentState.pendingConfirmations;

          updateAgentState(activeAgent, {
            messages: [...currentState.messages, userMessage, finalMessage],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined,
            pendingConfirmations: finalPendingConfirmations
          });
          
          // Save the final message to database
          try {
            await chatAPI.saveMessage(conversationId, {
              id: messageId,
              role: 'assistant',
              parts: [{ type: 'text', text: finalMessage.content }]
            });
            console.log(`ChatWidget saved final AI response (${finalMessage.content.length} chars) to database`);
          } catch (saveError) {
            console.warn('Failed to save final AI message to database:', saveError);
          }
        } else {
          // No content received, just clean up state
          updateAgentState(activeAgent, {
            messages: [...currentState.messages, userMessage],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            isStreaming: false,
            abortController: undefined
          });
        }
        
      } catch (streamError) {
        // Handle streaming errors (including aborts)
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log('Stream aborted by user, preserving partial response');
          
          // If we have any partial response, save it to database
          // Note: For new persistent format, the API route handles persistence automatically
          // via the onFinish callback, but when aborted, onFinish doesn't run
          // So we need to manually save the partial response
          if (aiResponse.trim()) {
            try {
              await chatAPI.saveMessage(conversationId, {
                id: messageId,
                role: 'assistant',
                parts: [{ type: 'text', text: aiResponse.trim() }]
              });
              
              console.log(`Saved interrupted AI response (${aiResponse.trim().length} chars) to database`);
            } catch (saveError) {
              console.error('Failed to save interrupted AI response to backend:', saveError);
              // Don't show error to user for this, as the message is visible in UI
            }
          }
          
          return; // Don't update state on abort, preserve current state
        }
        throw streamError;
      }

      // Ensure minimum loading time has passed before completing
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsedTime));
      }

      // Final update when streaming is complete
      const finalAiMessage: ChatMessage = {
        id: messageId,
        content: aiResponse,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: activeAgent
      };

      // Check if this final message contains a confirmation request
      const needsConfirmation = isConfirmationRequest(finalAiMessage.content);
      const newPendingConfirmations = needsConfirmation 
        ? new Set([...(currentState.pendingConfirmations || new Set()), finalAiMessage.id])
        : currentState.pendingConfirmations;

      updateAgentState(activeAgent, {
        messages: [...currentState.messages, userMessage, finalAiMessage],
        isTyping: false,
        isStreaming: false,
        abortController: undefined,
        loadingState: undefined,
        currentTool: undefined,
        pendingConfirmations: newPendingConfirmations
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Show error message to user
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: activeAgent
      };

      updateAgentState(activeAgent, {
        messages: [...currentState.messages, userMessage, errorMessage],
        isTyping: false,
        isStreaming: false,
        abortController: undefined,
        loadingState: undefined,
        currentTool: undefined
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!currentState.isTyping) {
        sendMessage();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    
    updateAgentState(activeAgent, { inputValue: textarea.value });
  };

  const currentAgent = AGENTS[activeAgent];
  const currentState = agentStates[activeAgent];
  const AgentIcon = getAgentIcon(activeAgent);

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-full max-w-[calc(100vw-2rem)] sm:w-96 sm:max-w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-visible flex flex-col ${
              isMinimized ? 'h-16' : 'h-[min(600px,calc(100vh-6rem))] sm:h-[min(600px,calc(100vh-8rem))] max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-8rem)]'
            }`}
          >
            {/* Header */}
            <div className={`${!isMinimized ? 'border-b border-gray-200 dark:border-gray-700' : ''} p-4 flex-shrink-0`}>
              {isMinimized ? (
                /* Minimized State - Clickable to expand */
                <div 
                  onClick={minimizeChat}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -m-4 p-4 rounded-xl transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-8 h-8 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                      <AgentIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currentAgent.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        AI Assistant
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Full Page Link Button */}
                    {projectId && (
                      <Link
                        href={`/project/${projectId}/ai-chat`}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeChat();
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors group"
                        title="Open full-page AI chat"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </Link>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        closeChat();
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Expanded State */
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Agent Selector Dropdown */}
                    <div className="relative agent-dropdown">
                      <button
                        onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className={`w-5 h-5 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                        <AgentIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-left">
                          <div className="text-xs font-medium text-gray-900 dark:text-white">
                          {currentAgent.name}
                          </div>
                        </div>
                        <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </button>

                      {/* Agent Dropdown Menu */}
                      {showAgentDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 max-w-[calc(100vw-4rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          {Object.values(AGENTS).map((agent) => {
                            const IconComponent = getAgentIcon(agent.id);
                            const isActive = activeAgent === agent.id;
                            
                            return (
                              <button
                                key={agent.id}
                                onClick={() => switchAgent(agent.id)}
                                className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center space-x-3 ${
                                  isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                              >
                                <div className={`w-5 h-5 ${agent.color} rounded-lg flex items-center justify-center`}>
                                  <IconComponent className="w-3 h-3 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {agent.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {agent.description}
                        </div>
                      </div>
                                {isActive && <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                              </button>
                            );
                          })}
                    </div>
                      )}
                    </div>

                    {/* Recent Chats Dropdown */}
                    <div className="relative chat-dropdown">
                      <button
                        onClick={() => {
                          const next = !showChatDropdown;
                          setShowChatDropdown(next);
                          if (next) {
                            // Load chats when opening the dropdown
                            loadRecentChats(activeAgent);
                          }
                        }}
                        className="flex items-center space-x-1 px-2 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Recent chats"
                      >
                        <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      </button>

                      {/* Recent Chats Dropdown Menu */}
                      {showChatDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[100]">
                          {/* Header */}
                          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-lg">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              Recent Chats {recentChats.length > 0 && `(${recentChats.length})`}
                            </div>
                          </div>

                          {/* Content with scrolling */}
                          {isLoadingChats ? (
                            <div className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
                              </div>
                            </div>
                          ) : recentChats.length === 0 ? (
                            <div className="p-3 text-center">
                              <div className="text-sm text-gray-600 dark:text-gray-400">No recent chats</div>
                            </div>
                          ) : (
                            <>
                              {/* New Chat Button - Fixed at top */}
                              <button
                                onClick={() => {
                                  // Generate a unique conversation ID for the new chat
                                  const timestamp = Date.now();
                                  const randomSuffix = Math.random().toString(36).substr(2, 9);
                                  const newConversationId = `${activeAgent}-new-${timestamp}-${randomSuffix}`;
                                  
                                  // Set the new conversation ID instead of clearing it
                                  setCurrentConversationId(newConversationId);
                                  updateAgentState(activeAgent, { messages: [] });
                                  setShowChatDropdown(false);
                                }}
                                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 flex items-center space-x-2 sticky top-0 bg-white dark:bg-gray-800 z-10"
                              >
                                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-white">New Chat</span>
                              </button>

                              {/* Scrollable Chat List - Fixed height showing ~5 chats */}
                              <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {recentChats.map((chat) => {
                                    const isSelected = chat.id === currentConversationId;
                                    return (
                                    <div key={chat.id} className={`w-full p-3 transition-colors ${
                                      isSelected 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 dark:border-l-blue-400' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}>
                                      {renamingChatId === chat.id ? (
                                        <div className="flex items-center space-x-2">
                                          <input
                                            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveRenamedChat(chat.id);
                                              if (e.key === 'Escape') cancelRenamingChat();
                                            }}
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => saveRenamedChat(chat.id)}
                                            className="p-1 text-green-600 hover:text-green-700"
                                            title="Save"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={cancelRenamingChat}
                                            className="p-1 text-gray-500 hover:text-gray-700"
                                            title="Cancel"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-start">
                                          <button
                                            onClick={() => {
                                              loadConversation(chat.id);
                                              setShowChatDropdown(false);
                                            }}
                                            className="flex-1 text-left"
                                          >
                                            <div className="text-sm text-gray-900 dark:text-white truncate">
                                              {chat.title || `${AGENTS[activeAgent].name} Chat`}
                                            </div>
                                          </button>
                                          <div className="flex items-center space-x-1 ml-2 opacity-70">
                                            <button
                                              onClick={() => startRenamingChat(chat.id, chat.title)}
                                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                              title="Rename"
                                            >
                                              <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => deleteChat(chat.id)}
                                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                                              title="Delete"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Full Page Link Button */}
                    {projectId && (
                      <Link
                        href={`/project/${projectId}/ai-chat`}
                        onClick={closeChat}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors group"
                        title="Open full-page AI chat"
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                      </Link>
                    )}
                    <button
                      onClick={minimizeChat}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={closeChat}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div 
                  className={`flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 relative ${
                    isDragOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Drag Overlay */}
                  {isDragOver && (
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Drop files here to upload
                        </p>
                      </div>
                    </div>
                  )}

                  {currentState.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className={`w-12 h-12 ${currentAgent.color} rounded-full flex items-center justify-center mb-3`}>
                        <AgentIcon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Chat with {currentAgent.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {currentAgent.description}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {currentAgent.expertise.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full text-gray-600 dark:text-gray-300"
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
                          <div className="flex items-start space-x-2 max-w-xs">
                            {message.sender === 'agent' && (
                              <div className={`w-6 h-6 ${currentAgent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <AgentIcon className="w-3 h-3 text-white" />
                              </div>
                            )}
                            
                            <div className="relative">
                              {editingMessageId === message.id ? (
                                /* Edit Mode */
                                <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border-2 border-blue-500" style={{ width: '250px', maxWidth: '90vw' }}>
                                  <textarea
                                    value={editingContent}
                                    onChange={(e) => {
                                      setEditingContent(e.target.value);
                                      // Auto-resize textarea
                                      const textarea = e.target;
                                      textarea.style.height = 'auto';
                                      textarea.style.height = `${Math.max(32, Math.min(textarea.scrollHeight, 120))}px`;
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        saveEditedMessage(message.id);
                                      }
                                    }}
                                    className="w-full bg-transparent text-gray-900 dark:text-white text-xs resize-none border-none outline-none min-h-[32px] overflow-hidden"
                                    placeholder="Edit your message..."
                                    autoFocus
                                    style={{ height: 'auto', minHeight: '32px' }}
                                  />
                                  <div className="flex justify-end space-x-1 mt-1">
                                    <button
                                      onClick={cancelEditingMessage}
                                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => saveEditedMessage(message.id)}
                                      disabled={!editingContent.trim()}
                                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded transition-colors disabled:cursor-not-allowed flex items-center space-x-1"
                                    >
                                      <Send className="w-3 h-3" />
                                      <span>Send</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Normal Message Display */
                                <>
                                  <div
                                    className={`px-3 py-2 rounded-lg text-base ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                              }`}
                            >
                                      {/* File Previews for User Messages */}
                                      {message.sender === 'user' && message.sessionData?.fileParts && message.sessionData.fileParts.length > 0 && (
                                        <div className="mb-3 space-y-2">
                                          {message.sessionData.fileParts.map((filePart: any, index: number) => (
                                            <div key={index} className="relative">
                                              {filePart.mediaType?.startsWith('image/') ? (
                                                <img
                                                  src={filePart.url}
                                                  alt="Uploaded image"
                                                  className="max-w-full h-auto rounded-lg border border-white/20"
                                                  style={{ maxHeight: '200px' }}
                                                />
                                              ) : (
                                                <div className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg">
                                                  <Upload className="w-4 h-4 text-white/80" />
                                                  <span className="text-sm text-white/90">
                                                    Uploaded file ({filePart.mediaType})
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    <div className="prose max-w-none prose-slate dark:prose-invert">
                                      {/* Display text content with markdown rendering */}
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
                                            <li key={index} className="ml-4 text-sm">
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
                                            <li key={index} className="ml-4 text-sm">
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
                                            <h3 key={index} className="text-base font-semibold mt-1 mb-1">
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
                                            <h2 key={index} className="text-base font-semibold mt-1 mb-1">
                                              {processedParts.map((part, partIndex) => 
                                                typeof part === 'string' ? 
                                                  <span key={partIndex} dangerouslySetInnerHTML={{ __html: part.replace('## ', '') }} /> : 
                                                  part
                                              )}
                                            </h2>
                                          );
                                        }
                                        
                                        return (
                                          <p key={index} className="mb-1 text-sm">
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
                                  <div className="flex space-x-2 mt-2 justify-center text-sm">
                                      <button
                                        onClick={() => handleConfirmation(message.id, true)}
                                        className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Accept</span>
                                      </button>
                                      <button
                                        onClick={() => handleConfirmation(message.id, false)}
                                        className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                                      >
                                        <XCircle className="w-3 h-3" />
                                        <span>Decline</span>
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Action Buttons - Show below message on hover */}
                                  {editingMessageId !== message.id && (
                                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1 mt-1 text-sm ${
                                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                                    }`}>
                                      {/* Edit Button - Only show for user messages */}
                                      {message.sender === 'user' && (
                                        <button
                                          onClick={() => startEditingMessage(message.id, message.content)}
                                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                          title="Edit message"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                      
                                      {/* Copy Button */}
                                      <button
                                        onClick={() => copyToClipboard(message.id, message.content)}
                                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                        title="Copy message"
                                      >
                                        {copiedMessageId === message.id ? (
                                          <Check className="w-3 h-3" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            
                            {message.sender === 'user' && (
                              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <User className="w-3 h-3 text-white" />
                              </div>
                            )}
                      </div>
                    </div>
                  ))}

                      {currentState.isTyping && (
                    <div className="flex justify-start">
                          <div className="flex items-start space-x-2">
                            <div className={`w-6 h-6 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                              <AgentIcon className="w-3 h-3 text-white" />
                            </div>
                            <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm">
                              <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                  {getLoadingMessage(currentState.loadingState, currentState.currentTool)}
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

                {/* File Previews */}
                {currentState.files && currentState.files.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                    <div className="flex flex-wrap gap-2">
                      {Array.from(currentState.files).map((file: File, index: number) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Remove file"
                          >
                            <X className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
                  {/* Integrated Input Field with Buttons */}
                  <div 
                    className={`relative flex items-center rounded-2xl border-0 transition-colors ${
                      isDragOver 
                        ? 'bg-blue-100 dark:bg-blue-800/30 border-2 border-dashed border-blue-400' 
                        : 'bg-gray-100 dark:bg-gray-700 focus-within:bg-gray-200 dark:focus-within:bg-gray-600'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
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
                        <div className="absolute bottom-full left-0 mb-2 w-48 max-w-[calc(100vw-4rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                          {/* Upload File Option */}
                          <button
                            onClick={() => {
                              console.log('Upload button clicked, fileInputRef:', fileInputRef.current);
                              fileInputRef.current?.click();
                              setShowPlusDropdown(false);
                            }}
                            className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg flex items-center space-x-3"
                          >
                            <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-white">Upload file</span>
                          </button>

                          {/* Web Search Option */}
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
                        </div>
                      )}
                    </div>

                    
                    {/* Text Input */}
                    <textarea
                      ref={inputRef}
                      value={currentState.inputValue}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask ${currentAgent.name} anything...`}
                      className="flex-1 px-3 py-3 bg-transparent text-base text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-0 focus:outline-none resize-none min-h-[48px] max-h-32 overflow-y-auto"
                      rows={1}
                    />
                    
                    {/* Send Button */}
                    {/* Send/Stop Button */}
                    {(currentState.isStreaming || currentState.isTyping || currentState.loadingState) ? (
                      <button
                        onClick={() => stopGeneration(activeAgent)}
                        className="p-2 m-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                        title="Stop generation"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={sendMessage}
                        disabled={(!currentState.inputValue.trim() && !currentState.files?.length) || currentState.isTyping}
                        className="p-2 m-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center"
                        title="Send message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;