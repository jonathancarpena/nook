import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const origin = 'http://localhost:3100';
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Host password').fill(process.env.HALLOWEEN_E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Enter control room' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, game master.' })).toBeVisible();
}
async function action(request: APIRequestContext, command: Record<string, unknown>, demo = false) {
  const url = `/api/host?mode=${demo ? 'demo' : 'live'}`;
  const before = await (
    await request.get(`/api/state?private=1&mode=${demo ? 'demo' : 'live'}`)
  ).json();
  const result = await request.post(url, {
    headers: { Origin: origin },
    data: { command, version: before.state.version, requestId: randomUUID() },
  });
  expect(result.ok(), await result.text()).toBe(true);
  return (await result.json()).state;
}
test('real guest registration, host authorization, all four rounds, projector synchronization and refresh recovery', async ({
  page,
  browser,
  request,
}) => {
  const unauthorized = await request.post('/api/host', { headers: { Origin: origin }, data: {} });
  expect(unauthorized.status()).toBe(401);
  expect((await request.get('/api/state?private=1')).status()).toBe(401);
  expect((await request.get('/api/export')).status()).toBe(401);
  expect((await request.get('/api/state?mode=demo')).status()).toBe(401);
  await login(page);
  await action(page.request, { type: 'registration', enabled: true });
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto('/join');
  await guestPage.getByLabel('Your name').fill('Mina Moon');
  await guestPage.getByRole('button', { name: 'Join tournament' }).click();
  await expect(guestPage.getByRole('heading', { name: 'Mina Moon' })).toBeVisible();
  const cardNumber = await guestPage.locator('.ticket-number').textContent();
  await guestPage.reload();
  await expect(guestPage.locator('.ticket-number')).toHaveText(cardNumber!);
  const contexts = await Promise.all(Array.from({ length: 23 }, () => browser.newContext()));
  const responses = await Promise.all(
    contexts.map((context, i) =>
      context.request.post(`${origin}/api/register`, {
        headers: { Origin: origin },
        data: { name: `Party Guest ${i + 1}`, requestId: randomUUID() },
      }),
    ),
  );
  expect(responses.every((r) => r.ok())).toBe(true);
  const roster = await (await page.request.get('/api/state?private=1')).json();
  expect(roster.state.contestants).toHaveLength(24);
  expect(new Set(roster.state.contestants.map((p: { number: number }) => p.number)).size).toBe(24);
  expect(roster.state.registrationOpen).toBe(false);
  const overflow = await request.post('/api/register', {
    headers: { Origin: origin },
    data: { name: 'Too Late', requestId: randomUUID() },
  });
  expect(overflow.status()).toBe(409);
  const projector = await guest.newPage();
  await projector.goto('/display');
  await expect(projector.getByText('All 24 contestants')).toBeVisible();
  await expect(projector.getByRole('button', { name: /Generate|Confirm|Advance/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tournament controls', exact: true }).click();
  await page.getByRole('button', { name: 'Begin the tournament', exact: true }).click();
  await page.getByRole('button', { name: 'Begin tournament', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mummy Mayhem', exact: true })).toBeVisible();
  for (let n = 1; n <= 4; n++) {
    if (n <= 2)
      await page
        .getByRole('button', { name: n === 1 ? 'Generate duos' : 'Generate trios', exact: true })
        .click();
    await page
      .getByRole('button', { name: n <= 2 ? 'Lock teams' : 'Lock contestants', exact: true })
      .click();
    const privateBefore = await (await page.request.get('/api/state?private=1')).json();
    const pubBefore = await (await guest.request.get('/api/state')).json();
    expect(pubBefore.state.rounds[n - 1].teams).toEqual([]);
    expect(pubBefore.state.rounds[n - 1]).not.toHaveProperty('selected');
    if (n === 2) {
      await page.getByRole('button', { name: 'Reveal match 1', exact: true }).click();
      await expect
        .poll(
          async () =>
            (await (await guest.request.get('/api/state')).json()).state.rounds[1].teams.length,
        )
        .toBe(2);
      await page.getByRole('button', { name: 'Reveal match 2', exact: true }).click();
    } else
      await page
        .getByRole('button', {
          name: n === 1 ? 'Reveal teams' : n === 3 ? 'Reveal contestants' : 'Reveal finalists',
          exact: true,
        })
        .click();
    if (n === 1) {
      await expect(projector.locator('.display-team')).toHaveCount(12);
      await page.getByRole('button', { name: 'Projector', exact: true }).click();
      await page.getByLabel('Show on projector').check();
      await page.getByRole('button', { name: 'Start / resume', exact: true }).click();
      await expect(projector.locator('.big-timer')).toBeVisible();
      await expect
        .poll(async () =>
          projector
            .locator('.projector-main')
            .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
        )
        .toBe(true);
    }
    if (n === 1) {
      await page.getByLabel('Show on projector').uncheck();
      await page.getByRole('button', { name: 'Tournament', exact: true }).click();
    }
    const cards = page.locator('button.team-card');
    await expect(cards).toHaveCount(n === 1 ? 12 : n === 2 ? 4 : n === 3 ? 6 : 3);
    const indices = n === 1 ? [0, 1, 2, 3, 4, 5] : n === 2 ? [0, 2] : n === 3 ? [0, 1, 2] : [0];
    for (const index of indices) {
      await cards.nth(index).click();
      await expect(cards.nth(index)).toHaveAttribute('aria-pressed', 'true');
    }
    const confirmLabel = n === 4 ? 'Confirm champion' : 'Confirm results';
    await page.getByRole('button', { name: confirmLabel, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: confirmLabel, exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const privateResults = await (await page.request.get('/api/state?private=1')).json();
    expect(privateResults.state.rounds[n - 1].winners).toHaveLength(
      n === 1 ? 12 : n === 2 ? 6 : n === 3 ? 3 : 1,
    );
    const hidden = await (await guest.request.get('/api/state')).json();
    expect(hidden.state.rounds[n - 1].winners).toEqual([]);
    expect(privateBefore.state.contestants.map((p: { number: number }) => p.number)).toEqual(
      privateResults.state.contestants.map((p: { number: number }) => p.number),
    );
    await page
      .getByRole('button', {
        name: n === 4 ? 'Reveal champion' : 'Reveal eliminations',
        exact: true,
      })
      .click();
    await expect
      .poll(
        async () =>
          (await (await guest.request.get('/api/state')).json()).state.rounds[n - 1]
            .resultsRevealed,
      )
      .toBe(true);
    if (n < 4) {
      await expect(
        projector.getByText(
          n === 1
            ? '12 CONTESTANTS ELIMINATED. ONLY 12 REMAIN.'
            : n === 2
              ? '6 CONTESTANTS ELIMINATED. ONLY 6 REMAIN.'
              : '3 CONTESTANTS ELIMINATED. ONLY 3 REMAIN.',
        ),
      ).toBeVisible();
      await expect
        .poll(async () =>
          projector
            .locator('.projector-main')
            .evaluate((e) => e.scrollHeight <= e.clientHeight + 1),
        )
        .toBe(true);
      await page
        .getByRole('button', {
          name: n === 3 ? 'Advance to finale' : `Advance to round ${n + 1}`,
          exact: true,
        })
        .click();
    } else {
      await expect(projector.getByText('HALLOWEEN CHAMPION.', { exact: true })).toBeVisible();
      const final = await (await guest.request.get('/api/state')).json();
      expect(final.state.status).toBe('completed');
      await projector.reload();
      await expect(projector.getByText('HALLOWEEN CHAMPION.', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.locator('.stat-value').nth(1)).toHaveText('1');
    }
  }
  const backup = await (await page.request.get('/api/export')).json();
  expect(backup.tournament.rounds).toHaveLength(4);
  expect(JSON.stringify(backup)).not.toContain('tokenHash');
  await guest.setOffline(true);
  await expect(projector.getByText('Reconnecting…', { exact: true })).toBeVisible();
  await expect(projector.getByText('HALLOWEEN CHAMPION.', { exact: true })).toBeVisible();
  await guest.setOffline(false);
  await expect(projector.getByText('Live connection', { exact: true })).toBeVisible();
  await expect(page.getByText('Projector connected', { exact: true })).toBeVisible();
  const printPage = await page.context().newPage();
  await printPage.goto('/host/print');
  await expect(printPage.getByRole('heading', { name: 'Round 4 · Traitors Trial' })).toBeVisible();
  await printPage.close();
  await guest.close();
  for (const context of contexts) await context.close();
});
test('demo is isolated and recovery, timer, reset and CSRF protections work', async ({ page }) => {
  await login(page);
  await page.goto('/demo');
  await page
    .getByRole('button', { name: 'Generate 24 fictional contestants', exact: true })
    .click();
  await expect(page.locator('.stat-value').first()).toHaveText('24/ 24');
  const live = await (await page.request.get('/api/state')).json();
  expect(live.state.status).toBe('completed');
  await action(page.request, { type: 'begin' }, true);
  await action(page.request, { type: 'generate' }, true);
  await action(page.request, { type: 'lock' }, true);
  await action(page.request, { type: 'timer', operation: 'configure', value: 30000 }, true);
  await action(page.request, { type: 'timer', operation: 'start' }, true);
  const paused = await action(page.request, { type: 'pause', enabled: true }, true);
  expect(paused.timer.endsAt).toBeNull();
  expect(paused.rounds[0].winners).toEqual([]);
  await action(page.request, { type: 'rewind', value: 1, confirmation: 'REWIND' }, true);
  const restored = await action(page.request, { type: 'undo' }, true);
  expect(restored.paused).toBe(true);
  const blocked = await page.request.post('/api/host?mode=demo', {
    headers: { Origin: 'https://attacker.example' },
    data: {},
  });
  expect(blocked.status()).toBe(403);
  await action(page.request, { type: 'reset', confirmation: 'RESET' }, true);
  const demo = await (await page.request.get('/api/state?private=1&mode=demo')).json();
  expect(demo.state.contestants).toEqual([]);
  expect((await (await page.request.get('/api/state')).json()).state.status).toBe('completed');
});
test('landing and guest page fit a small phone without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Enter the games', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await login(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/join');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
