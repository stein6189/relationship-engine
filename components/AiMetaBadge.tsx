'use client';
import { useState } from 'react';
import type { AiMeta } from '@/lib/ai/run';
import { Badge, Drawer } from './ui';
import { promptIndexClient } from '@/lib/promptIndexClient';
import { simStamp } from '@/lib/rules/format';
import { SIM_TODAY } from '@/lib/rules/config';

export function sourceLabel(m: AiMeta) {
  if (m.source === 'live') return 'live AI';
  if (m.source === 'seed') return 'cached · seed';
  return 'cached';
}

/** Small provenance line + "Under the hood" drawer for one AI output. */
export function AiMetaBadge({ meta, output, facts, confidence, hideGuard }: { meta?: AiMeta; output?: unknown; facts?: { id: string; label: string; value: string }[]; confidence?: number; hideGuard?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!meta) return null;
  const guardTone = meta.guard ? (meta.guard.pass ? 'green' : 'red') : 'slate';
  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-1">
        <Badge tone="violet" title="Produced by AI">AI · {meta.model.startsWith('seed') ? 'seed' : meta.model}</Badge>
        <Badge tone={meta.source === 'live' ? 'teal' : 'slate'}>{sourceLabel(meta)}</Badge>
        {meta.guard && !hideGuard && <Badge tone={guardTone} title={meta.guard.pass ? 'Every number matches a fact from code' : 'Numbers not found in facts: ' + meta.guard.unsupported.join(', ')}>{meta.guard.pass ? 'numbers ✓' : `number check ✗ ${meta.guard.unsupported.join(', ')}`}</Badge>}
        {confidence !== undefined && confidence < 0.6 && <Badge tone="amber">Please verify</Badge>}
        {meta.validation === 'failed' && <Badge tone="red">Needs review — AI output could not be validated</Badge>}
        <button onClick={() => setOpen(true)} className="text-[11px] font-medium text-accent underline-offset-2 hover:underline">Under the hood</button>
      </span>
      <HoodDrawer open={open} onClose={() => setOpen(false)} meta={meta} output={output} facts={facts} />
    </>
  );
}

export function HoodDrawer({ open, onClose, meta, output, facts }: { open: boolean; onClose: () => void; meta: AiMeta; output?: unknown; facts?: { id: string; label: string; value: string }[] }) {
  const p = promptIndexClient[meta.promptId];
  return (
    <Drawer open={open} onClose={onClose} title={`Under the hood · ${meta.promptId}`}>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1.5 text-sm">
        <dt className="text-slate-500">Prompt</dt><dd>{meta.promptId} · {meta.promptVersion}</dd>
        <dt className="text-slate-500">Model</dt><dd>{meta.model}</dd>
        <dt className="text-slate-500">Source</dt><dd>{sourceLabel(meta)}{meta.fallbackReason ? ` — ${meta.fallbackReason}` : ''}</dd>
        <dt className="text-slate-500">Schema validation</dt><dd>{meta.validation}</dd>
        <dt className="text-slate-500">Number guard</dt><dd>{meta.guard ? (meta.guard.pass ? `pass (${meta.guard.checked} numbers checked)` : `FAIL: ${meta.guard.unsupported.join(', ')}`) : 'n/a (no client-facing text)'}</dd>
        <dt className="text-slate-500">Confidence</dt><dd>{typeof (output as any)?.confidence === 'number' ? `${Math.round((output as any).confidence * 100)}%${(output as any).confidence < 0.6 ? ' — please verify' : ''}` : (output as any)?.overall ? `verifier overall: ${(output as any).overall}` : 'n/a'}</dd>
        <dt className="text-slate-500">Latency</dt><dd>{meta.latencyMs} ms</dd>
        <dt className="text-slate-500">Time</dt><dd>{simStamp(meta.timestamp, SIM_TODAY)}</dd>
      </dl>
      {facts && facts.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-semibold uppercase text-slate-500">Facts passed in (computed by code)</h4>
          <table className="mt-1 w-full text-xs"><tbody>{facts.map((f) => <tr key={f.id} className="border-b border-slate-100"><td className="py-1 pr-2 font-mono text-slate-500">{f.id}</td><td className="pr-2">{f.label}</td><td className="tnum text-right">{f.value}</td></tr>)}</tbody></table>
        </>
      )}
      {p && (<><h4 className="mt-4 text-xs font-semibold uppercase text-slate-500">System prompt</h4><pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px]">{p.system}</pre></>)}
      <h4 className="mt-4 text-xs font-semibold uppercase text-slate-500">Raw JSON output</h4>
      <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px]">{JSON.stringify(output, null, 2)}</pre>
    </Drawer>
  );
}
