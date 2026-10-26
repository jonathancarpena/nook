'use client';
import { useState } from 'react';
import { Shuffle, LockKeyhole, Eye, ArrowRight, Check, Users, Crown, Play } from 'lucide-react';
import { ROUNDS, formatNumber, type State, type HostCommand, type Team } from '@/lib/types';
import { Button } from './ui/button';
import { Modal } from './ui/dialog';
type Send = (command: HostCommand) => Promise<boolean>;
export function TournamentPanel({
  state,
  send,
  busy,
}: {
  state: State;
  send: Send;
  busy: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const round = state.rounds.find((r) => r.number === state.round);
  if (!round)
    return (
      <section className="panel">
        <div className="empty-state">
          <Users size={35} />
          <h3>The stage is almost set.</h3>
          <p>Register all 24 contestants before starting the first round.</p>
          <Button
            disabled={state.contestants.length !== 24 || busy}
            onClick={() => setConfirm(true)}
          >
            <Play size={15} /> Begin the tournament
          </Button>
        </div>
        <Modal
          open={confirm}
          onOpenChange={setConfirm}
          title="Let the games begin?"
          description="Registration will close. All 24 contestants will enter Mummy Mayhem."
        >
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (await send({ type: 'begin' })) setConfirm(false);
              }}
            >
              Begin tournament
            </Button>
          </div>
        </Modal>
      </section>
    );
  const definition = ROUNDS[round.number - 1],
    required = round.number === 1 ? 6 : round.number === 2 ? 2 : round.number === 3 ? 3 : 1;
  const isTeam = round.number <= 2;
  const options = isTeam
    ? round.teams
    : round.participants.map((id) => ({ id, label: 'Contestant', members: [id], match: null }));
  const selected = round.selected.length;
  const valid =
    selected === required &&
    (round.number !== 2 ||
      [1, 2].every(
        (m) =>
          round.teams.filter((t) => t.match === m && round.selected.includes(t.id)).length === 1,
      ));
  async function select(team: Team) {
    let ids = [...round!.selected];
    if (ids.includes(team.id)) ids = ids.filter((id) => id !== team.id);
    else {
      if (round!.number === 2)
        ids = ids.filter((id) => round!.teams.find((t) => t.id === id)?.match !== team.match);
      ids.push(team.id);
    }
    await send({ type: 'select', ids });
  }
  function cards(teams: Team[]) {
    return (
      <div className="team-grid">
        {teams.map((team) => (
          <button
            type="button"
            key={team.id}
            aria-pressed={round!.selected.includes(team.id)}
            className={`team-card ${round!.selected.includes(team.id) ? 'selected' : ''}`}
            disabled={
              busy ||
              !round!.locked ||
              round!.confirmed ||
              state.paused ||
              (!round!.selected.includes(team.id) && selected >= required && round!.number !== 2)
            }
            onClick={() => void select(team)}
          >
            <div className="team-label">
              {team.label}{' '}
              {round!.selected.includes(team.id) ? <Check size={15} /> : <span>○</span>}
            </div>
            {team.members.map((id) => {
              const p = state.contestants.find((p) => p.id === id)!;
              return (
                <div className="team-member" key={id}>
                  <b>#{formatNumber(p.number)}</b>
                  <span>{p.name}</span>
                </div>
              );
            })}
          </button>
        ))}
      </div>
    );
  }
  return (
    <>
      <section className="tournament-control">
        <div>
          <p className="eyebrow">
            ROUND 0{round.number} · {definition.format.toUpperCase()}
          </p>
          <h2>{definition.name}</h2>
          <p>
            {definition.start} contestants. {definition.survive}{' '}
            {round.number === 4 ? 'champion' : 'will survive'}.{' '}
            {round.confirmed
              ? 'Results confirmed.'
              : round.locked
                ? 'Assignments locked.'
                : 'Prepare the assignments privately.'}
          </p>
        </div>
        <div className="control-actions">
          {!round.locked && (
            <>
              {isTeam && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void send({ type: 'generate' })}
                >
                  <Shuffle size={15} />
                  {round.teams.length
                    ? 'Reshuffle'
                    : round.number === 1
                      ? 'Generate duos'
                      : 'Generate trios'}
                </Button>
              )}
              <Button
                disabled={busy || (isTeam && !round.teams.length)}
                onClick={() => void send({ type: 'lock' })}
              >
                <LockKeyhole size={15} /> Lock {isTeam ? 'teams' : 'contestants'}
              </Button>
            </>
          )}
          {round.locked && !round.resultsRevealed && round.number !== 2 && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void send({ type: 'reveal' })}
            >
              <Eye size={15} />
              {isTeam
                ? 'Reveal teams'
                : round.number === 4
                  ? 'Reveal finalists'
                  : 'Reveal contestants'}
            </Button>
          )}
          {round.confirmed && !round.resultsRevealed && (
            <Button disabled={busy} onClick={() => void send({ type: 'results' })}>
              <Eye size={15} />
              {round.number === 4 ? 'Reveal champion' : 'Reveal eliminations'}
            </Button>
          )}
          {round.resultsRevealed && round.number < 4 && (
            <Button disabled={busy || state.paused} onClick={() => void send({ type: 'advance' })}>
              Advance to {round.number === 3 ? 'finale' : `round ${round.number + 1}`}{' '}
              <ArrowRight size={15} />
            </Button>
          )}
          {state.status === 'completed' && (
            <Button onClick={() => void send({ type: 'replay' })} disabled={busy}>
              <Crown size={15} /> Replay champion reveal
            </Button>
          )}
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <h2>
            {round.confirmed
              ? 'The verdict is confirmed'
              : round.number === 4
                ? 'Choose the last one standing'
                : isTeam
                  ? 'Select the winning teams'
                  : 'Select the three finalists'}
          </h2>
          <span>
            {round.confirmed
              ? round.resultsRevealed
                ? 'Results public'
                : 'Results private'
              : `${selected} of ${required} selected`}
          </span>
        </div>
        <div className="panel-body">
          {!options.length ? (
            <div className="empty-state">
              <Shuffle size={30} />
              <h3>Leave it to fate.</h3>
              <p>
                Generate randomized {round.number === 1 ? 'duos' : 'trios'} to preview the
                assignments.
              </p>
            </div>
          ) : round.number === 2 ? (
            [1, 2].map((match) => (
              <div key={match}>
                <div className="match-heading">
                  <span>MATCH 0{match} · ONE TRIO ADVANCES</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!round.locked || busy}
                    onClick={() => void send({ type: 'reveal', value: match })}
                  >
                    <Eye size={13} /> Reveal match {match}
                  </Button>
                </div>
                {cards(options.filter((t) => t.match === match))}
              </div>
            ))
          ) : (
            cards(options)
          )}
          {options.length > 0 && (
            <div className="selection-footer">
              <div>
                <p>
                  {round.confirmed
                    ? `${definition.survive} contestants advance. ${definition.start - definition.survive} eliminated.`
                    : !round.locked
                      ? 'Lock assignments to select winners.'
                      : `Select exactly ${required} ${isTeam ? 'winning ' + (round.number === 1 ? 'duos' : 'trios') : 'contestant' + (required > 1 ? 's' : '')}.`}
                </p>
                <p>
                  {round.confirmed && !round.resultsRevealed
                    ? 'The projector cannot see these results until you reveal them.'
                    : 'Winners are chosen by the host after the physical game.'}
                </p>
              </div>
              <Button
                disabled={!valid || !round.locked || round.confirmed || busy || state.paused}
                onClick={() => setConfirm(true)}
              >
                <Check size={15} />
                {round.number === 4 ? 'Confirm champion' : 'Confirm results'}
              </Button>
            </div>
          )}
        </div>
      </section>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title={round.number === 4 ? 'Confirm the grand champion?' : 'The verdict is yours.'}
        description="Review carefully. These results will be saved privately before you reveal them to the audience."
      >
        <div className="confirmation-summary">
          <p>
            <b>{definition.survive}</b>{' '}
            {round.number === 4 ? 'champion will be crowned.' : 'contestants will advance.'}
          </p>
          <p>
            <b>{definition.start - definition.survive}</b> contestants will be eliminated.
          </p>
          {options
            .filter((t) => round.selected.includes(t.id))
            .flatMap((t) => t.members)
            .map((id) => {
              const p = state.contestants.find((p) => p.id === id)!;
              return (
                <p key={id}>
                  #{formatNumber(p.number)} · {p.name}
                </p>
              );
            })}
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              if (await send({ type: 'confirm', confirmation: 'CONFIRM' })) setConfirm(false);
            }}
          >
            Confirm {round.number === 4 ? 'champion' : 'results'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
