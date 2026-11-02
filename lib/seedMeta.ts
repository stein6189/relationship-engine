import { seedCache } from './seedCache';
import { numberGuard } from './rules/numberGuard';
import type { AiMeta } from './ai/run';
import type { Fact } from './types';

/** Provenance for a pre-computed output that is read directly in the browser (e.g. the 60 touchpoint drafts). */
export function seedMetaFor(task: AiMeta['task'], cacheKey: string, text?: string, facts?: Fact[]): AiMeta | undefined {
  const e = seedCache[`${task}__${cacheKey}`];
  if (!e) return undefined;
  const g = text !== undefined && facts ? numberGuard(text, facts) : undefined;
  return {
    task, promptId: e.promptId, promptVersion: e.promptVersion, model: e.model, source: e.model.startsWith('seed') ? 'seed' : 'cached',
    latencyMs: 0, validation: 'valid', timestamp: e.createdAt, cacheKey,
    guard: g && { pass: g.pass, unsupported: g.unsupported.map((u) => u.raw), checked: g.checked },
  };
}

export const seedOutput = <T = any>(task: string, key: string): T | undefined => seedCache[`${task}__${key}`]?.output as T | undefined;
