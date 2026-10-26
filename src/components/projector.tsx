'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  LoaderCircle,
  Radio,
  Play,
} from 'lucide-react';
import { Brand, Connection, GameIcon } from './brand';
import { JoinQR } from './qr';
import { useClock, useLive } from '@/lib/use-live';
import { ROUNDS, formatNumber, remainingTime, type PublicState } from '@/lib/types';
export function Projector({ demo = false }: { demo?: boolean }) {
  const { state, status, error, offset } = useLive<PublicState>(false, demo);
  const now = useClock();
  const systemReduced = useReducedMotion();
  const [reduced, setReduced] = useState(false),
    [sound, setSound] = useState(false),
    [volume, setVolume] = useState(0.35),
    [fullscreen, setFullscreen] = useState(false);
  const [animation, setAnimation] = useState<{ id: string; start: number } | null>(null);
  const lastEvent = useRef<string | undefined>(undefined),
    audio = useRef<AudioContext | null>(null),
    lastTick = useRef(-1);
  function tone(frequency = 180, duration = 0.7) {
    if (!audio.current || !sound) return;
    const ctx = audio.current;
    void ctx.resume();
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency / 2, ctx.currentTime + duration);
    gain.gain.setValueAtTime(Math.max(0.001, volume * 0.3), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }
  useEffect(() => {
    const beat = () => {
      void fetch(`/api/display-status?mode=${demo ? 'demo' : 'live'}`, { method: 'POST' }).catch(
        () => {},
      );
    };
    beat();
    const id = setInterval(beat, 10000);
    return () => clearInterval(id);
  }, [demo]);
  const toneRef = useRef(tone);
  useEffect(() => {
    toneRef.current = tone;
  });
  useEffect(() => {
    if (!state) return;
    const previous = lastEvent.current;
    lastEvent.current = state.effectId;
    if (
      previous === undefined ||
      previous === state.effectId ||
      Date.now() + offset.current - (state.effectAt || 0) > 10000
    )
      return;
    const id = setTimeout(() => {
      setAnimation({ id: state.effectId, start: Date.now() });
      toneRef.current(state.scene === 'champion' ? 440 : 180, 1.2);
    }, 0);
    return () => clearTimeout(id);
  }, [state, offset]);
  const seconds = state ? Math.ceil(remainingTime(state.timer, now + offset.current) / 1000) : 0;
  useEffect(() => {
    if (state?.timer.endsAt && seconds <= 5 && seconds > 0 && seconds !== lastTick.current) {
      lastTick.current = seconds;
      toneRef.current(500, 0.15);
    }
  }, [seconds, state?.timer.endsAt]);
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      void audio.current?.close();
    };
  }, []);
  const isReduced = reduced || systemReduced;
  const elapsed = animation ? (now - animation.start) / 1000 : 999;
  const animate = animation?.id === state?.effectId && !isReduced;
  const round = state?.rounds.find((r) => r.number === state.round);
  const definition = state?.round ? ROUNDS[state.round - 1] : null;
  function player(id: string) {
    return state!.contestants.find((p) => p.id === id)!;
  }
  function individuals(ids: string[]) {
    return (
      <div
        className="display-individuals"
        style={{ gridTemplateColumns: `repeat(${Math.min(ids.length, 6)}, minmax(0, 1fr))` }}
      >
        {ids.map((id) => {
          const p = player(id);
          return (
            <div className="display-individual" key={id}>
              <b>#{formatNumber(p.number)}</b>
              <p>{p.name}</p>
            </div>
          );
        })}
      </div>
    );
  }
  function assignments() {
    if (!round) return null;
    if (round.number > 2) return individuals(round.participants);
    return (
      <div className="display-grid">
        {round.teams.map((t, i) => (
          <motion.div
            key={t.id}
            initial={isReduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.07, 0.6), duration: 0.35 }}
            className="display-team"
          >
            <span>
              {round.number === 2 ? `MATCH ${t.match} · ` : ''}
              {t.label.toUpperCase()}
            </span>
            <div className="display-players">
              {t.members.map((id) => {
                const p = player(id);
                return (
                  <div className="display-player" key={id}>
                    <b>#{formatNumber(p.number)}</b>
                    <p>{p.name}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
  function scene() {
    if (!state)
      return (
        <div className="loading-screen">
          <LoaderCircle className="spinner" />
          {error || 'The stage is being set…'}
        </div>
      );
    if (state.scene === 'welcome')
      return (
        <div className="display-welcome">
          <div>
            <p className="eyebrow">YOUR INVITATION TO THE UNKNOWN</p>
            <h1 className="display-title">
              THE
              <br />
              HALLOWEEN
              <br />
              <em>GAMES.</em>
            </h1>
            <p className="display-tagline">24 ENTER. ONLY ONE SURVIVES.</p>
          </div>
          <div className="display-welcome-qr">
            {state.contestants.length === 24 ? (
              <>
                <GameIcon round={4} size={70} />
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 40, marginTop: 25 }}>
                  All 24 contestants
                  <br />
                  have been summoned.
                </h2>
                <p>AWAITING THE HOST.</p>
              </>
            ) : (
              <>
                <JoinQR size={230} />
                <p>SCAN TO ENTER.</p>
                <small>
                  {state.contestants.length} / 24 contestants summoned ·{' '}
                  {state.registrationOpen ? 'Registration open' : 'Registration closed'}
                </small>
              </>
            )}
          </div>
        </div>
      );
    if (state.scene === 'waiting')
      return (
        <>
          <p className="eyebrow">A MOMENT IN THE SHADOWS</p>
          <h1 className="display-title">
            {state.paused ? 'Hold your breath.' : 'Fate is taking its time.'}
          </h1>
          <p className="display-tagline">THE NEXT CHAPTER IS COMING.</p>
        </>
      );
    if (state.scene === 'intro')
      return (
        <>
          {animate && elapsed < 3 ? (
            <div className="display-countdown">{Math.max(1, 3 - Math.floor(elapsed))}</div>
          ) : (
            <>
              <p className="eyebrow">24 CONTESTANTS. FOUR ROUNDS. ONE CHAMPION.</p>
              <h1 className="display-title">
                Let the
                <br />
                <em>games begin.</em>
              </h1>
              <p className="display-tagline">KEEP YOUR FRIENDS CLOSE. YOUR NUMBER CLOSER.</p>
            </>
          )}
        </>
      );
    if (state.scene === 'champion' && round?.resultsRevealed && round.winners.length === 1) {
      const champion = player(round.winners[0]);
      return animate && elapsed < 5 ? (
        <>
          <p className="eyebrow">THE FINAL VERDICT.</p>
          <h1 className="display-title">
            {elapsed < 2 ? (
              'One name. One legend.'
            ) : (
              <span className="display-countdown">{Math.max(1, 5 - Math.floor(elapsed))}</span>
            )}
          </h1>
        </>
      ) : (
        <>
          <p className="eyebrow">THE LAST ONE STANDING.</p>
          <div className="champion-number">#{formatNumber(champion.number)}</div>
          <h1 className="champion-name">{champion.name}</h1>
          <p className="display-tagline">HALLOWEEN CHAMPION.</p>
          {!isReduced && (
            <div className="champion-sparkles" aria-hidden="true">
              {Array.from({ length: 26 }, (_, i) => (
                <i
                  key={i}
                  style={{ left: `${(i * 37) % 100}%`, top: '80%', animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}
        </>
      );
    }
    if (state.scene === 'elimination' && round?.resultsRevealed)
      return (
        <>
          <p className="eyebrow">
            ROUND 0{state.round} · {definition?.name.toUpperCase()}
          </p>
          <h1 className="display-title">
            {state.round === 3 ? (
              <>
                The final breath
                <br />
                <em>has been taken.</em>
              </>
            ) : (
              <>
                The verdict <em>is in.</em>
              </>
            )}
          </h1>
          <p className="display-tagline">
            {round.participants.length - round.winners.length} CONTESTANTS ELIMINATED. ONLY{' '}
            {round.winners.length} REMAIN.
          </p>
          {individuals(round.winners)}
          <p className="muted" style={{ marginTop: 25, fontSize: 'clamp(11px,1.1vw,16px)' }}>
            HONOR THE FALLEN ·{' '}
            {round.participants
              .filter((id) => !round.winners.includes(id))
              .map((id) => `#${formatNumber(player(id).number)} ${player(id).name}`)
              .join(' · ')}
          </p>
        </>
      );
    return (
      <>
        <p className="eyebrow">
          ROUND 0{state.round} · {definition?.start} CONTESTANTS · {definition?.survive}{' '}
          {state.round === 4 ? 'CHAMPION' : 'WILL SURVIVE'}
        </p>
        <h1 className="display-title">
          {state.scene === 'finalists' ? 'The final three.' : definition?.name}
        </h1>
        {state.scene === 'finalists' && (
          <p className="display-tagline">THREE REMAIN. ONE WILL SURVIVE.</p>
        )}
        {assignments()}
        {state.timer.visible && (
          <div className={`big-timer ${seconds <= 10 ? 'timer-warning' : ''}`}>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </div>
        )}
      </>
    );
  }
  return (
    <div className="projector">
      <header className="projector-header">
        <Brand compact />
        <Connection status={status} />
      </header>
      {demo && (
        <p className="info-banner" style={{ marginTop: 15 }}>
          PRIVATE REHEARSAL · DEMO TOURNAMENT
        </p>
      )}
      {error && status !== 'live' && (
        <p role="alert" className="error-banner">
          Connection interrupted. Showing the last confirmed state while reconnecting.
        </p>
      )}
      <AnimatePresence mode="wait">
        <motion.main
          className="projector-main"
          key={state?.effectId || 'loading'}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: isReduced ? 1 : 0.1 }}
          transition={{ duration: isReduced ? 0 : 0.2 }}
        >
          {scene()}
        </motion.main>
      </AnimatePresence>
      <footer className="projector-footer">
        <span>GOOD COMPANY. WICKED COMPETITION.</span>
        <div className="projector-tools">
          <button
            aria-label={sound ? 'Mute sound' : 'Enable sound'}
            title={sound ? 'Mute sound' : 'Enable sound'}
            onClick={() => {
              if (!audio.current) audio.current = new AudioContext();
              void audio.current.resume();
              setSound(!sound);
            }}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <input
            type="range"
            aria-label="Sound volume"
            min="0"
            max="1"
            step=".05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
          <button onClick={() => tone(300, 0.8)} aria-label="Replay sound effect" disabled={!sound}>
            <Play size={14} />
          </button>
          <button
            aria-label={reduced ? 'Enable animations' : 'Reduce motion'}
            title="Toggle reduced motion"
            onClick={() => setReduced(!reduced)}
            aria-pressed={!!isReduced}
          >
            <Sparkles size={15} />
          </button>
          <button
            aria-label={fullscreen ? 'Exit full screen' : 'Enter full screen'}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen().catch(() => {});
            }}
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <Radio size={13} className="orange" />
        </div>
      </footer>
    </div>
  );
}
