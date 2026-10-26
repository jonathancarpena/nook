import { NextRequest } from 'next/server';
import { requireHost } from '@/lib/auth';
import { heartbeat, lastDisplaySeen } from '@/lib/store';
import { checkOrigin, failure, json, tournamentId } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await heartbeat(await tournamentId(request));
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function GET(request: NextRequest) {
  try {
    await requireHost();
    const lastSeen = await lastDisplaySeen(await tournamentId(request));
    return json({ connected: lastSeen !== null && Date.now() - lastSeen < 25000 });
  } catch (error) {
    return failure(error);
  }
}
