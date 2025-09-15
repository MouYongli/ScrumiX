'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Globe
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Agent, AgentType, ChatMessage, AgentChatState } from '@/types/chat';
import { getAgentModelConfig, AI_MODELS } from '@/lib/ai-gateway';
import { getPreferredModel, setPreferredModel } from '@/lib/model-preferences';
import { hasNativeWebSearch } from '@/lib/tools/web-search';
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

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentType>('product-owner');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [showPlusDropdown, setShowPlusDropdown] = useState(false);
  const [agentStates, setAgentStates] = useState<Record<AgentType, AgentChatState>>({
    'product-owner': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: getPreferredModel('product-owner')
    },
    'scrum-master': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: getPreferredModel('scrum-master')
    },
    'developer': { 
      messages: [], 
      isTyping: false, 
      inputValue: '', 
      selectedModel: getPreferredModel('developer')
    }
  });
  
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  
  // Get project ID from current path
  const projectId = pathname?.startsWith('/project/') ? pathname.split('/')[2] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const updateAgentState = (agentType: AgentType, updates: Partial<AgentChatState>) => {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showPlusDropdown && !target.closest('.plus-dropdown')) {
        setShowPlusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlusDropdown]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    
    // Clear chat history for all agents
    setAgentStates(prev => {
      const clearedStates: Record<AgentType, AgentChatState> = {} as Record<AgentType, AgentChatState>;
      
      Object.keys(prev).forEach(agentType => {
        const agent = agentType as AgentType;
        clearedStates[agent] = {
          ...prev[agent],
          messages: [],
          isTyping: false,
          inputValue: ''
        };
      });
      
      return clearedStates;
    });
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  const switchAgent = (agentType: AgentType) => {
    setActiveAgent(agentType);
  };

  const sendMessage = async () => {
    const currentState = agentStates[activeAgent];
    if (!currentState.inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: currentState.inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };

    updateAgentState(activeAgent, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      inputValue: ''
    });

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: `Hello! I'm the ${AGENTS[activeAgent].name}. How can I help you today?`,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: activeAgent
      };

      updateAgentState(activeAgent, {
        messages: [...currentState.messages, userMessage, aiMessage],
        isTyping: false
      });
    }, 1000);
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
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
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
            className={`fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col ${
              isMinimized ? 'h-16' : 'h-[600px]'
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
                  <div className="flex items-center space-x-3">
                    {/* Agent Display */}
                    <div className="flex items-center space-x-3 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <div className={`w-6 h-6 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                        <AgentIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {currentAgent.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          AI Assistant
                        </div>
                      </div>
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

              {/* Agent Selection Tabs */}
              {!isMinimized && (
                <div className="flex space-x-1 mt-3">
                  {Object.values(AGENTS).map((agent) => {
                    const IconComponent = getAgentIcon(agent.id);
                    const isActive = activeAgent === agent.id;
                    
                    return (
                      <button
                        key={agent.id}
                        onClick={() => switchAgent(agent.id)}
                        className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 ${
                          isActive
                            ? `bg-white dark:bg-white ${agent.accentColor} border-current shadow-sm`
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        title={agent.description}
                      >
                        <IconComponent className="w-3 h-3" />
                        <span className="text-xs">{agent.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
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
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                          <div className="flex items-start space-x-2 max-w-xs">
                            {message.sender === 'agent' && (
                              <div className={`w-6 h-6 ${currentAgent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <AgentIcon className="w-3 h-3 text-white" />
                              </div>
                            )}
                            
                            <div
                              className={`px-3 py-2 rounded-lg text-sm ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              {message.content}
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
                            <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
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
                              // Handle file upload
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
                      className="flex-1 px-3 py-3 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-0 focus:outline-none resize-none min-h-[48px] max-h-32 overflow-y-auto"
                      rows={1}
                    />
                    
                    {/* Send Button */}
                    <button
                      onClick={sendMessage}
                      disabled={!currentState.inputValue.trim() || currentState.isTyping}
                      className="p-2 m-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center"
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
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