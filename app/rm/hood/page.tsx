'use client';
import { useEffect, useState } from 'react';
import { useStore, type AiLogEntry } from '@/lib/state/store';
import { promptIndexClient } from '@/lib/promptIndexClient';
import { FAST_TASKS } from '@/lib/ai/schemas';
import { HoodDrawer, sourceLabel } from '@/components/AiMetaBadge';
import { Badge, Card, SectionTitle } from '@/components/ui';

const USED_IN: Record<string, string> = {
  extract_signals: 'V1 · reads messages and notes into signals', draft_touchpoint: 'V2 · personal messages; V6 capital-call message',
  meeting_brief: 'V3 · sourced meeting brief', draft_suitability: 'V4 · suitability statement, client message, CRM note',
  verify_draft: 'V4 · independent sentence-by-sentence check', check_qualification_consistency: 'V5 · questionnaire vs notes',
  route_client_question: 'V7 · factual answer or hand-over to RM', explain_option: 'V6 · one neutral line per option',
};

export default function HoodPage() {
  const { s } = useStore();
  const [env, setEnv] = useState<{ liveAvailable: boolean; fast: string; smart: string } | null>(null);
  const [open, setOpen] = useState<AiLogEntry | null>(null);
  useEffect(() => { fetch('/api/ai/extract_signals').then((r) => r.json()).then(setEnv).catch(() => setEnv(null)); }, []);
  return (
    <div className="space-y-4" data-testid="hood">
      <div>
        <h1 className="text-xl font-semibold">Under the hood</h1>
        <p className="text-sm text-slate-500">Fast model reads, smart model writes, a second call checks, code does every number. Every AI call in this session is logged below with its provenance.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-4">
          <SectionTitle right={env && <Badge tone={env.liveAvailable ? 'green' : 'amber'}>{env.liveAvailable ? 'API key set — live calls possible' : 'no API key — seed / cached outputs'}</Badge>}>Orchestration · 8 prompts</SectionTitle>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Prompt</th><th>Model</th><th>Used in</th></tr></thead>
            <tbody>{Object.entries(promptIndexClient).map(([id, p]) => (
              <tr key={id} className="border-t border-slate-100"><td className="py-1 font-mono text-xs">{id} · {p.version}</td><td><Badge tone={FAST_TASKS.includes(id as never) ? 'blue' : 'violet'}>{FAST_TASKS.includes(id as never) ? `fast · ${env?.fast ?? 'MODEL_FAST'}` : `smart · ${env?.smart ?? 'MODEL_SMART'}`}</Badge></td><td className="text-xs text-slate-600">{USED_IN[id]}</td></tr>
            ))}</tbody>
          </table>
        </Card>
        <Card className="p-4 text-sm">
          <SectionTitle>Guardrails on every call</SectionTitle>
          <ul className="list-disc space-y-1 pl-4 text-slate-700">
            <li><b>Structured output:</b> JSON validated with zod. Invalid → one retry → “Needs review”, never shown as fine.</li>
            <li><b>Number guard (code):</b> every number in AI text must exist in the facts passed in. Unknown → red, needs review.</li>
            <li><b>Verifier:</b> a separate call checks each sentence of the suitability draft against the sources.</li>
            <li><b>Confidence:</b> below 0.6 → amber “Please verify”, never auto-actioned. Client answers below 0.7 go to the RM.</li>
            <li><b>Quotes checked in code:</b> a signal whose quote is not in the source text is dropped.</li>
            <li><b>Fallback:</b> live call fails or takes &gt; 20 s → cached result, labelled “cached”.</li>
            <li><b>Server-side only:</b> the API key never reaches the browser. Nothing is sent to a client without RM approval.</li>
          </ul>
        </Card>
      </div>
      <Card className="p-4">
        <SectionTitle right={<span className="text-xs text-slate-500">{s.aiLog.length} calls this session</span>}>Log of AI calls</SectionTitle>
        {s.aiLog.length === 0 ? <p className="text-sm text-slate-500">No AI calls yet in this session. Run the monthly orchestration on the Plan, or open a client.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm" data-testid="hood-log">
              <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Time</th><th>What</th><th>Prompt</th><th>Model</th><th>Source</th><th>Schema</th><th>Number guard</th><th className="text-right">Latency</th><th /></tr></thead>
              <tbody>{s.aiLog.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="tnum py-1 text-xs">{new Date(e.meta.timestamp).toLocaleTimeString('en-GB')}</td>
                  <td>{e.label}</td>
                  <td className="font-mono text-xs">{e.meta.promptId} · {e.meta.promptVersion}</td>
                  <td className="text-xs">{e.meta.model.startsWith('seed') ? 'seed (authored offline)' : e.meta.model}</td>
                  <td><Badge tone={e.meta.source === 'live' ? 'teal' : 'slate'} title={e.meta.fallbackReason}>{sourceLabel(e.meta)}</Badge></td>
                  <td><Badge tone={e.meta.validation === 'failed' ? 'red' : e.meta.validation === 'retried' ? 'amber' : 'green'}>{e.meta.validation}</Badge></td>
                  <td>{e.meta.guard ? <Badge tone={e.meta.guard.pass ? 'green' : 'red'}>{e.meta.guard.pass ? `pass · ${e.meta.guard.checked}` : `fail · ${e.meta.guard.unsupported.join(', ')}`}</Badge> : <span className="text-xs text-slate-400">n/a</span>}</td>
                  <td className="tnum text-right text-xs">{e.meta.latencyMs} ms</td>
                  <td className="text-right"><button className="text-xs font-medium text-accent hover:underline" onClick={() => setOpen(e)}>Details</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <SectionTitle right={<span className="text-xs text-slate-500">human decisions are logged too</span>}>RM overrides and feedback</SectionTitle>
        {Object.keys(s.overrides).length === 0 && Object.keys(s.feedback).length === 0 ? <p className="text-sm text-slate-500">No overrides or feedback yet.</p> : (
          <ul className="space-y-1 text-sm" data-testid="override-log">
            {Object.entries(s.overrides).map(([id, o]) => <li key={id}><b>{id}</b> moved to <Badge>{o.lane === 'rm' ? 'RM conversation' : o.lane === 'digital' ? 'Digital' : 'No action'}</Badge> — {o.reason} <span className="text-xs text-slate-400">{new Date(o.at).toLocaleTimeString('en-GB')}</span></li>)}
            {Object.entries(s.feedback).map(([k, v]) => <li key={k} className="text-xs text-slate-600">Feedback {v === 'up' ? '▲ useful' : '▼ not useful'} · <span className="font-mono">{k}</span></li>)}
          </ul>
        )}
      </Card>
      {open && <HoodDrawer open onClose={() => setOpen(null)} meta={open.meta} output={open.output} facts={open.facts} />}
    </div>
  );
}
