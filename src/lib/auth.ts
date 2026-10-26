import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createHmac, timingSafeEqual, scryptSync } from 'node:crypto';
import { backend } from './server-config';
import { RuleError } from './engine';
const SESSION = 'hgames_host';
function sessionSecret() {
  const key = process.env.LOCAL_SESSION_SECRET;
  if (!key || key.length < 32)
    throw new Error('Run npm run setup:local to configure local host authentication.');
  return key;
}
export async function supabaseAuth() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          for (const item of items) {
            try {
              jar.set(item.name, item.value, item.options);
            } catch {
              /* Server components cannot refresh cookies; API routes can. */
            }
          }
        },
      },
    },
  );
}
function allowed(email: string | undefined) {
  return (
    !!email &&
    !!process.env.HOST_EMAILS?.split(',')
      .map((x) => x.trim().toLowerCase())
      .includes(email.toLowerCase())
  );
}
export async function isHost(): Promise<boolean> {
  if (backend() === 'supabase') {
    const client = await supabaseAuth();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    return !error && !!user?.email_confirmed_at && allowed(user?.email);
  }
  const token = (await cookies()).get(SESSION)?.value;
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature || Number(expiry) < Date.now()) return false;
  const expected = createHmac('sha256', sessionSecret()).update(expiry).digest('hex');
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
export async function requireHost() {
  if (!(await isHost())) throw new RuleError('Host authentication required.', 401);
}
export async function login(email: string, password: string) {
  if (backend() === 'supabase') {
    if (!allowed(email)) throw new RuleError('Invalid host credentials.', 401);
    const client = await supabaseAuth();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error || !(await isHost())) {
      await client.auth.signOut();
      throw new RuleError('Invalid host credentials.', 401);
    }
    return;
  }
  const encoded = process.env.LOCAL_HOST_PASSWORD_HASH;
  if (!encoded) throw new Error('Local host password is not configured. Run npm run setup:local.');
  const [salt, hash] = encoded.split(':');
  const actual = scryptSync(password, salt, 64).toString('hex');
  if (
    !hash ||
    hash.length !== actual.length ||
    !timingSafeEqual(Buffer.from(hash), Buffer.from(actual))
  )
    throw new RuleError('Invalid host credentials.', 401);
  const expiry = String(Date.now() + 12 * 3600000);
  const signature = createHmac('sha256', sessionSecret()).update(expiry).digest('hex');
  (await cookies()).set(SESSION, `${expiry}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 12 * 3600,
  });
}
export async function logout() {
  if (backend() === 'supabase') await (await supabaseAuth()).auth.signOut();
  (await cookies()).delete(SESSION);
}
