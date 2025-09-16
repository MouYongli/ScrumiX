import { NextRequest } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getBaseDir(): string {
  return path.join(os.tmpdir(), 'scrumix-uploads');
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const entries = form.getAll('files');
    const files = entries.filter((e): e is File => e instanceof File);

    if (files.length === 0) {
      return new Response('No files provided', { status: 400 });
    }

    const uploadId = crypto.randomUUID();
    const baseDir = getBaseDir();
    const uploadDir = path.join(baseDir, uploadId);
    await ensureDir(uploadDir);

    const saved: Array<{ id: string; name: string; mediaType: string; size: number }> = [];

    for (const file of files) {
      const fileName = file.name || 'file';
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      saved.push({ id: uploadId, name: fileName, mediaType: file.type || 'application/octet-stream', size: buffer.length });
    }

    return Response.json({
      uploadId,
      files: saved
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Upload failed: ${message}`, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return new Response('id required', { status: 400 });
    const dir = path.join(getBaseDir(), id);
    await fs.rm(dir, { recursive: true, force: true });
    return new Response(null, { status: 204 });
  } catch (err) {
    return new Response(null, { status: 204 });
  }
}


