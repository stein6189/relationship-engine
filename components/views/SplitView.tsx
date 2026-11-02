'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { TopBar, Footer } from '@/components/Shell';
import { ClientApp, ScaledPhone } from '@/components/client/ClientApp';
import { Client360 } from '@/components/views/Client360';
import { AlbersAdvice } from '@/components/views/AlbersAdvice';
import { AlbersSubscription } from '@/components/views/AlbersSubscription';
import { KellerLiquidity } from '@/components/views/KellerLiquidity';
import { useStore } from '@/lib/state/store';
import { clientById } from '@/lib/data';

const VIEWS: Record<string, [string, string][]> = {
  albers: [['subscription', 'Subscription'], ['advice', 'Advisory follow-up'], ['360', 'Client 360']],
  keller: [['liquidity', 'Liquidity'], ['360', 'Client 360']],
};

export function SplitView() {
  const sp = useSearchParams();
  const router = useRouter();
  const { s } = useStore();
  const id = sp.get('client') === 'keller' ? 'keller' : 'albers';
  const views = VIEWS[id];
  const view = views.some(([v]) => v === sp.get('view')) ? sp.get('view')! : views[0][0];
  const go = (q: Record<string, string>) => router.replace(`/split?${new URLSearchParams({ client: id, view, ...q }).toString()}`);
  const openReq = s.requests.filter((r) => !r.done && r.clientId === id);
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-5 py-2 text-sm">
        <Link href="/rm/plan" className="text-slate-500 hover:text-accent">← Plan</Link>
        <span className="mx-1 text-slate-300">|</span>
        <span className="font-semibold">Split view</span>
        <span className="text-slate-500">one relationship, two screens — actions on one side update the other</span>
        <div className="ml-auto flex gap-1">
          {['albers', 'keller'].map((c) => <button key={c} onClick={() => router.replace(`/split?client=${c}`)} className={clsx('rounded-md px-2.5 py-1', id === c ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100')}>{clientById(c)?.name}</button>)}
        </div>
      </div>
      <div className="flex flex-1 gap-5 overflow-hidden px-5 pt-4">
        <section className="min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }} data-testid="split-rm">
          <div className="mb-3 flex items-center gap-1 text-sm">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">RM workspace · Jonas</span>
            {views.map(([v, label]) => <button key={v} onClick={() => go({ view: v })} className={clsx('rounded-md px-2.5 py-1', view === v ? 'bg-teal-50 font-medium text-accent-dark' : 'text-slate-600 hover:bg-slate-100')} data-testid={`split-tab-${v}`}>{label}</button>)}
            {openReq.length > 0 && <span className="ml-auto rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200" data-testid="split-requests">{openReq.length} new request{openReq.length > 1 ? 's' : ''} from {clientById(id)?.firstName}: “{openReq[0].text}”</span>}
          </div>
          {view === '360' && <Client360 id={id} embedded />}
          {view === 'advice' && <AlbersAdvice embedded />}
          {view === 'subscription' && <AlbersSubscription embedded />}
          {view === 'liquidity' && <KellerLiquidity embedded />}
        </section>
        <aside className="shrink-0">
          <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Client app · {clientById(id)?.firstName}</div>
          <ScaledPhone><ClientApp key={id} id={id} /></ScaledPhone>
        </aside>
      </div>
      <Footer />
    </div>
  );
}

