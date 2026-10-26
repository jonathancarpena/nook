import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@supabase/supabase-js';
import { backend } from './server-config';
import { initialState, RuleError } from './engine';
import type { State } from './types';
let db: DatabaseSync | undefined;
function localDb() {
  if (!db) {
    const directory = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), '.local');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    db = new DatabaseSync(path.join(directory, 'tournament.sqlite'));
    db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS states(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events(tournament_id TEXT NOT NULL, request_id TEXT NOT NULL, version INTEGER NOT NULL, previous TEXT NOT NULL, kind TEXT NOT NULL, PRIMARY KEY(tournament_id,request_id));',
    );
  }
  return db;
}
function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function loadState(id: string): Promise<State> {
  if (backend() === 'local') {
    const row = localDb().prepare('SELECT data FROM states WHERE id=?').get(id) as
      { data: string } | undefined;
    return row ? JSON.parse(row.data) : initialState(id);
  }
  const { data, error } = await supabase()
    .from('tournament_state')
    .select('data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Database read failed: ' + error.message);
  return (data?.data as State) || initialState(id);
}
async function seen(id: string, requestId: string) {
  if (backend() === 'local')
    return !!localDb()
      .prepare('SELECT 1 FROM events WHERE tournament_id=? AND request_id=?')
      .get(id, requestId);
  const { data, error } = await supabase()
    .from('tournament_events')
    .select('request_id')
    .eq('tournament_id', id)
    .eq('request_id', requestId)
    .maybeSingle();
  if (error) throw new Error('Database event read failed: ' + error.message);
  return !!data;
}
async function commit(
  previous: State,
  next: State,
  requestId: string,
  kind: string,
): Promise<boolean> {
  if (backend() === 'supabase') {
    const { data, error } = await supabase().rpc('commit_tournament', {
      p_id: next.id,
      p_expected: previous.version,
      p_data: next,
      p_previous: previous,
      p_request: requestId,
      p_kind: kind,
    });
    if (error) throw new Error('Database transaction failed: ' + error.message);
    return data === true;
  }
  const database = localDb();
  database.exec('BEGIN IMMEDIATE');
  try {
    const row = database.prepare('SELECT data FROM states WHERE id=?').get(next.id) as
      { data: string } | undefined;
    if (
      (row ? JSON.parse(row.data).version : 0) !== previous.version ||
      database
        .prepare('SELECT 1 FROM events WHERE tournament_id=? AND request_id=?')
        .get(next.id, requestId)
    ) {
      database.exec('ROLLBACK');
      return false;
    }
    database
      .prepare(
        'INSERT INTO states(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
      )
      .run(next.id, JSON.stringify(next));
    database
      .prepare(
        'INSERT INTO events(tournament_id,request_id,version,previous,kind) VALUES (?,?,?,?,?)',
      )
      .run(next.id, requestId, next.version, JSON.stringify(previous), kind);
    database.exec('COMMIT');
    return true;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
export async function mutate(
  id: string,
  requestId: string,
  kind: string,
  operation: (s: State) => State,
  expectedVersion?: number,
): Promise<State> {
  for (let i = 0; i < 32; i++) {
    if (await seen(id, requestId)) return loadState(id);
    const previous = await loadState(id);
    if (expectedVersion !== undefined && previous.version !== expectedVersion)
      throw new RuleError(
        'The tournament changed on another screen. Review the refreshed state and try again.',
      );
    const next = operation(previous);
    next.version = previous.version + 1;
    next.updatedAt = new Date().toISOString();
    if (await commit(previous, next, requestId, kind)) return next;
    if (expectedVersion !== undefined && (await seen(id, requestId))) return loadState(id);
  }
  throw new RuleError('The tournament is busy. Please try again.', 503);
}
export async function undoState(id: string): Promise<State> {
  const current = await loadState(id);
  let row: { previous: State | string; kind: string } | undefined;
  if (backend() === 'local')
    row = localDb()
      .prepare('SELECT previous,kind FROM events WHERE tournament_id=? AND version=?')
      .get(id, current.version) as typeof row;
  else {
    const { data, error } = await supabase()
      .from('tournament_events')
      .select('previous,kind')
      .eq('tournament_id', id)
      .eq('version', current.version)
      .maybeSingle();
    if (error) throw new Error(error.message);
    row = data ?? undefined;
  }
  if (!row || ['register', 'undo', 'reset', 'seed', 'add', 'edit', 'remove'].includes(row.kind))
    throw new RuleError(
      'This action cannot be undone. Use a round correction or contestant controls.',
    );
  return typeof row.previous === 'string' ? JSON.parse(row.previous) : row.previous;
}

export async function heartbeat(id: string) {
  if (backend() === 'local') {
    const database = localDb();
    database.exec(
      'CREATE TABLE IF NOT EXISTS display_presence(id TEXT PRIMARY KEY, seen_at INTEGER NOT NULL)',
    );
    database
      .prepare(
        'INSERT INTO display_presence(id,seen_at) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET seen_at=excluded.seen_at',
      )
      .run(id, Date.now());
    return;
  }
  const { error } = await supabase()
    .from('display_presence')
    .upsert({ id, seen_at: new Date().toISOString() });
  if (error) throw new Error('Presence update failed: ' + error.message);
}
export async function lastDisplaySeen(id: string): Promise<number | null> {
  if (backend() === 'local') {
    const database = localDb();
    database.exec(
      'CREATE TABLE IF NOT EXISTS display_presence(id TEXT PRIMARY KEY, seen_at INTEGER NOT NULL)',
    );
    const row = database.prepare('SELECT seen_at FROM display_presence WHERE id=?').get(id) as
      { seen_at: number } | undefined;
    return row?.seen_at ?? null;
  }
  const { data, error } = await supabase()
    .from('display_presence')
    .select('seen_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('Presence read failed: ' + error.message);
  return data ? Date.parse(data.seen_at) : null;
}
