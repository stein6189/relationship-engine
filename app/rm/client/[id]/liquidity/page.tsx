'use client';
import { useParams } from 'next/navigation';
import { KellerLiquidity } from '@/components/views/KellerLiquidity';
import { Card } from '@/components/ui';
export default function Page() {
  const { id } = useParams<{ id: string }>();
  if (id !== 'keller') return <Card className="p-6 text-sm text-slate-600">This flow is built for the demo persona only (keller). Other clients use the same engine without this screen in the prototype.</Card>;
  return <KellerLiquidity />;
}
