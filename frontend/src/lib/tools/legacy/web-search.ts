/**
 * Web Search Tools for ScrumiX AI Agents
 * Provides native web search capabilities for OpenAI and Gemini models
 * Following AI SDK 5 patterns from: https://ai-sdk.dev/cookbook/node/web-search-agent
 */

import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

/**
 * Get web search tools based on the model being used and if web search is enabled
 * Returns native search tools for supported models when enabled, empty object otherwise
 */
export function getWebSearchToolsForModel(modelId: string, webSearchEnabled: boolean = true): Record<string, any> {
  // If web search is disabled, return no tools
  if (!webSearchEnabled) {
    return {};
  }

  // OpenAI models get native web search preview
  if (modelId?.startsWith('openai/')) {
    return {
      web_search_preview: openai.tools.webSearchPreview({})
    };
  }
  
  // Google/Gemini models get native Google Search grounding
  if (modelId?.startsWith('google/')) {
    return {
      google_search: google.tools.googleSearch({})
    };
  }
  
  // Other models (like Claude) don't get web search tools yet
  return {};
}

/**
 * Check if a model supports native web search
 */
export function hasNativeWebSearch(modelId: string): boolean {
  return modelId?.startsWith('openai/') || modelId?.startsWith('google/');
}
