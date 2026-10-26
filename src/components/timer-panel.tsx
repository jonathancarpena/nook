'use client';
import { useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-react';
import { remainingTime, type State, type HostCommand } from '@/lib/types';
import { useClock } from '@/lib/use-live';
import { Button } from './ui/button';
export function TimerPanel({
  state,
  send,
  offset,
}: {
  state: State;
  send: (c: HostCommand) => Promise<boolean>;
  offset: number;
}) {
  const now = useClock();
  const [duration, setDuration] = useState('60');
  const ms = remainingTime(state.timer, now + offset);
  const seconds = Math.ceil(ms / 1000);
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Game timer</h2>
        <label className="switch-label">
          <input
            type="checkbox"
            checked={state.timer.visible}
            onChange={(e) =>
              void send({ type: 'timer', operation: 'visibility', enabled: e.target.checked })
            }
          />{' '}
          Show on projector
        </label>
      </div>
      <div className="panel-body">
        <div className={`timer-number ${seconds <= 10 ? 'timer-warning' : ''}`}>
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')}
        </div>
        <div className="toolbar" style={{ justifyContent: 'center', marginBottom: 25 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void send({ type: 'timer', operation: 'adjust', value: -10000 })}
          >
            <Minus size={13} /> 10s
          </Button>
          <Button
            onClick={() =>
              void send({ type: 'timer', operation: state.timer.endsAt ? 'pause' : 'start' })
            }
            disabled={!state.timer.endsAt && (seconds === 0 || state.paused)}
          >
            {state.timer.endsAt ? <Pause size={15} /> : <Play size={15} />}{' '}
            {state.timer.endsAt ? 'Pause' : 'Start / resume'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void send({ type: 'timer', operation: 'reset' })}
            aria-label="Reset timer"
          >
            <RotateCcw size={15} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void send({ type: 'timer', operation: 'adjust', value: 10000 })}
          >
            <Plus size={13} /> 10s
          </Button>
        </div>
        <form
          className="timer-settings"
          onSubmit={(e) => {
            e.preventDefault();
            void send({ type: 'timer', operation: 'configure', value: Number(duration) * 1000 });
          }}
        >
          <label className="field">
            Custom duration (seconds)
            <input
              type="number"
              min={1}
              max={3600}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </label>
          <Button style={{ marginBottom: 17 }} variant="secondary" type="submit">
            Set duration
          </Button>
        </form>
        <p className="muted" style={{ fontSize: 10 }}>
          The timer never determines winners or eliminates contestants.
        </p>
      </div>
    </section>
  );
}
