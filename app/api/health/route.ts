import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Live-AI check: is a key set, and do both configured models answer? Protected by basic auth like every route.
 *  Sends one tiny request per model (a few tokens). Never returns the key. */
export async function GET() {
  const fast = process.env.MODEL_FAST || 'claude-haiku-5-5';
  const smart = process.env.MODEL_SMART || 'claude-sonnet-5-5';
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ apiKeySet: false, verdict: 'No ANTHROPIC_API_KEY on the server — the app runs on cached outputs only.' });
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const ping = async (model: string) => {
    const t = Date.now();
    try {
      const r = await client.messages.create({ model, max_tokens: 5, messages: [{ role: 'user', content: 'Reply with OK.' }] });
      return { model, ok: true, latencyMs: Date.now() - t, servedBy: r.model };
    } catch (e) {
      return { model, ok: false, latencyMs: Date.now() - t, error: (e as Error).message.slice(0, 300) };
    }
  };
  const [f, s] = await Promise.all([ping(fast), ping(smart)]);
  return NextResponse.json({
    apiKeySet: true, MODEL_FAST: f, MODEL_SMART: s,
    verdict: f.ok && s.ok ? 'Live AI works with both models.' : 'At least one model failed — the app falls back to cached outputs for it. See error.',
  });
}
