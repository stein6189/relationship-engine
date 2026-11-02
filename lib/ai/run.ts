import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { schemas, FAST_TASKS, type TaskId } from './schemas';
import { promptIndex } from '../promptIndex';
import { seedCache } from '../seedCache';
import { numberGuard } from '../rules/numberGuard';
import { textOf } from './textFields';
import type { Fact } from '../types';

export interface AiMeta {
  task: TaskId;
  promptId: string;
  promptVersion: string;
  model: string;
  source: 'live' | 'cached' | 'seed';
  fallbackReason?: string;
  latencyMs: number;
  validation: 'valid' | 'retried' | 'failed';
  guard?: { pass: boolean; unsupported: string[]; checked: number };
  timestamp: string;
  cacheKey: string;
}

const TIMEOUT_MS = 20_000;

function modelFor(task: TaskId) {
  return FAST_TASKS.includes(task) ? process.env.MODEL_FAST || 'claude-haiku-5-5' : process.env.MODEL_SMART || 'claude-sonnet-5-5';
}

function parseJson(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no JSON object in response');
  return JSON.parse(text.slice(start, end + 1));
}

function fromCache(task: TaskId, cacheKey: string) {
  return seedCache[`${task}__${cacheKey}`];
}

async function callModel(task: TaskId, input: unknown, signal: AbortSignal) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const p = promptIndex[task];
  const msg = await client.messages.create(
    { model: modelFor(task), max_tokens: 2500, temperature: 0, system: p.system, messages: [{ role: 'user', content: JSON.stringify(input) }] },
    { signal },
  );
  return msg.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

export async function runTask(task: TaskId, input: { cacheKey: string; facts?: Fact[] } & Record<string, unknown>, mode: 'live' | 'cached') {
  const started = Date.now();
  const p = promptIndex[task];
  const base = { task, promptId: task, promptVersion: p?.version ?? 'v1', cacheKey: input.cacheKey, timestamp: new Date().toISOString() };
  const finish = (output: unknown, meta: Omit<AiMeta, 'guard' | 'latencyMs' | keyof typeof base>) => {
    const text = textOf(task, output).trim();
    const g = input.facts && text ? numberGuard(text, input.facts) : undefined;
    const full: AiMeta = { ...base, ...meta, latencyMs: Date.now() - started, guard: g && { pass: g.pass, unsupported: g.unsupported.map((u) => u.raw), checked: g.checked } };
    return { output, meta: full };
  };
  const cachedResult = (reason?: string) => {
    const c = fromCache(task, input.cacheKey);
    if (!c) return null;
    return finish(c.output, { model: c.model, source: c.model.startsWith('seed') ? 'seed' : 'cached', fallbackReason: reason, validation: 'valid' });
  };

  if (mode === 'cached' || !process.env.ANTHROPIC_API_KEY) {
    return cachedResult(mode === 'cached' ? undefined : 'no API key configured') ?? { output: null, meta: { ...base, model: 'none', source: 'cached' as const, latencyMs: 0, validation: 'failed' as const, fallbackReason: 'no cached result' } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let validation: AiMeta['validation'] = 'valid';
    for (let attempt = 0; attempt < 2; attempt++) {
      const text = await callModel(task, input, controller.signal);
      try {
        const parsed = schemas[task].parse(parseJson(text));
        clearTimeout(timer);
        return finish(parsed, { model: modelFor(task), source: 'live', validation });
      } catch {
        validation = 'retried';
      }
    }
    clearTimeout(timer);
    return cachedResult('live output failed validation twice') ?? { output: null, meta: { ...base, model: modelFor(task), source: 'live' as const, latencyMs: Date.now() - started, validation: 'failed' as const } };
  } catch (e) {
    clearTimeout(timer);
    const reason = controller.signal.aborted ? 'live call exceeded 20 s' : `live call failed: ${(e as Error).message.slice(0, 120)}`;
    return cachedResult(reason) ?? { output: null, meta: { ...base, model: modelFor(task), source: 'live' as const, latencyMs: Date.now() - started, validation: 'failed' as const, fallbackReason: reason } };
  }
}
