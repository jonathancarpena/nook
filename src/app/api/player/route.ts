import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { loadState } from '@/lib/store';
import { publicState } from '@/lib/engine';
import { failure, json } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const token = (await cookies()).get('hgames_guest')?.value;
    if (!token) return json({ player: null });
    const raw = await loadState('live');
    const hash = createHash('sha256').update(token).digest('hex');
    const p = raw.contestants.find((p) => p.tokenHash === hash);
    return json({
      player: p ? publicState(raw).contestants.find((x) => x.id === p.id) : null,
      status: raw.status,
    });
  } catch (error) {
    return failure(error);
  }
}
