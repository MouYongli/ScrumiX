/**
 * API Route to validate if a specific model is available and working
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';

export async function POST(req: NextRequest) {
  try {
    const { modelId } = await req.json();
    
    if (!modelId) {
      return NextResponse.json({
        success: false,
        error: 'Model ID is required'
      }, { status: 400 });
    }

    // Test the model with a simple prompt
    try {
      const result = await generateText({
        model: modelId,
        prompt: 'Hello, please respond with just "OK" to confirm you are working.',
      });

      return NextResponse.json({
        success: true,
        modelId,
        available: true,
        response: result.text,
        usage: result.usage
      });
      
    } catch (modelError) {
      // Model-specific error (likely not available)
      return NextResponse.json({
        success: false,
        modelId,
        available: false,
        error: modelError instanceof Error ? modelError.message : 'Model not available'
      });
    }
    
  } catch (error) {
    console.error('Model validation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
