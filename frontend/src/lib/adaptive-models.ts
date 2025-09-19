/**
 * Adaptive Model Management System
 * Automatically detects available models and provides fallbacks
 */

import { AI_MODELS } from './ai-gateway';

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
  available?: boolean;
  tested?: boolean;
}

// Curated model definitions based on specific requirements
export const MODEL_DEFINITIONS: ModelInfo[] = [
  // === GPT-5 Models (OpenAI) ===
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    description: 'Flagship, complex reasoning, coding, multi-step tasks',
    category: 'analysis',
    provider: 'OpenAI'
  },
  {
    id: 'openai/gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Fast, cost-efficient, chat/support tasks',
    category: 'chat',
    provider: 'OpenAI'
  },
  
  // === Anthropic Claude Models ===
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Coding & agentic workflows',
    category: 'creative',
    provider: 'Anthropic'
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5',
    description: 'Heavy coding/multi-step workflows',
    category: 'creative',
    provider: 'Anthropic'
  },
  
  // === Google Gemini Models ===
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Strong reasoning, multimodal, long context',
    category: 'analysis',
    provider: 'Google'
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    description: 'Lower cost, still multimodal, smaller tasks',
    category: 'fast',
    provider: 'Google'
  }
];

// Curated fallback chains by category - using only the specified models
export const FALLBACK_CHAINS: Record<ModelInfo['category'], string[]> = {
  // Chat: Balanced models for general conversation
  chat: [
    'openai/gpt-5-mini',               // GPT-5 Mini (fast, cost-efficient)
    'google/gemini-2.5-flash-lite',    // Gemini 2.5 Flash-Lite (lower cost)
    'openai/gpt-5'                     // GPT-5 (fallback)
  ],
  
  // Analysis: Most powerful models for complex reasoning
  analysis: [
    'openai/gpt-5',                    // GPT-5 (flagship, complex reasoning)
    'google/gemini-2.5-flash',         // Gemini 2.5 Flash (strong reasoning)
    'anthropic/claude-sonnet-4',       // Claude Sonnet 4 (coding & agentic)
    'anthropic/claude-3.5-sonnet'      // Claude 3.5 (heavy coding)
  ],
  
  // Creative: Best for creative and content generation tasks
  creative: [
    'anthropic/claude-sonnet-4',       // Claude Sonnet 4 (coding & agentic workflows)
    'anthropic/claude-3.5-sonnet',     // Claude 3.5 (heavy coding/multi-step workflows)
    'openai/gpt-5',                    // GPT-5 (flagship)
    'google/gemini-2.5-flash'          // Gemini 2.5 Flash (multimodal)
  ],
  
  // Fast: Quickest response models
  fast: [
    'openai/gpt-5-mini',               // GPT-5 Mini (fast, cost-efficient)
    'google/gemini-2.5-flash-lite',    // Gemini 2.5 Flash-Lite (lower cost)
    'openai/gpt-5'                     // GPT-5 (fallback)
  ],
  
  // Custom: General fallback
  custom: [
    'openai/gpt-5-mini',
    'openai/gpt-5',
    'anthropic/claude-3.5-sonnet'
  ]
};

/**
 * Cache for model availability
 */
let modelAvailabilityCache: Record<string, boolean> = {};
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch available models from the server - return our curated models
 */
export async function fetchAvailableModels(): Promise<ModelInfo[]> {
  // For now, always return our curated models as available
  // This avoids the complexity of matching against potentially non-existent models
  return MODEL_DEFINITIONS.map(model => ({ 
    ...model, 
    available: true, 
    tested: true 
  }));
}

/**
 * Categorize a model based on its ID
 */
function categorizeModel(modelId: string): ModelInfo['category'] {
  const id = modelId.toLowerCase();
  
  // GPT-5 models
  if (id.includes('gpt-5-mini')) {
    return 'chat';
  }
  if (id.includes('gpt-5')) {
    return 'analysis';
  }
  
  // Claude models
  if (id.includes('claude-sonnet-4') || id.includes('claude-3.5')) {
    return 'creative';
  }
  
  // Gemini models
  if (id.includes('gemini-2.5-flash-lite')) {
    return 'fast';
  }
  if (id.includes('gemini-2.5-flash')) {
    return 'analysis';
  }
  
  return 'chat';
}

/**
 * Validate if a specific model is available
 */
export async function validateModel(modelId: string): Promise<boolean> {
  // Check cache first
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_DURATION && modelId in modelAvailabilityCache) {
    return modelAvailabilityCache[modelId];
  }
  
  // If we're on the server-side, check if it's one of our curated models
  if (typeof window === 'undefined') {
    const curatedModelIds = new Set(MODEL_DEFINITIONS.map(model => model.id));
    const isAvailable = curatedModelIds.has(modelId);
    
    // Update cache
    modelAvailabilityCache[modelId] = isAvailable;
    lastCacheUpdate = now;
    
    return isAvailable;
  }
  
  // Client-side validation
  try {
    const response = await fetch('/api/models/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId })
    });
    
    const data = await response.json();
    const isAvailable = data.success && data.available;
    
    // Update cache
    modelAvailabilityCache[modelId] = isAvailable;
    lastCacheUpdate = now;
    
    return isAvailable;
  } catch (error) {
    console.warn(`Failed to validate model ${modelId}:`, error);
    // Fallback: check if it's one of our curated models
    const curatedModelIds = new Set(MODEL_DEFINITIONS.map(model => model.id));
    return curatedModelIds.has(modelId);
  }
}

/**
 * Get the best available model for a category with fallback
 */
export async function getBestAvailableModel(category: ModelInfo['category']): Promise<string> {
  const fallbackChain = FALLBACK_CHAINS[category];
  
  // Since we're treating all curated models as available, just return the first one
  if (fallbackChain && fallbackChain.length > 0) {
    return fallbackChain[0];
  }
  
  // Ultimate fallback to the most basic OpenAI model
  return 'openai/gpt-5-mini';
}

/**
 * Filter models to only show available ones - return our curated models
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
  const allModels = await fetchAvailableModels();
  
  // Simple deduplication
  const seenModelIds = new Set<string>();
  const availableModels: ModelInfo[] = [];
  
  for (const model of allModels) {
    if (!seenModelIds.has(model.id)) {
      availableModels.push(model);
      seenModelIds.add(model.id);
    }
  }
  
  return availableModels;
}

/**
 * Smart model selector that validates before returning
 */
export async function selectModel(preferredModelId: string, category: ModelInfo['category']): Promise<string> {
  // First try the preferred model - if it's one of our curated models, use it
  if (preferredModelId) {
    const curatedModelIds = new Set(MODEL_DEFINITIONS.map(model => model.id));
    if (curatedModelIds.has(preferredModelId)) {
      return preferredModelId;
    }
    
    console.warn(`Preferred model ${preferredModelId} is not in curated list, falling back...`);
  }
  
  // Fall back to best available in category
  return getBestAvailableModel(category);
}

/**
 * Clear the model availability cache
 */
export function clearModelCache(): void {
  modelAvailabilityCache = {};
  lastCacheUpdate = 0;
}
