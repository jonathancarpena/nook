import { redirect, notFound } from 'next/navigation';
import { Projector } from '@/components/projector';
import { isHost } from '@/lib/auth';
import { demoEnabled } from '@/lib/server-config';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Live projector' };
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  if (mode === 'demo') {
    if (!demoEnabled()) notFound();
    if (!(await isHost())) redirect('/login?next=/demo');
  }
  return <Projector demo={mode === 'demo'} />;
}
