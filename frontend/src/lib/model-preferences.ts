/**
 * Model Preferences Management
 * Handles saving and loading user's preferred AI models for each agent
 */

import { AgentType } from '@/types/chat';
import { AI_MODELS, getAgentModelConfig } from './ai-gateway';

const STORAGE_KEY = 'scrumix_model_preferences';

export interface ModelPreferences {
  [key: string]: string; // AgentType -> ModelId
}

/**
 * Get default model preferences based on agent configurations
 */
export const getDefaultPreferences = (): ModelPreferences => ({
  'product-owner': getAgentModelConfig('product-owner').model,
  'scrum-master': getAgentModelConfig('scrum-master').model,
  'developer': getAgentModelConfig('developer').model,
});

/**
 * Load model preferences from localStorage
 */
export const loadModelPreferences = (): ModelPreferences => {
  if (typeof window === 'undefined') {
    return getDefaultPreferences();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const preferences = JSON.parse(stored) as ModelPreferences;
      
      // Merge with defaults to ensure all agents have a model
      return {
        ...getDefaultPreferences(),
        ...preferences
      };
    }
  } catch (error) {
    console.warn('Failed to load model preferences:', error);
  }

  return getDefaultPreferences();
};

/**
 * Save model preferences to localStorage
 */
export const saveModelPreferences = (preferences: ModelPreferences): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save model preferences:', error);
  }
};

/**
 * Get preferred model for a specific agent
 */
export const getPreferredModel = (agentType: AgentType): string => {
  const preferences = loadModelPreferences();
  return preferences[agentType] || getAgentModelConfig(agentType).model;
};

/**
 * Set preferred model for a specific agent
 */
export const setPreferredModel = (agentType: AgentType, modelId: string): void => {
  const preferences = loadModelPreferences();
  preferences[agentType] = modelId;
  saveModelPreferences(preferences);
};

/**
 * Reset preferences to defaults
 */
export const resetModelPreferences = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Hook for managing model preferences in React components
 */
export const useModelPreferences = () => {
  const getPreferences = () => loadModelPreferences();
  
  const updatePreference = (agentType: AgentType, modelId: string) => {
    setPreferredModel(agentType, modelId);
  };
  
  const resetPreferences = () => {
    resetModelPreferences();
  };
  
  return {
    getPreferences,
    updatePreference,
    resetPreferences,
    getPreferredModel
  };
};
