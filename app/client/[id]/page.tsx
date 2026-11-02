'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { TopBar, Footer } from '@/components/Shell';
import { ClientApp, ScaledPhone } from '@/components/client/ClientApp';
import { clientById } from '@/lib/data';

export default function ClientAppPage() {
  const { id } = useParams<{ id: string }>();
  const c = clientById(id);
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex flex-1 flex-col items-center gap-10 px-6 pt-5 lg:flex-row lg:items-start lg:justify-center">
        <div className="max-w-xs text-sm text-slate-600 lg:pt-10">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client app</div>
          <h1 className="mt-1 text-xl font-semibold text-ink">What {c?.firstName ?? 'the client'} sees</h1>
          <p className="mt-2">Same relationship, same data as the RM workspace. AI answers only factual questions about the client’s own data; anything that needs advice goes to the RM.</p>
          <div className="mt-3 flex flex-col gap-1">
            <Link className="text-accent underline" href={`/rm/client/${id}`}>Open in RM workspace →</Link>
            {(id === 'albers' || id === 'keller') && <Link className="text-accent underline" href={`/split?client=${id}`}>Split view →</Link>}
            <span className="mt-2 text-xs text-slate-500">Other clients: {['albers', 'keller', 'berger', 'hofmann'].filter((x) => x !== id).map((x) => <Link key={x} className="mr-2 underline" href={`/client/${x}`}>{clientById(x)?.firstName}</Link>)}</span>
          </div>
        </div>
        {c ? <ScaledPhone><ClientApp id={id} /></ScaledPhone> : <p>Client not found.</p>}
      </main>
      <Footer />
    </div>
  );
}
