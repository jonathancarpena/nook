'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { State, PublicState, HostCommand } from './types';
export function useLive<T extends State | PublicState>(privateView = false, demo = false) {
  const [state, setState] = useState<T | null>(null),
    [status, setStatus] = useState('connecting'),
    [error, setError] = useState(''),
    [connectionError, setConnectionError] = useState(''),
    [busy, setBusy] = useState(false);
  const offset = useRef(0);
  const version = useRef(-1);
  const query = `?mode=${demo ? 'demo' : 'live'}${privateView ? '&private=1' : ''}`;
  const accept = useCallback((data: { state: T; serverTime: number }) => {
    if (data.state.version >= version.current) {
      version.current = data.state.version;
      setState(data.state);
    }
    offset.current = data.serverTime - Date.now();
    setStatus('live');
    setConnectionError('');
  }, []);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/state${query}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      accept(data);
    } catch (e) {
      setStatus('reconnecting');
      setConnectionError(e instanceof Error ? e.message : 'Connection lost. Retrying…');
    }
  }, [query, accept]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), 2000);
    const online = () => void refresh();
    window.addEventListener('online', online);
    window.addEventListener('focus', online);
    let cleanup = () => {};
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !demo
    ) {
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
      const channel = client
        .channel('revision')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'public_revision', filter: 'id=eq.live' },
          () => void refresh(),
        )
        .subscribe();
      cleanup = () => {
        void client.removeChannel(channel);
      };
    }
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener('online', online);
      window.removeEventListener('focus', online);
      cleanup();
    };
  }, [refresh, demo]);
  const send = useCallback(
    async (command: HostCommand) => {
      if (!state || busy) return false;
      setBusy(true);
      setError('');
      const payload = JSON.stringify({
        command,
        version: state.version,
        requestId: crypto.randomUUID(),
      });
      try {
        let response: Response;
        try {
          response = await fetch(`/api/host${query}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
        } catch {
          /* Retry the same idempotency key, never a new mutation. */ response = await fetch(
            `/api/host${query}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload },
          );
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        accept(data);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed.');
        void refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [state, busy, query, accept, refresh],
  );
  return { state, status, error: error || connectionError, setError, busy, send, refresh, offset };
}
export function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);
  return now;
}
