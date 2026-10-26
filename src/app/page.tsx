import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Skull,
  Ticket,
  Radio,
  ShieldCheck,
  MoveDown,
  Sparkles,
} from 'lucide-react';
import { Brand, GameIcon } from '@/components/brand';
import { HauntedArt } from '@/components/haunted-art';
import { ROUNDS } from '@/lib/types';
export default function Home() {
  return (
    <div className="landing">
      <header className="site-header">
        <Brand />
        <nav>
          <a href="#the-games">The games</a>
          <a href="#how-it-works">How it works</a>
          <Link href="/host" className="host-link">
            Host entrance <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span /> AN EVENING OF FRIENDLY BETRAYAL
            </div>
            <h1>
              THE
              <br />
              HALLOWEEN
              <br />
              <span>
                GAMES<span className="title-star">✦</span>
              </span>
            </h1>
            <p className="hero-tagline">
              24 ENTER. <span>ONLY ONE SURVIVES.</span>
            </p>
            <p className="hero-description">
              A little mystery. A little mayhem. A night to remember.
              <br className="desktop-only" /> Step into the shadows and let the games begin.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-lg" href="/join">
                Enter the games <ArrowUpRight size={19} />
              </Link>
              <Link className="button button-secondary button-lg" href="/display">
                <Radio size={17} /> View live display
              </Link>
            </div>
            <p className="hero-note">
              <ShieldCheck size={14} /> No account needed. Just your name and your nerve.
            </p>
          </div>
          <div className="hero-visual">
            <div className="art-caption">
              <span>EST. IN THE SHADOWS</span>
              <Sparkles size={14} />
            </div>
            <HauntedArt />
            <div className="invitation-seal">
              <span>YOU’RE</span>
              <strong>invited.</strong>
              <span>IF YOU DARE</span>
            </div>
            <span className="art-bottom">A NIGHT WHERE LEGENDS ARE MADE.</span>
          </div>
          <a className="scroll-hint" href="#the-games">
            <MoveDown size={15} /> YOUR FATE AWAITS
          </a>
        </section>
        <section className="event-strip">
          <div>
            <Ticket />
            <strong>24</strong>
            <span>brave contestants</span>
          </div>
          <span className="strip-star">✦</span>
          <div>
            <Skull />
            <strong>4</strong>
            <span>unforgiving rounds</span>
          </div>
          <span className="strip-star">✦</span>
          <div>
            <GameIcon round={4} size={23} />
            <strong>1</strong>
            <span>last one standing</span>
          </div>
        </section>
        <section className="games-section" id="the-games">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE PATH TO GLORY</p>
              <h2>
                Four rounds. <em>One survivor.</em>
              </h2>
            </div>
            <p>
              Every round raises the stakes.
              <br />
              Will you make it to the final trial?
            </p>
          </div>
          <div className="round-grid">
            {ROUNDS.map((round) => (
              <article className="round-card" key={round.number}>
                <div className="round-card-top">
                  <span>ROUND 0{round.number}</span>
                  <GameIcon round={round.number} size={33} />
                </div>
                <h3>{round.name}</h3>
                <p>{round.description}</p>
                <div className="round-card-bottom">
                  <span>
                    {round.start} <ArrowRight size={13} /> {round.survive}{' '}
                    {round.number === 4 ? 'champion' : 'survivors'}
                  </span>
                  <span>
                    {round.number === 4 ? 'THE FINAL VERDICT' : round.format.toUpperCase()}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="how-section" id="how-it-works">
          <div>
            <p className="eyebrow">YOUR INVITATION TO THE UNKNOWN</p>
            <h2>
              A name. A number.
              <br />
              <em>A night of possibilities.</em>
            </h2>
            <Link href="/join" className="text-link">
              Claim your place <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="steps">
            {[
              [
                '01',
                'Answer the call',
                'Scan the QR code or enter online. All we need is your name.',
              ],
              [
                '02',
                'Meet your fate',
                'Receive your own random contestant number. It’s yours all night.',
              ],
              [
                '03',
                'Survive the games',
                'Watch the big screen, find your team, and give it everything.',
              ],
            ].map(([n, title, description]) => (
              <div className="step" key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="closing-call">
          <span>✦</span>
          <p>THE SHADOWS ARE CALLING.</p>
          <h2>Will you answer?</h2>
          <Link className="button button-primary button-lg" href="/join">
            I’m in. Let’s play. <ArrowRight size={18} />
          </Link>
          <small>24 places. One unforgettable night.</small>
        </section>
      </main>
      <footer className="site-footer">
        <Brand compact />
        <p>Good company. Wicked competition.</p>
        <span>ENTER IF YOU DARE. ✦</span>
      </footer>
    </div>
  );
}
