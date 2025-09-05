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

// Common responses based on user queries
const getGuideResponse = (userMessage: string): { content: string; quickActions?: QuickAction[] } => {
  const message = userMessage.toLowerCase();
  
  if (message.includes('create') && message.includes('project')) {
    return {
      content: "I'll help you create a new project! Click 'Create Project' below to get started, or I can guide you through the process step by step.",
      quickActions: [QUICK_ACTIONS[0], QUICK_ACTIONS[1]]
    };
  }
  
  if (message.includes('dashboard') || message.includes('overview')) {
    return {
      content: "Your workspace dashboard shows all your projects and recent activity. You can access it anytime from the navigation menu or by clicking below.",
      quickActions: [QUICK_ACTIONS[1]]
    };
  }
  
  if (message.includes('team') || message.includes('member') || message.includes('invite')) {
    return {
      content: "To invite team members, first create a project, then navigate to the project's team section. You can also manage your profile and workspace settings.",
      quickActions: [QUICK_ACTIONS[0], QUICK_ACTIONS[2]]
    };
  }
  
  if (message.includes('help') || message.includes('support') || message.includes('guide')) {
    return {
      content: "I'm here to help! You can find detailed guides in our Help Center, or ask me specific questions about using ScrumiX.",
      quickActions: [QUICK_ACTIONS[3]]
    };
  }
  
  if (message.includes('settings') || message.includes('profile') || message.includes('account')) {
    return {
      content: "You can manage your account settings, profile information, and preferences in the Settings page. Would you like me to take you there?",
      quickActions: [QUICK_ACTIONS[2]]
    };
  }
  
  // Default response
  return {
    content: "Hi! I'm your ScrumiX Guide. I can help you navigate the platform, create projects, understand features, and get you where you need to go. What would you like to do?",
    quickActions: QUICK_ACTIONS.slice(0, 2)
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
  const [guideState, setGuideState] = useState<GuideState>({
    isOpen: false,
    messages: [],
    isTyping: false
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (guideState.isOpen) {
      scrollToBottom();
    }
  }, [guideState.messages, guideState.isOpen]);

  useEffect(() => {
    if (guideState.isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [guideState.isOpen, isMinimized]);

  // Add welcome message when first opened
  useEffect(() => {
    if (guideState.isOpen && guideState.messages.length === 0) {
      const welcomeMessage: GuideMessage = {
        id: `guide-${Date.now()}`,
        content: "👋 Hello! I'm your ScrumiX Guide. I'm here to help you navigate the platform and get things done. What can I help you with today?",
        timestamp: new Date().toISOString(),
        sender: 'guide'
      };
      
      setGuideState(prev => ({
        ...prev,
        messages: [welcomeMessage]
      }));
    }
  }, [guideState.isOpen, guideState.messages.length]);

  const toggleChat = () => {
    setGuideState(prev => ({ ...prev, isOpen: !prev.isOpen }));
    setIsMinimized(false);
  };

  const closeChat = () => {
    setGuideState(prev => ({ ...prev, isOpen: false }));
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized(!isMinimized);
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: GuideMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };

    setGuideState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true
    }));

    setInputValue('');

    // Get guide response
    setTimeout(() => {
      const response = getGuideResponse(userMessage.content);
      
      const guideMessage: GuideMessage = {
        id: `guide-${Date.now()}`,
        content: response.content,
        timestamp: new Date().toISOString(),
        sender: 'guide'
      };

      setGuideState(prev => ({
        ...prev,
        messages: [...prev.messages, guideMessage],
        isTyping: false
      }));
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.action === 'navigate' && action.target) {
      window.location.href = action.target;
    }
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

  return (
    <>
      {/* Guide Chat Button */}
      <AnimatePresence>
        {!guideState.isOpen && (
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
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-2 h-2 text-white" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Guide Chat Window */}
      <AnimatePresence>
        {guideState.isOpen && (
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
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
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
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      Here to help you navigate and get started
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
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
            </div>

            {/* Chat Messages */}
            {!isMinimized && (
              <>
                <div className="h-80 overflow-y-auto p-4 space-y-4">
                  {guideState.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex items-start space-x-3 max-w-sm">
                        {message.sender === 'guide' && (
                          <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Compass className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        <div
                          className={`px-3 py-2 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'user' 
                              ? 'text-indigo-100' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                        
                        {message.sender === 'user' && (
                          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {guideState.isTyping && (
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
                  {guideState.messages.length > 0 && !guideState.isTyping && (
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
                  <div className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about ScrumiX..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!inputValue.trim()}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
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

export default GuideAgent;
