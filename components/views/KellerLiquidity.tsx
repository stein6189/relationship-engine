'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { useStore, uid } from '@/lib/state/store';
import { useAi } from '@/lib/ai/client';
import { clientById, fundById } from '@/lib/data';
import { kellerFacts, KELLER_BRIDGE_MONTHS } from '@/lib/facts';
import { liquidityGap } from '@/lib/rules/liquidity';
import { bridgeOption, sellOption, transferOption } from '@/lib/rules/lombard';
import { numberGuard } from '@/lib/rules/numberGuard';
import { eur, eurShort, fmtDate, pct } from '@/lib/rules/format';
import { LENDING_VALUES, SIM_TODAY, STRESS, LOMBARD_RATE } from '@/lib/rules/config';
import { AiMetaBadge } from '@/components/AiMetaBadge';
import { GuardedText } from '@/components/GuardedText';
import { Badge, Button, Card, SectionTitle, Spinner, Term } from '@/components/ui';

export type OptionId = 'sell' | 'bridge' | 'transfer';
const MONTHS = ['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10'];

export function kellerNumbers() {
  const c = clientById('keller')!;
  const gap = liquidityGap(c, SIM_TODAY);
  return { c, gap, bridge: bridgeOption(c, gap.gapEur, KELLER_BRIDGE_MONTHS), sell: sellOption(c, gap.gapEur), transfer: transferOption(gap.gapEur) };
}

export const OPTION_LABEL: Record<OptionId, string> = { sell: 'Sell ETFs', bridge: 'Liquidity bridge (loan against portfolio)', transfer: 'Transfer from bank account' };

function LiquidityChart() {
  const { c } = kellerNumbers();
  const data = useMemo(() => {
    let cash = c.holdings.filter((h) => h.assetClass === 'cash').reduce((s, h) => s + h.valueEur, 0);
    return MONTHS.map((m) => {
      const ev = c.cashflows.filter((e) => e.date.startsWith(m));
      const calls = ev.filter((e) => e.type === 'call').reduce((s, e) => s + e.amountEur, 0);
      const dists = ev.filter((e) => e.type === 'distribution').reduce((s, e) => s + e.amountEur, 0);
      cash += dists - calls;
      const label = new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
      return { label, calls: -calls, dists, cash, indicative: ev.some((e) => e.type === 'distribution' && e.status === 'indicative'), callIndicative: ev.some((e) => e.type === 'call' && e.status === 'indicative') };
    });
  }, [c]);
  return (
    <div className="h-64" data-testid="liquidity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
          <YAxis tickFormatter={(v) => eurShort(v)} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} width={56} />
          <Tooltip formatter={(v: number, n: string) => [eur(v), n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="#94A3B8" />
          <Bar isAnimationActive={false} dataKey="calls" name="Capital calls" fill="#B91C1C" radius={[0, 0, 3, 3]} maxBarSize={28}>
            {data.map((d, i) => <Cell key={i} fill={d.callIndicative ? '#FCA5A5' : '#B91C1C'} />)}
          </Bar>
          <Bar isAnimationActive={false} dataKey="dists" name="Distributions (indicative)" fill="#0F766E" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {data.map((d, i) => <Cell key={i} fill={d.indicative ? '#5EEAD4' : '#0F766E'} />)}
          </Bar>
          <Line isAnimationActive={false} type="stepAfter" dataKey="cash" name="Free cash if nothing is done" stroke="#0F172A" strokeWidth={2} dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KellerLiquidity({ embedded }: { embedded?: boolean }) {
  const { s, update, ready } = useStore();
  const ai = useAi();
  const k = s.keller;
  const { c, gap, bridge, sell, transfer } = kellerNumbers();
  const facts = useMemo(() => kellerFacts(), []);
  const [busy, setBusy] = useState<string>('');
  const [body, setBody] = useState<string | null>(null);
  const setK = (patch: Partial<typeof k>) => update((x) => ({ ...x, keller: { ...x.keller, ...patch } }));

  async function explainAll() {
    setBusy('explain');
    const res = await Promise.all((['sell', 'bridge', 'transfer'] as OptionId[]).map(async (id) => {
      const r = await ai<any>('explain_option', { cacheKey: `keller_${id}`, optionId: id, facts }, { clientId: 'keller', label: `Option · ${OPTION_LABEL[id]}` });
      return [id, { output: r.output, meta: r.meta }] as const;
    }));
    update((x) => ({ ...x, keller: { ...x.keller, explanations: Object.fromEntries(res) } }));
    setBusy('');
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && !Object.keys(k.explanations).length) void explainAll(); }, [ready]);

  async function draftMessage(opt: OptionId) {
    setBusy('draft');
    setK({ option: opt, draft: undefined, draftMeta: undefined, messageApproved: false, clientConfirmed: false });
    const r = await ai<any>('draft_touchpoint', {
      cacheKey: `keller_${opt}`, client: { firstName: c.firstName, tonePreference: 'direct, brief' }, trigger: `capital_call_gap · RM proposes: ${OPTION_LABEL[opt]}`, facts,
      history: ['client asked twice why Atlas Growth V shows a loss', `RM chose option: ${opt}`], note: 'The RM has chosen this option and will approve the message. Write the client message in the RM voice (messageType advisory: RM-owned proposal, not AI advice). Explain the call and the option; state costs, risks and conditions plainly.',
    }, { clientId: 'keller', label: `Capital call message · ${opt}` });
    setK({ option: opt, draft: r.output, draftMeta: r.meta, messageApproved: false });
    setBody(null);
    setBusy('');
  }

  const msg = body ?? k.draft?.body ?? '';
  const g = numberGuard(`${k.draft?.subject ?? ''}\n${msg}`, facts);
  const approveMsg = () => update((x) => ({
    ...x, keller: { ...x.keller, messageApproved: true, draft: { ...x.keller.draft, body: msg } },
    inbox: { ...x.inbox, keller: [{ id: uid(), subject: k.draft.subject, body: msg, date: SIM_TODAY, kind: 'message' }, ...(x.inbox.keller ?? []).filter((m) => m.subject !== k.draft.subject)] },
  }));

  const rows: { id: OptionId; cost: string; aum: string; fee: string; note: React.ReactNode }[] = [
    { id: 'sell', cost: `${eur(sell.taxEur)} tax (simplified estimate)`, aum: `−${eur(gap.gapEur)}`, fee: `−${eur(sell.feeLostPaEur)} p.a.`, note: <>Realises gains: {pct(sell.realisedGainEur / gap.gapEur, 0)} of the amount sold is gain → {eur(sell.realisedGainEur)} × 26.375%. Simplified: before the 30% partial exemption for equity funds (Teilfreistellung), which would lower it to about {eur(sell.taxWithPartialExemptionEur)}.</> },
    { id: 'bridge', cost: `${eur(bridge.interestEur)} interest (${KELLER_BRIDGE_MONTHS} months at ${pct(LOMBARD_RATE)})`, aum: 'unchanged', fee: '±€0', note: <><Badge tone="amber">Concept option — product availability assumed</Badge> Covered under stress test: {bridge.coveredUnderStress ? 'yes' : 'no'}.</> },
    { id: 'transfer', cost: '€0', aum: `+${eur(transfer.aumChangeEur)}`, fee: `+${eur(transfer.feeGainPaEur)} p.a.`, note: <>Only if the client confirms the cash is available — ask the client.</> },
  ];

  return (
    <div className="space-y-4" data-testid="liquidity">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Liquidity · Dr. Thomas Keller</h1>
          <p className="text-sm text-slate-500">Private account (the ETFs and funds below) · also invests via Keller Beteiligungs GmbH, not shown · {eur(c.aumEur)} with us · next <Term t="capital call">capital call</Term> {eur(gap.callsEur)} on {fmtDate(gap.firstDueDate!)}.</p>
        </div>
        {!embedded && <div className="flex gap-1.5"><Link href="/rm/client/keller"><Button>Client 360</Button></Link><Link href="/split?client=keller"><Button variant="primary">Split view</Button></Link></div>}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700" data-testid="guardrail">Guardrail: credit is only suggested when a liquidity need is detected — never to invest more. Credit and eligibility are decided by rules and the RM, not by AI.</div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-4">
          <SectionTitle right={<span className="text-[11px] text-slate-500">dark = confirmed · light = indicative</span>}>Next 12 months</SectionTitle>
          <LiquidityChart />
          <ul className="mt-2 grid gap-x-4 text-xs text-slate-600 md:grid-cols-2">
            {c.cashflows.filter((e) => e.date >= SIM_TODAY).map((e) => <li key={e.id} className="tnum">{fmtDate(e.date)} · {e.type === 'call' ? 'call' : 'distribution'} {fundById(e.fundId)?.name} {eur(e.amountEur)} <span className="text-slate-400">({e.status})</span></li>)}
          </ul>
        </Card>
        <Card className="p-4" data-testid="gap-steps">
          <SectionTitle right={<Badge tone="teal">code</Badge>}>Liquidity gap, step by step</SectionTitle>
          <table className="w-full text-sm"><tbody className="tnum">
            {gap.steps.map((st, i) => <tr key={st.label} className={clsx('border-b border-slate-100', i === gap.steps.length - 1 && 'font-semibold text-red-700')}><td className="py-1.5">{st.label}</td><td className="text-right">{eur(st.valueEur)}</td></tr>)}
          </tbody></table>
          <p className="mt-2 text-xs text-slate-500">The Meridian Buyout IV distribution of {eur(c.cashflows.find((e) => e.type === 'distribution')!.amountEur)} expected {fmtDate(c.cashflows.find((e) => e.type === 'distribution')!.date)} is <Term t="distribution">indicative</Term> and comes after the due date, so it is not counted.</p>
          <p className="mt-2 text-xs text-slate-500">Atlas Growth V: paid in {eur(c.commitments.find((x) => x.fundId === 'ag5')!.calledEur)}, value {eur(c.commitments.find((x) => x.fundId === 'ag5')!.navEur)} → normal <Term t="J-curve">J-curve</Term> in year 2.</p>
        </Card>
      </div>

      <Card className="p-4" data-testid="options">
        <SectionTitle right={busy === 'explain' && <Spinner />}>Options to cover {eur(gap.gapEur)} (numbers from code · one-line explanation from AI)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Option</th><th>One-off cost</th><th>Assets with us</th><th title="Shown for transparency. Not a decision criterion — the RM decides by the client's interest.">Our revenue (internal)</th><th className="w-[34%]">What it means (AI, for the RM)</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => {
                const ex = k.explanations[r.id];
                const eg = ex?.output ? numberGuard(ex.output.sentence, facts) : null;
                return (
                  <tr key={r.id} className={clsx('border-t border-slate-100 align-top', k.option === r.id && 'bg-teal-50/60')} data-testid={`option-${r.id}`}>
                    <td className="py-2 pr-2 font-medium">{OPTION_LABEL[r.id]}<div className="mt-0.5 text-[11px] font-normal text-slate-600">{r.note}</div></td>
                    <td className="tnum py-2 pr-2">{r.cost}</td>
                    <td className="tnum whitespace-nowrap py-2 pr-2">{r.aum}</td>
                    <td className="tnum whitespace-nowrap py-2 pr-2">{r.fee}</td>
                    <td className="py-2 pr-2 text-xs">
                      {ex?.output ? <><GuardedText text={ex.output.sentence} unsupported={eg?.unsupported.map((u) => u.raw) ?? []} /><div className="mt-1"><AiMetaBadge meta={ex.meta} output={ex.output} facts={facts} confidence={ex.output.confidence} /></div></> : ex ? <span className="text-amber-700">Needs review — AI output could not be validated</span> : <span className="text-slate-400">…</span>}
                    </td>
                    <td className="py-2"><Button variant={k.option === r.id ? 'primary' : 'secondary'} className="text-xs" disabled={busy === 'draft'} onClick={() => draftMessage(r.id)} data-testid={`pick-${r.id}`}>{k.option === r.id ? 'Chosen' : 'Choose'}</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Tax: simplified estimate for a private account — 26.375% (25% flat tax + 5.5% solidarity surcharge, no church tax) on the full gain; the tax adviser confirms. Revenue column at 0.75% p.a. (assumption) is internal and not a decision criterion. The RM chooses — the AI explains consequences and never recommends.</p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <Card className="p-4" data-testid="stress-test">
          <SectionTitle right={<Badge tone={bridge.coveredUnderStress ? 'green' : 'red'}>{bridge.coveredUnderStress ? 'covered — no top-up' : `top-up ${eur(bridge.topUpEur)}`}</Badge>}>Stress test for the bridge (code)</SectionTitle>
          <table className="w-full text-xs"><thead className="text-left text-slate-500"><tr><th className="py-1">Asset</th><th className="text-right">Value</th><th className="text-right"><Term t="lending value">Lending value</Term></th><th className="text-right">Credit line</th><th className="text-right">After stress</th></tr></thead>
            <tbody className="tnum">
              {c.holdings.filter((h) => h.assetClass !== 'cash' && h.assetClass !== 'pm').map((h) => {
                const lv = LENDING_VALUES[h.assetClass];
                const shock = h.assetClass === 'equity_etf' ? STRESS.equity : h.assetClass === 'bond_etf' ? STRESS.bond : 0;
                return <tr key={h.name} className="border-t border-slate-100"><td className="py-1">{h.name} <span className="text-slate-400">({pct(shock, 0)})</span></td><td className="text-right">{eur(h.valueEur)}</td><td className="text-right">{pct(lv, 0)}</td><td className="text-right">{eur(h.valueEur * lv)}</td><td className="text-right">{eur(h.valueEur * (1 + shock) * lv)}</td></tr>;
              })}
              <tr className="border-t border-slate-100 text-slate-500"><td className="py-1">Private markets (not pledgeable)</td><td className="text-right">{eur(c.holdings.filter((h) => h.assetClass === 'pm').reduce((x, h) => x + h.valueEur, 0))}</td><td className="text-right">0%</td><td className="text-right">€0</td><td className="text-right">€0</td></tr>
              <tr className="border-t border-slate-300 font-semibold"><td className="py-1" colSpan={3}>Total</td><td className="text-right">{eur(bridge.creditLineEur)}</td><td className="text-right">{eur(bridge.stressedLineEur)}</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-600">Loan {eur(gap.gapEur)} ≤ stressed credit line {eur(bridge.stressedLineEur)} → still covered if equities fall 30% and bonds 10%.</p>
        </Card>

        <Card className="p-4" data-testid="keller-message">
          <SectionTitle right={k.draftMeta && <AiMetaBadge meta={k.draftMeta} output={k.draft} facts={facts} hideGuard />}>Message to Thomas</SectionTitle>
          {!k.option && <p className="text-sm text-slate-500">Choose an option above. The AI drafts a message in your name; you approve it before the client sees anything.</p>}
          {busy === 'draft' && <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Drafting…</div>}
          {k.option && busy !== 'draft' && k.draft && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5"><Badge tone="violet">RM proposal · {OPTION_LABEL[k.option]}</Badge><Badge tone={g.pass ? 'green' : 'red'}>{g.pass ? 'numbers ✓' : `number check ✗ ${g.unsupported.map((u) => u.raw).join(', ')}`}</Badge>{k.messageApproved && <Badge tone="green">approved · in client app</Badge>}{k.clientConfirmed && <Badge tone="green">client confirmed</Badge>}</div>
              <div className="text-sm font-medium">{k.draft.subject}</div>
              {k.messageApproved
                ? <p className="rounded-lg bg-slate-50 p-2 text-sm"><GuardedText text={msg} unsupported={g.unsupported.map((u) => u.raw)} /></p>
                : <textarea aria-label="Message to client" className="h-36 w-full rounded border border-slate-300 p-1.5 text-sm" value={msg} onChange={(e) => setBody(e.target.value)} />}
              {!k.messageApproved && <div className="flex justify-end"><Button variant="primary" disabled={!g.pass} onClick={approveMsg} data-testid="approve-keller-msg">Approve &amp; send to app</Button></div>}
            </div>
          )}
          {k.option && busy !== 'draft' && !k.draft && <p className="text-sm text-amber-800">Needs review — AI output could not be validated. Write the message yourself or retry.</p>}
        </Card>
      </div>
    </div>
  );
}
