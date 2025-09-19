import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getBaseDir(): string {
  return path.join(os.tmpdir(), 'scrumix-uploads');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response('id required', { status: 400 });
    const uploadDir = path.join(getBaseDir(), id);
    const names = await fs.readdir(uploadDir);
    const files: Array<{ name: string; mediaType: string; dataUrl: string }> = [];
    for (const name of names) {
      const filePath = path.join(uploadDir, name);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;
      const buf = await fs.readFile(filePath);
      const mediaType = name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : `image/${name.split('.').pop()}`;
      const base64 = buf.toString('base64');
      const dataUrl = `data:${mediaType};base64,${base64}`;
      files.push({ name, mediaType, dataUrl });
    }
    return Response.json({ files });
  } catch (err) {
    return new Response('Not found', { status: 404 });
  }
}


