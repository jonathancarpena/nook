import { redirect, notFound } from 'next/navigation';
import { isHost } from '@/lib/auth';
import { demoEnabled } from '@/lib/server-config';
import { loadState } from '@/lib/store';
import { ROUNDS, formatNumber } from '@/lib/types';
import { PrintButton } from '@/components/print-button';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  if (!(await isHost())) redirect('/login');
  const { mode } = await searchParams;
  if (mode === 'demo' && !demoEnabled()) notFound();
  const state = await loadState(mode === 'demo' ? 'demo' : 'live');
  return (
    <main className="print-sheet">
      <h1>The Halloween Games</h1>
      <p>
        Emergency roster · {state.id.toUpperCase()} · Revision {state.version} ·{' '}
        {new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
      </p>
      <div style={{ margin: '20px 0' }}>
        <PrintButton />
      </div>
      <h2>Contestants</h2>
      <table className="roster">
        <thead>
          <tr>
            <th>NUMBER</th>
            <th>NAME</th>
            <th>OUTCOME</th>
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
                  {state.rounds.some(
                    (r) =>
                      r.confirmed && r.participants.includes(p.id) && !r.winners.includes(p.id),
                  )
                    ? 'Eliminated'
                    : 'In the game'}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {state.rounds.map((round) => (
        <section key={round.number}>
          <h2>
            Round {round.number} · {ROUNDS[round.number - 1].name}
          </h2>
          <p>
            {round.confirmed
              ? `Confirmed survivors: ${round.winners
                  .map((id) => {
                    const p = state.contestants.find((p) => p.id === id)!;
                    return `#${formatNumber(p.number)} ${p.name}`;
                  })
                  .join(', ')}`
              : 'Results not confirmed.'}
          </p>
          <div className="team-grid">
            {round.teams.map((t) => (
              <div key={t.id} className="team-card">
                <p className="team-label">
                  {t.label} {t.match ? `· Match ${t.match}` : ''}
                </p>
                {t.members.map((id) => {
                  const p = state.contestants.find((p) => p.id === id)!;
                  return (
                    <div className="team-member" key={id}>
                      <b>#{formatNumber(p.number)}</b>
                      {p.name}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
