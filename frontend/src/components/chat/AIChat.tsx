'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  History
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Agent, AgentType, ChatMessage, AgentChatState, UIMessage, MessagePart } from '@/types/chat';
import { getAgentModelConfig, AI_MODELS } from '@/lib/ai-gateway';
import { getPreferredModel, setPreferredModel } from '@/lib/model-preferences';
import { hasNativeWebSearch } from '@/lib/tools/web-search';
import { convertFilesToDataURLs, validateFile, formatFileSize, getFileCategory, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, getSupportedFormatsString } from '@/utils/multimodal';
import ModelSelector from './ModelSelector';

// Agent definitions with Scrum-specific roles
const AGENTS: Record<AgentType, Agent> = {
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

const getAgentIcon = (agentType: AgentType) => {
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

interface AgentChatStateWithFiles extends AgentChatState {
  files?: FileList;
  isDragOver?: boolean;
  loadingState?: 'thinking' | 'searching' | 'tool-call' | 'generating';
  currentTool?: string;
  pendingConfirmations?: Set<string>; // Message IDs that need confirmation
  confirmedMessages?: Set<string>; // Message IDs that have been confirmed/declined
}


const AIChat: React.FC<AIChatProps> = ({ projectId }) => {
  const [activeAgent, setActiveAgent] = useState<AgentType>('product-owner');
  const [isClient, setIsClient] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<AgentType, AgentChatStateWithFiles>>({
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
  const inputRefs = useRef<Record<AgentType, HTMLTextAreaElement | null>>({
    'product-owner': null,
    'scrum-master': null,
    'developer': null
  });
  const fileInputRefs = useRef<Record<AgentType, HTMLInputElement | null>>({
    'product-owner': null,
    'scrum-master': null,
    'developer': null
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [agentStates[activeAgent].messages]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Focus input when switching agents
    const inputRef = inputRefs.current[activeAgent];
    if (inputRef) {
      inputRef.focus();
    }
  }, [activeAgent]);

  useEffect(() => {
    // Reset textarea height when input is cleared
    const inputRef = inputRefs.current[activeAgent];
    if (inputRef && !agentStates[activeAgent].inputValue) {
      inputRef.style.height = '48px'; // Reset to min-height
    }
  }, [activeAgent, agentStates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showAgentDropdown) {
        const target = event.target as Element;
        if (!target.closest('.agent-dropdown')) {
          setShowAgentDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAgentDropdown]);

  const updateAgentState = (agentType: AgentType, updates: Partial<AgentChatStateWithFiles>) => {
    setAgentStates(prev => ({
      ...prev,
      [agentType]: { ...prev[agentType], ...updates }
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, agentType: AgentType) => {
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

  const removeFiles = (agentType: AgentType) => {
    updateAgentState(agentType, { files: undefined });
    const fileInput = fileInputRefs.current[agentType];
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDragOverChat = (e: React.DragEvent, agentType: AgentType) => {
    handleDragOver(e);
    if (!agentStates[agentType].isDragOver) {
      updateAgentState(agentType, { isDragOver: true });
    }
  };

  const handleDragEnterChat = (e: React.DragEvent, agentType: AgentType) => {
    handleDragEnter(e);
    updateAgentState(agentType, { isDragOver: true });
  };

  const handleDragLeaveChat = (e: React.DragEvent, agentType: AgentType) => {
    handleDragLeave(e);
    // Only set isDragOver to false if we're leaving the chat area completely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      updateAgentState(agentType, { isDragOver: false });
    }
  };

  const handleDropChat = (e: React.DragEvent, agentType: AgentType) => {
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

  const sendMessage = async (agentType: AgentType) => {
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

    // Add user message and clear input
    updateAgentState(agentType, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      inputValue: '',
      files: undefined,
      loadingState: webSearchEnabled ? 'searching' : 'thinking'
    });

    // Clear file input
    const fileInput = fileInputRefs.current[agentType];
    if (fileInput) {
      fileInput.value = '';
    }

    if (agentType === 'product-owner' || agentType === 'scrum-master' || agentType === 'developer') {
      // Use real AI for Product Owner, Scrum Master, and Developer
      const getApiEndpoint = (type: AgentType) => {
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
        
        // Set initial thinking state after a short delay if web search is not enabled
        if (!webSearchEnabled) {
          setTimeout(() => {
            updateAgentState(agentType, {
              messages: [...currentState.messages, userMessage],
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

          updateAgentState(agentType, {
            messages: [...currentState.messages, userMessage, agentMessage],
            isTyping: false,
            loadingState: undefined,
            currentTool: undefined,
            pendingConfirmations: newPendingConfirmations
          });
        }
      } catch (error) {
        console.error('AI Chat Error:', error);
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
          currentTool: undefined
        });
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, agentType: AgentType) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow line break with Shift + Enter
        return;
      } else {
        // Send message with Enter
      e.preventDefault();
      sendMessage(agentType);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>, agentType: AgentType) => {
    const textarea = e.target;
    
    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`; // max-height: 128px (8rem)
    
    updateAgentState(agentType, { inputValue: textarea.value });
  };

  const clearChatHistory = (agentType: AgentType) => {
    updateAgentState(agentType, { messages: [] });
  };

  const exportChatHistory = (agentType: AgentType) => {
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
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
        return `${agentName} is responding...`;
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
      // Open-ended questions
      /how would you like/i,
      /what would you like/i,
      /which (?:one|option|approach|way)/i,
      /where would you like/i,
      /when would you like/i,
      
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
      /next.*then/i
    ];
    
    // Check if it's a binary question
    const isBinaryQuestion = binaryQuestionPatterns.some(pattern => pattern.test(content));
    
    // Check if it contains exclusion patterns (suggestions/multiple choices)
    const hasExclusions = exclusionPatterns.some(pattern => pattern.test(content));
    
    // Only return true for binary questions without exclusion patterns
    return isBinaryQuestion && !hasExclusions;
  };

  const handleConfirmation = async (agentType: AgentType, messageId: string, accepted: boolean) => {
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

  const sendConfirmationResponse = async (agentType: AgentType, userMessage: ChatMessage) => {
    const currentState = agentStates[agentType];
    const getApiEndpoint = (type: AgentType) => {
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

  const saveEditedMessage = async (agentType: AgentType, messageId: string) => {
    if (!editingContent.trim()) return;

    const currentState = agentStates[agentType];
    const messageIndex = currentState.messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;

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
  };

  const regenerateConversationFromMessage = async (agentType: AgentType, messages: ChatMessage[], editedMessage: ChatMessage) => {
    const getApiEndpoint = (type: AgentType) => {
      switch (type) {
        case 'product-owner': return '/api/chat/product-owner';
        case 'scrum-master': return '/api/chat/scrum-master';
        case 'developer': return '/api/chat/developer';
        default: return '/api/chat/product-owner';
      }
    };

    try {
      const currentState = agentStates[agentType];
      const apiEndpoint = getApiEndpoint(agentType);
      
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
        
        // Update the agent message in real-time
        const agentMessage: ChatMessage = {
          id: messageId,
          content: aiResponse,
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agentType: agentType,
          model: currentState.selectedModel
        };

        updateAgentState(agentType, {
          messages: [...messages, agentMessage],
          isTyping: false,
          loadingState: undefined,
          currentTool: undefined
        });
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
              const messageCount = agentState.messages.length;
              
              return (
                            <button
                  key={agent.id}
                              onClick={() => {
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
                        {messageCount > 0 && (
                                      <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                            {messageCount}
                          </span>
                        )}
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Chat History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your recent conversations with AI agents
            </p>
          </div>
          
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {/* Sample Chat History Items - Frontend only for now */}
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                  <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    User Story Creation
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    Created user story for chatbot functionality with acceptance criteria...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Product Owner</span>
                    <span className="text-xs text-gray-500">2 hours ago</span>
                  </div>
                </div>
              </div>
                      </div>
                      
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Sprint Planning Session
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    Discussed sprint goals and capacity planning for the upcoming iteration...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Scrum Master</span>
                    <span className="text-xs text-gray-500">1 day ago</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Code Review Guidelines
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    Reviewed best practices for code reviews and established team standards...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Developer</span>
                    <span className="text-xs text-gray-500">2 days ago</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                      </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Backlog Refinement
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    Refined backlog items and updated priorities based on stakeholder feedback...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">Product Owner</span>
                    <span className="text-xs text-gray-500">3 days ago</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No more chat history</p>
            </div>
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
            <div className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/40 z-10 flex items-center justify-center">
              <div className="text-center">
                <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-300 mb-2">
                  Drop files to attach
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 max-w-md">
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
                          {/* Display file attachments for multimodal messages */}
                          {message.parts && message.parts.length > 0 && (
                            <div className="mb-3">
                              {message.parts.map((part, partIndex) => {
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
                            <p className={`text-xs mt-1 ${
                          message.sender === 'user' 
                            ? 'text-blue-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatTimestamp(message.timestamp)}
                        </p>
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
            
            <div className="flex items-end space-x-3">
              {/* File Upload Button */}
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
              <button
                onClick={() => fileInputRefs.current[activeAgent]?.click()}
                disabled={currentState.isTyping}
                className="px-3 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center flex-shrink-0"
                title="Attach images or PDFs"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Web Search Toggle Button */}
              {isClient && hasNativeWebSearch(currentState.selectedModel || currentAgent.defaultModel || '') && (
                <button
                  onClick={() => {
                    // Simple toggle - click to enable/disable
                    setWebSearchEnabled(!webSearchEnabled);
                  }}
                  disabled={currentState.isTyping}
                  className={`px-3 py-3 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center flex-shrink-0 ${
                    webSearchEnabled
                      ? 'bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 text-green-600 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400'
                  } ${currentState.isTyping ? 'disabled:bg-gray-300 dark:disabled:bg-gray-600' : ''}`}
                  title={webSearchEnabled 
                    ? "Web search enabled - click to disable" 
                    : "Web search disabled - click to enable"
                  }
                >
                  <Globe className="w-4 h-4" />
                </button>
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
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[48px] max-h-32 overflow-y-auto"
                disabled={currentState.isTyping}
                rows={1}
              />
              
              {/* Send Button */}
              <button
                onClick={() => sendMessage(activeAgent)}
                disabled={(!currentState.inputValue.trim() && !currentState.files?.length) || currentState.isTyping}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex items-center space-x-2 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
