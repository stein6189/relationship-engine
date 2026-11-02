'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/lib/state/store';
import { usePlan } from '@/lib/state/usePlan';
import { useAi } from '@/lib/ai/client';
import { clientById, fundById } from '@/lib/data';
import { factsFor } from '@/lib/facts';
import { timelineFor, sourceMap, type TimelineItem } from '@/lib/timeline';
import { eur, fmtDate, pct, daysBetween } from '@/lib/rules/format';
import { MINUTES_SAVED, SIM_TODAY } from '@/lib/rules/config';
import { laneLabel } from '@/lib/rules/allocation';
import { SIGNAL_LABEL } from '@/lib/labels';
import { AiMetaBadge } from '@/components/AiMetaBadge';
import { Badge, Button, Card, SectionTitle, Spinner, Term } from '@/components/ui';

const ASSET: Record<string, string> = { equity_etf: 'Equity ETFs', bond_etf: 'Bond ETFs', cash: 'Cash', money_market: 'Money market', single_stock: 'Single stocks', pm: 'Private markets (NAV)' };

export function briefFacts(id: string) {
  const f = factsFor(id);
  return id === 'berger' ? [...f, { id: 'b_need', label: 'Stated need', value: '€300,000' }] : f;
}

export function SourceChip({ id, map }: { id: string; map: Record<string, string> }) {
  return <span title={map[id] ?? id} className="ml-1 cursor-help rounded bg-slate-100 px-1 py-px font-mono text-[10px] text-slate-500 hover:bg-teal-50 hover:text-accent">{id}</span>;
}

export function Brief({ id, compact }: { id: string; compact?: boolean }) {
  const { s, update, ready } = useStore();
  const ai = useAi();
  const c = clientById(id)!;
  const { byId } = usePlan();
  const [busy, setBusy] = useState(false);
  const b = s.briefs[id];
  const map = useMemo(() => sourceMap(c), [c]);
  const facts = useMemo(() => briefFacts(id), [id]);

  async function generate() {
    setBusy(true);
    const a = byId.get(id);
    const timeline = timelineFor(c, s).filter((t) => t.kind !== 'view').slice(0, 15).map((t) => ({ id: t.id, date: t.date, title: t.title, text: t.text }));
    const r = await ai<any>('meeting_brief', { cacheKey: id, facts, signals: (a?.signals ?? []).map((x) => ({ type: x.type, summary: x.summary, sourceIds: x.sourceIds })), timeline, planReason: a?.reason }, { clientId: id, label: `Meeting brief · ${c.name}` });
    update((x) => ({ ...x, briefs: { ...x.briefs, [id]: { output: r.output, meta: r.meta } }, minutesSaved: x.briefs[id] || !r.output ? x.minutesSaved : x.minutesSaved + MINUTES_SAVED.brief }));
    setBusy(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && !b && c.persona && id !== 'hofmann') void generate(); }, [id, ready]);

  return (
    <Card className="p-4" data-testid="ai-brief">
      <SectionTitle right={b?.meta && <AiMetaBadge meta={b.meta} output={b.output} facts={facts} confidence={b.output?.confidence} />}>✦ Meeting brief</SectionTitle>
      {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Reading messages, notes and portfolio…</div>}
      {!busy && !b && <div className="flex items-center justify-between gap-2 text-sm text-slate-500"><span>No brief yet.</span><Button onClick={generate}>Prepare brief</Button></div>}
      {!busy && b && !b.output && <div className="text-sm text-amber-800" data-testid="needs-review"><b>Needs review — AI output could not be validated.</b> {b.meta.fallbackReason ?? (b.meta.validation === "failed" ? "Invalid output twice, no cached brief for this client." : "")} <Button className="ml-2 text-xs" onClick={generate}>Retry</Button></div>}
      {!busy && b?.output && (
        <div className="space-y-3 text-sm">
          <ul className="space-y-1.5" data-testid="brief-sentences">
            {b.output.sentences.map((x: { text: string; sourceIds: string[] }, i: number) => (
              <li key={i} className="leading-snug">{x.text}{x.sourceIds.map((sid) => <SourceChip key={sid} id={sid} map={map} />)}{!x.sourceIds.length && <Badge tone="red" className="ml-1">no source</Badge>}</li>
            ))}
          </ul>
          {!compact && (
            <div className="grid gap-3 md:grid-cols-2">
              <div><div className="text-xs font-semibold text-slate-500">Questions to ask</div><ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">{b.output.openQuestionsForClient.map((q: string) => <li key={q}>{q}</li>)}</ul></div>
              <div><div className="text-xs font-semibold text-slate-500">Prepare</div><ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700">{b.output.prepareDocuments.map((q: string) => <li key={q}>{q}</li>)}</ul></div>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Hover a source id to see the source. Numbers come from code. The brief prepares you — it does not advise.</p>
        </div>
      )}
    </Card>
  );
}

export function Timeline({ items, side }: { items: TimelineItem[]; side: 'rm' | 'client' }) {
  return (
    <ol className="relative space-y-2.5 border-l border-slate-200 pl-4" data-testid="timeline">
      {items.map((t) => (
        <li key={t.id} className="relative">
          <span className={clsx('absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white', t.actor === 'client' ? 'bg-sky-500' : t.actor === 'rm' ? 'bg-accent' : 'bg-slate-400', t.upcoming && 'bg-white ring-amber-500')} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="text-sm font-medium">{t.title}</span>
            <span className="tnum text-[11px] text-slate-500">{t.upcoming ? 'upcoming · ' : ''}{fmtDate(t.date)}</span>
          </div>
          {t.text && <p className="text-xs leading-snug text-slate-600">{t.text}</p>}
          {side === 'rm' && (
            <div className="mt-0.5 flex gap-1 text-[10px]">
              <span className={t.seenByClient ? 'text-sky-700' : 'text-slate-400'}>{t.seenByClient ? '● seen by client' : '○ not visible to client'}</span>
              <span className="text-slate-300">·</span>
              <span className={t.seenByRm ? 'text-accent' : 'text-slate-400'}>{t.seenByRm ? '● seen by RM' : '○ RM not aware'}</span>
              {t.kind === 'view' && <span className="text-slate-400">· behavioural signal, RM only — never used in client messages</span>}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function Client360({ id, embedded }: { id: string; embedded?: boolean }) {
  const { s } = useStore();
  const { byId } = usePlan();
  const c = clientById(id);
  const items = useMemo(() => (c ? timelineFor(c, s) : []), [c, s]);
  if (!c) return <Card className="p-6">Client not found.</Card>;
  const a = byId.get(id)!;
  const pmCommit = c.commitments.reduce((x, k) => x + k.commitmentEur, 0);
  const since = c.lastProactiveContact ? daysBetween(c.lastProactiveContact, SIM_TODAY) : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{c.name}</h1>
          <p className="text-sm text-slate-500">{c.age} · {c.occupation} · {since !== null ? `last proactive contact ${Math.round(since / 30)} months ago` : 'never contacted proactively'}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={a.lane === 'rm' ? 'teal' : a.lane === 'digital' ? 'blue' : 'slate'}>November: {laneLabel[a.lane]}</Badge>
            <span className="text-sm text-slate-700">{a.reason}</span>
          </div>
        </div>
        {!embedded && (
          <div className="flex flex-wrap gap-1.5">
            {id === 'albers' && <><Link href="/rm/client/albers/advice"><Button variant="primary">Advisory follow-up</Button></Link><Link href="/rm/client/albers/subscription"><Button>Subscription</Button></Link></>}
            {id === 'keller' && <Link href="/rm/client/keller/liquidity"><Button variant="primary">Liquidity view</Button></Link>}
            <Link href={`/client/${id}`}><Button>Client app</Button></Link>
            {(id === 'albers' || id === 'keller') && <Link href={`/split?client=${id}`}><Button>Split view</Button></Link>}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Brief id={id} />
          <Card className="p-4">
            <SectionTitle right={<span className="text-[11px] text-slate-500">same timeline the client sees in the app (minus RM notes and behaviour)</span>}>Shared timeline</SectionTitle>
            <Timeline items={items} side="rm" />
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-4" data-testid="portfolio">
            <SectionTitle>Portfolio (code)</SectionTitle>
            <table className="w-full text-sm"><tbody>
              {c.holdings.map((h) => <tr key={h.name} className="border-b border-slate-100"><td className="py-1">{ASSET[h.assetClass]}<div className="text-[11px] text-slate-500">{h.name}</div></td><td className="tnum py-1 text-right">{eur(h.valueEur)}</td></tr>)}
              <tr className="font-semibold"><td className="py-1">Assets with us</td><td className="tnum py-1 text-right">{eur(c.aumEur)}</td></tr>
            </tbody></table>
            <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-slate-500">Stated investable wealth</dt><dd className="tnum text-right">{eur(c.statedInvestableEur)}</dd>
              <dt className="text-slate-500"><Term t="share of wallet">Share of wallet</Term></dt><dd className="tnum text-right">{pct(c.aumEur / c.statedInvestableEur)}</dd>
              <dt className="text-slate-500">Held elsewhere</dt><dd className="tnum text-right">{eur(c.statedInvestableEur - c.aumEur)}</dd>
              <dt className="text-slate-500">Year to date</dt><dd className="tnum text-right">{(c.ytdReturn >= 0 ? '+' : '') + pct(c.ytdReturn)}</dd>
              <dt className="text-slate-500">Risk class · horizon</dt><dd className="tnum text-right">{c.riskClass} / 7 · {c.horizonYears} years</dd>
              <dt className="text-slate-500">Objectives</dt><dd className="text-right text-xs">{c.objectives.join(', ')}{c.goal ? ` · ${c.goal}` : ''}</dd>
            </dl>
          </Card>
          {c.commitments.length > 0 && (
            <Card className="p-4">
              <SectionTitle>Private markets</SectionTitle>
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500"><tr><th className="py-1">Fund</th><th className="text-right">Commitment</th><th className="text-right">Paid in</th><th className="text-right">Value</th></tr></thead>
                <tbody>{c.commitments.map((k) => <tr key={k.fundId} className="border-t border-slate-100"><td className="py-1">{fundById(k.fundId)?.name}</td><td className="tnum text-right">{eur(k.commitmentEur)}</td><td className="tnum text-right">{eur(k.calledEur)}</td><td className={clsx('tnum text-right', k.navEur < k.calledEur && 'text-amber-700')}>{eur(k.navEur)}</td></tr>)}</tbody>
              </table>
              <div className="mt-1 text-[11px] text-slate-500">Total commitments {eur(pmCommit)} · unfunded {eur(c.commitments.reduce((x, k) => x + k.commitmentEur - k.calledEur, 0))}</div>
            </Card>
          )}
          <Card className="p-4">
            <SectionTitle>Signals this month</SectionTitle>
            <ul className="space-y-1.5 text-sm">
              {a.signals.map((x, i) => (
                <li key={i} className="flex items-start justify-between gap-2">
                  <span><b className="font-medium">{x.origin === 'ai' ? '✦ ' : ''}{SIGNAL_LABEL[x.type]}</b> — {x.summary}{x.quote && <span className="block text-xs italic text-slate-500">“{x.quote}”</span>}</span>
                  <span className="shrink-0">{x.origin === 'ai' ? <Badge tone={x.confidence < 0.6 ? 'amber' : 'violet'}>AI · {Math.round(x.confidence * 100)}%{x.confidence < 0.6 ? ' · please verify' : ''}</Badge> : <Badge>data</Badge>}</span>
                </li>
              ))}
              {!a.signals.length && <li className="text-slate-500">No signals.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
