import { redirect } from 'next/navigation';
import { isHost } from '@/lib/auth';
import { demoEnabled } from '@/lib/server-config';
import { HostDashboard } from '@/components/host-dashboard';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!(await isHost())) redirect('/login');
  return <HostDashboard demoAvailable={demoEnabled()} />;
}
