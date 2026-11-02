'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lane, Signal } from '../types';
import type { AiMeta } from '../ai/run';
import { DATA_NOTES_ALBERS } from '../notes';

export interface AiLogEntry { id: string; task: string; clientId?: string; label: string; meta: AiMeta; output: unknown; facts?: { id: string; label: string; value: string }[] }
export interface InboxMsg { id: string; subject: string; body: string; date: string; kind: 'message' | 'document' | 'answer' }
export interface RequestItem { id: string; clientId: string; text: string; rmDraft?: string; kind: 'question' | 'talk'; at: string; done?: boolean }
export interface AuditRecord {
  approvedBy: string; approvedAt: string; sources: string[]; draftModel: string; draftPrompt: string; verifyModel: string; verifyPrompt: string;
  changes: { id: string; before: string; after: string | null }[]; ruleChecks: { label: string; pass: boolean | null }[]; reviewedDespiteFlags: boolean;
  guardPass: boolean;
}

export interface DemoState {
  mode: 'live' | 'cached';
  liveSignals: Record<string, Signal[]>;
  orchestratedAt: string | null;
  overrides: Record<string, { lane: Lane; reason: string; at: string }>;
  touchpoints: Record<string, { status: 'draft' | 'approved' | 'rejected'; subject?: string; body?: string; meta?: AiMeta }>;
  inbox: Record<string, InboxMsg[]>;
  escalations: string[];
  requests: RequestItem[];
  feedback: Record<string, 'up' | 'down'>;
  aiLog: AiLogEntry[];
  minutesSaved: number;
  albers: {
    notes: string; draft?: any; draftMeta?: AiMeta; verify?: any; verifyMeta?: AiMeta; edits: Record<string, string>; removed: string[];
    testInserted: boolean; reviewedAccept: boolean; audit?: AuditRecord; consistency?: any; consistencyMeta?: AiMeta; attested: boolean;
    ack: boolean; signed: boolean; funded: boolean;
  };
  keller: { option?: 'sell' | 'bridge' | 'transfer'; draft?: any; draftMeta?: AiMeta; messageApproved: boolean; clientConfirmed: boolean; explanations: Record<string, any> };
}

const initial = (): DemoState => ({
  mode: 'live', liveSignals: {}, orchestratedAt: null, overrides: {}, touchpoints: {}, inbox: {}, escalations: [], requests: [], feedback: {},
  aiLog: [], minutesSaved: 0,
  albers: { notes: DATA_NOTES_ALBERS, edits: {}, removed: [], testInserted: false, reviewedAccept: false, attested: false, ack: false, signed: false, funded: false },
  keller: { messageApproved: false, clientConfirmed: false, explanations: {} },
});

const KEY = 'relationship-engine-demo-v1';
interface Ctx { s: DemoState; update: (fn: (s: DemoState) => DemoState) => void; reset: () => void; ready: boolean }
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<DemoState>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS({ ...initial(), ...JSON.parse(raw) }); } catch { /* storage unavailable */ }
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY && e.newValue) { try { setS({ ...initial(), ...JSON.parse(e.newValue) }); } catch { /* ignore */ } } };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => { if (!ready) return; try { localStorage.setItem(KEY, JSON.stringify({ ...s, aiLog: s.aiLog.slice(0, 60) })); } catch { /* ignore */ } }, [s, ready]);
  const update = useCallback((fn: (s: DemoState) => DemoState) => setS((prev) => fn(prev)), []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setS(initial()); }, []);
  const value = useMemo(() => ({ s, update, reset, ready }), [s, update, reset, ready]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

export const today = () => new Date().toISOString();
export const uid = () => Math.random().toString(36).slice(2, 10);
