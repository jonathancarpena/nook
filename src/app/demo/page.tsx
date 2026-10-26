import { redirect, notFound } from 'next/navigation';
import { isHost } from '@/lib/auth';
import { demoEnabled } from '@/lib/server-config';
import { HostDashboard } from '@/components/host-dashboard';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!demoEnabled()) notFound();
  if (!(await isHost())) redirect('/login?next=/demo');
  return <HostDashboard demo demoAvailable />;
}
