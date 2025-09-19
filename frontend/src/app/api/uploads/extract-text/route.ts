import gateway from '@/lib/ai-gateway';
import { generateText, convertToModelMessages, type UIMessage } from 'ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

function isSupported(mediaType: string): boolean {
  return mediaType.startsWith('image/') || mediaType === 'application/pdf';
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const entries = form.getAll('files');
    const files = entries.filter((e): e is File => e instanceof File);

    if (files.length === 0) {
      return new Response('No files provided', { status: 400 });
    }

    // If no AI Gateway key is configured, return empty extracted text but keep flow working
    if (!process.env.AI_GATEWAY_API_KEY) {
      const empty = files.map(f => ({ name: f.name, mediaType: f.type || 'application/octet-stream', text: '' }));
      return Response.json({
        combinedText: '',
        files: empty.map(r => ({
          name: r.name,
          mediaType: r.mediaType,
          text: r.text,
          chars: 0,
        })),
      }, { status: 200 });
    }

    const results: Array<{ name: string; mediaType: string; text: string }> = [];

    for (const file of files) {
      const mediaType = file.type || 'application/octet-stream';
      if (!isSupported(mediaType)) {
        return new Response(`Unsupported media type: ${mediaType}`, { status: 415 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${mediaType};base64,${base64}`;

      const system = 'Extract only the plaintext from the provided input. Do not describe visuals or layout.';

      const userMessage: UIMessage = {
        id: 'u1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Extract the raw plaintext content.' },
          { type: 'file', mediaType, url: dataUrl } as any,
        ],
      };

      const { text } = await generateText({
        model: gateway('openai/gpt-5-mini'),
        system,
        messages: convertToModelMessages([userMessage]),
        temperature: 0,
      });

      results.push({ name: file.name, mediaType, text: text.trim() });
    }

    const combinedText = results.map(r => `Extracted from ${r.name}:\n${r.text}`).join('\n\n');

    return Response.json({
      combinedText,
      files: results.map(r => ({
        name: r.name,
        mediaType: r.mediaType,
        text: r.text,
        chars: r.text.length,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Extraction failed: ${message}`, { status: 500 });
  }
}


