'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, LoaderCircle, ShieldCheck, Ticket } from 'lucide-react';
import { Brand, Connection } from './brand';
import { Button } from './ui/button';
import { useLive } from '@/lib/use-live';
import type { PublicState, PublicContestant } from '@/lib/types';
import { formatNumber } from '@/lib/types';
export function Registration() {
  const { state, status, error } = useLive<PublicState>();
  const [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('');
  const router = useRouter();
  useEffect(() => {
    void fetch('/api/player')
      .then((r) => r.json())
      .then((d) => {
        if (d.player) router.replace('/player');
      })
      .catch(() => {});
  }, [router]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailure('');
    try {
      let key = localStorage.getItem('hgames:registration');
      if (!key) {
        key = crypto.randomUUID();
        localStorage.setItem('hgames:registration', key);
      }
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, requestId: key }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.removeItem('hgames:registration');
      router.push('/player');
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Registration failed. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  const open = state?.registrationOpen && status === 'live';
  return (
    <div className="center-page">
      <div className="public-nav">
        <Brand compact />
        <Link href="/">
          <ArrowLeft size={15} /> Back to the games
        </Link>
      </div>
      <main className="narrow-card">
        <Ticket className="orange" size={32} style={{ margin: '0 auto 20px' }} />
        <p className="eyebrow" style={{ justifyContent: 'center' }}>
          YOUR INVITATION AWAITS
        </p>
        <h1>
          The Halloween
          <br />
          <em className="orange">Games.</em>
        </h1>
        <p style={{ letterSpacing: 2, fontSize: 10 }}>24 ENTER. ONLY ONE SURVIVES.</p>
        <form className="form-card" onSubmit={submit}>
          <p className="eyebrow" style={{ marginBottom: 23, fontSize: 9 }}>
            ENTER YOUR NAME TO JOIN THE GAME.
          </p>
          <label className="field">
            Your name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What shall we call you?"
              disabled={busy || !open}
            />
          </label>
          <div className="registration-foot">
            <span>
              <b>{24 - (state?.contestants.length ?? 0)}</b> of 24 places left
            </span>
            <span className={`status-pill ${open ? '' : 'closed'}`}>
              {!state
                ? 'Connecting'
                : open
                  ? 'Registration open'
                  : state.status === 'registration'
                    ? 'Registration closed'
                    : 'Games in progress'}
            </span>
          </div>
          {(failure || error) && (
            <div role="alert" className="error-banner">
              {failure || error}
            </div>
          )}
          <Button type="submit" size="lg" disabled={!open || busy}>
            {busy ? <LoaderCircle className="spinner" size={16} /> : <ArrowUpRight size={17} />}{' '}
            Join tournament
          </Button>
          {state && !open && (
            <p className="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 15 }}>
              {state.contestants.length === 24
                ? 'All 24 contestants have been summoned.'
                : state.status === 'registration'
                  ? 'The host will open registration shortly.'
                  : 'Registration has ended. Keep your eyes on the projector.'}
            </p>
          )}
        </form>
        <p
          style={{
            display: 'flex',
            gap: 7,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
          }}
        >
          <ShieldCheck size={13} /> No account. No password. Just your nerve.
        </p>
        <div style={{ marginTop: 25 }}>
          <Connection status={status} />
        </div>
        <Link href="/player" className="text-link">
          Already summoned? Find your number <ArrowUpRight size={13} />
        </Link>
      </main>
    </div>
  );
}
export function PlayerCard() {
  const [player, setPlayer] = useState<PublicContestant | null>(null),
    [status, setStatus] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/player', { cache: 'no-store' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setPlayer(d.player);
        setStatus(d.status);
        setError('');
      } catch {
        setError('We couldn’t retrieve your card. Please reconnect and try again.');
      } finally {
        setLoading(false);
      }
    };
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="center-page">
      <div className="public-nav">
        <Brand compact />
        <Link href="/">
          The games <ArrowUpRight size={14} />
        </Link>
      </div>
      <main className="narrow-card">
        {loading ? (
          <LoaderCircle className="spinner" style={{ margin: '60px auto' }} />
        ) : player ? (
          <>
            <p className="eyebrow" style={{ justifyContent: 'center' }}>
              YOU’VE BEEN SUMMONED.
            </p>
            <h1>
              Your fate
              <br />
              <em className="orange">has been sealed.</em>
            </h1>
            <div className="ticket-card">
              <small>YOUR CONTESTANT NUMBER</small>
              <div className="ticket-number">#{formatNumber(player.number)}</div>
              <h2>{player.name}</h2>
              <span className="status-pill">
                {player.status === 'champion'
                  ? 'Halloween champion'
                  : player.status === 'eliminated'
                    ? 'A worthy contender'
                    : 'Registration confirmed'}
              </span>
              <div className="ticket-bottom">REMEMBER YOUR NUMBER.</div>
            </div>
            <p>
              Keep your eyes on the projector.
              <br />
              Your number stays with you all night.
            </p>
            <p style={{ marginTop: 18, fontSize: 10 }}>
              TOURNAMENT:{' '}
              {status === 'registration'
                ? 'AWAITING THE HOST'
                : status === 'completed'
                  ? 'COMPLETED'
                  : 'IN PROGRESS'}
            </p>
          </>
        ) : (
          <>
            <h1>
              No number
              <br />
              <em className="orange">just yet.</em>
            </h1>
            <p>Register on this device to receive your contestant card.</p>
            <Link className="button button-primary" style={{ marginTop: 25 }} href="/join">
              Enter the games <ArrowUpRight size={16} />
            </Link>
          </>
        )}
        {error && (
          <p role="alert" className="error-banner">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
