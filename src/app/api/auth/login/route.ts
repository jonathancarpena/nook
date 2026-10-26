import { NextRequest } from 'next/server';
import { login } from '@/lib/auth';
import { checkOrigin, failure, json } from '@/lib/api';
import { RuleError } from '@/lib/engine';
// Per-process backoff complements the provider's account-level protection; never key registration by IP.
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (
      typeof body.password !== 'string' ||
      body.password.length > 256 ||
      typeof body.email !== 'string' ||
      body.email.length > 254
    )
      throw new RuleError('Invalid credentials.', 400);
    const key = body.email.trim().toLowerCase() || 'local-host';
    const existing = attempts.get(key);
    if (existing && existing.until > Date.now() && existing.count >= 8)
      throw new RuleError('Too many attempts. Try again in a minute.', 429);
    const entry =
      existing && existing.until > Date.now() ? existing : { count: 0, until: Date.now() + 60000 };
    entry.count++;
    if (attempts.size > 1000) attempts.clear();
    attempts.set(key, entry);
    await login(body.email, body.password);
    attempts.delete(key);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
