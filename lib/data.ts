import clientsJson from '../data/clients.json';
import fundsJson from '../data/funds.json';
import type { Client, Signal, SignalType } from './types';

// Seed caches are bundled so the app and tests can run without any AI calls.
import { seedCache } from './seedCache';

export const clients = clientsJson as unknown as Client[];
export const funds = fundsJson as unknown as {
  id: string; name: string; type: string; vintage: number; status: string; minCommitment: number; termYears: number; sri: number;
  firstCallPct?: number; firstClose?: string;
}[];
export const clientById = (id: string) => clients.find((c) => c.id === id);
export const fundById = (id: string) => funds.find((f) => f.id === id);

interface ExtractOutput {
  signals: { type: SignalType; summary: string; amountEur: number | null; timing: string | null; topic: string | null; evidence: { itemId: string; quote: string }[]; confidence: number }[];
}

export function signalsFromExtract(clientId: string, out: ExtractOutput): Signal[] {
  return out.signals.map((s) => ({
    clientId, type: s.type, summary: s.summary, amountEur: s.amountEur ?? undefined,
    dueDate: s.timing && /^\d{4}-\d{2}-\d{2}$/.test(s.timing) ? s.timing : undefined, topic: s.topic ?? undefined,
    confidence: s.confidence, sourceIds: s.evidence.map((e) => e.itemId), quote: s.evidence[0]?.quote || undefined, origin: 'ai' as const,
  }));
}

export function loadSeedSignals(): Record<string, Signal[]> {
  const out: Record<string, Signal[]> = {};
  for (const [key, entry] of Object.entries(seedCache)) {
    if (!key.startsWith('extract_signals__')) continue;
    const id = key.slice('extract_signals__'.length);
    out[id] = signalsFromExtract(id, entry.output as ExtractOutput);
  }
  return out;
}
