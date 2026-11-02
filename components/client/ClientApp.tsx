'use client';
import { useMemo, useRef, useState, useEffect } from 'react';
import clsx from 'clsx';
import { useStore, uid, type InboxMsg } from '@/lib/state/store';
import { usePlan } from '@/lib/state/usePlan';
import { useAi } from '@/lib/ai/client';
import { clientById, fundById } from '@/lib/data';
import { factsFor } from '@/lib/facts';
import { timelineFor } from '@/lib/timeline';
import { numberGuard } from '@/lib/rules/numberGuard';
import { eur, fmtDate, pct } from '@/lib/rules/format';
import { liquidityGap } from '@/lib/rules/liquidity';
import { SIM_TODAY } from '@/lib/rules/config';
import { SUGGESTED, cacheKeyFor, ADVICE_REPLY } from '@/lib/clientQa';
import { subscriptionSteps, PREFILLED_FIELDS, firstCallEur, firstClose } from '@/lib/subscription';
import { exAnteCosts } from '@/lib/rules/costs';
import { ALBERS_COMMITMENT } from '@/lib/facts';
import { Timeline } from '@/components/views/Client360';

type Tab = 'home' | 'invest' | 'activity' | 'ask';
const ASSET: Record<string, string> = { equity_etf: 'Equity ETFs', bond_etf: 'Bond ETFs', cash: 'Cash', money_market: 'Money market', single_stock: 'Stocks', pm: 'Private markets' };
const ASSET_COLOR: Record<string, string> = { equity_etf: 'bg-teal-700', bond_etf: 'bg-teal-400', cash: 'bg-slate-300', money_market: 'bg-slate-400', single_stock: 'bg-sky-600', pm: 'bg-amber-500' };

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[844px] w-[390px] shrink-0 overflow-hidden rounded-[48px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl" data-testid="phone">
      <div className="absolute left-1/2 top-2 z-30 h-7 w-28 -translate-x-1/2 rounded-full bg-slate-900" />
      <div className="relative flex h-full flex-col overflow-hidden rounded-[38px] bg-[#F6F7F9]">{children}</div>
    </div>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <section className="mt-5"><div className="mb-2 flex items-center justify-between px-1"><h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">{title}</h3>{right}</div>{children}</section>;
}
const Panel = ({ children, className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={clsx('rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]', className)} {...p}>{children}</div>;
const Primary = ({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button className={clsx('w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-white active:scale-[0.99] disabled:bg-slate-300', className)} {...p} />;
const Secondary = ({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button className={clsx('w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] font-semibold text-ink active:scale-[0.99]', className)} {...p} />;

export function ClientApp({ id }: { id: string }) {
  const c = clientById(id)!;
  const [tab, setTab] = useState<Tab>('home');
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [tab]);
  const isAlbers = id === 'albers';
  const tabs: [Tab, string, string][] = [['home', 'Home', '⌂'], ...(isAlbers ? [['invest', 'Invest', '◎'] as [Tab, string, string]] : []), ['activity', 'Activity', '≡'], ['ask', 'Ask', '?']];
  return (
    <PhoneFrame>
      <div className="flex items-center justify-between px-7 pb-1 pt-3.5 text-[13px] font-semibold text-ink"><span>9:41</span><span className="tracking-tight">●●● ▮</span></div>
      <div ref={scroller} className="flex-1 overflow-y-auto px-4 pb-6" data-testid="client-scroll">
        {tab === 'home' && <Home id={id} go={setTab} />}
        {tab === 'invest' && <Invest />}
        {tab === 'activity' && <Activity id={id} />}
        {tab === 'ask' && <Ask id={id} />}
      </div>
      <nav className="grid border-t border-slate-200 bg-white/95 pb-5 pt-1.5 backdrop-blur" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }} aria-label="Client app tabs">
        {tabs.map(([t, label, icon]) => (
          <button key={t} onClick={() => setTab(t)} className={clsx('flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium', tab === t ? 'text-accent' : 'text-slate-400')} data-testid={`ctab-${t}`} aria-current={tab === t}>
            <span className="text-lg leading-none">{icon}</span>{label}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-1.5 left-1/2 h-1 w-32 -translate-x-1/2 rounded-full bg-slate-900" />
    </PhoneFrame>
  );
}

function TalkButton({ id, compact }: { id: string; compact?: boolean }) {
  const { s, update } = useStore();
  const asked = s.escalations.includes(id);
  const talk = () => update((x) => ({
    ...x, escalations: x.escalations.includes(id) ? x.escalations : [...x.escalations, id],
    requests: [{ id: uid(), clientId: id, text: 'I would like to talk to my advisor.', kind: 'talk', at: new Date().toISOString() }, ...x.requests],
  }));
  if (asked) return <div className={clsx('rounded-xl bg-teal-50 text-center font-medium text-accent-dark', compact ? 'px-3 py-2 text-[13px]' : 'px-4 py-3 text-[15px]')} data-testid="talk-sent">✓ Jonas has your request and will call you</div>;
  return compact ? <button onClick={talk} className="text-[13px] font-semibold text-accent" data-testid="talk-to-advisor">Talk to my advisor</button> : <Secondary onClick={talk} data-testid="talk-to-advisor">Talk to my advisor</Secondary>;
}

function MessageCard({ m, id }: { m: InboxMsg; id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel className="space-y-1.5" data-testid="client-message">
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-full bg-teal-100 text-[13px] font-semibold text-accent-dark">JW</span><div className="min-w-0 flex-1"><div className="truncate text-[15px] font-semibold">{m.subject}</div><div className="text-[12px] text-slate-500">Jonas Weber · {fmtDate(m.date)}</div></div></div>
      <p className={clsx('whitespace-pre-line text-[14px] leading-relaxed text-slate-700', !open && 'line-clamp-6')}>{m.body}</p>
      {m.body.length > 320 && <button className="text-[13px] font-medium text-accent" onClick={() => setOpen(!open)}>{open ? 'Less' : 'Read all'}</button>}
      <div className="pt-1 text-[11px] text-slate-400">Sent by your advisor</div>
    </Panel>
  );
}

function Home({ id, go }: { id: string; go: (t: Tab) => void }) {
  const { s, update } = useStore();
  const { byId } = usePlan();
  const c = clientById(id)!;
  const a = byId.get(id);
  const inbox = (s.inbox[id] ?? []).filter((m) => m.kind === 'message');
  const gap = liquidityGap(c, SIM_TODAY);
  const ag5 = c.commitments.find((k) => k.fundId === 'ag5');
  const upcomingCall = c.cashflows.find((e) => e.type === 'call' && e.date >= SIM_TODAY && e.status === 'confirmed');
  const plannedContact = a?.lane === 'rm' || s.escalations.includes(id);
  return (
    <div>
      <div className="pt-3 text-[15px] text-slate-500">Good morning, {c.firstName}</div>
      <div className="mt-3 text-[13px] text-slate-500">Your portfolio</div>
      <div className="tnum text-[34px] font-semibold leading-tight tracking-tight" data-testid="client-value">{eur(c.aumEur)}</div>
      <div className={clsx('tnum text-[14px] font-medium', c.ytdReturn >= 0 ? 'text-green-700' : 'text-red-700')}>{c.ytdReturn >= 0 ? '+' : ''}{pct(c.ytdReturn)} this year</div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full">{c.holdings.map((h) => <div key={h.name} className={ASSET_COLOR[h.assetClass]} style={{ width: `${(h.valueEur / c.aumEur) * 100}%` }} />)}</div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-600">{c.holdings.map((h) => <span key={h.name} className="flex items-center gap-1"><span className={clsx('h-2 w-2 rounded-full', ASSET_COLOR[h.assetClass])} />{ASSET[h.assetClass]} <span className="tnum">{eur(h.valueEur)}</span></span>)}</div>

      <Panel className="mt-5 flex items-start gap-3" data-testid="advisor-card">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 font-semibold text-accent-dark">JW</span>
        <div className="flex-1">
          <div className="text-[15px] font-semibold">Jonas Weber, your advisor</div>
          <div className="text-[14px] text-slate-600">{id === 'albers' ? (s.albers.audit ? 'Thank you for meeting on 5 Nov. Your documents are ready to read.' : 'Thank you for meeting on 5 Nov. Jonas is preparing your documents.') : plannedContact ? 'Jonas will contact you personally this month.' : 'No action needed. Jonas sends you a short update every quarter.'}</div>
        </div>
      </Panel>

      {id === 'albers' && s.albers.audit && !s.albers.signed && (
        <button onClick={() => go('invest')} className="mt-3 w-full rounded-2xl bg-ink p-4 text-left text-white" data-testid="albers-cta">
          <div className="text-[13px] text-slate-300">Meridian Buyout V</div>
          <div className="text-[16px] font-semibold">{s.albers.ack ? 'Next: sign your subscription' : '2 documents to read before you sign'}</div>
          <div className="mt-1 text-[13px] text-teal-200">Open →</div>
        </button>
      )}

      {upcomingCall && ag5 && (
        <Section title="Coming up">
          <Panel data-testid="capital-call-card">
            <div className="flex items-start justify-between gap-2"><div><div className="text-[13px] text-slate-500">Capital call · {fundById(upcomingCall.fundId)?.name}</div><div className="tnum text-[22px] font-semibold">{eur(upcomingCall.amountEur)}</div></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-800">due {fmtDate(upcomingCall.date)}</span></div>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-700">When you invested in this fund you committed {eur(ag5.commitmentEur)}. The fund asks for it step by step, when it buys companies. This is the next step.</p>
            {gap.gapEur > 0 && <div className="tnum mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-[12px]"><div><div className="text-slate-500">Needed</div><div className="text-[15px] font-semibold">{eur(gap.callsEur)}</div></div><div><div className="text-slate-500">Your cash</div><div className="text-[15px] font-semibold">{eur(gap.freeCashEur)}</div></div><div><div className="text-slate-500">Still to cover</div><div className="text-[15px] font-semibold text-amber-700">{eur(gap.gapEur)}</div></div></div>}
            {id === 'keller' && !s.keller.messageApproved && <p className="mt-2 text-[13px] text-slate-500">Jonas is preparing options for you.</p>}
            {id === 'keller' && s.keller.messageApproved && (
              <div className="mt-3 space-y-2" data-testid="keller-proposal">
                <div className="text-[13px] font-semibold text-accent-dark">Jonas’s proposal</div>
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-700">{s.keller.draft?.body}</p>
                {s.keller.clientConfirmed ? <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-[15px] font-medium text-green-800">✓ Jonas will call you to set it up</div>
                  : <><Primary onClick={() => update((x) => ({ ...x, keller: { ...x.keller, clientConfirmed: true } }))} data-testid="keller-confirm">Sounds good — let’s set it up</Primary><TalkButton id={id} /></>}
                <p className="text-[11px] leading-snug text-slate-400">Nothing is executed from this screen. Jonas confirms the details with you first.{s.keller.option === 'bridge' ? ' The loan is a concept in this prototype — no credit agreement is made here.' : ''}</p>
              </div>
            )}
          </Panel>
        </Section>
      )}

      {ag5 && ag5.navEur < ag5.calledEur && (
        <Section title="Explained">
          <Panel data-testid="jcurve-card">
            <div className="text-[15px] font-semibold">Why Atlas Growth V shows {pct(ag5.navEur / ag5.calledEur - 1, 0)}</div>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-700">You have paid in {eur(ag5.calledEur)}. Today it is valued at {eur(ag5.navEur)}. Young private equity funds pay fees and costs before their companies grow, so they often show less than was paid in during the first years. This is called the J-curve. It is common for young funds and says little yet about the final result.</p>
            <svg viewBox="0 0 300 70" className="mt-2 h-16 w-full" aria-label="J-curve illustration"><line x1="0" y1="30" x2="300" y2="30" stroke="#CBD5E1" strokeDasharray="3 3" /><path d="M5 30 C 40 30, 60 55, 95 55 S 170 40, 200 20 S 270 5, 295 3" fill="none" stroke="#0F766E" strokeWidth="3" /><circle cx="70" cy="50" r="5" fill="#B45309" /><text x="80" y="66" fontSize="10" fill="#64748B">you are here (year 2)</text></svg>
          </Panel>
        </Section>
      )}

      {inbox.length > 0 && <Section title="Messages from Jonas"><div className="space-y-2">{inbox.map((m) => <MessageCard key={m.id} m={m} id={id} />)}</div></Section>}

      <div className="mt-5"><TalkButton id={id} /></div>
      <p className="mt-4 px-2 text-center text-[11px] leading-snug text-slate-400">Prototype · synthetic data · not investment advice</p>
    </div>
  );
}

function Activity({ id }: { id: string }) {
  const { s } = useStore();
  const c = clientById(id)!;
  const items = useMemo(() => timelineFor(c, s).filter((t) => t.clientVisible), [c, s]);
  return (
    <div>
      <h2 className="pt-3 text-[26px] font-semibold tracking-tight">Activity</h2>
      <p className="mb-4 text-[14px] text-slate-500">Everything between you and Jonas, in one place. Jonas sees the same.</p>
      <Panel><Timeline items={items} side="client" /></Panel>
    </div>
  );
}

function Ask({ id }: { id: string }) {
  const { s, update } = useStore();
  const ai = useAi();
  const c = clientById(id)!;
  const facts = useMemo(() => factsFor(id), [id]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const thread = s.qa[id] ?? [];

  async function ask(question: string) {
    if (!question.trim()) return;
    setBusy(true);
    setQ('');
    const r = await ai<any>('route_client_question', { cacheKey: cacheKeyFor(id, question), question, clientFirstName: c.firstName, facts }, { clientId: id, label: `Client question · ${c.name}` });
    let category: 'factual' | 'advice' | 'out_of_scope' = r.output?.category ?? 'advice';
    let answer: string = r.output?.clientAnswer ?? ADVICE_REPLY;
    let rmDraft: string = r.output?.rmDraft ?? '';
    // Guardrails in code: low confidence or an unknown number → never shown as an AI answer; routed to the RM instead.
    const g = r.output ? numberGuard(answer, facts) : null;
    if (category === 'factual' && ((r.output?.confidence ?? 0) < 0.7 || (g && !g.pass))) {
      rmDraft = `AI answer held back (${g && !g.pass ? `unknown number ${g.unsupported.map((u) => u.raw).join(', ')}` : 'low confidence'}): ${answer}`;
      category = 'advice'; answer = ADVICE_REPLY;
    }
    if (category === 'advice') answer = ADVICE_REPLY;
    const rg = rmDraft ? numberGuard(rmDraft, facts) : null;
    const item = { id: uid(), q: question, a: answer, category, at: new Date().toISOString(), meta: r.meta };
    update((x) => ({
      ...x, qa: { ...x.qa, [id]: [...(x.qa[id] ?? []), item] },
      requests: category === 'advice' ? [{ id: uid(), clientId: id, text: question, rmDraft: rmDraft || undefined, rmDraftGuard: rg ? { pass: rg.pass, unsupported: rg.unsupported.map((u) => u.raw) } : undefined, kind: 'question', at: item.at }, ...x.requests] : x.requests,
    }));
    setBusy(false);
  }

  const suggested = (SUGGESTED[id] ?? []).filter((x) => !thread.some((t) => t.q === x.q));
  return (
    <div className="flex min-h-full flex-col">
      <h2 className="pt-3 text-[26px] font-semibold tracking-tight">Ask</h2>
      <p className="text-[14px] text-slate-500">Questions about your own portfolio are answered from your data. Anything about what you should do goes to Jonas.</p>
      <div className="mt-4 flex-1 space-y-3" data-testid="qa-thread">
        {thread.map((t) => (
          <div key={t.id} className="space-y-1.5">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-[14px] text-white">{t.q}</div>
            <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_2px_rgba(15,23,42,0.06)]" data-testid={`answer-${t.category}`}>
              {t.a}
              <div className={clsx('mt-1.5 text-[11px] font-medium', t.category === 'factual' ? 'text-violet-700' : t.category === 'advice' ? 'text-accent' : 'text-slate-500')}>
                {t.category === 'factual' ? '✦ Answered by AI from your data' : t.category === 'advice' ? '→ Passed to Jonas with a draft answer' : 'Outside what this app can answer'}
              </div>
            </div>
          </div>
        ))}
        {busy && <div className="max-w-[60%] rounded-2xl bg-white px-3.5 py-2.5 text-[14px] text-slate-400">…</div>}
      </div>
      {suggested.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{suggested.map((x) => <button key={x.key} onClick={() => ask(x.q)} disabled={busy} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-[13px] font-medium text-ink" data-testid={`suggest-${x.key}`}>{x.q}</button>)}</div>}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input aria-label="Your question" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a question" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px]" />
        <button type="submit" disabled={busy || !q.trim()} className="rounded-xl bg-accent px-4 text-[15px] font-semibold text-white disabled:bg-slate-300">Send</button>
      </form>
      <div className="mt-3"><TalkButton id={id} /></div>
    </div>
  );
}

function Invest() {
  const { s, update } = useStore();
  const a = s.albers;
  const steps = subscriptionSteps(a);
  const [openDoc, setOpenDoc] = useState<'suit' | 'cost' | null>(null);
  const setA = (patch: Partial<typeof a>) => update((x) => ({ ...x, albers: { ...x.albers, ...patch } }));
  const docsReady = a.attested && a.ack;
  return (
    <div>
      <h2 className="pt-3 text-[26px] font-semibold tracking-tight">Meridian Buyout V</h2>
      <p className="text-[14px] text-slate-500">Private equity fund · commitment €200,000 · 10-year term</p>
      <Panel className="mt-4 p-0">
        <ol data-testid="client-steps">
          {steps.map((st) => (
            <li key={st.n} className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0" data-testid={`cstep-${st.n}`} data-state={st.state}>
              <span className={clsx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold', st.state === 'done' ? 'bg-green-600 text-white' : st.state === 'open' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500')}>{st.state === 'done' ? '✓' : st.n}</span>
              <div><div className="text-[15px] font-medium">{st.n === 1 ? 'Check that this investment is open to you' : st.n === 2 ? 'Read the suitability statement and costs' : st.n === 3 ? 'Review your documents' : st.n === 4 ? 'Sign' : 'Pay the first capital call'}</div>
                <div className="text-[13px] text-slate-500">{st.n === 1 ? (a.attested ? 'Done — Jonas confirmed it' : 'Jonas is checking this') : st.detail}</div></div>
            </li>
          ))}
        </ol>
      </Panel>

      {a.audit && (
        <Section title="Before you sign">
          <div className="space-y-2">
            <Panel className="p-0">
              <button className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-medium" onClick={() => setOpenDoc(openDoc === 'suit' ? null : 'suit')} data-testid="doc-suitability">Suitability statement <span className="text-slate-400">{openDoc === 'suit' ? '−' : '+'}</span></button>
              {openDoc === 'suit' && <div className="whitespace-pre-line border-t border-slate-100 px-4 py-3 text-[13px] leading-relaxed text-slate-700">{a.finalStatement}</div>}
            </Panel>
            <Panel className="p-0">
              <button className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-medium" onClick={() => setOpenDoc(openDoc === 'cost' ? null : 'cost')} data-testid="doc-costs">Costs <span className="text-slate-400">{openDoc === 'cost' ? '−' : '+'}</span></button>
              {openDoc === 'cost' && <div className="border-t border-slate-100 px-4 py-3"><MobileCosts /></div>}
            </Panel>
            {a.ack ? <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-[15px] font-medium text-green-800">✓ You confirmed you have read and understood</div>
              : <Primary onClick={() => setA({ ack: true, ackAt: new Date().toISOString() })} data-testid="client-ack">I have read and understood</Primary>}
          </div>
        </Section>
      )}

      {docsReady && (
        <Section title="Your documents">
          <Panel>
            <ul className="space-y-1.5 text-[13px]">{PREFILLED_FIELDS.map((f) => <li key={f.field} className="flex justify-between gap-2"><span className="text-slate-500">{f.field}</span><span className="text-right font-medium">{f.value}</span></li>)}</ul>
            <p className="mt-2 text-[12px] text-slate-400">Filled in from your data. Tell Jonas if anything is wrong.</p>
          </Panel>
        </Section>
      )}

      <Section title="Sign">
        {a.signed ? <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-[15px] font-medium text-green-800">✓ Signed</div> : (
          <>
            <Primary disabled={!docsReady} onClick={() => setA({ signed: true, signedAt: new Date().toISOString() })} data-testid="client-sign">{docsReady ? 'Sign subscription (simulated)' : '🔒︎ Sign subscription'}</Primary>
            {!docsReady && <p className="mt-1.5 text-center text-[12px] text-slate-500">Unlocks after Jonas’s check and after you have read the statement and costs.</p>}
          </>
        )}
      </Section>

      {a.signed && (
        <Section title="Funding">
          <Panel>
            <div className="tnum text-[22px] font-semibold">{eur(firstCallEur())}</div>
            <div className="text-[13px] text-slate-500">First capital call, due at first close on {fmtDate(firstClose())}</div>
            <p className="mt-2 text-[13px] text-slate-700">Transfer to your cash account with us. Later calls follow over the next 3–4 years; we tell you each one in advance.</p>
            <div className="mt-2 rounded-lg bg-slate-50 p-2 font-mono text-[12px] text-slate-600">IBAN DE00 0000 0000 0000 0000 00 (synthetic)</div>
            <div className="mt-3">{a.funded ? <div className="rounded-xl bg-green-50 px-4 py-3 text-center text-[15px] font-medium text-green-800">✓ Transfer instructed</div> : <Primary onClick={() => setA({ funded: true, fundedAt: new Date().toISOString() })} data-testid="client-fund">I have instructed the transfer</Primary>}</div>
          </Panel>
        </Section>
      )}
      <p className="mt-6 text-center text-[11px] text-slate-400">Prototype · synthetic data · not investment advice</p>
    </div>
  );
}

/** Fits the 390 × 844 phone into the viewport height next to the RM workspace. */
export function ScaledPhone({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.max(0.6, Math.min(1, (window.innerHeight - 175) / 844)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ width: 390 * scale, height: 844 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 390, height: 844 }}>{children}</div>
    </div>
  );
}

/** Cost disclosure for the phone: same code-generated numbers as the RM table, stacked and in plain words. */
function MobileCosts() {
  const c = exAnteCosts(ALBERS_COMMITMENT);
  const rows = c.rows.filter((r) => r.eurEarly !== null);
  return (
    <div className="space-y-3 text-[14px]" data-testid="cost-table">
      <p className="text-[13px] text-slate-600">For a commitment of {eur(ALBERS_COMMITMENT)}. Calculated from the fund terms — the same figures Jonas sees.</p>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => <li key={r.label} className="flex items-baseline justify-between gap-3 py-2"><span>{r.label}</span><span className="tnum shrink-0 text-right font-medium">{eur(r.eurEarly!)} <span className="text-[12px] font-normal text-slate-500">· {pct(r.pct!, 2)} a year</span></span></li>)}
        <li className="flex items-baseline justify-between gap-3 py-2 font-semibold"><span>Per year, years 1–5</span><span className="tnum">{eur(c.totalEarlyEur)}</span></li>
        <li className="flex items-baseline justify-between gap-3 py-2"><span>Per year, years 6–10</span><span className="tnum">{eur(c.totalLateEur)}</span></li>
        <li className="flex items-baseline justify-between gap-3 py-2 font-semibold"><span>10 years in total (illustration)</span><span className="tnum">{eur(c.tenYearTotalEur)}</span></li>
      </ul>
      <p className="text-[13px] leading-relaxed text-slate-600">If the fund does well, the fund manager also keeps a share of the profit: 20% of gains above 8% a year (“carried interest”). This depends on results, so it has no fixed amount.</p>
      <p className="text-[13px] leading-relaxed text-slate-600">Costs reduce your return. Illustration: at a gross return of 12% a year, costs reduce the net return to about 9% a year.</p>
    </div>
  );
}
