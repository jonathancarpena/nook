import { describe, it, expect } from 'vitest';
import { applyCommand, initialState, register, publicState } from '../src/lib/engine';
import { ROUNDS, remainingTime, type State, type HostCommand } from '../src/lib/types';
function cmd(s: State, c: HostCommand) {
  return applyCommand(s, c);
}
function full(id = 'live') {
  let s = cmd(initialState(id), { type: 'registration', enabled: true });
  for (let i = 0; i < 24; i++) s = register(s, `Guest ${i + 1}`, `token-${i}`);
  return s;
}
function ready() {
  let s = cmd(full(), { type: 'begin' });
  s = cmd(s, { type: 'generate' });
  return cmd(s, { type: 'lock' });
}
function finish(s: State) {
  const r = s.rounds[s.round - 1];
  const ids =
    s.round === 1
      ? r.teams.slice(0, 6).map((t) => t.id)
      : s.round === 2
        ? [r.teams[0].id, r.teams[2].id]
        : r.participants.slice(0, s.round === 3 ? 3 : 1);
  s = cmd(s, { type: 'select', ids });
  s = cmd(s, { type: 'confirm', confirmation: 'CONFIRM' });
  return cmd(s, { type: 'results' });
}
function atRound(n: number) {
  let s = ready();
  while (s.round < n) {
    s = cmd(finish(s), { type: 'advance' });
    if (s.round === 2) s = cmd(s, { type: 'generate' });
    s = cmd(s, { type: 'lock' });
  }
  return s;
}
describe('registration invariants', () => {
  it('allocates exactly 24 unique immutable random numbers and closes at capacity', () => {
    const s = full();
    expect(new Set(s.contestants.map((p) => p.number))).toEqual(
      new Set(Array.from({ length: 24 }, (_, i) => i + 1)),
    );
    expect(s.registrationOpen).toBe(false);
    expect(() => register(s, 'Overflow', 'overflow')).toThrow();
    expect(s.contestants.map((p) => p.number)).not.toEqual(
      Array.from({ length: 24 }, (_, i) => i + 1),
    );
  });
  it('deduplicates guest retries and validates names', () => {
    const s = full();
    expect(register(s, 'Changed name', 'token-0').contestants).toEqual(s.contestants);
    expect(() =>
      register({ ...initialState(), registrationOpen: true }, '<script>', 'x'),
    ).toThrow();
  });
  it('reuses only the removed number and preserves closed registration for manual adds', () => {
    let s = full();
    const removed = s.contestants[0];
    s = cmd(s, { type: 'remove', id: removed.id });
    const numbers = s.contestants.map((p) => p.number);
    s = cmd(s, { type: 'add', name: 'New guest' });
    expect(s.contestants.at(-1)?.number).toBe(removed.number);
    expect(s.contestants.slice(0, -1).map((p) => p.number)).toEqual(numbers);
    expect(s.registrationOpen).toBe(false);
  });
  it('requires 24 players and forbids registration/removal once started', () => {
    expect(() => cmd(initialState(), { type: 'begin' })).toThrow();
    const s = ready();
    expect(() => cmd(s, { type: 'remove', id: s.contestants[0].id })).toThrow();
    expect(() => register(s, 'Late guest', 'late')).toThrow();
  });
});
describe('official tournament', () => {
  it('generates 12 duos containing every contestant exactly once', () => {
    const s = ready(),
      r = s.rounds[0];
    expect(r.teams).toHaveLength(12);
    expect(r.teams.every((t) => t.members.length === 2)).toBe(true);
    expect(new Set(r.teams.flatMap((t) => t.members))).toEqual(
      new Set(s.contestants.map((p) => p.id)),
    );
  });
  it('requires exactly six duos and produces 12 survivors', () => {
    let s = ready();
    s = cmd(s, { type: 'select', ids: s.rounds[0].teams.slice(0, 5).map((t) => t.id) });
    expect(() => cmd(s, { type: 'confirm', confirmation: 'CONFIRM' })).toThrow();
    s = finish(s);
    expect(s.rounds[0].winners).toHaveLength(12);
  });
  it('creates four trios in two matches and includes every survivor once', () => {
    const s = atRound(2),
      r = s.rounds[1];
    expect(r.teams).toHaveLength(4);
    expect(r.teams.every((t) => t.members.length === 3)).toBe(true);
    expect(new Set(r.teams.flatMap((t) => t.members))).toEqual(new Set(s.rounds[0].winners));
    expect(r.teams.filter((t) => t.match === 1)).toHaveLength(2);
    expect(r.teams.filter((t) => t.match === 2)).toHaveLength(2);
  });
  it('rejects two winners from the same match and requires one per match', () => {
    const s = atRound(2),
      t = s.rounds[1].teams;
    expect(() => cmd(s, { type: 'select', ids: [t[0].id, t[1].id] })).toThrow();
    let one = cmd(s, { type: 'select', ids: [t[0].id] });
    expect(() => cmd(one, { type: 'confirm', confirmation: 'CONFIRM' })).toThrow();
    one = finish(s);
    expect(one.rounds[1].winners).toHaveLength(6);
  });
  it('round 3 is only Ghost Breath and requires exactly three finalists', () => {
    let s = atRound(3);
    expect(ROUNDS[2].name).toBe('Ghost Breath');
    expect(s.rounds[2].participants).toHaveLength(6);
    expect(() => cmd(s, { type: 'generate' })).toThrow();
    s = cmd(s, { type: 'select', ids: s.rounds[2].participants.slice(0, 2) });
    expect(() => cmd(s, { type: 'confirm', confirmation: 'CONFIRM' })).toThrow();
    expect(finish(s).rounds[2].winners).toHaveLength(3);
  });
  it('round 4 requires one confirmed champion before reveal and permits replay', () => {
    let s = atRound(4);
    expect(s.rounds[3].participants).toHaveLength(3);
    expect(() => cmd(s, { type: 'results' })).toThrow();
    expect(() => cmd(s, { type: 'scene', scene: 'champion' })).toThrow();
    expect(() => cmd(s, { type: 'select', ids: s.rounds[3].participants.slice(0, 2) })).toThrow();
    s = finish(s);
    expect(s.status).toBe('completed');
    expect(s.rounds[3].winners).toHaveLength(1);
    const replay = cmd(s, { type: 'replay' });
    expect(replay.effectId).not.toBe(s.effectId);
    expect(replay.rounds[3].winners).toEqual(s.rounds[3].winners);
  });
  it('never includes eliminated contestants in later rounds or changes original numbers', () => {
    let s = atRound(4);
    const before = s.contestants.map((p) => [p.id, p.number]);
    s = finish(s);
    for (let i = 1; i < 4; i++) expect(s.rounds[i].participants).toEqual(s.rounds[i - 1].winners);
    expect(s.contestants.map((p) => [p.id, p.number])).toEqual(before);
  });
  it('locked assignments cannot reshuffle and confirmations are explicit', () => {
    const s = ready();
    expect(() => cmd(s, { type: 'generate' })).toThrow();
    expect(() => cmd(s, { type: 'confirm' })).toThrow();
    expect(() => cmd(s, { type: 'advance' })).toThrow();
  });
  it('keeps private assignments, selections, token hashes and confirmed results off the public API', () => {
    let s = ready();
    let pub = publicState(s);
    expect(pub.rounds[0].teams).toEqual([]);
    expect(pub.rounds[0].participants).toEqual([]);
    expect(JSON.stringify(pub)).not.toContain('tokenHash');
    s = cmd(s, { type: 'select', ids: s.rounds[0].teams.slice(0, 6).map((t) => t.id) });
    s = cmd(s, { type: 'confirm', confirmation: 'CONFIRM' });
    pub = publicState(s);
    expect(pub.rounds[0].winners).toEqual([]);
    expect(pub.rounds[0]).not.toHaveProperty('selected');
    expect(pub.rounds[0].confirmed).toBe(false);
    expect(pub.contestants.every((p) => p.status === 'active')).toBe(true);
    expect(() => cmd(s, { type: 'scene', scene: 'elimination' })).toThrow();
    pub = publicState(cmd(s, { type: 'results' }));
    expect(pub.rounds[0].winners).toHaveLength(12);
    expect(pub.contestants.filter((p) => p.status === 'eliminated')).toHaveLength(12);
  });
  it('reveals Charades matchups independently', () => {
    let s = atRound(2);
    s = cmd(s, { type: 'reveal', value: 1 });
    expect(publicState(s).rounds[1].teams).toHaveLength(2);
    expect(publicState(s).rounds[1].teams.every((t) => t.match === 1)).toBe(true);
  });
  it('round corrections invalidate downstream state and preserve earlier outcomes', () => {
    const s = atRound(4);
    expect(() => cmd(s, { type: 'rewind', value: 2 })).toThrow();
    const corrected = cmd(s, { type: 'rewind', value: 2, confirmation: 'REWIND' });
    expect(corrected.round).toBe(2);
    expect(corrected.rounds).toHaveLength(2);
    expect(corrected.rounds[0]).toEqual(s.rounds[0]);
    expect(corrected.rounds[1].participants).toEqual(s.rounds[0].winners);
    expect(corrected.rounds[1].teams).toEqual([]);
    expect(corrected.rounds[1].confirmed).toBe(false);
  });
  it('timer and pause never eliminate anyone', () => {
    let s = ready();
    s = cmd(s, { type: 'timer', operation: 'configure', value: 1000 });
    s = cmd(s, { type: 'timer', operation: 'start' });
    expect(remainingTime(s.timer, Date.now() + 5000)).toBe(0);
    expect(s.rounds[0].winners).toEqual([]);
    s = cmd(s, { type: 'pause', enabled: true });
    expect(s.timer.endsAt).toBeNull();
    expect(() => cmd(s, { type: 'select', ids: [] })).toThrow();
    expect(s.scene).toBe('waiting');
  });
  it('demo seed and reset never affect the live tournament', () => {
    expect(() => cmd(initialState(), { type: 'seed' })).toThrow();
    let s = cmd(initialState('demo'), { type: 'seed' });
    expect(s.contestants).toHaveLength(24);
    s = cmd(s, { type: 'reset', confirmation: 'RESET' });
    expect(s.contestants).toEqual([]);
    expect(s.id).toBe('demo');
  });
});
