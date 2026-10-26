import { redirect } from 'next/navigation';
import { isHost } from '@/lib/auth';
import { backend } from '@/lib/server-config';
import { LoginForm } from '@/components/login-form';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next === '/demo' ? '/demo' : '/host';
  if (await isHost()) redirect(next);
  return <LoginForm local={backend() === 'local'} next={next} />;
}
