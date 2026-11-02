'use client';
import { useParams } from 'next/navigation';
import { Client360 } from '@/components/views/Client360';
export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  return <Client360 id={id} />;
}
