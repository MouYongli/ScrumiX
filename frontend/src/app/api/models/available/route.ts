/**
 * API Route to get available models
 * This runs on the server-side where AI Gateway authentication is available
 */

import { NextResponse } from 'next/server';
import { getAvailableModels } from '@/lib/ai-gateway';

export async function GET() {
  try {
    const models = await getAvailableModels();
    
    if (!models?.models) {
      return NextResponse.json({
        success: false,
        error: 'No models available',
        models: []
      });
    }

    // Transform models to our format
    const availableModels = models.models.map(model => ({
      id: model.id,
      name: model.name || model.id.split('/')[1]?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: model.description,
      pricing: model.pricing,
      provider: model.id.split('/')[0]?.charAt(0).toUpperCase() + model.id.split('/')[0]?.slice(1),
      available: true
    }));

    return NextResponse.json({
      success: true,
      models: availableModels,
      count: availableModels.length
    });
    
  } catch (error) {
    console.error('Failed to fetch available models:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      models: []
    }, { status: 500 });
  }
}
