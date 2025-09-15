/**
 * AI Gateway Configuration for ScrumiX
 * Provides centralized access to multiple AI providers through Vercel's AI Gateway
 */

import { createGateway } from 'ai';

/**
 * AI Gateway provider instance
 * Automatically configured with environment variables
 */
export const gateway = createGateway({
  // API key from environment variable (optional when using OIDC)
  apiKey: process.env.AI_GATEWAY_API_KEY,
  
  // Custom headers for additional configuration
  headers: {
    'X-Application': 'ScrumiX',
    'X-Version': '1.0.0',
  },
  
  // Metadata cache refresh interval (5 minutes)
  metadataCacheRefreshMillis: 5 * 60 * 1000,
});

/**
 * Available AI models through the gateway
 * These can be easily switched without changing code throughout the application
 */
export const AI_MODELS = {
  // Primary models for different use cases - curated set
  CHAT: 'openai/gpt-5-mini',              // Fast, cost-efficient, chat/support tasks
  ANALYSIS: 'openai/gpt-5',               // Flagship, complex reasoning, coding, multi-step tasks
  CREATIVE: 'anthropic/claude-sonnet-4',  // Coding & agentic workflows
  FAST: 'google/gemini-2.5-flash-lite',   // Lower cost, still multimodal, smaller tasks
  
  // Specific curated models
  GPT5: 'openai/gpt-5',                   // Flagship, complex reasoning, coding, multi-step tasks
  GPT5_MINI: 'openai/gpt-5-mini',         // Fast, cost-efficient, chat/support tasks
  CLAUDE_SONNET_4: 'anthropic/claude-sonnet-4',     // Coding & agentic workflows
  CLAUDE_3_5: 'anthropic/claude-3.5-sonnet',        // Heavy coding/multi-step workflows
  GEMINI_FLASH: 'google/gemini-2.5-flash',          // Strong reasoning, multimodal, long context
  GEMINI_FLASH_LITE: 'google/gemini-2.5-flash-lite' // Lower cost, still multimodal, smaller tasks
} as const;

/**
 * Model selection based on use case
 */
export const getModelForUseCase = (useCase: 'chat' | 'analysis' | 'creative' | 'fast') => {
  switch (useCase) {
    case 'chat':
      return AI_MODELS.CHAT;
    case 'analysis':
      return AI_MODELS.ANALYSIS;
    case 'creative':
      return AI_MODELS.CREATIVE;
    case 'fast':
      return AI_MODELS.FAST;
    default:
      return AI_MODELS.CHAT;
  }
};

/**
 * Get available models programmatically
 * This should only be called from server-side code
 * @deprecated Use predefined models in components instead
 */
export const getAvailableModels = async () => {
  try {
    // Only attempt if we have an API key (server-side only)
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.warn('AI Gateway API key not available - this function should only be called server-side');
      return null;
    }
    
    const models = await gateway.getAvailableModels();
    return models;
  } catch (error) {
    console.error('Failed to fetch available models:', error);
    return null;
  }
};

/**
 * Model configuration for different agent types
 */
export const AGENT_MODEL_CONFIG = {
  'product-owner': {
    model: AI_MODELS.CHAT,
    temperature: 0.3,
    description: 'Optimized for backlog management and stakeholder communication'
  },
  'scrum-master': {
    model: AI_MODELS.ANALYSIS,
    temperature: 0.2,
    description: 'Enhanced analysis capabilities for sprint monitoring and coaching'
  },
  'developer': {
    model: AI_MODELS.CHAT,
    temperature: 0.3,
    description: 'Balanced for technical guidance and implementation support'
  }
} as const;

/**
 * Get model configuration for a specific agent
 */
export const getAgentModelConfig = (agentType: keyof typeof AGENT_MODEL_CONFIG) => {
  return AGENT_MODEL_CONFIG[agentType] || AGENT_MODEL_CONFIG['product-owner'];
};

/**
 * Provider options for specific providers when needed
 * These can be used with the providerOptions parameter in AI SDK functions
 */
export const PROVIDER_OPTIONS = {
  anthropic: {
    // Example: Enable thinking mode for complex reasoning
    thinking: { type: 'enabled' as const, budgetTokens: 12000 },
  },
  openai: {
    // Example: Additional OpenAI-specific options
    // These would be passed through to the actual provider
  }
};

/**
 * Utility function to create model instances with gateway
 */
export const createModel = (modelId: string) => {
  return gateway(modelId);
};

/**
 * Health check for AI Gateway connection
 * This should only be called from server-side code
 */
export const checkGatewayHealth = async () => {
  try {
    // Only attempt if we have an API key (server-side only)
    if (!process.env.AI_GATEWAY_API_KEY) {
      return {
        healthy: false,
        error: 'AI Gateway API key not available - health check should only be called server-side',
        timestamp: new Date().toISOString()
      };
    }
    
    // Try to get available models as a health check
    const models = await getAvailableModels();
    return {
      healthy: models !== null,
      modelCount: models?.models?.length || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Export the gateway instance for direct use
 */
export default gateway;
