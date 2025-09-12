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
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { Agent, AgentType, ChatMessage } from '@/types/chat';

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

interface AIChatProps {
  projectId: string;
}

interface AgentChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  inputValue: string;
}

const AIChat: React.FC<AIChatProps> = ({ projectId }) => {
  const [activeAgent, setActiveAgent] = useState<AgentType>('product-owner');
  const [agentStates, setAgentStates] = useState<Record<AgentType, AgentChatState>>({
    'product-owner': { messages: [], isTyping: false, inputValue: '' },
    'scrum-master': { messages: [], isTyping: false, inputValue: '' },
    'developer': { messages: [], isTyping: false, inputValue: '' }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Record<AgentType, HTMLInputElement | null>>({
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
    // Focus input when switching agents
    const inputRef = inputRefs.current[activeAgent];
    if (inputRef) {
      inputRef.focus();
    }
  }, [activeAgent]);

  const updateAgentState = (agentType: AgentType, updates: Partial<AgentChatState>) => {
    setAgentStates(prev => ({
      ...prev,
      [agentType]: { ...prev[agentType], ...updates }
    }));
  };

  const sendMessage = async (agentType: AgentType) => {
    const currentState = agentStates[agentType];
    if (!currentState.inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: currentState.inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };

    // Add user message and clear input
    updateAgentState(agentType, {
      messages: [...currentState.messages, userMessage],
      isTyping: true,
      inputValue: ''
    });

    if (agentType === 'product-owner' || agentType === 'scrum-master') {
      // Use real AI for Product Owner and Scrum Master
      const apiEndpoint = agentType === 'product-owner' ? '/api/chat/product-owner' : '/api/chat/scrum-master';
      
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...currentState.messages, userMessage].map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiResponse += chunk;
          
          // Update the agent message in real-time
          const agentMessage: ChatMessage = {
            id: messageId,
            content: aiResponse,
            timestamp: new Date().toISOString(),
            sender: 'agent',
            agentType: agentType
          };

          updateAgentState(agentType, {
            messages: [...currentState.messages, userMessage, agentMessage],
            isTyping: false
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
          isTyping: false
        });
      }
    } else {
      // Use mock responses for other agents
      setTimeout(() => {
        const agentMessage: ChatMessage = {
          id: `agent-${Date.now()}`,
          content: `As your ${AGENTS[agentType].name}, I understand you're asking about "${userMessage.content}". Let me help you with that based on my expertise in ${AGENTS[agentType].expertise.join(', ')}.`,
          timestamp: new Date().toISOString(),
          sender: 'agent',
          agentType: agentType
        };

        updateAgentState(agentType, {
          messages: [...currentState.messages, userMessage, agentMessage],
          isTyping: false
        });
      }, 1500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, agentType: AgentType) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(agentType);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, agentType: AgentType) => {
    updateAgentState(agentType, { inputValue: e.target.value });
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

  const currentAgent = AGENTS[activeAgent];
  const currentState = agentStates[activeAgent];
  const AgentIcon = getAgentIcon(activeAgent);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
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
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportChatHistory(activeAgent)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              disabled={currentState.messages.length === 0}
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => clearChatHistory(activeAgent)}
              className="flex items-center space-x-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors text-sm"
              disabled={currentState.messages.length === 0}
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Agent Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Select Agent
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose an AI assistant to help with your project needs
            </p>
          </div>
          
          <div className="flex-1 p-4 space-y-3">
            {Object.values(AGENTS).map((agent) => {
              const IconComponent = getAgentIcon(agent.id);
              const isActive = activeAgent === agent.id;
              const agentState = agentStates[agent.id];
              const messageCount = agentState.messages.length;
              const lastMessage = agentState.messages[agentState.messages.length - 1];
              
              return (
                <motion.button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                    isActive
                      ? `bg-white dark:bg-white border-current shadow-lg ${agent.accentColor}`
                      : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.color}`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm ${
                          isActive ? agent.accentColor : 'text-gray-900 dark:text-white'
                        }`}>
                          {agent.name}
                        </h3>
                        {messageCount > 0 && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isActive 
                              ? `${agent.color} text-white` 
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}>
                            {messageCount}
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-xs mt-1 ${
                        isActive ? 'text-gray-700 dark:text-gray-700' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {agent.description}
                      </p>
                      
                      {lastMessage && (
                        <p className={`text-xs mt-2 truncate ${
                          isActive ? 'text-gray-600 dark:text-gray-600' : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTimestamp(lastMessage.timestamp)}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.expertise.slice(0, 2).map((skill, index) => (
                          <span
                            key={index}
                            className={`text-xs px-2 py-1 rounded-full ${
                              isActive
                                ? 'bg-gray-100 dark:bg-gray-100 text-gray-700 dark:text-gray-700'
                                : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${currentAgent.color} rounded-lg flex items-center justify-center`}>
                <AgentIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentAgent.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentAgent.description}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start space-x-3 max-w-2xl">
                      {message.sender === 'agent' && (
                        <div className={`w-8 h-8 ${currentAgent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <AgentIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`px-4 py-3 rounded-xl ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-2 ${
                          message.sender === 'user' 
                            ? 'text-blue-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {formatTimestamp(message.timestamp)}
                        </p>
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
                      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-xl">
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
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex space-x-3">
              <input
                ref={(el) => {
                  inputRefs.current[activeAgent] = el;
                }}
                type="text"
                value={currentState.inputValue}
                onChange={(e) => handleInputChange(e, activeAgent)}
                onKeyPress={(e) => handleKeyPress(e, activeAgent)}
                placeholder={`Ask ${currentAgent.name} anything about your project...`}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={currentState.isTyping}
              />
              <button
                onClick={() => sendMessage(activeAgent)}
                disabled={!currentState.inputValue.trim() || currentState.isTyping}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
