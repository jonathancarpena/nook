import { it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mutate, loadState, undoState } from '../src/lib/store';
import { applyCommand, register, publicState } from '../src/lib/engine';
let dir: string;
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'halloween-tests-'));
  process.env.LOCAL_DATA_DIR = dir;
  process.env.APP_BACKEND = 'local';
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));
it('serializes simultaneous registrations, rejects overflow, and persists through a new database connection', async () => {
  await mutate('live', randomUUID(), 'registration', (s) =>
    applyCommand(s, { type: 'registration', enabled: true }),
  );
  const requests = Array.from({ length: 30 }, (_, i) =>
    mutate('live', randomUUID(), 'register', (s) =>
      register(s, `Concurrent guest ${i}`, `concurrent-${i}`),
    ),
  );
  const results = await Promise.allSettled(requests);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(24);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(6);
  const state = await loadState('live');
  expect(new Set(state.contestants.map((p) => p.number)).size).toBe(24);
  const reopened = new DatabaseSync(path.join(dir, 'tournament.sqlite'));
  const row = reopened.prepare('SELECT data FROM states WHERE id=?').get('live') as {
    data: string;
  };
  expect(JSON.parse(row.data)).toEqual(state);
  reopened.close();
});
it('network retries are idempotent and stale writes cannot overwrite state', async () => {
  const before = await loadState('live');
  const requestId = randomUUID();
  const a = await mutate(
    'live',
    requestId,
    'begin',
    (s) => applyCommand(s, { type: 'begin' }),
    before.version,
  );
  const b = await mutate(
    'live',
    requestId,
    'begin',
    (s) => applyCommand(s, { type: 'begin' }),
    before.version,
  );
  expect(b).toEqual(a);
  await expect(
    mutate(
      'live',
      randomUUID(),
      'generate',
      (s) => applyCommand(s, { type: 'generate' }),
      before.version,
    ),
  ).rejects.toThrow('another screen');
});
it('undo restores a valid prior state while revision remains monotonic', async () => {
  const s = await loadState('live');
  await mutate(
    'live',
    randomUUID(),
    'generate',
    (s) => applyCommand(s, { type: 'generate' }),
    s.version,
  );
  const previous = await undoState('live');
  const restored = await mutate('live', randomUUID(), 'undo', () => previous);
  expect(restored.rounds[0].teams).toEqual([]);
  expect(restored.version).toBe(s.version + 2);
  await expect(undoState('live')).rejects.toThrow('cannot be undone');
});
it('repeated confirmation cannot duplicate eliminations or reveal them', async () => {
  let _s = await mutate('demo', randomUUID(), 'seed', (s) => applyCommand(s, { type: 'seed' }));
  for (const c of [{ type: 'begin' }, { type: 'generate' }, { type: 'lock' }] as const)
    _s = await mutate('demo', randomUUID(), c.type, (s) => applyCommand(s, c));
  _s = await mutate('demo', randomUUID(), 'select', (s) =>
    applyCommand(s, { type: 'select', ids: s.rounds[0].teams.slice(0, 6).map((t) => t.id) }),
  );
  const requestId = randomUUID();
  const confirm = () =>
    mutate('demo', requestId, 'confirm', (s) =>
      applyCommand(s, { type: 'confirm', confirmation: 'CONFIRM' }),
    );
  const [first, second] = await Promise.all([confirm(), confirm()]);
  expect(first.version).toBe(second.version);
  expect(second.rounds[0].winners).toHaveLength(12);
  expect(publicState(second).rounds[0].winners).toEqual([]);
  await expect(
    mutate('demo', randomUUID(), 'confirm', (s) =>
      applyCommand(s, { type: 'confirm', confirmation: 'CONFIRM' }),
    ),
  ).rejects.toThrow('already');
});
