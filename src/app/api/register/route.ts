import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac, createHash } from 'node:crypto';
import { z } from 'zod';
import { register } from '@/lib/engine';
import { guestSecret } from '@/lib/server-config';
import { mutate } from '@/lib/store';
import { failure, json, checkOrigin } from '@/lib/api';
const schema = z.object({ name: z.string().min(2).max(60), requestId: z.uuid() });
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    const body = schema.safeParse(await request.json());
    if (!body.success) return jsonError();
    const { name, requestId } = body.data;
    const jar = await cookies();
    const existing = jar.get('hgames_guest')?.value;
    const token = existing || createHmac('sha256', guestSecret()).update(requestId).digest('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const state = await mutate('live', requestId, 'register', (s) => register(s, name, tokenHash));
    const player = state.contestants.find((p) => p.tokenHash === tokenHash);
    if (!player) return jsonError();
    jar.set('hgames_guest', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 3600,
    });
    return json({ player: { id: player.id, name: player.name, number: player.number } });
  } catch (error) {
    return failure(error);
  }
}
function jsonError() {
  return new Response(
    JSON.stringify({ error: 'Invalid registration. Use a name between 2 and 60 characters.' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  );
}
