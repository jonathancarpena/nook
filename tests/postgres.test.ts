import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { applyCommand, initialState, register } from '../src/lib/engine';
import type { State, HostCommand } from '../src/lib/types';
it('applies the real PostgreSQL migration and commits a complete four-round tournament transactionally', async () => {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(readFileSync('supabase/migrations/202610260001_tournament.sql', 'utf8'));
  let state = initialState();
  async function commit(next: State, kind: string) {
    next.version = state.version + 1;
    const previous = state;
    const request = randomUUID();
    const result = await db.query<{ commit_tournament: boolean }>(
      'select commit_tournament($1,$2,$3::jsonb,$4::jsonb,$5::uuid,$6)',
      ['live', state.version, JSON.stringify(next), JSON.stringify(state), request, kind],
    );
    expect(result.rows[0].commit_tournament).toBe(true);
    const repeat = await db.query<{ commit_tournament: boolean }>(
      'select commit_tournament($1,$2,$3::jsonb,$4::jsonb,$5::uuid,$6)',
      ['live', previous.version, JSON.stringify(next), JSON.stringify(previous), request, kind],
    );
    expect(repeat.rows[0].commit_tournament).toBe(false);
    state = next;
  }
  async function action(c: HostCommand) {
    await commit(applyCommand(state, c), c.type);
  }
  await action({ type: 'registration', enabled: true });
  for (let i = 0; i < 24; i++)
    await commit(register(state, `SQL Guest ${i}`, `hash-${i}`), 'register');
  expect((await db.query('select * from contestants')).rows).toHaveLength(24);
  await action({ type: 'begin' });
  for (let n = 1; n <= 4; n++) {
    if (n <= 2) await action({ type: 'generate' });
    await action({ type: 'lock' });
    const r = state.rounds[n - 1];
    const ids =
      n === 1
        ? r.teams.slice(0, 6).map((t) => t.id)
        : n === 2
          ? [r.teams[0].id, r.teams[2].id]
          : r.participants.slice(0, n === 3 ? 3 : 1);
    await action({ type: 'select', ids });
    await action({ type: 'confirm', confirmation: 'CONFIRM' });
    await action({ type: 'results' });
    if (n < 4) await action({ type: 'advance' });
  }
  expect(state.status).toBe('completed');
  expect((await db.query("select * from results where outcome='survivor'")).rows).toHaveLength(22);
  expect(
    (await db.query('select * from matches where winning_team_id is not null')).rows,
  ).toHaveLength(2);
  // Permissions are enforced independently of the API.
  await db.exec('SET ROLE anon');
  await expect(db.query('select * from tournament_state')).rejects.toThrow('permission denied');
  expect((await db.query('select * from public_revision')).rows).toHaveLength(1);
  await expect(db.query('update public_revision set version=0')).rejects.toThrow(
    'permission denied',
  );
  await db.exec('RESET ROLE');
  await db.close();
}, 30000);
