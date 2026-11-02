'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { usePlan } from '@/lib/state/usePlan';
import { clients } from '@/lib/data';
import { daysBetween, eur, pct } from '@/lib/rules/format';
import { SIM_TODAY } from '@/lib/rules/config';
import { laneLabel } from '@/lib/rules/allocation';
import type { Lane } from '@/lib/types';
import { Badge, Card } from '@/components/ui';

type Sort = 'aum' | 'name' | 'contact';

export default function ClientsPage() {
  const { byId } = usePlan();
  const [q, setQ] = useState('');
  const [lane, setLane] = useState<Lane | 'all'>('all');
  const [sort, setSort] = useState<Sort>('aum');
  const rows = useMemo(() => {
    const list = clients.filter((c) => (lane === 'all' || byId.get(c.id)?.lane === lane) && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.occupation.toLowerCase().includes(q.toLowerCase())));
    return list.sort((a, b) => sort === 'aum' ? b.aumEur - a.aumEur : sort === 'name' ? a.name.localeCompare(b.name) : (a.lastProactiveContact ?? '').localeCompare(b.lastProactiveContact ?? ''));
  }, [q, lane, sort, byId]);
  const total = rows.reduce((s, c) => s + c.aumEur, 0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Clients</h1>
        <p className="text-sm text-slate-500">Jonas Weber’s book · {clients.length} clients · {eur(clients.reduce((s, c) => s + c.aumEur, 0))} with us</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search clients" placeholder="Search name or occupation" className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        {(['all', 'rm', 'digital', 'none'] as const).map((l) => (
          <button key={l} onClick={() => setLane(l)} className={clsx('rounded-md px-2.5 py-1 text-sm', lane === l ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100')}>{l === 'all' ? 'All lanes' : laneLabel[l]}</button>
        ))}
        <select aria-label="Sort" className="ml-auto rounded-lg border border-slate-300 px-2 py-1.5 text-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="aum">Sort: assets with us</option><option value="name">Sort: name</option><option value="contact">Sort: longest without contact</option>
        </select>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="px-3 py-2">Client</th><th className="px-3 py-2 text-right">With us</th><th className="px-3 py-2 text-right"><span title="Assets with us ÷ stated investable wealth">Share of wallet</span></th><th className="px-3 py-2">Private markets</th><th className="px-3 py-2">Last proactive contact</th><th className="px-3 py-2">November lane</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const a = byId.get(c.id);
              const since = c.lastProactiveContact ? Math.round(daysBetween(c.lastProactiveContact, SIM_TODAY) / 30) : null;
              return (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`client-row-${c.id}`}>
                  <td className="px-3 py-1.5"><Link href={`/rm/client/${c.id}`} className="font-medium hover:text-accent">{c.name}</Link>{c.persona && <span className="ml-1.5 text-[10px] text-slate-400">demo persona</span>}<div className="text-xs text-slate-500">{c.occupation} · {c.age}</div></td>
                  <td className="tnum px-3 py-1.5 text-right">{eur(c.aumEur)}</td>
                  <td className="tnum px-3 py-1.5 text-right">{pct(c.aumEur / c.statedInvestableEur, 0)}</td>
                  <td className="px-3 py-1.5 text-xs">{c.commitments.length ? `${c.commitments.length} fund${c.commitments.length > 1 ? 's' : ''}` : '—'}</td>
                  <td className="tnum px-3 py-1.5 text-xs">{since === null ? 'never' : `${since} months ago`}</td>
                  <td className="px-3 py-1.5">{a && <Badge tone={a.lane === 'rm' ? 'teal' : a.lane === 'digital' ? 'blue' : 'slate'}>{laneLabel[a.lane]}</Badge>}{a?.controlGroup && <Badge tone="blue" className="ml-1">control group</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t border-slate-200 bg-slate-50 text-xs"><td className="px-3 py-2 text-slate-500">{rows.length} shown</td><td className="tnum px-3 py-2 text-right font-medium">{eur(total)}</td><td colSpan={4} /></tr></tfoot>
        </table>
      </Card>
    </div>
  );
}
