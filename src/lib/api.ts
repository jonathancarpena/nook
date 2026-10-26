import { NextRequest, NextResponse } from 'next/server';
import { RuleError } from './engine';
import { requireHost } from './auth';
import { demoEnabled } from './server-config';
export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== request.headers.get('host'))
    throw new RuleError('Request origin is not allowed.', 403);
}
export async function tournamentId(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode');
  if (mode === 'demo') {
    if (!demoEnabled()) throw new RuleError('Demo mode is disabled.', 404);
    await requireHost();
    return 'demo';
  }
  if (mode && mode !== 'live') throw new RuleError('Invalid tournament.', 400);
  return 'live';
}
export function failure(error: unknown) {
  if (error instanceof RuleError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  console.error(
    'Server operation failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  return NextResponse.json(
    {
      error:
        'The server could not complete this action. Check the server configuration and connection, then retry.',
    },
    { status: 500 },
  );
}
export function json(value: unknown) {
  return NextResponse.json(value, { headers: { 'Cache-Control': 'no-store' } });
}
