import Link from 'next/link';
import { Flame, Ghost, VenetianMask, Crown } from 'lucide-react';
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="The Halloween Games home">
      <span className="brand-mark">
        <Flame size={23} strokeWidth={1.5} />
      </span>
      <span>
        THE HALLOWEEN
        <span>
          GAMES<span className="brand-star">✦</span>
        </span>
      </span>
      {!compact && <span className="edition">THE ANNUAL TOURNAMENT</span>}
    </Link>
  );
}
export function GameIcon({ round, size = 30 }: { round: number; size?: number }) {
  if (round === 1)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="9" y="5" width="22" height="30" rx="9" />
        <path d="m10 12 20 5M9 20l22 6M11 28l17 4M12 8l17 5M15 16h3m4 1h3" />
      </svg>
    );
  if (round === 2) return <VenetianMask size={size} strokeWidth={1.3} />;
  if (round === 3) return <Ghost size={size} strokeWidth={1.3} />;
  return <Crown size={size} strokeWidth={1.3} />;
}
export function Connection({ status }: { status: string }) {
  return (
    <span className={`connection ${status === 'live' ? '' : 'connection-offline'}`} role="status">
      <i />
      {status === 'live'
        ? 'Live connection'
        : status === 'connecting'
          ? 'Connecting…'
          : 'Reconnecting…'}
    </span>
  );
}
