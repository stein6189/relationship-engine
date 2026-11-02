'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from "@/lib/state/store";
import { usePlan } from '@/lib/state/usePlan';
import { useAi } from '@/lib/ai/client';
import { clients, clientById, signalsFromExtract } from '@/lib/data';
import { daysBetween, eur, eurShort, pct, fmtDate } from '@/lib/rules/format';
import { RM_SLOTS, SIM_TODAY, PLAN_DATE, MINUTES_SAVED } from '@/lib/rules/config';
import { priority } from '@/lib/rules/allocation';
import { SIGNAL_LABEL, SIGNAL_TONE, TRIGGER_LABEL } from '@/lib/labels';
import { STAGES, seededPipeline, albersStage, avgDaysToFunded, type Opportunity } from '@/lib/pipeline';
import { portfolioFacts } from '@/lib/facts';
import type { Allocation, Lane, Signal } from '@/lib/types';
import { Badge, Button, Card, Modal, SectionTitle, Spinner, Stat, Term } from '@/components/ui';

const STEP_NAMES = ['Read signals (AI · fast model)', 'Score clients (rules)', 'Allocate fixed capacity (rules)', 'Draft touchpoints (AI · smart model)'];

function SignalChip({ s }: { s: Signal }) {
  const { s: st, update } = useStore();
  const key = `${s.clientId}:${s.type}`;
  const fb = st.feedback[key];
  const lowConf = s.origin === 'ai' && s.confidence < 0.6;
  return (
    <span className="inline-flex items-center gap-0.5">
      <Badge tone={lowConf ? 'amber' : SIGNAL_TONE[s.type] ?? 'slate'} title={`${s.summary}\nSource: ${s.sourceIds.join(', ')}${s.quote ? `\n“${s.quote}”` : ''}\n${s.origin === 'ai' ? `AI-extracted · confidence ${Math.round(s.confidence * 100)}%` : 'From data (code)'}`}>
        {s.origin === 'ai' ? '✦ ' : ''}{SIGNAL_LABEL[s.type]}{s.origin === 'ai' ? ` · ${Math.round(s.confidence * 100)}%` : ''}{lowConf ? ' · please verify' : ''}
      </Badge>
      {s.origin === 'ai' && (
        <span className="ml-0.5 flex text-[11px]">
          <button aria-label="Signal useful" className={clsx('px-0.5', fb === 'up' ? 'text-accent' : 'text-slate-300 hover:text-slate-500')} onClick={() => update((x) => ({ ...x, feedback: { ...x.feedback, [key]: 'up' } }))}>▲</button>
          <button aria-label="Signal not useful" className={clsx('px-0.5', fb === 'down' ? 'text-red-600' : 'text-slate-300 hover:text-slate-500')} onClick={() => update((x) => ({ ...x, feedback: { ...x.feedback, [key]: 'down' } }))}>▼</button>
        </span>
      )}
    </span>
  );
}

function ClientCard({ a, onOverride }: { a: Allocation; onOverride: (a: Allocation) => void }) {
  const c = clientById(a.clientId)!;
  const { s } = useStore();
  const since = c.lastProactiveContact ? Math.round(daysBetween(c.lastProactiveContact, SIM_TODAY) / 30) : null;
  const shown = a.signals.filter((x) => x.type !== 'quarterly_progress' || a.lane !== 'rm');
  const ov = s.overrides[a.clientId];
  return (
    <Card className="p-3" data-testid={`card-${c.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/rm/client/${c.id}`} className="font-medium hover:text-accent">{c.name}</Link>
          <div className="tnum text-xs text-slate-500">{eur(c.aumEur)} · {since !== null ? `last proactive contact ${since} mo ago` : 'never contacted proactively'}</div>
        </div>
        <Button variant="ghost" className="px-1.5 py-0.5 text-xs" onClick={() => onOverride(a)}>Move</Button>
      </div>
      <p className="mt-1.5 text-sm leading-snug">{a.reason}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {a.hardTrigger && <Badge tone="slate">{TRIGGER_LABEL[a.hardTrigger]}</Badge>}
        {shown.slice(0, 5).map((x, i) => <SignalChip key={i} s={x} />)}
        {a.churnReason && <Badge tone="red" title="AI hypothesis from signals — to be confirmed by the RM">Churn reason? {a.churnReason}</Badge>}
        {ov && <Badge tone="violet" title={`Moved by RM: ${ov.reason}`}>RM override</Badge>}
      </div>
    </Card>
  );
}

function Row({ a, onOverride }: { a: Allocation; onOverride: (a: Allocation) => void }) {
  const c = clientById(a.clientId)!;
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5 text-sm last:border-0" data-testid={`row-${c.id}`}>
      <div className="min-w-0">
        <Link href={`/rm/client/${c.id}`} className="font-medium hover:text-accent">{c.name}</Link>
        <span className="tnum ml-1.5 text-xs text-slate-500">{eurShort(c.aumEur)}</span>
        <div className="truncate text-xs text-slate-600" title={a.reason}>{a.reason}</div>
        <div className="mt-0.5 flex flex-wrap gap-1">
          {a.controlGroup && <span data-testid="control-chip" className="cursor-help" title="Control group — digital only (3-month test). Drawn at random from clients with silent risk (seed 2026-11). The 2–3× churn gap between contacted and uncontacted clients is observed, not causal — this test measures the real effect of proactive contact. Never included: clients who told us what they need (transfer intent, liquidity need, capital call gap), AUM > €2m, or hard triggers."><Badge tone="blue">Control group · 3-month test ⓘ</Badge></span>}
          {a.overflow && <Badge tone="amber">Overflow — RM to review</Badge>}
          {a.churnReason && <Badge tone="red">Churn reason? {a.churnReason}</Badge>}
        </div>
      </div>
      <Button variant="ghost" className="px-1.5 py-0.5 text-xs" onClick={() => onOverride(a)}>Move</Button>
    </div>
  );
}

function Pipeline() {
  const { s } = useStore();
  const list: Opportunity[] = [...seededPipeline, { clientId: 'albers', product: 'Meridian Buyout V', amountEur: 200000, stage: albersStage(s.albers), stageSince: SIM_TODAY, enteredConversation: '2026-11-05' }];
  const avg = avgDaysToFunded(seededPipeline);
  return (
    <Card className="p-3">
      <SectionTitle right={<span className="text-xs text-slate-500">Avg. conversation → funded: <b className="tnum">{avg} days</b> (case: 3–6 weeks)</span>}>Pipeline</SectionTitle>
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map((st) => {
          const items = list.filter((o) => o.stage === st);
          return (
            <div key={st} className="rounded-lg bg-slate-50 p-2">
              <div className="text-[11px] font-medium text-slate-500">{st}</div>
              <div className="tnum text-sm font-semibold">{eurShort(items.reduce((x, o) => x + o.amountEur, 0))}</div>
              <div className="mt-1 space-y-0.5">
                {items.map((o) => <div key={o.clientId} className={clsx('truncate text-[11px]', o.clientId === 'albers' ? 'font-semibold text-accent' : 'text-slate-600')} data-testid={o.clientId === 'albers' ? `pipeline-albers-${st}` : undefined}>{clientById(o.clientId)?.name} · {o.product}</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function PlanPage() {
  const { s, update } = useStore();
  const { plan } = usePlan();
  const ai = useAi();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [moving, setMoving] = useState<Allocation | null>(null);
  const [showAllNone, setShowAllNone] = useState(false);

  const rm = plan.filter((a) => a.lane === 'rm').sort((a, b) => Number(!!b.hardTrigger) - Number(!!a.hardTrigger) || b.priority - a.priority);
  const digital = plan.filter((a) => a.lane === 'digital');
  const none = plan.filter((a) => a.lane === 'none');

  const kpi = useMemo(() => {
    const contacted = clients.filter((c) => c.lastProactiveContact && daysBetween(c.lastProactiveContact, SIM_TODAY) <= 365).map((c) => c.id);
    const afterPlan = new Set([...contacted, ...rm.map((a) => a.clientId)]);
    let risk = 0, need = 0, opp = 0;
    for (const a of plan) {
      const c = clientById(a.clientId)!;
      const p = priority(c, a.signals, SIM_TODAY);
      risk += p.risk; need += p.need; opp += p.opportunity;
    }
    return { coverage: contacted.length / clients.length, coverageAfter: afterPlan.size / clients.length, risk, need, opp };
  }, [plan, rm]);

  async function runOrchestration() {
    setRunning(true);
    setStep(0);
    const targets = ['albers', 'keller', 'berger', 'hofmann', ...clients.filter((c) => !c.persona && c.items.length > 0).slice(0, 10).map((c) => c.id)];
    const results: Record<string, Signal[]> = {};
    for (let i = 0; i < targets.length; i += 4) {
      await Promise.all(targets.slice(i, i + 4).map(async (id) => {
        const c = clientById(id)!;
        const r = await ai<{ signals: any[] }>('extract_signals', { cacheKey: id, clientId: id, items: c.items.map(({ id: itemId, date, kind, text }) => ({ id: itemId, date, kind, text })) }, { clientId: id, label: `Signals · ${c.name}` });
        if (r.output) {
          // Guardrail: drop any signal whose quote is not literally in the source text
          const sigs = signalsFromExtract(id, r.output as never).filter((sg) => !sg.quote || c.items.some((it) => it.text.includes(sg.quote!)));
          results[id] = sigs;
        }
      }));
    }
    setStep(1); await new Promise((r) => setTimeout(r, 500));
    setStep(2); await new Promise((r) => setTimeout(r, 500));
    setStep(3);
    const hof = clientById('hofmann')!;
    const facts = [...portfolioFacts(hof), { id: 'f3', label: 'retirement goal year', value: '2030' }];
    const r = await ai<any>('draft_touchpoint', { cacheKey: 'hofmann', client: { firstName: hof.firstName, tonePreference: 'short, warm; prefers no calls' }, trigger: 'quarterly_progress', facts, history: ['last RM meeting: April 2026', 'client asked for quarterly updates only'] }, { clientId: 'hofmann', label: 'Touchpoint · Monika Hofmann' });
    update((x) => ({
      ...x, liveSignals: { ...x.liveSignals, ...results }, orchestratedAt: new Date().toISOString(),
      touchpoints: r.output && x.touchpoints.hofmann?.status !== 'approved' ? { ...x.touchpoints, hofmann: { status: 'draft', subject: r.output.subject, body: r.output.body, meta: r.meta } } : x.touchpoints,
    }));
    setStep(4);
    setRunning(false);
  }

  const openRequests = s.requests.filter((r) => !r.done);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">November plan</h1>
          <p className="text-sm text-slate-500">Generated {fmtDate(PLAN_DATE)}{s.orchestratedAt ? ` · re-run ${new Date(s.orchestratedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''} · one list, one reason per client.</p>
        </div>
        <Button variant="primary" onClick={runOrchestration} disabled={running} data-testid="run-orchestration">{running ? <><Spinner /> Running…</> : 'Run monthly orchestration'}</Button>
      </div>

      {step >= 0 && (
        <Card className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm" data-testid="pipeline-steps">
          {STEP_NAMES.map((n, i) => (
            <span key={n} className={clsx('flex items-center gap-1.5 rounded-md px-2 py-1', i < step || step === 4 ? 'bg-teal-50 text-accent-dark' : i === step ? 'bg-amber-50 text-amber-800' : 'text-slate-400')}>
              {i < step || step === 4 ? '✓' : i === step ? <Spinner /> : `${i + 1}`} {n}
            </span>
          ))}
          {step === 4 && <span className="text-xs text-slate-500">14 clients read live; the rest from the 1 Nov run. See “Under the hood”.</span>}
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="RM conversations this month" value={<span data-testid="capacity">{rm.length} / {RM_SLOTS}</span>} sub={<div className="mt-1 h-1.5 w-full rounded bg-slate-100"><div className="h-1.5 rounded bg-accent" style={{ width: `${(rm.length / RM_SLOTS) * 100}%` }} /></div>} />
        <Stat label="Proactive coverage (12 months)" value={pct(kpi.coverage)} sub={`→ ${pct(kpi.coverageAfter)} after this plan`} tone="teal" />
        <Stat label="AUM at risk (probability-weighted)" value={eurShort(kpi.risk)} tone="red" />
        <Stat label="Liquidity needs detected" value={eurShort(kpi.need)} tone="amber" />
        <Stat label="Time saved this month" value={`${Math.round((s.minutesSaved + Object.values(s.touchpoints).filter((t) => t.status === 'approved').length * MINUTES_SAVED.touchpoint) / 60 * 10) / 10} h`} sub="prep, documentation, messages (assumption)" />
      </div>

      {openRequests.length > 0 && (
        <Card className="border-amber-300 p-3" data-testid="requests">
          <SectionTitle>Requests from clients ({openRequests.length})</SectionTitle>
          {openRequests.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 text-sm last:border-0">
              <div>
                <b>{clientById(r.clientId)?.name}</b> · {r.kind === 'talk' ? 'asked to talk' : 'asked'}: “{r.text}”
                {r.rmDraft && <div className="mt-0.5 text-xs text-slate-600">✦ AI draft for you (not sent): {r.rmDraft}</div>}
              </div>
              <div className="flex gap-1">
                <Link href={`/rm/client/${r.clientId}`}><Button className="text-xs">Open</Button></Link>
                <Button variant="ghost" className="text-xs" onClick={() => update((x) => ({ ...x, requests: x.requests.map((q) => (q.id === r.id ? { ...q, done: true } : q)) }))}>Done</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Pipeline />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr_1fr]">
        <section data-testid="lane-rm">
          <SectionTitle right={<Badge tone="teal">{rm.length} of {RM_SLOTS} slots</Badge>}>RM conversation</SectionTitle>
          <div className="space-y-2">{rm.map((a) => <ClientCard key={a.clientId} a={a} onOverride={setMoving} />)}</div>
        </section>
        <section data-testid="lane-digital">
          <SectionTitle right={<Link href="/rm/touchpoints" className="text-xs font-medium text-accent hover:underline">Review drafts →</Link>}>Digital touchpoint ({digital.length})</SectionTitle>
          <Card className="px-3 py-1">{digital.map((a) => <Row key={a.clientId} a={a} onOverride={setMoving} />)}</Card>
        </section>
        <section data-testid="lane-none">
          <SectionTitle>No action this month ({none.length})</SectionTitle>
          <Card className="px-3 py-1">
            {(showAllNone ? none : none.slice(0, 25)).map((a) => <Row key={a.clientId} a={a} onOverride={setMoving} />)}
            {!showAllNone && none.length > 25 && <button className="w-full py-2 text-xs font-medium text-accent" onClick={() => setShowAllNone(true)}>Show all {none.length}</button>}
          </Card>
        </section>
      </div>

      <OverrideModal a={moving} onClose={() => setMoving(null)} rmLane={rm} />
    </div>
  );
}

const REASONS = ['I know something the data does not', 'Client asked for it', 'Relationship needs a personal touch', 'Not needed this month', 'Other'];

function OverrideModal({ a, onClose, rmLane }: { a: Allocation | null; onClose: () => void; rmLane: Allocation[] }) {
  const { update } = useStore();
  const [lane, setLane] = useState<Lane>('rm');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [swap, setSwap] = useState<string>('');
  if (!a) return null;
  const c = clientById(a.clientId)!;
  const needsSwap = lane === 'rm' && a.lane !== 'rm' && rmLane.length >= RM_SLOTS;
  const save = () => {
    const at = new Date().toISOString();
    const r = `${reason}${note ? ` — ${note}` : ''}`;
    update((x) => ({
      ...x,
      overrides: { ...x.overrides, [a.clientId]: { lane, reason: r, at }, ...(needsSwap && swap ? { [swap]: { lane: 'digital' as Lane, reason: `Moved out to make room for ${c.name}`, at } } : {}) },
      aiLog: x.aiLog, // overrides are logged in state and shown on cards
    }));
    onClose();
  };
  return (
    <Modal open={!!a} onClose={onClose} title={`Move ${c.name}`}>
      <div className="space-y-3 text-sm">
        <div className="flex gap-2">
          {(['rm', 'digital', 'none'] as Lane[]).map((l) => (
            <button key={l} onClick={() => setLane(l)} className={clsx('rounded-lg border px-3 py-1.5', lane === l ? 'border-accent bg-teal-50 font-medium' : 'border-slate-300')}>{l === 'rm' ? 'RM conversation' : l === 'digital' ? 'Digital' : 'No action'}</button>
          ))}
        </div>
        {needsSwap && (
          <div className="rounded-lg bg-amber-50 p-2">
            <div className="mb-1 font-medium text-amber-900">Capacity is fixed at {RM_SLOTS}. Who moves to digital instead?</div>
            <select className="w-full rounded border border-slate-300 p-1.5" value={swap} onChange={(e) => setSwap(e.target.value)} aria-label="Client to move out">
              <option value="">Choose a client…</option>
              {rmLane.filter((x) => !x.hardTrigger).map((x) => <option key={x.clientId} value={x.clientId}>{clientById(x.clientId)?.name} — {x.reason.slice(0, 60)}</option>)}
            </select>
          </div>
        )}
        <label className="block">Reason (logged)
          <select className="mt-1 w-full rounded border border-slate-300 p-1.5" value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
        </label>
        <input className="w-full rounded border border-slate-300 p-1.5" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={needsSwap && !swap} onClick={save}>Save</Button></div>
      </div>
    </Modal>
  );
}

