'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Minimize2,
  Compass,
  Sparkles,
  ArrowRight,
  Home,
  FolderPlus,
  Users,
  Settings,
  HelpCircle,
  FileText,
  Bell,
  User,
  Layout
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GuideMessage, GuideState, QuickAction } from '@/types/guide';
import { getAgentModelConfig } from '@/lib/ai-gateway';
import { getPreferredModel } from '@/lib/model-preferences';
import type { UIMessage } from 'ai';
import { nanoid } from 'nanoid';

// Quick actions for common tasks
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create-project',
    label: 'Create Project',
    description: 'Start a new Scrum project',
    icon: 'FolderPlus',
    action: 'navigate',
    target: '/project'
  },
  {
    id: 'view-workspace',
    label: 'View Workspace',
    description: 'See all your projects',
    icon: 'Layout',
    action: 'navigate',
    target: '/workspace'
  },
  {
    id: 'profile-settings',
    label: 'Profile Settings',
    description: 'Update your account',
    icon: 'User',
    action: 'navigate',
    target: '/profile'
  },
  {
    id: 'help-center',
    label: 'Help Center',
    description: 'Get support and guides',
    icon: 'HelpCircle',
    action: 'navigate',
    target: '/help'
  }
];

// Convert AI messages to GuideMessage format
const convertToGuideMessage = (message: any, sender: 'user' | 'guide'): GuideMessage => {
  return {
    id: message.id || `${sender}-${Date.now()}`,
    content: message.content || '',
    timestamp: new Date().toISOString(),
    sender
  };
};

const getActionIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    FolderPlus,
    Layout,
    User,
    HelpCircle,
    Settings,
    Home,
    FileText,
    Bell
  };
  return icons[iconName] || HelpCircle;
};

const GuideAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(getPreferredModel('support'));
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const userMessage: UIMessage = {
      id: nanoid(),
      role: 'user',
      parts: [{ type: 'text', text: userInput }]
    };

    // Add user message and clear input
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the support agent API
      const response = await fetch('/api/chat/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
              content: (msg.parts.find(part => part.type === 'text') as any)?.text || ''
            })),
            {
              role: 'user',
              content: userInput
            }
          ],
          selectedModel,
          webSearchEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantMessage: UIMessage = {
        id: nanoid(),
        role: 'assistant',
        parts: [{ type: 'text', text: '' }]
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let aiResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;
        
        // Update the assistant message with the accumulated response
        if (assistantMessage.parts[0].type === 'text') {
          (assistantMessage.parts[0] as any).text = aiResponse;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.role === 'assistant' && lastMessage.parts[0].type === 'text') {
              (lastMessage.parts[0] as any).text = aiResponse;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error('Error calling support agent:', error);
      // Add error message
      const errorMessage: UIMessage = {
        id: nanoid(),
        role: 'assistant',
        parts: [{ type: 'text', text: 'Sorry, I encountered an error. Please try again.' }]
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Add welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add a welcome message to start the conversation
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        parts: [{ 
          type: 'text', 
          text: "👋 Hello! I'm your ScrumiX Support Assistant. I'm here to help you navigate the platform, understand features, and answer any questions about using ScrumiX effectively. What can I help you with today?" 
        }]
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    // Clear messages when closing
    setMessages([]);
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };


  const handleQuickAction = (action: QuickAction) => {
    if (action.action === 'navigate' && action.target) {
      window.location.href = action.target;
    }
  };

  return (
    <>
      {/* Guide Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          >
            <Compass className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Guide Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? 'auto' : '500px'
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Chat Header */}
            <div className={`bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 px-4 py-3 ${
              !isMinimized ? 'border-b border-gray-200 dark:border-gray-600' : ''
            } ${
              isMinimized ? 'cursor-pointer hover:bg-gradient-to-r hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/30 dark:hover:to-blue-900/30 transition-all duration-200' : ''
            }`}
            onClick={isMinimized ? minimizeChat : undefined}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Compass className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      ScrumiX Guide
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Navigation Assistant
                    </p>
                    {!isMinimized && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        Here to help you navigate and get started
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!isMinimized && (
                    <button
                      onClick={minimizeChat}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  )}
                  <button
                    onClick={closeChat}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            {!isMinimized && (
              <>
                <div className="h-80 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex items-start space-x-3 max-w-sm">
                        {message.role === 'assistant' && (
                          <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Compass className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <div
                          className={`px-3 py-2 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {(message.parts.find(part => part.type === 'text') as any)?.text || ''}
                          </p>
                        </div>
                        
                        {message.role === 'user' && (
                          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full flex items-center justify-center">
                          <Compass className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  {messages.length > 0 && !isLoading && (
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Actions:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.slice(0, 4).map((action) => {
                          const IconComponent = getActionIcon(action.icon);
                          return (
                            <button
                              key={action.id}
                              onClick={() => handleQuickAction(action)}
                              className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
                            >
                              <IconComponent className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <div>
                                <p className="text-xs font-medium text-gray-900 dark:text-white">{action.label}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-200 dark:border-gray-600 p-4">
                  <form onSubmit={handleSubmit} className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ask me anything about ScrumiX..."
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GuideAgent;
