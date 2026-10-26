import { NextRequest } from 'next/server';
import { z } from 'zod';
import { applyCommand } from '@/lib/engine';
import { mutate, undoState } from '@/lib/store';
import { requireHost } from '@/lib/auth';
import { checkOrigin, failure, json, tournamentId } from '@/lib/api';
import type { HostCommand } from '@/lib/types';
const schema = z.object({
  requestId: z.uuid(),
  version: z.number().int().nonnegative(),
  command: z.object({
    type: z.enum([
      'registration',
      'add',
      'edit',
      'remove',
      'begin',
      'generate',
      'lock',
      'reveal',
      'select',
      'confirm',
      'results',
      'advance',
      'scene',
      'timer',
      'pause',
      'replay',
      'rewind',
      'seed',
      'reset',
      'undo',
    ]),
    name: z.string().max(60).optional(),
    id: z.string().max(100).optional(),
    ids: z.array(z.string().max(100)).max(24).optional(),
    value: z.number().finite().optional(),
    enabled: z.boolean().optional(),
    scene: z
      .enum([
        'welcome',
        'waiting',
        'intro',
        'teams',
        'game',
        'elimination',
        'finalists',
        'champion',
      ])
      .optional(),
    operation: z.enum(['start', 'pause', 'reset', 'adjust', 'configure', 'visibility']).optional(),
    confirmation: z.string().max(20).optional(),
  }),
});
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await requireHost();
    const id = await tournamentId(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return new Response(JSON.stringify({ error: 'Invalid host command.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    const { requestId, version, command } = parsed.data;
    const previous = command.type === 'undo' ? await undoState(id) : undefined;
    const state = await mutate(
      id,
      requestId,
      command.type,
      (s) => previous ?? applyCommand(s, command as HostCommand),
      version,
    );
    return json({ state, serverTime: Date.now() });
  } catch (error) {
    return failure(error);
  }
}
