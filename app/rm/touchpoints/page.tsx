'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useStore, uid } from '@/lib/state/store';
import { usePlan } from '@/lib/state/usePlan';
import { useAi } from '@/lib/ai/client';
import { clientById } from '@/lib/data';
import { seedCache } from '@/lib/seedCache';
import { seedMetaFor } from '@/lib/seedMeta';
import { numberGuard } from '@/lib/rules/numberGuard';
import { portfolioFacts } from '@/lib/facts';
import { eurShort } from '@/lib/rules/format';
import { SIM_TODAY } from '@/lib/rules/config';
import type { AiMeta } from '@/lib/ai/run';
import type { Fact } from '@/lib/types';
import { AiMetaBadge } from '@/components/AiMetaBadge';
import { GuardedText } from '@/components/GuardedText';
import { Badge, Button, Card, Spinner, Term } from '@/components/ui';

const TRIGGER: Record<string, string> = {
  quarterly_progress: 'Quarterly progress', distribution_received: 'Distribution received', j_curve_explainer: 'J-curve explainer',
  statement_info: 'Statement / tax info', re_engagement: 'Re-engagement after long silence',
  distribution_upcoming: 'Distribution expected', capital_call_explainer: 'Capital call explainer',
};

interface Draft {
  clientId: string; subject: string; body: string; messageType: 'informational' | 'personal_outreach' | 'advisory'; trigger: string;
  facts: Fact[]; testCase: boolean; meta?: AiMeta; output: unknown; edited: boolean; status: 'draft' | 'approved' | 'rejected'; missing?: boolean;
  guard: { pass: boolean; unsupported: string[] };
}

function useDrafts(ids: string[]): Draft[] {
  const { s } = useStore();
  return useMemo(() => ids.map((id) => {
    const c = clientById(id)!;
    const seed = seedCache[`draft_touchpoint__${id}`]?.output as any;
    const st = s.touchpoints[id];
    const facts: Fact[] = seed?.facts ?? (id === 'hofmann' ? [...portfolioFacts(c), { id: 'f3', label: 'retirement goal year', value: '2030' }] : portfolioFacts(c));
    const subject = st?.subject ?? seed?.subject ?? '';
    const body = st?.body ?? seed?.body ?? '';
    const g = numberGuard(`${subject}\n${body}`, facts);
    return {
      clientId: id, subject, body, facts, testCase: !!seed?.testCase && !st?.body,
      messageType: ((st as any)?.messageType ?? seed?.messageType ?? 'informational'),
      trigger: seed?.trigger ?? 'quarterly_progress', meta: st?.meta ?? seedMetaFor('draft_touchpoint', id, `${subject}\n${body}`, facts),
      output: st?.meta ? st : seed, edited: !!(st as any)?.edited, status: st?.status ?? 'draft', missing: !seed && !st?.body,
      guard: { pass: g.pass, unsupported: g.unsupported.map((u) => u.raw) },
    } as Draft;
  }), [ids, s.touchpoints]);
}

const canBatch = (d: Draft) => d.status === 'draft' && !d.missing && d.messageType === 'informational' && d.guard.pass;

export default function TouchpointsPage() {
  const { s, update } = useStore();
  const { plan } = usePlan();
  const ids = useMemo(() => plan.filter((a) => a.lane === 'digital').map((a) => a.clientId), [plan]);
  const drafts = useDrafts(ids);
  const [filter, setFilter] = useState<'all' | 'attention' | 'approved'>('all');
  const [confirming, setConfirming] = useState(false);
  const opened = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const approved = drafts.filter((d) => d.status === 'approved').length;
  const rejected = drafts.filter((d) => d.status === 'rejected').length;
  const attention = drafts.filter((d) => d.status === 'draft' && !canBatch(d));
  const batch = drafts.filter(canBatch);
  const mins = Math.floor((now - opened.current) / 60000);
  const secs = Math.floor(((now - opened.current) % 60000) / 1000);

  const approve = (list: Draft[]) => update((x) => {
    const touchpoints = { ...x.touchpoints };
    const inbox = { ...x.inbox };
    for (const d of list) {
      touchpoints[d.clientId] = { ...(touchpoints[d.clientId] ?? {}), status: 'approved', subject: d.subject, body: d.body, meta: d.meta };
      inbox[d.clientId] = [{ id: uid(), subject: d.subject, body: d.body, date: SIM_TODAY, kind: 'message' }, ...(inbox[d.clientId] ?? []).filter((m) => m.subject !== d.subject)];
    }
    return { ...x, touchpoints, inbox };
  });

  const shown = filter === 'all' ? drafts : filter === 'approved' ? drafts.filter((d) => d.status === 'approved') : attention;
  const sorted = [...shown].sort((a, b) => Number(canBatch(a)) - Number(canBatch(b)) || (a.clientId === 'hofmann' ? -1 : b.clientId === 'hofmann' ? 1 : 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Digital touchpoints · November</h1>
          <p className="text-sm text-slate-500">One personal message per client in the digital lane. Every number comes from code and is checked by the number guard. Nothing is sent without your approval.</p>
        </div>
        {confirming && batch.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm">
            <span>Approve {batch.length} informational messages? All numbers are verified by code. Personal outreach and flagged drafts stay for individual review.</span>
            <Button variant="primary" onClick={() => { approve(batch); setConfirming(false); }} data-testid="confirm-approve-all">Yes, approve {batch.length}</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        ) : <Button variant="primary" disabled={!batch.length} onClick={() => setConfirming(true)} data-testid="approve-all">Approve all informational ({batch.length})</Button>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="px-4 py-3"><div className="text-xs text-slate-500">Drafts this month</div><div className="tnum text-xl font-semibold">{drafts.length}</div></Card>
        <Card className="px-4 py-3"><div className="text-xs text-slate-500">Ready for batch approval</div><div className="tnum text-xl font-semibold text-accent">{batch.length}</div><div className="text-xs text-slate-500">informational · all numbers verified</div></Card>
        <Card className="px-4 py-3"><div className="text-xs text-slate-500">Review one by one</div><div className="tnum text-xl font-semibold text-amber-700">{attention.length}</div><div className="text-xs text-slate-500">personal outreach, number check failed, advisory</div></Card>
        <Card className="px-4 py-3" data-testid="review-timer"><div className="text-xs text-slate-500">Decided since you opened this page</div><div className="tnum text-xl font-semibold">{approved + rejected} in {mins}:{String(secs).padStart(2, '0')} min</div><div className="text-xs text-slate-500">{approved} approved · {rejected} rejected</div></Card>
      </div>

      <div className="flex gap-1 text-sm" role="tablist">
        {([['all', `All (${drafts.length})`], ['attention', `Review one by one (${attention.length})`], ['approved', `Approved (${approved})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={clsx('rounded-md px-3 py-1', filter === k ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100')}>{l}</button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((d) => <DraftRow key={d.clientId} d={d} onApprove={() => approve([d])} />)}
        {!sorted.length && <Card className="p-6 text-center text-sm text-slate-500">Nothing here.</Card>}
      </div>
      <p className="text-xs text-slate-500">Message policy: informational messages may be batch-approved. Advisory content is never written for the client by AI — it goes to the RM. Client messages never mention app usage or other tracked behaviour. {s.requests.length > 0 && <Link className="text-accent underline" href="/rm/plan">Client replies appear in the Plan inbox.</Link>}</p>
    </div>
  );
}

function DraftRow({ d, onApprove }: { d: Draft; onApprove: () => void }) {
  const { s, update } = useStore();
  const ai = useAi();
  const c = clientById(d.clientId)!;
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(d.body);
  const [busy, setBusy] = useState(false);
  const fb = s.feedback[`tp:${d.clientId}`];
  const set = (patch: Record<string, unknown>) => update((x) => ({ ...x, touchpoints: { ...x.touchpoints, [d.clientId]: { ...(x.touchpoints[d.clientId] ?? { status: 'draft' }), ...patch } as any } }));

  async function regenerate() {
    setBusy(true);
    const r = await ai<any>('draft_touchpoint', { cacheKey: d.clientId, client: { firstName: c.firstName, tonePreference: c.prefersLowContact ? 'short, warm; prefers no calls' : 'short, warm' }, trigger: d.trigger, facts: d.facts, history: [] }, { clientId: d.clientId, label: `Touchpoint · ${c.name}` });
    if (r.output) set({ status: 'draft', subject: r.output.subject, body: r.output.body, messageType: r.output.messageType, meta: r.meta, edited: false });
    else set({ meta: r.meta });
    setBusy(false);
  }

  const advisory = d.messageType === 'advisory';
  return (
    <Card className={clsx('p-3', d.status === 'approved' && 'border-green-300 bg-green-50/30', d.status === 'rejected' && 'opacity-60')} data-testid={`tp-${d.clientId}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/rm/client/${c.id}`} className="font-medium hover:text-accent">{c.name}</Link>
          <span className="tnum text-xs text-slate-500">{eurShort(c.aumEur)}</span>
          <Badge tone="blue">{TRIGGER[d.trigger] ?? d.trigger}</Badge>
          <Badge tone={advisory ? 'red' : d.messageType === 'personal_outreach' ? 'violet' : 'slate'}>{advisory ? 'advisory — blocked' : d.messageType}</Badge>
          {d.testCase && <Badge tone="amber" title="Seeded on purpose to show the number guard. Not a real AI error.">Test case</Badge>}
          {!d.missing && !advisory && <Badge tone={d.guard.pass ? 'green' : 'red'} title={d.guard.pass ? 'Every number matches a fact' : 'Numbers not in facts: ' + d.guard.unsupported.join(', ')}>{d.guard.pass ? 'numbers ✓' : `number check ✗ ${d.guard.unsupported.join(', ')}`}</Badge>}
          {d.edited && <Badge tone="violet">edited by RM</Badge>}
          {d.status === 'approved' && <Badge tone="green">approved · in client app</Badge>}
          {d.status === 'rejected' && <Badge tone="slate">rejected</Badge>}
          {s.escalations.includes(d.clientId) && <Badge tone="red">Escalation</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 flex text-[11px]">
            <button aria-label="Draft useful" className={clsx('px-0.5', fb === 'up' ? 'text-accent' : 'text-slate-300 hover:text-slate-500')} onClick={() => update((x) => ({ ...x, feedback: { ...x.feedback, [`tp:${d.clientId}`]: 'up' } }))}>▲</button>
            <button aria-label="Draft not useful" className={clsx('px-0.5', fb === 'down' ? 'text-red-600' : 'text-slate-300 hover:text-slate-500')} onClick={() => update((x) => ({ ...x, feedback: { ...x.feedback, [`tp:${d.clientId}`]: 'down' } }))}>▼</button>
          </span>
          {d.status === 'draft' && !advisory && !d.missing && !editing && (
            <>
              <Button className="text-xs" onClick={() => { setSubject(d.subject); setBody(d.body); setEditing(true); }}>Edit</Button>
              <Button className="text-xs" variant="ghost" onClick={() => set({ status: 'rejected' })}>Reject</Button>
              <Button className="text-xs" variant="primary" disabled={!d.guard.pass} title={d.guard.pass ? '' : 'Fix the red number first'} onClick={onApprove} data-testid={`approve-${d.clientId}`}>Approve</Button>
            </>
          )}
          {d.status !== 'draft' && <Button className="text-xs" variant="ghost" onClick={() => set({ status: 'draft' })}>Undo</Button>}
          <Button className="text-xs" variant="ghost" onClick={regenerate} disabled={busy} title="Ask the model again (Live AI) or load the cached draft">{busy ? <Spinner /> : 'Regenerate'}</Button>
        </div>
      </div>

      {d.missing ? (
        <p className="mt-2 text-sm text-slate-500">No draft yet for this client (moved here this month). Use “Regenerate” to draft one.</p>
      ) : editing ? (
        <div className="mt-2 space-y-1.5">
          <input aria-label="Subject" className="w-full rounded border border-slate-300 p-1.5 text-sm font-medium" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea aria-label="Message" className="h-24 w-full rounded border border-slate-300 p-1.5 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="flex justify-end gap-1"><Button variant="ghost" className="text-xs" onClick={() => setEditing(false)}>Cancel</Button><Button variant="primary" className="text-xs" onClick={() => { set({ subject, body, edited: true, status: 'draft' }); setEditing(false); }}>Save &amp; re-check</Button></div>
        </div>
      ) : (
        <div className="mt-2 grid gap-3 lg:grid-cols-[1fr_260px]">
          <div className={clsx('rounded-lg p-2.5 text-sm leading-relaxed', advisory ? 'bg-red-50/50' : 'bg-slate-50')}>
            <div className="font-medium"><GuardedText text={d.subject} unsupported={d.guard.unsupported} /></div>
            <div className="mt-0.5 text-slate-700" data-testid="tp-body"><GuardedText text={d.body} unsupported={d.guard.unsupported} /></div>
            {advisory && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-red-800">
                The model classified this as advice. AI does not write advice for clients — the client is queued for an RM conversation.
                {s.overrides[d.clientId]?.lane === 'rm'
                  ? <Badge tone="teal">moved to RM lane</Badge>
                  : <Button className="text-xs" onClick={() => update((x) => ({ ...x, overrides: { ...x.overrides, [d.clientId]: { lane: 'rm', reason: 'Advisory need found while drafting touchpoint', at: new Date().toISOString() } } }))}>Move to RM lane</Button>}
              </div>
            )}
          </div>
          <div className="text-xs">
            <div className="mb-1 font-medium text-slate-500">Facts used (from code)</div>
            <ul className="space-y-0.5">{d.facts.map((f) => <li key={f.id} className="flex justify-between gap-2"><span className="text-slate-500"><span className="font-mono">{f.id}</span> {f.label}</span><span className="tnum font-medium">{f.value}</span></li>)}</ul>
            <div className="mt-2"><AiMetaBadge meta={d.meta} output={d.output} facts={d.facts} hideGuard /></div>
          </div>
        </div>
      )}
      {d.trigger === 'j_curve_explainer' && <div className="mt-1 text-[11px] text-slate-500"><Term t="J-curve">What is the J-curve?</Term></div>}
    </Card>
  );
}
