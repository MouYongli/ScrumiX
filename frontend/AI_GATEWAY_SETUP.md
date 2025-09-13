# AI Gateway Setup Guide

This guide explains how to configure the AI Gateway provider in ScrumiX to access multiple AI providers through a single interface.

## Overview

ScrumiX now uses Vercel's AI Gateway to provide unified access to multiple AI providers including:
- OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo)
- Anthropic (Claude 3 Haiku, Sonnet, Opus)
- Google (Gemini Pro)
- xAI (Grok)
- Mistral AI (Small, Medium models)
- And many more...

## Environment Variables

### Required Variables

Copy the following environment variables to your `.env.local` file:

```bash
# AI Gateway API Key (get from Vercel AI Gateway dashboard)
AI_GATEWAY_API_KEY=your_ai_gateway_api_key_here

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### Optional Variables

```bash
# Legacy OpenAI API Key (fallback for backend embedding service)
OPENAI_API_KEY=your_openai_api_key_here

# Development settings
DEBUG_AI_GATEWAY=false
NODE_ENV=development

# Model overrides for testing
AI_MODEL_CHAT=openai/gpt-4o-mini
AI_MODEL_ANALYSIS=openai/gpt-4o
AI_MODEL_CREATIVE=anthropic/claude-3-sonnet
```

## Setup Instructions

### 1. Get AI Gateway API Key

1. Go to [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)
2. Create an account or sign in
3. Create a new AI Gateway project
4. Copy your API key from the dashboard

### 2. Configure Environment

Create a `.env.local` file in the `frontend/` directory:

```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 3. Using OIDC Authentication (Vercel Deployments)

When deployed to Vercel, you can use OIDC authentication instead of API keys:

1. **Production/Preview**: Authentication is automatic
2. **Local Development**: 
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Authenticate
   vercel login
   
   # Pull environment variables (includes OIDC token)
   vercel env pull
   
   # Start with automatic token refresh
   vercel dev
   ```

## Model Configuration

The AI Gateway is configured with the following models for different use cases:

### Agent-Specific Models

- **Product Owner**: `openai/gpt-4o-mini` (cost-efficient for backlog management)
- **Scrum Master**: `openai/gpt-4o` (enhanced analysis for sprint monitoring)
- **Developer**: `openai/gpt-4o-mini` (balanced for technical guidance)

### Available Models

```typescript
export const AI_MODELS = {
  CHAT: 'openai/gpt-4o-mini',           // General chat
  ANALYSIS: 'openai/gpt-4o',            // Complex analysis
  CREATIVE: 'anthropic/claude-3-sonnet', // Creative responses
  FAST: 'openai/gpt-3.5-turbo',        // Fastest responses
  
  // Alternative providers
  ANTHROPIC_HAIKU: 'anthropic/claude-3-haiku',
  ANTHROPIC_SONNET: 'anthropic/claude-3-sonnet',
  GOOGLE_GEMINI: 'google/gemini-pro',
  XAI_GROK: 'xai/grok-beta',
  MISTRAL_SMALL: 'mistral/mistral-small',
};
```

## Features

### Dynamic Model Discovery

```typescript
import { getAvailableModels } from '@/lib/ai-gateway';

const models = await getAvailableModels();
console.log(models.models); // List all available models with pricing
```

### Provider-Specific Options

```typescript
import { streamText } from 'ai';
import { AI_MODELS } from '@/lib/ai-gateway';

const result = await streamText({
  model: AI_MODELS.CREATIVE,
  messages: [...],
  providerOptions: {
    anthropic: {
      thinking: { type: 'enabled', budgetTokens: 12000 }
    }
  }
});
```

### Health Checking

```typescript
import { checkGatewayHealth } from '@/lib/ai-gateway';

const health = await checkGatewayHealth();
console.log(health.healthy, health.modelCount);
```

## Migration from Direct Providers

The application has been updated to use AI Gateway instead of direct provider imports:

### Before
```typescript
import { createOpenAI } from '@ai-sdk/openai';
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const result = await streamText({ model: openai('gpt-4o-mini'), ... });
```

### After
```typescript
import { getAgentModelConfig } from '@/lib/ai-gateway';
const modelConfig = getAgentModelConfig('product-owner');
const result = await streamText({ model: modelConfig.model, ... });
```

## Benefits

1. **Unified Interface**: Access multiple providers without installing separate SDKs
2. **Easy Switching**: Change models without code changes
3. **Cost Optimization**: Compare pricing across providers
4. **Automatic Authentication**: OIDC support on Vercel
5. **Observability**: Built-in usage monitoring
6. **Fallback Support**: Graceful degradation if one provider fails

## Troubleshooting

### Common Issues

1. **"AI Gateway API key not configured"**
   - Ensure `AI_GATEWAY_API_KEY` is set in your environment
   - For Vercel deployments, ensure OIDC is properly configured

2. **"Model not found"**
   - Check available models with `getAvailableModels()`
   - Verify the model ID format is correct (`provider/model-name`)

3. **Rate limiting**
   - AI Gateway handles rate limiting across providers
   - Check your usage in the Vercel dashboard

### Debug Mode

Enable debug logging:

```bash
DEBUG_AI_GATEWAY=true
```

This will log model selection, health checks, and provider responses.

## Support

For issues with:
- AI Gateway setup: [Vercel AI Gateway Documentation](https://vercel.com/docs/ai-gateway)
- ScrumiX integration: Check the GitHub issues or create a new one
- Specific providers: Refer to individual provider documentation
