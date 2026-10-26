import { NextRequest } from 'next/server';
import { requireHost } from '@/lib/auth';
import { loadState } from '@/lib/store';
import { failure, tournamentId } from '@/lib/api';
export async function GET(request: NextRequest) {
  try {
    await requireHost();
    const id = await tournamentId(request);
    const state = await loadState(id);
    const safe = {
      ...state,
      contestants: state.contestants.map(({ tokenHash: _tokenHash, ...p }) => p),
    };
    return new Response(
      JSON.stringify(
        { exportedAt: new Date().toISOString(), schemaVersion: 1, tournament: safe },
        null,
        2,
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="halloween-${id}-backup.json"`,
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
