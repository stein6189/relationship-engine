'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@/lib/state/store';
import { fmtDate } from '@/lib/rules/format';
import { SIM_TODAY, RM_NAME } from '@/lib/rules/config';
import { Badge, Button } from './ui';

const NAV = [
  { href: '/rm/plan', label: 'Plan' },
  { href: '/rm/touchpoints', label: 'Touchpoints' },
  { href: '/rm/clients', label: 'Clients' },
  { href: '/split?client=albers', label: 'Split view' },
  { href: '/rm/hood', label: 'Under the hood' },
  { href: '/rm/about', label: 'About' },
];

export function TopBar() {
  const { s, update, reset } = useStore();
  const [live, setLive] = useState<boolean | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => { fetch('/api/ai/extract_signals').then((r) => r.json()).then((j) => setLive(!!j.liveAvailable)).catch(() => setLive(false)); }, []);
  return (
    <>
      <div className="bg-ink px-4 py-1 text-center text-[11px] text-slate-200">Prototype · synthetic data · not investment advice</div>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2.5">
        <div className="flex items-center gap-3">
          <Link href="/rm/plan" className="flex items-center gap-2 font-semibold"><span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-xs text-white">RE</span>Relationship Engine</Link>
          <Badge tone="slate">Demo date: {fmtDate(SIM_TODAY)}</Badge>
          <span className="text-xs text-slate-500">RM: {RM_NAME} · 200 clients</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="AI mode">
            {(['live', 'cached'] as const).map((m) => (
              <button key={m} onClick={() => update((x) => ({ ...x, mode: m }))}
                className={clsx('px-2.5 py-1 font-medium', s.mode === m ? 'bg-ink text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                {m === 'live' ? 'Live AI' : 'Cached'}
              </button>
            ))}
          </div>
          {live === false && s.mode === 'live' && <Badge tone="amber" title="No API key on the server — live calls fall back to cached results">no API key → cached fallback</Badge>}
          {confirmReset
            ? <><span className="text-slate-600">Reset all demo state?</span><Button variant="danger" onClick={() => { reset(); setConfirmReset(false); }}>Yes, reset</Button><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button></>
            : <Button variant="ghost" onClick={() => setConfirmReset(true)}>Reset demo</Button>}
        </div>
      </header>
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { s } = useStore();
  const open = s.requests.filter((r) => !r.done).length;
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1">
        <nav className="w-48 shrink-0 border-r border-slate-200 bg-white px-3 py-4">
          <ul className="space-y-0.5">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={clsx('flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm', path === n.href.split('?')[0] ? 'bg-teal-50 font-medium text-accent-dark' : 'text-slate-700 hover:bg-slate-50')}>
                  {n.label}
                  {n.label === 'Plan' && open > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[10px] text-white">{open}</span>}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
            <div className="font-medium text-slate-600">Who does what</div>
            Code: numbers, rules, allocation<br />AI: reads, drafts, explains, checks<br />RM: decides, approves, owns advice
          </div>
        </nav>
        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
      <footer className="border-t border-slate-200 bg-white px-5 py-2 text-[11px] text-slate-500">Prototype built for the LIQID case study · Relationship Engine</footer>
    </div>
  );
}
