# THE HALLOWEEN GAMES

A working host-controlled Halloween tournament: **24 → 12 → 6 → 3 → 1**. Next.js App Router, TypeScript, Tailwind, accessible Radix/shadcn-style UI primitives, Motion, Supabase Auth/PostgreSQL/Realtime, and generated Web Audio effects. The artwork is original SVG; there are no third-party sound assets or remote font dependencies.

## Run locally

Requires Node.js **22.13+** (Node 24 recommended) and npm. Use the existing checkout; cloud tasks already run in an isolated workspace and do not need a Git worktree.

```sh
cd /workspace/nook # or your checkout directory
npm ci
npm run setup:local
npm run dev
```

The setup command creates `.env.local`, a persistent SQLite database directory `.local/`, and a random host password in `.local/host-password.txt`. It preserves an existing `.env.local`. Read that password privately and enter it at `/login`. It is never committed or embedded in the browser. Keep the password file and SQLite database private. The development server binds to all interfaces; share access only with people you trust.

Local development runs the same server-side tournament engine as production, with SQLite transactions in place of the Supabase transaction RPC. Local mode is **not supported on Vercel**: configuration errors fail closed rather than silently falling back to a nonpersistent filesystem. Self-hosted local mode requires a single persistent machine and HTTPS when using a production build (secure cookies).

Routes:

| Route                | Access                                 | Purpose                                           |
| -------------------- | -------------------------------------- | ------------------------------------------------- |
| `/`                  | Public                                 | Event introduction and game guide                 |
| `/join`              | Public                                 | Name-only guest registration                      |
| `/player`            | Guest cookie                           | Persistent personal contestant card               |
| `/host`              | Host                                   | Registration, teams, results, projector, recovery |
| `/display`           | Public, read-only                      | Audience projector                                |
| `/demo`              | Host, explicitly enabled in production | Separate rehearsal tournament                     |
| `/display?mode=demo` | Host                                   | Rehearsal projector                               |
| `/host/print`        | Host                                   | Printable roster and team sheets                  |

The guest card uses an HttpOnly cookie. Guests should revisit from the same browser; clearing cookies loses card access. A shared device represents one guest. Different devices on the same office network register independently. Names need not be unique, so the host can resolve actual duplicate people before starting.

## Deploy with Supabase and Vercel

1. Create a Supabase project. In its SQL Editor, run **`supabase/migrations/202610260001_tournament.sql`** once. Alternatively link the Supabase CLI to your project and run `supabase db push`. This creates private state, normalized projections, transactions, audit history, RLS, a public revision-only Realtime table, and display presence.
2. In Supabase Auth → Users, create the host email/password user and confirm its email. Disable public sign-ups in Auth settings. Guests do not use Supabase Auth. Use a strong, unique host password. Provision additional hosts only if you want them to share control.
3. Import this repository into Vercel as a Next.js project, select Node.js 24, and configure the variables below in the Vercel project. Keep server-only keys out of `NEXT_PUBLIC_` variables, source control, and browser code.
4. Set `NEXT_PUBLIC_SITE_URL` to the **actual HTTPS deployment origin** (no path), then deploy/redeploy so the public variables are included in the build. QR codes use that origin plus `/join`; without it they use the current browser origin. No production localhost URL is hardcoded.
5. Sign in at `/login`. Open `/display` in a separate browser/device. Open registration, register a test guest from a phone, and verify the host count and guest number. Use `/demo` for a complete isolated rehearsal if explicitly enabled. Confirm the real phone can reach the deployed site before the party.
6. Reset the live test registrations from Host → Settings before the event. Keep `ENABLE_DEMO=false` for the event if rehearsal access is not needed.

| Variable                        | Required                    | Use                                                                                         |
| ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `APP_BACKEND`                   | Production                  | `supabase`                                                                                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production                  | Your `https://PROJECT.supabase.co` project URL                                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production                  | Supabase legacy anon API key (public key; RLS restricts it)                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Production, **server only** | Supabase legacy service-role key; never a public variable                                   |
| `HOST_EMAILS`                   | Production                  | Comma-separated verified host email allowlist                                               |
| `GUEST_TOKEN_SECRET`            | All modes, **server only**  | At least 32 random characters; generate with `openssl rand -hex 32`                         |
| `NEXT_PUBLIC_SITE_URL`          | Recommended                 | Actual public HTTPS origin for the registration QR                                          |
| `ENABLE_DEMO`                   | Optional                    | `true` explicitly enables authenticated rehearsal routes in production; default is disabled |
| `LOCAL_HOST_PASSWORD_HASH`      | Local only                  | Generated by `npm run setup:local`; salted scrypt hash                                      |
| `LOCAL_SESSION_SECRET`          | Local only                  | Generated random HMAC signing key                                                           |
| `LOCAL_DATA_DIR`                | Local only                  | Optional persistent data directory; defaults to `.local/`                                   |

External destinations for production: the Supabase project HTTPS and WebSocket origin, your deployed application origin, and the npm registry during installation. The browser's public anon key can only read **live revision numbers**. It cannot read private tournament tables or call the mutation RPC. Do not grant additional table policies to guests.

Deployment has **not** been performed by this implementation. Real Supabase Auth, hosted Realtime, cross-device audio/fullscreen behavior, and Vercel integration must be validated in your configured deployment. The real SQL migration and transaction functions are tested using PostgreSQL-compatible PGlite; that does not replace a hosted rehearsal.

## Host operating guide

1. Sign in, open the projector on the audience screen, and enter fullscreen. The host header reports a projector heartbeat; it expires after 25 seconds without a heartbeat. This reports a browser connection, not whether the physical projector is on.
2. On the projector, enable sound with its speaker button (browsers require a local user gesture), choose volume, and test the sound replay. Audio is optional. Use the sparkle toggle or the OS reduced-motion setting to reduce animations.
3. In **Contestants**, open registration. Display the QR code. Add guests manually if needed, edit names, and remove duplicate registrations. Numbers remain fixed; only a removed guest's number becomes available again. Capacity automatically closes registration at 24.
4. In **Tournament**, begin when exactly 24 guests have registered. The intro appears on the projector; the game does not start automatically just because registration is full.
5. **Mummy Mayhem:** generate 12 duos, reshuffle if desired, lock, and reveal. After the physical game, select exactly six winning duos. Click Confirm results, inspect the modal, and confirm. Results remain private until **Reveal eliminations**. Advance to Round 2.
6. **Charades:** generate four trios paired into two matches, lock, and reveal each match separately. Select exactly one winning trio per match. Confirm, reveal, and advance with six survivors.
7. **Ghost Breath:** lock and reveal the six individual contestants. Use the optional timer from **Projector**. Select exactly three finalists, confirm, reveal, and advance. There is only this one game in Round 3.
8. **Traitors Trial:** lock and reveal the three finalists. Select exactly one champion, inspect the final confirmation, then reveal. The reveal completes the tournament. It can be replayed without changing the winner.

**Projector** offers authorized scenes, a waiting screen, and a timer with custom duration, pause/resume/reset, ±10 seconds, and visibility. Timers use a persisted server target timestamp and never choose winners. Projector and host use Supabase revision events plus a two-second authoritative polling fallback. Reconnects and refreshes reload saved state. Old champion animations do not automatically replay after a refresh.

Writes only appear successful after the server confirms them. A stale host tab receives a conflict and refreshes rather than overwriting another host's work. If the connection drops, the projector retains the last confirmed state and shows a reconnecting warning. Do not proceed with physical eliminations until a confirmed verdict is visible.

## Recovery and event reset

- **Export JSON:** Host → Settings → Export JSON. Includes the current roster, original numbers, round assignments, matchups, selected/confirmed winners, finalists, current display/timer state, and champion. Guest authentication hashes are excluded. Keep this backup private because it contains names and potentially unrevealed results. JSON is a reference backup; automated import is intentionally not provided.
- **Print roster:** opens a printable roster and generated team sheets with confirmed outcomes. Keep a paper copy before starting each round if event connectivity is uncertain.
- **Undo last action:** reverses the most recent host operation and increments the revision. Guest registration, roster edits, add/remove, seed, reset, and undo itself cannot be undone. Undoing an advance safely removes its newly created downstream round.
- **Correct a round:** choose the round and type `REWIND`. An explicit warning explains that the chosen round and all later assignments/results are erased. Earlier confirmed rounds and contestant numbers are retained. Generate and confirm the affected rounds again.
- **Pause tournament:** freezes the timer, blocks result selection/confirmation and advancement, and shows the waiting scene. Resume, then select the appropriate scene or use the round's reveal controls.
- **Reset:** export first, then type `RESET` in Settings. The active roster and all current rounds are cleared. Guest cards are invalid until a new registration. Private audit events remain for diagnosis; reset does not purge historical personal data. A database administrator can manage audit retention separately.
- **Local disk recovery:** stop the server and back up `.local/` (including SQLite WAL files) and `.env.local` together. Keep signing keys unchanged if you want existing cookies to remain valid. Do not copy these files to a public repository.

## Demo mode

Sign in and open `/demo`. Click **Generate 24 fictional contestants**, then operate all four rounds as above. Demo and live state, guest numbering, results, timer, and projector presence are stored under distinct tournament IDs. Demo APIs and projector require host authentication. In production `/demo` is disabled unless `ENABLE_DEMO=true`. Reset Demo affects only rehearsal data.

## Architecture and correctness

- `src/lib/engine.ts`: pure state transitions and server-side cryptographic shuffles. All host mutations are authenticated and validated. The engine enforces locked assignments, exact winner counts, per-match winners, explicit confirmation, authorized reveals, and downstream correction.
- `src/lib/store.ts`: atomic SQLite transactions locally and a versioned Supabase transaction RPC in production. Request IDs deduplicate retries. Compare-and-swap protects concurrent writes; registration retries against the latest authoritative state and never allocates numbers in the browser.
- `supabase/migrations/…sql`: private aggregate plus normalized contestant/round/team/member/match/result/display/timer projections updated atomically. Database constraints protect capacity ranges, unique numbers, round membership, valid game names, and immutable numbers. History contains private previous snapshots for undo.
- `src/lib/auth.ts`: confirmed Supabase Auth users plus an explicit email allowlist. Local authentication uses salted scrypt and expiring signed HttpOnly sessions. Mutation requests require a matching Origin. Guest cards use server-generated HMAC tokens, store only token hashes in state, and use an HttpOnly cookie.
- `/api/state`: host view requires authentication. Public view strips guest token hashes, private selections, hidden team assignments, unconfirmed/unrevealed outcomes, and private confirmation flags. Projector reads that public view; it has no host mutation controls.
- `src/lib/use-live.ts`: Supabase revision notifications, polling fallback, server-clock alignment, reconnection, monotonic revision acceptance, and same-key network retries.

There is one live event per deployment. Host actions and confirmations are saved individually; no application process memory is needed to reconstruct an event. Browser processes/audio contexts must be restarted after restoring a cloud snapshot.

## Checks

```sh
npm run test          # 22 engine, concurrent persistence, PostgreSQL/RLS tests
npm run lint
npm run typecheck
npm run build
# If no system Chromium exists, first install Playwright's browser:
npx playwright install chromium
npm run test:e2e      # real browser + HTTP integration against an isolated SQLite database
```

The browser suite automatically starts a separate server on port 3100, uses a fresh temporary database, and exercises 24 guest registrations (including concurrent requests), all four host-driven rounds, independent projector synchronization, hidden results, refresh persistence, authentication/CSRF, demo isolation, recovery, timers, and small-phone layouts. It generates an ephemeral test host password and signing keys, and overrides Supabase settings for the test server. It never changes the local or hosted event. `CHROMIUM_PATH` can override the browser executable. Browser traces/screenshots on failure are local ignored artifacts and may contain event information.

For actual event readiness, rehearse on the deployed URL using the intended phone, host device, projector browser, and venue network. A passing local build does not establish deployment, production credentials, or venue connectivity.
