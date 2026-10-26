import { NextRequest } from 'next/server';
import { loadState } from '@/lib/store';
import { publicState } from '@/lib/engine';
import { requireHost } from '@/lib/auth';
import { failure, json, tournamentId } from '@/lib/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const id = await tournamentId(request);
    if (request.nextUrl.searchParams.get('private') === '1') {
      await requireHost();
      return json({ state: await loadState(id), serverTime: Date.now() });
    }
    return json({ state: publicState(await loadState(id)), serverTime: Date.now() });
  } catch (error) {
    return failure(error);
  }
}
