'use client';
import { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
export function ProjectorStatus({ demo }: { demo: boolean }) {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`/api/display-status?mode=${demo ? 'demo' : 'live'}`, {
          cache: 'no-store',
        });
        const data = await r.json();
        setConnected(r.ok && data.connected);
      } catch {
        setConnected(false);
      }
    };
    void check();
    const id = setInterval(() => void check(), 5000);
    return () => clearInterval(id);
  }, [demo]);
  return (
    <span
      className="projector-status"
      style={{
        color: connected ? 'var(--green)' : 'var(--muted)',
      }}
    >
      <Monitor size={13} />
      {connected ? 'Projector connected' : 'Projector offline'}
    </span>
  );
}
