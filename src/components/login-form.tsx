'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, ArrowRight, LoaderCircle } from 'lucide-react';
import { Brand } from './brand';
import { Button } from './ui/button';
export function LoginForm({ local, next }: { local: boolean; next: string }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email') || '', password: form.get('password') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="center-page">
      <div className="public-nav">
        <Brand compact />
        <Link href="/">Back to the games</Link>
      </div>
      <main className="narrow-card">
        <KeyRound size={30} className="orange" style={{ margin: '0 auto 20px' }} />
        <p className="eyebrow" style={{ justifyContent: 'center' }}>
          BEHIND THE CURTAIN
        </p>
        <h1>
          The host
          <br />
          <em className="orange">entrance.</em>
        </h1>
        <p>A little power. A great responsibility.</p>
        <form className="form-card" onSubmit={submit}>
          {!local && (
            <label className="field">
              Host email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@company.com"
              />
            </label>
          )}
          <label className="field">
            Host password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              placeholder="Your private password"
            />
          </label>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit" size="lg">
            {busy ? <LoaderCircle className="spinner" size={16} /> : <ArrowRight size={16} />} Enter
            control room
          </Button>
        </form>
        {local && (
          <p style={{ fontSize: 10 }}>
            Local development mode. Your generated password is in
            <br />
            <code>.local/host-password.txt</code> inside the project.
          </p>
        )}
        <p style={{ marginTop: 18, fontSize: 10 }}>This entrance is reserved for the event host.</p>
      </main>
    </div>
  );
}
