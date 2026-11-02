'use client';
import { useCallback } from 'react';
import { useStore, uid } from '../state/store';
import type { AiMeta } from './run';
import type { Fact } from '../types';

export interface AiResult<T = any> { output: T | null; meta: AiMeta }

export function useAi() {
  const { s, update } = useStore();
  const mode = s.mode;
  return useCallback(async <T = any,>(task: string, input: { cacheKey: string; facts?: Fact[] } & Record<string, unknown>, opts: { clientId?: string; label: string }): Promise<AiResult<T>> => {
    let result: AiResult<T>;
    try {
      const res = await fetch(`/api/ai/${task}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode, input }) });
      result = await res.json();
    } catch (e) {
      result = { output: null, meta: { task: task as never, promptId: task, promptVersion: 'v1', model: 'none', source: 'live', latencyMs: 0, validation: 'failed', timestamp: new Date().toISOString(), cacheKey: input.cacheKey, fallbackReason: `network error: ${(e as Error).message}` } };
    }
    update((st) => ({ ...st, aiLog: [{ id: uid(), task, clientId: opts.clientId, label: opts.label, meta: result.meta, output: result.output, facts: input.facts }, ...st.aiLog].slice(0, 60) }));
    return result;
  }, [mode, update]);
}
