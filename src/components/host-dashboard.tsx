'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Swords,
  Monitor,
  Settings,
  ArrowUpRight,
  Plus,
  Download,
  LogOut,
  Pause,
  Play,
  Undo2,
  Trash2,
  Pencil,
  LoaderCircle,
  Skull,
  UserCheck,
  Clock,
  FlaskConical,
  Printer,
  X,
} from 'lucide-react';
import { Brand, Connection, GameIcon } from './brand';
import { HauntedArt } from './haunted-art';
import { JoinQR } from './qr';
import { ProjectorStatus } from './projector-status';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
import { TournamentPanel } from './tournament-panel';
import { TimerPanel } from './timer-panel';
import { useLive } from '@/lib/use-live';
import { ROUNDS, formatNumber, type State, type Scene, type HostCommand } from '@/lib/types';
type View = 'Overview' | 'Contestants' | 'Tournament' | 'Projector' | 'Settings';
const navigation = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Contestants', icon: Users },
  { name: 'Tournament', icon: Swords },
  { name: 'Projector', icon: Monitor },
  { name: 'Settings', icon: Settings },
] as const;
const scenes: [Scene, string, string][] = [
  ['welcome', 'Welcome', 'Registration & QR code'],
  ['waiting', 'Holding screen', 'Give the room a moment'],
  ['intro', 'Introduction', 'Let the games begin'],
  ['teams', 'Team reveal', 'Authorized assignments only'],
  ['game', 'Active game', 'Assignments & countdown'],
  ['elimination', 'The verdict', 'Revealed results only'],
  ['finalists', 'The final three', 'Introduce the finalists'],
  ['champion', 'Grand champion', 'The last one standing'],
];
export function HostDashboard({
  demo = false,
  demoAvailable = false,
}: {
  demo?: boolean;
  demoAvailable?: boolean;
}) {
  const { state, status, error, setError, busy, send, offset } = useLive<State>(true, demo);
  const [view, setView] = useState<View>('Overview');
  const [edit, setEdit] = useState<{ id?: string; name: string } | null>(null),
    [remove, setRemove] = useState<string | null>(null),
    [recovery, setRecovery] = useState<'reset' | 'rewind' | null>(null),
    [text, setText] = useState(''),
    [rewind, setRewind] = useState('1');
  const router = useRouter();
  const suffix = demo ? '?mode=demo' : '';
  const action = (c: HostCommand) => send(c);
  if (!state)
    return (
      <div className="loading-screen">
        <LoaderCircle className="spinner" size={22} />
        <div>
          {error || 'Opening the control room…'}
          {error && (
            <Button
              variant="secondary"
              style={{ margin: 15 }}
              onClick={() => window.location.reload()}
            >
              Retry connection
            </Button>
          )}
        </div>
      </div>
    );
  const current = state.rounds.find((r) => r.number === state.round);
  const remaining = current?.confirmed
    ? current.winners.length
    : (current?.participants.length ?? state.contestants.length);
  const eliminated = state.contestants.length - remaining;
  const eliminatedIds = state.rounds
    .filter((r) => r.confirmed)
    .flatMap((r) => r.participants.filter((id) => !r.winners.includes(id)));
  async function saveContestant(e: React.FormEvent) {
    e.preventDefault();
    if (edit && (await action({ type: edit.id ? 'edit' : 'add', id: edit.id, name: edit.name })))
      setEdit(null);
  }
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Brand compact />
        <span className="sidebar-label">THE CONTROL ROOM</span>
        <nav aria-label="Host navigation">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setView(name)}
              className={view === name ? 'active' : ''}
            >
              <Icon size={17} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <GameIcon round={4} size={23} />
            <strong>One night. One champion.</strong>Make it a game to remember.
          </div>
          <Link href={`/display${suffix}`} target="_blank" rel="noreferrer">
            <Monitor size={15} /> Open projector <ArrowUpRight size={12} />
          </Link>
          {demoAvailable && (
            <Link href={demo ? '/host' : '/demo'}>
              <FlaskConical size={15} />
              {demo ? 'Back to live event' : 'Practice in demo mode'}
            </Link>
          )}
          <button
            className="button button-ghost"
            style={{ justifyContent: 'start', paddingLeft: 0 }}
            onClick={async () => {
              const r = await fetch('/api/auth/logout', { method: 'POST' });
              if (r.ok) {
                router.push('/login');
                router.refresh();
              } else setError('Sign-out failed. Please retry.');
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <span>
            THE HALLOWEEN GAMES <span style={{ margin: '0 10px', color: '#574450' }}>/</span> {view}
          </span>
          <div>
            <ProjectorStatus demo={demo} />
            <Connection status={status} />
            <span className="host-avatar">H</span>
          </div>
        </header>
        <main className="dashboard-content">
          {demo && (
            <div className="info-banner">
              <strong>REHEARSAL MODE</strong> · This tournament is isolated from the live event. All
              demo controls require host authentication.
            </div>
          )}
          <div className="dashboard-title">
            <div>
              <h1>
                {view === 'Overview'
                  ? 'Welcome, game master.'
                  : view === 'Tournament'
                    ? 'Let fate take the stage.'
                    : view === 'Contestants'
                      ? 'The summoned.'
                      : view === 'Projector'
                        ? 'Set the scene.'
                        : 'Behind the curtain.'}
              </h1>
              <p>
                {view === 'Overview'
                  ? 'The stage is yours. A memorable night awaits.'
                  : view === 'Tournament'
                    ? 'Every verdict is yours. Every reveal is on your cue.'
                    : view === 'Contestants'
                      ? '24 places. 24 stories. Only one will become a legend.'
                      : view === 'Projector'
                        ? 'Control what the room sees, one moment at a time.'
                        : 'Recovery tools, backups, and event safeguards.'}
              </p>
            </div>
            <div className="dashboard-title-actions">
              <Link
                href={`/display${suffix}`}
                target="_blank"
                rel="noreferrer"
                className="button button-secondary"
              >
                <Monitor size={15} />
                <span className="desktop-only">Open projector</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
          {error && (
            <div role="alert" className="error-banner">
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {state.paused && (
            <div className="info-banner">
              Tournament paused. The timer is frozen and results cannot be changed until you resume.
            </div>
          )}
          <fieldset
            disabled={busy || status !== 'live'}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <div className="stats-grid">
              {[
                {
                  label: 'Registered contestants',
                  value: state.contestants.length,
                  total: '/ 24',
                  note: state.registrationOpen ? 'Registration is open' : 'Registration is closed',
                  icon: Users,
                },
                {
                  label: 'Still in the game',
                  value: remaining,
                  total: '',
                  note: 'One step closer to glory',
                  icon: UserCheck,
                },
                {
                  label: 'Eliminated',
                  value: eliminated,
                  total: '',
                  note: 'Gone, but not forgotten',
                  icon: Skull,
                },
                {
                  label: 'Current round',
                  value: state.round ? `0${state.round}` : '—',
                  total: state.round ? '/ 04' : '',
                  note: state.round ? ROUNDS[state.round - 1].name : 'Awaiting the first verdict',
                  icon: Clock,
                },
              ].map(({ label, value, total, note, icon: Icon }) => (
                <section className="stat-card" key={label}>
                  <div className="stat-label">
                    {label}
                    <Icon size={15} />
                  </div>
                  <div className="stat-value">
                    {value}
                    <small>{total}</small>
                  </div>
                  <p>{note}</p>
                </section>
              ))}
            </div>
            {view === 'Overview' && (
              <>
                <div className="overview-grid">
                  <section className="panel welcome-panel">
                    <HauntedArt />
                    <p className="eyebrow">
                      {state.status === 'registration'
                        ? 'THE CALM BEFORE THE GAMES'
                        : state.status === 'completed'
                          ? 'A LEGEND HAS BEEN CROWNED'
                          : 'THE GAMES ARE UNDERWAY'}
                    </p>
                    <h2>
                      {state.status === 'registration' ? (
                        <>
                          A wickedly good night
                          <br />
                          starts right here.
                        </>
                      ) : state.status === 'completed' ? (
                        'The last one standing.'
                      ) : (
                        ROUNDS[state.round - 1].name
                      )}
                    </h2>
                    <p>
                      {state.status === 'registration'
                        ? 'Gather your contestants. Open the doors. Let a little friendly betrayal begin.'
                        : state.status === 'completed'
                          ? 'Replay the champion reveal and celebrate the evening’s victor.'
                          : 'Your contestants are ready. Control the assignments, the verdict, and the next dramatic reveal.'}
                    </p>
                    <Button
                      onClick={() =>
                        setView(state.status === 'registration' ? 'Contestants' : 'Tournament')
                      }
                    >
                      {state.status === 'registration'
                        ? 'Manage registration'
                        : 'Control the tournament'}{' '}
                      <ArrowUpRight size={15} />
                    </Button>
                  </section>
                  <section className="panel panel-body overview-qr">
                    <JoinQR size={115} />
                    <div className="qr-description">
                      <h3>Answer the call.</h3>
                      <p>
                        Scan to register.
                        <br />
                        Your number. Your destiny.
                      </p>
                      <span className={`status-pill ${state.registrationOpen ? '' : 'closed'}`}>
                        {state.registrationOpen
                          ? 'Registration open'
                          : state.contestants.length === 24
                            ? 'All places claimed'
                            : 'Registration closed'}
                      </span>
                      <Link style={{ marginTop: 12 }} href="/join" target="_blank">
                        Registration page <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </section>
                </div>
                <section className="panel">
                  <div className="panel-header">
                    <h2>The path to the last one standing</h2>
                    <span>24 → 12 → 6 → 3 → 1</span>
                  </div>
                  <div className="round-journey">
                    {ROUNDS.map((r) => (
                      <div className="journey-item" key={r.number}>
                        <div className="journey-icon">
                          <GameIcon round={r.number} size={30} />
                          <span>ROUND 0{r.number}</span>
                        </div>
                        <h3>{r.name}</h3>
                        <p>{r.format}</p>
                        <p>
                          {r.start} contestants → {r.survive}{' '}
                          {r.number === 4 ? 'champion' : 'survivors'}
                        </p>
                        <span className={`status-pill ${state.round === r.number ? '' : 'closed'}`}>
                          {state.rounds[r.number - 1]?.resultsRevealed
                            ? 'Verdict revealed'
                            : state.round === r.number
                              ? 'Current round'
                              : 'Awaiting its moment'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="toolbar" style={{ marginTop: 20 }}>
                  {state.status === 'registration' && (
                    <Button
                      onClick={() =>
                        void action({ type: 'registration', enabled: !state.registrationOpen })
                      }
                      disabled={state.contestants.length === 24 && !state.registrationOpen}
                    >
                      {state.registrationOpen ? 'Close registration' : 'Open registration'}
                    </Button>
                  )}
                  {demo && state.contestants.length === 0 && (
                    <Button variant="secondary" onClick={() => void action({ type: 'seed' })}>
                      <FlaskConical size={15} /> Generate 24 fictional contestants
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setView('Tournament')}>
                    <Swords size={15} /> Tournament controls
                  </Button>
                </div>
              </>
            )}
            {view === 'Contestants' && (
              <section className="panel">
                <div className="panel-header">
                  <h2>The contestant roster</h2>
                  <div className="toolbar">
                    {state.status === 'registration' && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={state.contestants.length === 24 && !state.registrationOpen}
                          onClick={() =>
                            void action({ type: 'registration', enabled: !state.registrationOpen })
                          }
                        >
                          {state.registrationOpen ? 'Close registration' : 'Open registration'}
                        </Button>
                        <Button
                          size="sm"
                          disabled={state.contestants.length === 24}
                          onClick={() => setEdit({ name: '' })}
                        >
                          <Plus size={13} /> Add contestant
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {state.contestants.length ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="roster">
                      <thead>
                        <tr>
                          <th>NUMBER</th>
                          <th>CONTESTANT</th>
                          <th>STATUS</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...state.contestants]
                          .sort((a, b) => a.number - b.number)
                          .map((p) => (
                            <tr key={p.id}>
                              <td>#{formatNumber(p.number)}</td>
                              <td>{p.name}</td>
                              <td>
                                <span
                                  className={`status-pill ${eliminatedIds.includes(p.id) ? 'closed' : ''}`}
                                >
                                  {eliminatedIds.includes(p.id)
                                    ? 'Eliminated'
                                    : state.status === 'completed'
                                      ? 'Champion'
                                      : 'In the game'}
                                </span>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Edit ${p.name}`}
                                    onClick={() => setEdit({ id: p.id, name: p.name })}
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                  {state.status === 'registration' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Remove ${p.name}`}
                                      onClick={() => setRemove(p.id)}
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Users size={32} />
                    <h3>Every legend starts with a name.</h3>
                    <p>Open registration and share the QR code, or add contestants here.</p>
                    {demo && (
                      <Button onClick={() => void action({ type: 'seed' })}>
                        <FlaskConical size={15} /> Generate 24 fictional contestants
                      </Button>
                    )}
                  </div>
                )}
              </section>
            )}
            {view === 'Tournament' && <TournamentPanel state={state} send={send} busy={busy} />}
            {view === 'Projector' && (
              <div className="split-grid">
                <section className="panel">
                  <div className="panel-header">
                    <h2>Audience scenes</h2>
                    <span>Current: {state.scene}</span>
                  </div>
                  <div className="panel-body">
                    <div className="scene-grid">
                      {scenes.map(([scene, title, description]) => (
                        <button
                          key={scene}
                          className={`scene-button ${state.scene === scene ? 'active' : ''}`}
                          onClick={() => void action({ type: 'scene', scene })}
                          disabled={
                            (scene === 'champion' && state.status !== 'completed') ||
                            (scene === 'elimination' && !current?.resultsRevealed) ||
                            (['teams', 'game', 'finalists'].includes(scene) &&
                              !current?.revealed.length) ||
                            (scene === 'finalists' && state.round !== 4) ||
                            (scene === 'intro' && state.round === 0)
                          }
                        >
                          <span>{title}</span>
                          <small>{description}</small>
                        </button>
                      ))}
                    </div>
                    <p className="muted" style={{ fontSize: 10, marginTop: 18 }}>
                      Team assignments and results must be explicitly revealed from Tournament
                      before they appear here. Audio is enabled on the projector itself.
                    </p>
                  </div>
                </section>
                <TimerPanel state={state} send={send} offset={offset.current} />
              </div>
            )}
            {view === 'Settings' && (
              <section className="panel">
                <div className="panel-header">
                  <h2>Event safeguards</h2>
                  <span>{demo ? 'DEMO' : 'LIVE EVENT'}</span>
                </div>
                <div className="panel-body">
                  <div className="setting-row">
                    <div>
                      <h3>Emergency backup</h3>
                      <p>
                        Download a portable JSON snapshot or print the current roster and team
                        sheets. Guest tokens are excluded.
                      </p>
                    </div>
                    <div className="toolbar">
                      <a className="button button-secondary" href={`/api/export${suffix}`}>
                        <Download size={15} /> Export JSON
                      </a>
                      <Link
                        target="_blank"
                        className="button button-secondary"
                        href={`/host/print${suffix}`}
                      >
                        <Printer size={15} /> Print roster
                      </Link>
                    </div>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>Pause the room</h3>
                      <p>
                        Freeze the timer and return the projector to a holding screen. Resume when
                        you’re ready.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => void action({ type: 'pause', enabled: !state.paused })}
                    >
                      {state.paused ? <Play size={15} /> : <Pause size={15} />}{' '}
                      {state.paused ? 'Resume tournament' : 'Pause tournament'}
                    </Button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>Undo the most recent action</h3>
                      <p>
                        Reverse the last host operation. Registrations, roster edits, reset, seed,
                        and undo cannot be undone.
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => void action({ type: 'undo' })}>
                      <Undo2 size={15} /> Undo last action
                    </Button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>Correct an earlier round</h3>
                      <p>
                        Erase assignments and results for a chosen round and every round after it.
                        Earlier survivors and original numbers are preserved.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={state.round === 0}
                      onClick={() => {
                        setRecovery('rewind');
                        setText('');
                      }}
                    >
                      Correct a round
                    </Button>
                  </div>
                  {demoAvailable && (
                    <div className="setting-row">
                      <div>
                        <h3>A rehearsal in the shadows</h3>
                        <p>Practice with fictional contestants in a separate tournament.</p>
                      </div>
                      <Link className="button button-secondary" href={demo ? '/host' : '/demo'}>
                        <FlaskConical size={15} />
                        {demo ? 'Return to live event' : 'Open demo mode'}
                      </Link>
                    </div>
                  )}
                  <div className="setting-row">
                    <div>
                      <h3>Host session</h3>
                      <p>Sign out when you are finished using this device.</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const response = await fetch('/api/auth/logout', { method: 'POST' });
                        if (response.ok) {
                          router.push('/login');
                          router.refresh();
                        } else setError('Sign-out failed. Please retry.');
                      }}
                    >
                      <LogOut size={15} /> Sign out of this device
                    </Button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <h3>{demo ? 'Reset demo' : 'Reset the live tournament'}</h3>
                      <p>
                        Clear every contestant and result in this {demo ? 'demo' : 'live event'}.
                        Export a backup first. This cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setRecovery('reset');
                        setText('');
                      }}
                    >
                      Reset {demo ? 'demo' : 'tournament'}
                    </Button>
                  </div>
                </div>
              </section>
            )}
          </fieldset>
          <div className="dashboard-bottom">
            <span>24 ENTER. ONLY ONE SURVIVES.</span>
            <span>
              {busy ? 'Saving…' : `Saved · revision ${state.version}`} {demo ? '· DEMO' : ''}
            </span>
          </div>
        </main>
      </div>
      <Modal
        open={edit !== null}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
        title={edit?.id ? 'A name, corrected.' : 'Summon a contestant.'}
        description={
          edit?.id
            ? 'Their contestant number will remain unchanged.'
            : 'A unique random number will be assigned by the server.'
        }
      >
        <form onSubmit={saveContestant}>
          <label className="field">
            Contestant name
            <input
              autoFocus
              required
              minLength={2}
              maxLength={60}
              value={edit?.name ?? ''}
              onChange={(e) => setEdit((v) => ({ ...v, name: e.target.value }))}
            />
          </label>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Save contestant
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
        title="Release this contestant?"
        description="Their number becomes available again. Other contestant numbers will remain unchanged."
      >
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setRemove(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              if (await action({ type: 'remove', id: remove! })) setRemove(null);
            }}
          >
            Remove contestant
          </Button>
        </div>
      </Modal>
      <Modal
        open={!!recovery}
        onOpenChange={(open) => {
          if (!open) setRecovery(null);
        }}
        title={recovery === 'reset' ? 'Erase this tournament?' : 'Reopen a previous verdict?'}
        description={
          recovery === 'reset'
            ? 'This clears all contestants, assignments, and results. Existing guest cards will no longer work. Export a backup before proceeding.'
            : 'This erases the chosen round and all downstream assignments and results. The selected round restarts with its original participants.'
        }
      >
        {recovery === 'rewind' && (
          <label className="field">
            Round to restart
            <select value={rewind} onChange={(e) => setRewind(e.target.value)}>
              {ROUNDS.filter((r) => r.number <= state.round).map((r) => (
                <option key={r.number} value={r.number}>
                  Round {r.number} · {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Type {recovery === 'reset' ? 'RESET' : 'REWIND'} to confirm
          <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        </label>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setRecovery(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy || text !== (recovery === 'reset' ? 'RESET' : 'REWIND')}
            onClick={async () => {
              if (await action({ type: recovery!, value: Number(rewind), confirmation: text }))
                setRecovery(null);
            }}
          >
            Confirm {recovery === 'reset' ? 'reset' : 'round correction'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
