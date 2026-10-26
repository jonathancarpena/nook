export const ROUNDS = [
  {
    number: 1,
    name: 'Mummy Mayhem',
    start: 24,
    survive: 12,
    size: 2,
    description: 'Find your other half. Wrap fast. Survive together.',
    format: '12 random duos',
    icon: 'mummy',
  },
  {
    number: 2,
    name: 'Charades',
    start: 12,
    survive: 6,
    size: 3,
    description: 'No words. No mercy. Let your actions do the talking.',
    format: '4 trios · 2 matches',
    icon: 'mask',
  },
  {
    number: 3,
    name: 'Ghost Breath',
    start: 6,
    survive: 3,
    size: 1,
    description: 'Steady your nerves. Every breath could be your last.',
    format: 'Individual challenge',
    icon: 'ghost',
  },
  {
    number: 4,
    name: 'Traitors Trial',
    start: 3,
    survive: 1,
    size: 1,
    description: 'Three enter the final trial. Only one leaves a legend.',
    format: 'The grand finale',
    icon: 'crown',
  },
] as const;
export type Scene =
  'welcome' | 'waiting' | 'intro' | 'teams' | 'game' | 'elimination' | 'finalists' | 'champion';
export type Contestant = {
  id: string;
  name: string;
  number: number;
  tokenHash: string;
  registeredAt: string;
};
export type Team = { id: string; label: string; members: string[]; match: number | null };
export type Round = {
  number: number;
  participants: string[];
  teams: Team[];
  locked: boolean;
  revealed: number[];
  selected: string[];
  winners: string[];
  confirmed: boolean;
  resultsRevealed: boolean;
};
export type Timer = {
  duration: number;
  remaining: number;
  endsAt: number | null;
  visible: boolean;
};
export type State = {
  id: string;
  version: number;
  status: 'registration' | 'active' | 'completed';
  registrationOpen: boolean;
  contestants: Contestant[];
  round: number;
  rounds: Round[];
  scene: Scene;
  timer: Timer;
  paused: boolean;
  effectId: string;
  effectAt: number;
  updatedAt: string;
};
export type PublicContestant = Omit<Contestant, 'tokenHash'> & {
  status: 'active' | 'eliminated' | 'champion';
};
export type PublicState = Omit<State, 'contestants' | 'rounds'> & {
  contestants: PublicContestant[];
  rounds: Omit<Round, 'selected'>[];
  serverTime: number;
};
export type HostCommand = {
  type:
    | 'registration'
    | 'add'
    | 'edit'
    | 'remove'
    | 'begin'
    | 'generate'
    | 'lock'
    | 'reveal'
    | 'select'
    | 'confirm'
    | 'results'
    | 'advance'
    | 'scene'
    | 'timer'
    | 'pause'
    | 'replay'
    | 'rewind'
    | 'seed'
    | 'reset'
    | 'undo';
  name?: string;
  id?: string;
  ids?: string[];
  value?: number;
  enabled?: boolean;
  scene?: Scene;
  operation?: 'start' | 'pause' | 'reset' | 'adjust' | 'configure' | 'visibility';
  confirmation?: string;
};
export const formatNumber = (n: number) => String(n).padStart(2, '0');
export function remainingTime(timer: Timer, now = Date.now()) {
  return Math.max(0, timer.endsAt === null ? timer.remaining : timer.endsAt - now);
}
