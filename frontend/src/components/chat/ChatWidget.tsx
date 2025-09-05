'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2,
  User,
  Settings,
  Users,
  Code2,
  Sparkles,
  ArrowUp,
  ExternalLink
} from 'lucide-react';
import { Agent, AgentType, ChatMessage, ChatState } from '@/types/chat';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Agent definitions with Scrum-specific roles
const AGENTS: Record<AgentType, Agent> = {
  'product-owner': {
    id: 'product-owner',
    name: 'Product Owner',
    description: 'Helps with backlog management, user stories, and product vision',
    icon: 'User',
    color: 'bg-emerald-500',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    expertise: ['User Stories', 'Backlog Prioritization', 'Acceptance Criteria', 'Stakeholder Management']
  },
  'scrum-master': {
    id: 'scrum-master',
    name: 'Scrum Master',
    description: 'Assists with ceremonies, impediment removal, and process improvement',
    icon: 'Settings',
    color: 'bg-blue-500',
    accentColor: 'text-blue-600 dark:text-blue-400',
    expertise: ['Sprint Planning', 'Daily Standups', 'Retrospectives', 'Impediment Resolution']
  },
  'developer': {
    id: 'developer',
    name: 'Developer',
    description: 'Provides technical guidance, code reviews, and implementation advice',
    icon: 'Code2',
    color: 'bg-purple-500',
    accentColor: 'text-purple-600 dark:text-purple-400',
    expertise: ['Code Review', 'Technical Debt', 'Architecture', 'Best Practices']
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
  const [chatState, setChatState] = useState<ChatState>({
    isOpen: false,
    activeAgent: 'product-owner',
    messages: [],
    isTyping: false
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  
  // Get project ID from current path
  const projectId = pathname?.startsWith('/project/') ? pathname.split('/')[2] : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatState.isOpen) {
      scrollToBottom();
    }
  }, [chatState.messages, chatState.isOpen]);

  useEffect(() => {
    if (chatState.isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [chatState.isOpen, isMinimized, chatState.activeAgent]);

  const toggleChat = () => {
    setChatState(prev => ({ ...prev, isOpen: !prev.isOpen }));
    setIsMinimized(false);
  };

  const closeChat = () => {
    setChatState(prev => ({ ...prev, isOpen: false }));
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  const switchAgent = (agentType: AgentType) => {
    setChatState(prev => ({ ...prev, activeAgent: agentType }));
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));

    setInputValue('');

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        content: `As your ${AGENTS[chatState.activeAgent].name}, I understand you're asking about "${userMessage.content}". Let me help you with that based on my expertise in ${AGENTS[chatState.activeAgent].expertise.join(', ')}.`,
        timestamp: new Date().toISOString(),
        sender: 'agent',
        agentType: chatState.activeAgent
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, agentMessage],
        isTyping: false
      }));
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentAgent = AGENTS[chatState.activeAgent];
  const AgentIcon = getAgentIcon(chatState.activeAgent);

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!chatState.isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          >
            <MessageCircle className="w-6 h-6" />
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-2 h-2 text-white" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {chatState.isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? 'auto' : '600px'
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                    <AgentIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {currentAgent.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      AI Assistant
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-xs">
                      {currentAgent.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Full Page Link Button */}
                  {projectId && (
                    <Link
                      href={`/project/${projectId}/ai-chat`}
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

              {/* Agent Selection Tabs */}
              {!isMinimized && (
                <div className="flex space-x-1 mt-3">
                  {Object.values(AGENTS).map((agent) => {
                    const IconComponent = getAgentIcon(agent.id);
                    const isActive = chatState.activeAgent === agent.id;
                    
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
                        <span className="hidden sm:inline">{agent.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Messages */}
            {!isMinimized && (
              <>
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {chatState.messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className={`w-12 h-12 ${currentAgent.color} rounded-full mx-auto mb-3 flex items-center justify-center`}>
                        <AgentIcon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Chat with {currentAgent.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {currentAgent.description}
                      </p>
                      <div className="flex flex-wrap gap-1 justify-center">
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
                  )}

                  {chatState.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}

                  {chatState.isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                  <div className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Ask ${currentAgent.name} anything...`}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputValue.trim()}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
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
