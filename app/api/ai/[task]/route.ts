import { NextResponse } from 'next/server';
import { runTask } from '@/lib/ai/run';
import { schemas, type TaskId } from '@/lib/ai/schemas';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ task: string }> }) {
  const { task } = await params;
  if (!(task in schemas)) return NextResponse.json({ error: 'unknown task' }, { status: 404 });
  const body = await req.json();
  const mode = body.mode === 'cached' ? 'cached' : 'live';
  if (!body.input?.cacheKey) return NextResponse.json({ error: 'cacheKey required' }, { status: 400 });
  const result = await runTask(task as TaskId, body.input, mode);
  return NextResponse.json(result);
}

export async function GET() {
  return NextResponse.json({ liveAvailable: !!process.env.ANTHROPIC_API_KEY, fast: process.env.MODEL_FAST || 'claude-haiku-5-5', smart: process.env.MODEL_SMART || 'claude-sonnet-5-5' });
}
