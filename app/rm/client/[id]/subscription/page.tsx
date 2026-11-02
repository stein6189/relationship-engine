'use client';
import { useParams } from 'next/navigation';
import { AlbersSubscription } from '@/components/views/AlbersSubscription';
import { Card } from '@/components/ui';
export default function Page() {
  const { id } = useParams<{ id: string }>();
  if (id !== 'albers') return <Card className="p-6 text-sm text-slate-600">This flow is built for the demo persona only (albers). Other clients use the same engine without this screen in the prototype.</Card>;
  return <AlbersSubscription />;
}
