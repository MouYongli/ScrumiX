'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Zap, Brain, Sparkles, Clock, Info } from 'lucide-react';
import { AI_MODELS } from '@/lib/ai-gateway';
import { getAvailableModels, ModelInfo as AdaptiveModelInfo } from '@/lib/adaptive-models';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    input: number;
    output: number;
  };
  category: 'chat' | 'analysis' | 'creative' | 'fast' | 'custom';
  provider: string;
}

// Predefined model categories with icons and descriptions
const MODEL_CATEGORIES = {
  chat: {
    icon: Zap,
    label: 'Chat',
    description: 'Balanced for general conversation',
    color: 'text-blue-500'
  },
  analysis: {
    icon: Brain,
    label: 'Analysis',
    description: 'Enhanced for complex reasoning',
    color: 'text-purple-500'
  },
  creative: {
    icon: Sparkles,
    label: 'Creative',
    description: 'Optimized for creative tasks',
    color: 'text-pink-500'
  },
  fast: {
    icon: Clock,
    label: 'Fast',
    description: 'Quick responses, lower cost',
    color: 'text-green-500'
  },
  custom: {
    icon: Info,
    label: 'Custom',
    description: 'Other available models',
    color: 'text-gray-500'
  }
};

// Map predefined models to categories
const getModelCategory = (modelId: string): ModelInfo['category'] => {
  if (modelId === AI_MODELS.CHAT) return 'chat';
  if (modelId === AI_MODELS.ANALYSIS) return 'analysis';
  if (modelId === AI_MODELS.CREATIVE) return 'creative';
  if (modelId === AI_MODELS.FAST) return 'fast';
  return 'custom';
};

const getProviderFromModelId = (modelId: string): string => {
  const provider = modelId.split('/')[0];
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

const getModelDisplayName = (modelId: string): string => {
  const parts = modelId.split('/');
  if (parts.length < 2) return modelId;
  
  const modelName = parts[1];
  // Convert model names to more readable format
  return modelName
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  agentType?: string;
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  agentType,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      setLoading(true);
      
      // Get available models using the adaptive system
      const adaptiveModels = await getAvailableModels();
      
      // Convert to our component's format and deduplicate - only curated models
      const modelMap = new Map<string, ModelInfo>();
      
      // Define our curated model IDs for final filtering (excluding Gemini 2.5 Flash and Flash Lite)
      const curatedModelIds = new Set([
        'openai/gpt-5',
        'openai/gpt-5-mini',
        'anthropic/claude-sonnet-4',
        'anthropic/claude-3.5-sonnet'
      ]);
      
      adaptiveModels.forEach(model => {
        // Only include curated models
        if (curatedModelIds.has(model.id) && !modelMap.has(model.id)) {
          modelMap.set(model.id, {
            id: model.id,
            name: model.name,
            description: model.description || `${model.provider} model`,
            category: model.category,
            provider: model.provider,
            pricing: model.pricing
          });
        }
      });

      const modelList: ModelInfo[] = Array.from(modelMap.values());
      setAvailableModels(modelList);
    } catch (error) {
      console.error('Failed to load available models:', error);
      // Fallback to basic curated models only - ensure no duplicates
      const fallbackModels = [
        {
          id: AI_MODELS.CHAT,
          name: 'GPT-5 Mini',
          description: 'Fast, cost-efficient, chat/support tasks',
          category: 'chat' as const,
          provider: 'OpenAI'
        },
        {
          id: AI_MODELS.ANALYSIS,
          name: 'GPT-5',
          description: 'Flagship, complex reasoning, coding, multi-step tasks',
          category: 'analysis' as const,
          provider: 'OpenAI'
        }
      ];
      
      // Deduplicate fallback models too
      const fallbackMap = new Map<string, ModelInfo>();
      fallbackModels.forEach(model => {
        if (!fallbackMap.has(model.id)) {
          fallbackMap.set(model.id, model);
        }
      });
      
      setAvailableModels(Array.from(fallbackMap.values()));
    } finally {
      setLoading(false);
    }
  };

  const selectedModelInfo = availableModels.find(m => m.id === selectedModel) || availableModels[0];
  const CategoryIcon = selectedModelInfo ? MODEL_CATEGORIES[selectedModelInfo.category].icon : Zap;

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[200px]"
        disabled={loading}
      >
        <CategoryIcon className={`w-4 h-4 ${selectedModelInfo ? MODEL_CATEGORIES[selectedModelInfo.category].color : 'text-gray-400'}`} />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {loading ? 'Loading...' : (selectedModelInfo?.name || 'Select Model')}
          </div>
          {selectedModelInfo && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selectedModelInfo.provider} • {MODEL_CATEGORIES[selectedModelInfo.category].label}
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {availableModels.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {model.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {model.provider}
                  </div>
                </div>
                {selectedModel === model.id && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2" />
                )}
              </div>
            </button>
          ))}
          
          {availableModels.length === 0 && !loading && (
            <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
              No models available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
