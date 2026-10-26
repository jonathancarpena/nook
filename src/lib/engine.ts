import { randomInt, randomUUID } from 'node:crypto';
import {
  ROUNDS,
  type State,
  type Round,
  type HostCommand,
  type PublicState,
  remainingTime,
} from './types';
export class RuleError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleError(message);
}
export function initialState(id = 'live'): State {
  return {
    id,
    version: 0,
    status: 'registration',
    registrationOpen: false,
    contestants: [],
    round: 0,
    rounds: [],
    scene: 'welcome',
    timer: { duration: 60000, remaining: 60000, endsAt: null, visible: false },
    paused: false,
    effectId: '',
    effectAt: 0,
    updatedAt: new Date().toISOString(),
  };
}
export function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function validName(name?: string): string {
  const result = name?.trim().replace(/\s+/g, ' ');
  assert(
    result && result.length >= 2 && result.length <= 60 && !/[\u0000-\u001f<>]/.test(result),
    'Use a name between 2 and 60 characters, without markup.',
  );
  return result;
}
export function register(state: State, name: string, tokenHash: string): State {
  const s = structuredClone(state);
  if (s.contestants.some((p) => p.tokenHash === tokenHash)) return s;
  assert(s.status === 'registration' && s.registrationOpen, 'Registration is closed.');
  const available = Array.from({ length: 24 }, (_, i) => i + 1).filter(
    (n) => !s.contestants.some((p) => p.number === n),
  );
  assert(available.length, 'All 24 places have been taken.');
  s.contestants.push({
    id: randomUUID(),
    name: validName(name),
    number: available[randomInt(available.length)],
    tokenHash,
    registeredAt: new Date().toISOString(),
  });
  if (s.contestants.length === 24) s.registrationOpen = false;
  return s;
}
function makeRound(number: number, participants: string[]): Round {
  return {
    number,
    participants,
    teams: [],
    locked: false,
    revealed: [],
    selected: [],
    winners: [],
    confirmed: false,
    resultsRevealed: false,
  };
}
function activeRound(s: State): Round {
  const r = s.rounds.find((r) => r.number === s.round);
  assert(r, 'Begin the tournament first.');
  return r;
}
function checkWinners(r: Round) {
  const selected = new Set(r.selected);
  assert(selected.size === r.selected.length, 'Duplicate selections are not allowed.');
  if (r.number === 1) {
    assert(
      selected.size === 6 && r.selected.every((id) => r.teams.some((t) => t.id === id)),
      'Select exactly six winning duos.',
    );
    return r.teams.filter((t) => selected.has(t.id)).flatMap((t) => t.members);
  }
  if (r.number === 2) {
    assert(
      selected.size === 2 &&
        [1, 2].every(
          (m) => r.teams.filter((t) => t.match === m && selected.has(t.id)).length === 1,
        ),
      'Select exactly one winning trio in each match.',
    );
    return r.teams.filter((t) => selected.has(t.id)).flatMap((t) => t.members);
  }
  assert(
    selected.size === (r.number === 3 ? 3 : 1) &&
      r.selected.every((id) => r.participants.includes(id)),
    r.number === 3 ? 'Select exactly three finalists.' : 'Select exactly one champion.',
  );
  return [...r.selected];
}
export function applyCommand(state: State, command: HostCommand): State {
  const s = structuredClone(state),
    c = command;
  if (c.type === 'registration') {
    assert(s.status === 'registration', 'Registration cannot change after the tournament begins.');
    assert(!c.enabled || s.contestants.length < 24, 'The tournament is full.');
    s.registrationOpen = !!c.enabled;
  } else if (c.type === 'add') {
    const next = register({ ...s, registrationOpen: true }, c.name ?? '', `host:${randomUUID()}`);
    next.registrationOpen = s.registrationOpen && next.contestants.length < 24;
    return next;
  } else if (c.type === 'edit') {
    const p = s.contestants.find((p) => p.id === c.id);
    assert(p, 'Contestant not found.');
    p.name = validName(c.name);
  } else if (c.type === 'remove') {
    assert(
      s.status === 'registration',
      'Contestants can only be removed before the tournament begins.',
    );
    assert(
      s.contestants.some((p) => p.id === c.id),
      'Contestant not found.',
    );
    s.contestants = s.contestants.filter((p) => p.id !== c.id);
  } else if (c.type === 'begin') {
    assert(
      s.status === 'registration' && s.contestants.length === 24,
      'Exactly 24 contestants are required to begin.',
    );
    s.status = 'active';
    s.registrationOpen = false;
    s.round = 1;
    s.rounds = [
      makeRound(
        1,
        s.contestants.map((p) => p.id),
      ),
    ];
    s.scene = 'intro';
  } else if (c.type === 'generate') {
    const r = activeRound(s);
    assert(!s.paused, 'Resume the tournament first.');
    assert(
      r.number <= 2 && !r.locked && !r.confirmed,
      'Teams are locked or this is an individual round.',
    );
    const definition = ROUNDS[r.number - 1];
    assert(r.participants.length === definition.start, 'Invalid participant count.');
    const ids = shuffle(r.participants);
    r.teams = [];
    for (let i = 0; i < ids.length; i += definition.size) {
      const index = i / definition.size;
      r.teams.push({
        id: randomUUID(),
        label: `${r.number === 1 ? 'Duo' : 'Trio'} ${String(index + 1).padStart(2, '0')}`,
        members: ids.slice(i, i + definition.size),
        match: r.number === 2 ? Math.floor(index / 2) + 1 : null,
      });
    }
    r.selected = [];
  } else if (c.type === 'lock') {
    const r = activeRound(s);
    assert(!r.locked, 'Assignments are already locked.');
    assert(r.number > 2 || r.teams.length === (r.number === 1 ? 12 : 4), 'Generate teams first.');
    r.locked = true;
  } else if (c.type === 'reveal') {
    const r = activeRound(s);
    assert(r.locked, 'Lock assignments before revealing.');
    const match = r.number === 2 ? (c.value ?? 1) : 0;
    assert(r.number !== 2 || [1, 2].includes(match), 'Invalid match.');
    if (!r.revealed.includes(match)) r.revealed.push(match);
    s.scene = r.number === 4 ? 'finalists' : 'teams';
  } else if (c.type === 'select') {
    const r = activeRound(s);
    assert(!s.paused, 'Resume the tournament first.');
    assert(
      r.locked && !r.confirmed,
      'Lock assignments first. Confirmed results require a correction.',
    );
    r.selected = [...(c.ids ?? [])];
    assert(new Set(r.selected).size === r.selected.length, 'Duplicate selections.');
    assert(
      r.selected.every((id) =>
        r.number <= 2 ? r.teams.some((t) => t.id === id) : r.participants.includes(id),
      ),
      'Invalid selection.',
    );
    if (r.number === 2)
      assert(
        [1, 2].every(
          (m) => r.teams.filter((t) => t.match === m && r.selected.includes(t.id)).length <= 1,
        ),
        'Only one trio can win each match.',
      );
    assert(
      r.selected.length <= (r.number === 1 ? 6 : r.number === 2 ? 2 : r.number === 3 ? 3 : 1),
      'Too many winners selected.',
    );
  } else if (c.type === 'confirm') {
    const r = activeRound(s);
    assert(!s.paused, 'Resume the tournament first.');
    assert(
      r.locked && !r.confirmed,
      'Results have already been confirmed or assignments are unlocked.',
    );
    assert(c.confirmation === 'CONFIRM', 'Explicit result confirmation is required.');
    r.winners = checkWinners(r);
    assert(r.winners.length === ROUNDS[r.number - 1].survive, 'Invalid survivor count.');
    r.confirmed = true;
  } else if (c.type === 'results') {
    const r = activeRound(s);
    assert(r.confirmed, 'Confirm the results first.');
    r.resultsRevealed = true;
    s.scene = r.number === 4 ? 'champion' : 'elimination';
    if (r.number === 4) s.status = 'completed';
  } else if (c.type === 'advance') {
    const r = activeRound(s);
    assert(!s.paused, 'Resume the tournament first.');
    assert(
      r.number < 4 && r.confirmed && r.resultsRevealed,
      'Confirm and reveal results before advancing.',
    );
    s.round++;
    s.rounds.push(makeRound(s.round, [...r.winners]));
    s.scene = 'waiting';
    s.timer.endsAt = null;
    s.timer.remaining = s.timer.duration;
    s.timer.visible = false;
  } else if (c.type === 'scene') {
    assert(c.scene, 'A scene is required.');
    if (['teams', 'game', 'finalists'].includes(c.scene)) {
      const r = activeRound(s);
      assert(r.revealed.length > 0, 'Reveal assignments first.');
      if (c.scene === 'finalists') assert(s.round === 4, 'Finalists are available in the finale.');
    }
    if (c.scene === 'intro') assert(s.round > 0, 'Begin the tournament first.');
    if (c.scene === 'elimination')
      assert(activeRound(s).resultsRevealed, 'Results are still private.');
    if (c.scene === 'champion')
      assert(
        s.status === 'completed' && activeRound(s).resultsRevealed,
        'Confirm and reveal a champion first.',
      );
    s.scene = c.scene;
  } else if (c.type === 'timer') {
    const t = s.timer;
    switch (c.operation) {
      case 'start':
        assert(!s.paused, 'Resume the tournament first.');
        assert(remainingTime(t) > 0, 'Reset the expired timer first.');
        if (t.endsAt === null) t.endsAt = Date.now() + t.remaining;
        break;
      case 'pause':
        t.remaining = remainingTime(t);
        t.endsAt = null;
        break;
      case 'reset':
        t.endsAt = null;
        t.remaining = t.duration;
        break;
      case 'adjust':
        assert(c.value === 10000 || c.value === -10000, 'Adjust by ten seconds.');
        t.remaining = Math.min(3600000, Math.max(0, remainingTime(t) + c.value));
        if (t.endsAt !== null) t.endsAt = Date.now() + t.remaining;
        break;
      case 'configure':
        assert(
          Number.isInteger(c.value) && c.value! >= 1000 && c.value! <= 3600000,
          'Choose a duration from 1 to 3600 seconds.',
        );
        t.duration = c.value!;
        t.remaining = c.value!;
        t.endsAt = null;
        break;
      case 'visibility':
        t.visible = !!c.enabled;
        break;
      default:
        throw new RuleError('Unknown timer operation.', 400);
    }
  } else if (c.type === 'pause') {
    s.paused = !!c.enabled;
    if (s.paused) {
      s.timer.remaining = remainingTime(s.timer);
      s.timer.endsAt = null;
      s.scene = 'waiting';
    }
  } else if (c.type === 'replay') {
    assert(s.status === 'completed', 'Reveal the champion first.');
    s.scene = 'champion';
  } else if (c.type === 'rewind') {
    assert(c.confirmation === 'REWIND', 'Confirm that downstream rounds will be erased.');
    assert(
      Number.isInteger(c.value) && c.value! >= 1 && c.value! <= s.round,
      'Choose an existing round.',
    );
    const r = s.rounds.find((r) => r.number === c.value)!;
    s.round = c.value!;
    s.rounds = s.rounds.filter((r) => r.number < s.round);
    s.rounds.push(makeRound(s.round, r.participants));
    s.status = 'active';
    s.scene = 'waiting';
    s.paused = false;
    s.timer = { ...s.timer, endsAt: null, remaining: s.timer.duration, visible: false };
  } else if (c.type === 'seed') {
    assert(s.id === 'demo', 'Fictional contestants are restricted to the isolated demo.');
    assert(
      s.status === 'registration' && s.contestants.length === 0,
      'Reset the demo before seeding.',
    );
    let seeded = { ...s, registrationOpen: true };
    const names = [
      'Raven Blackwood',
      'Jasper Nightingale',
      'Hazel Moon',
      'Felix Graves',
      'Luna Ashford',
      'Oscar Wren',
      'Ivy Hollow',
      'Theo Crow',
      'Willow Frost',
      'Finn Thorne',
      'Aurora Vale',
      'Miles Raven',
      'Cleo Finch',
      'Arthur Dusk',
      'Sage Wilder',
      'Nora Spellman',
      'Ezra Moss',
      'Ruby Hart',
      'Silas Reed',
      'Violet Cross',
      'Leo Fox',
      'Mabel Stone',
      'Atticus Shaw',
      'Florence Grey',
    ];
    for (const name of names) seeded = register(seeded, name, `demo:${randomUUID()}`);
    return seeded;
  } else if (c.type === 'reset') {
    assert(c.confirmation === 'RESET', 'Type RESET to erase this tournament.');
    return initialState(s.id);
  } else throw new RuleError('Unknown action.', 400);
  if (['begin', 'reveal', 'results', 'advance', 'replay', 'scene'].includes(c.type)) {
    s.effectId = randomUUID();
    s.effectAt = Date.now();
  }
  return s;
}
export function publicState(s: State): PublicState {
  const revealed = s.rounds.filter((r) => r.resultsRevealed);
  const contestants = s.contestants.map(({ tokenHash: _tokenHash, ...p }) => ({
    ...p,
    status: (revealed.some((r) => r.participants.includes(p.id) && !r.winners.includes(p.id))
      ? 'eliminated'
      : s.status === 'completed' && s.rounds[3]?.winners.includes(p.id)
        ? 'champion'
        : 'active') as 'active' | 'eliminated' | 'champion',
  }));
  return {
    ...s,
    contestants,
    rounds: s.rounds.map(({ selected: _selected, ...r }) => ({
      ...r,
      teams: r.teams.filter((t) => r.revealed.includes(r.number === 2 ? t.match! : 0)),
      participants: r.revealed.length || r.resultsRevealed ? r.participants : [],
      winners: r.resultsRevealed ? r.winners : [],
      confirmed: r.resultsRevealed,
    })),
    serverTime: Date.now(),
  };
}
