'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/lib/state/store';
import { useAi } from '@/lib/ai/client';
import { clientById } from '@/lib/data';
import { albersRuleResults, albersAllFacts } from '@/lib/albers';
import { subscriptionSteps, PREFILLED_FIELDS, firstCallEur, firstClose, type StepState } from '@/lib/subscription';
import { eur, fmtDate } from '@/lib/rules/format';
import { AiMetaBadge } from '@/components/AiMetaBadge';
import { Badge, Button, Card, SectionTitle, Spinner, Term } from '@/components/ui';

const CLARIFY_DEFAULT = 'Meeting 5 Nov: client invested directly in startups as an angel investor (one exit in 2019); no investments in private equity funds. Questionnaire to be corrected from "none" to "some (direct, no funds)".';

export function StepDot({ state, n }: { state: StepState; n: number }) {
  return <span className={clsx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold', state === 'done' ? 'bg-green-600 text-white' : state === 'open' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500')}>{state === 'done' ? '✓' : state === 'locked' ? '🔒︎' : n}</span>;
}

export function AlbersSubscription({ embedded }: { embedded?: boolean }) {
  const { s, update, ready } = useStore();
  const ai = useAi();
  const a = s.albers;
  const c = clientById('albers')!;
  const rules = albersRuleResults(a.attested);
  const steps = subscriptionSteps(a);
  const [busy, setBusy] = useState(false);
  const [attestTick, setAttestTick] = useState(false);
  const setA = (patch: Partial<typeof a>) => update((x) => ({ ...x, albers: { ...x.albers, ...patch } }));
  const facts = useMemo(() => albersAllFacts(), []);

  async function runCheck() {
    setBusy(true);
    const r = await ai<any>('check_qualification_consistency', {
      cacheKey: 'albers', questionnaire: c.questionnaire,
      sources: c.items.map((i) => ({ id: i.id, date: i.date, kind: i.kind, text: i.text })), meetingNotes: { id: 'notes', text: a.notes }, facts,
    }, { clientId: 'albers', label: 'Qualification consistency · Albers' });
    setA({ consistency: r.output ?? { findings: [], invalid: true }, consistencyMeta: r.meta });
    setBusy(false);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && !a.consistency) void runCheck(); }, [ready]);

  const findings: any[] = a.consistency?.findings ?? [];
  const rulesPass = rules.allRulesPass;
  const canAttest = rulesPass && !!a.consistency && (findings.length === 0 && !a.consistency.invalid || (a.contradictionReviewed && !!(a.clarification ?? '').trim())) && attestTick;

  return (
    <div className="space-y-4" data-testid="subscription">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Subscription · Claudia Albers · Meridian Buyout V</h1>
          <p className="text-sm text-slate-500">€200,000 commitment. RM and client see the same five steps. Signing stays locked until the suitability statement and costs are read (MiFID II).</p>
        </div>
        {!embedded && <div className="flex gap-1.5"><Link href="/rm/client/albers/advice"><Button>← Advisory follow-up</Button></Link><Link href="/split?client=albers"><Button variant="primary">Split view</Button></Link></div>}
      </div>

      <Card className="p-3">
        <ol className="grid gap-2 md:grid-cols-5" data-testid="steps">
          {steps.map((st) => (
            <li key={st.n} className={clsx('flex gap-2 rounded-lg p-2', st.state === 'open' && 'bg-teal-50', st.state === 'done' && 'bg-green-50')} data-testid={`step-${st.n}`} data-state={st.state}>
              <StepDot state={st.state} n={st.n} />
              <div><div className="text-sm font-medium leading-tight">{st.title}</div><div className="text-[11px] text-slate-500">{st.who}</div><div className="mt-0.5 text-[11px] text-slate-700">{st.detail}</div></div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4" data-testid="qual-checks">
          <SectionTitle right={a.attested ? <Badge tone="green">step 1 done</Badge> : <Badge tone="teal">RM only</Badge>}>1 · Investor qualification</SectionTitle>
          <p className="mb-2 text-xs text-slate-500">Based on <Term t="KAGB">KAGB</Term> criteria for semi-professional investors (prototype — to be confirmed by Legal). Rules decide; AI only points out contradictions; the RM attests.</p>
          <ul className="space-y-1 text-sm">
            {rules.checks.map((k) => (
              <li key={k.id} className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1">
                <span>{k.label}<span className="ml-1 text-[11px] text-slate-500">{k.kind === 'legal' ? 'legal' : k.kind === 'internal' ? 'internal guardrail' : 'human judgment'}</span></span>
                <span className="flex shrink-0 items-center gap-1.5"><span className="tnum text-xs text-slate-500">{k.detail}{k.id === 'quest' && a.contradictionReviewed ? ' · update pending' : ''}</span>{k.pass === null ? <Badge tone="amber">RM</Badge> : k.pass ? <Badge tone="green">✓</Badge> : <Badge tone="red">✗</Badge>}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card className="p-4" data-testid="consistency">
            <SectionTitle right={a.consistencyMeta && <AiMetaBadge meta={a.consistencyMeta} output={a.consistency} />}>✦ Consistency check (AI, fast model)</SectionTitle>
            {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner /> Comparing questionnaire with notes and messages…</div>}
            {!busy && a.consistency?.invalid && <p className="text-sm text-amber-900" data-testid="needs-review"><b>Needs review — AI output could not be validated.</b> Check the questionnaire against the notes yourself, or re-run.{!a.attested && <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={!!a.contradictionReviewed} onChange={(e) => setA({ contradictionReviewed: e.target.checked })} /> I checked questionnaire and notes myself.</label>}</p>}
            {!busy && a.consistency && !a.consistency.invalid && findings.length === 0 && <p className="text-sm text-green-800">No contradictions found.</p>}
            {!busy && findings.map((f, i) => (
              <div key={i} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" data-testid="contradiction">
                <div className="flex items-center justify-between gap-2"><b>Contradiction: {f.field === 'peExperience' ? 'private equity experience' : f.field}</b>{f.confidence < 0.6 ? <Badge tone="amber">Please verify</Badge> : <Badge tone="violet">confidence {Math.round(f.confidence * 100)}%</Badge>}</div>
                <div className="mt-1">Questionnaire says: <b>“{f.questionnaireValue}”</b></div>
                {f.conflictingEvidence.map((e: any) => <div key={e.sourceId} className="mt-1">But <span className="font-mono text-xs">{e.sourceId}</span>: <i>“{e.quote}”</i></div>)}
                <div className="mt-1 text-xs text-slate-700">{f.whyItMatters}</div>
                <div className="mt-1 text-xs">Ask the client: “{f.suggestedQuestionForClient}”</div>
                {!a.attested ? (
                  <div className="mt-2 space-y-1">
                    <label className="block text-xs font-medium">What did the client say? (recorded in the audit record)
                      <textarea aria-label="Clarification" className="mt-0.5 h-14 w-full rounded border border-amber-300 bg-white p-1.5 text-xs font-normal" value={a.clarification ?? CLARIFY_DEFAULT} onChange={(e) => setA({ clarification: e.target.value })} data-testid="clarification" />
                    </label>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!a.contradictionReviewed} onChange={(e) => setA({ contradictionReviewed: e.target.checked, clarification: a.clarification ?? CLARIFY_DEFAULT })} data-testid="contradiction-reviewed" /> Clarified with the client. Questionnaire update is logged as pending.</label>
                  </div>
                ) : <div className="mt-2 text-xs"><b>Clarified:</b> {a.clarification} <Badge tone="amber">questionnaire update pending</Badge></div>}
              </div>
            ))}
            {!busy && <Button className="mt-2 text-xs" variant="ghost" onClick={runCheck} disabled={a.attested}>Re-run check</Button>}
          </Card>

          <Card className={clsx('p-4', a.attested && 'border-green-300 bg-green-50/40')} data-testid="attestation">
            <SectionTitle>RM attestation</SectionTitle>
            {a.attested ? (
              <p className="text-sm"><Badge tone="green">Attested</Badge> by Jonas Weber · {fmtDate('2026-11-06')}. Albers moved to “Qualified” in the pipeline.</p>
            ) : (
              <>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={attestTick} onChange={(e) => setAttestTick(e.target.checked)} data-testid="attest-tick" /> I am sufficiently satisfied that the client can make their own investment decisions and understands the risks.</label>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500">{!rulesPass ? 'A rule check failed.' : findings.length && !a.contradictionReviewed ? 'Review the contradiction first.' : 'Never automated — this is your judgment.'}</span>
                  <Button variant="primary" disabled={!canAttest} onClick={() => setA({ attested: true, attestedAt: new Date().toISOString() })} data-testid="attest">Complete qualification</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4">
          <SectionTitle>2 · Suitability + costs</SectionTitle>
          <p className="text-sm">{a.audit ? <>Delivered {fmtDate('2026-11-06')}. {a.ack ? <Badge tone="green">Client: “I have read and understood”</Badge> : <Badge tone="amber">waiting for the client</Badge>}</> : <>Not sent yet. <Link href="/rm/client/albers/advice" className="text-accent underline">Approve the documentation</Link>.</>}</p>
        </Card>
        <Card className="p-4">
          <SectionTitle>3 · Documents (pre-filled)</SectionTitle>
          <table className="w-full text-xs"><tbody>{PREFILLED_FIELDS.map((f) => <tr key={f.field} className="border-b border-slate-100"><td className="py-0.5 text-slate-500">{f.field}</td><td className="py-0.5">{f.value}</td><td className="py-0.5 text-right text-[10px] text-slate-400">{f.source}</td></tr>)}</tbody></table>
        </Card>
        <Card className="p-4">
          <SectionTitle>4–5 · Signature and funding</SectionTitle>
          <p className="text-sm">{a.signed ? <Badge tone="green">Signed by client</Badge> : <Badge>{steps[3].state === 'locked' ? 'locked' : 'ready — client signs in the app'}</Badge>}</p>
          <p className="mt-2 text-sm">First capital call: <b className="tnum">{eur(firstCallEur())}</b> (20% of commitment) at first close on {fmtDate(firstClose())}.</p>
          {a.funded && <Badge tone="green" className="mt-1">Transfer instructed</Badge>}
        </Card>
      </div>
    </div>
  );
}
