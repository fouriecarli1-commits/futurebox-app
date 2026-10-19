/**
 * Reporting and blocking, pressed the way a member would.
 *
 * Google Play asks two things of an app that makes things with AI and shows
 * members each other's work: somebody who meets something offensive can
 * report it without leaving the app, and can block the member who posted it.
 * `app/lib/reports.ts` has the why.
 *
 * Here: the flag in a making room's bar opens the sheet, a reason is one
 * press, the report goes out with the room it came from and the sheet says
 * it was sent. In the live room another member's post has the flag and your
 * own does not; blocking from it takes their posts out of the room at once,
 * and the block goes to the account named by the post, not by an account id.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3378');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const POSTS = [
  { id: '11111111-1111-4111-8111-111111111111', title: 'Somebody Else Song', by: 'Rude Person', who: 'aaaaaaaaaaaaaaaaaaaa', mine: false },
  { id: '22222222-2222-4222-8222-222222222222', title: 'Another One Of Theirs', by: 'Rude Person', who: 'aaaaaaaaaaaaaaaaaaaa', mine: false },
  { id: '33333333-3333-4333-8333-333333333333', title: 'A Kind Song', by: 'Kind Person', who: 'bbbbbbbbbbbbbbbbbbbb', mine: false },
  { id: '44444444-4444-4444-8444-444444444444', title: 'My Own Song', by: 'Me', who: 'cccccccccccccccccccc', mine: true },
].map((one) => ({
  ...one, kind: 'elsewhere', note: '', genre: '', art: null, seconds: 0, platform: 'youtube',
  link: 'https://www.youtube.com/watch?v=x', startsAt: null, at: new Date().toISOString(),
  audio: null, video: null, why: null, cover: null, hearts: 0, plays: 0, hearted: false,
}));

const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const sent = { reports: [], blocks: [] };
await page.route('**/api/report', async (route) => {
  sent.reports.push(route.request().postDataJSON());
  await route.fulfill({ json: { ok: true } });
});
await page.route('**/api/block', async (route) => {
  if (route.request().method() === 'POST') sent.blocks.push(route.request().postDataJSON());
  await route.fulfill({ json: route.request().method() === 'POST' ? { ok: true, who: 'aaaaaaaaaaaaaaaaaaaa' } : { blocked: [] } });
});
await page.route('**/api/live*', (route) => route.fulfill({
  json: { ready: true, signedIn: true, here: 2, posts: POSTS, says: [] },
}));

try {
  /* ── Something the AI made ─────────────────────────────────────────── */
  await studio(page);
  await toRoom(page, 'Make a song');
  await page.waitForTimeout(600);
  const flag = page.locator('[data-reportflag="ai"]').first();
  check('a making room has the flag in its bar', await flag.isVisible().catch(() => false));
  await flag.click();
  check('  and it opens the report sheet', await page.locator('[data-reportsheet]').isVisible().catch(() => false));
  check('  where sending waits for a reason', await page.locator('[data-reportsend]').isDisabled());
  await page.locator('[data-reportreason="hate"]').click();
  await page.locator('[data-reportnote]').fill('The lyrics it wrote were cruel.');
  await page.locator('[data-reportsend]').click();
  await page.locator('[data-reportsent]').waitFor({ timeout: 5000 }).catch(() => undefined);
  check('  and sending says it was sent', (await page.locator('[data-reportsent]').count()) === 1);
  const first = sent.reports[0] ?? {};
  check('  with the reason, the note and the room it came from',
    first.kind === 'ai' && first.reason === 'hate' && /cruel/.test(first.note ?? '') && Boolean(first.where), JSON.stringify(first));
  check('  and no block is offered for something nobody posted', (await page.locator('[data-reportblock]').count()) === 0);
  await page.locator('[data-reportclose]').click();
  await page.waitForTimeout(300);
  check('  and it closes back into the room', (await page.locator('[data-reportsheet]').count()) === 0);

  /* ── Somebody else's post ──────────────────────────────────────────── */
  const bar = page.locator('nav[aria-label]').first();
  await bar.locator('button').filter({ hasText: 'Live' }).first().click();
  await page.locator('[data-livefeed]').waitFor({ timeout: 10000 });
  await page.getByText('A Kind Song').first().waitFor({ timeout: 10000 });
  const flags = await page.locator('[data-livefeed] [data-reportflag="post"]').count();
  check('other members’ posts have the flag, your own does not', flags === 3, `${flags} flags on 4 posts`);

  const theirs = page.locator('[data-livefeed] article').filter({ hasText: 'Somebody Else Song' }).first();
  await theirs.locator('[data-reportflag="post"]').click();
  check('the sheet offers to block the member, by name',
    /Rude Person/.test(await page.locator('[data-reportblock]').innerText().catch(() => '')));
  await page.locator('[data-reportblock]').click();
  await page.waitForTimeout(500);
  check('  and blocking says so', (await page.locator('[data-reportblock]').getAttribute('aria-pressed')) === 'true');
  /* Only when there is a session to send it with; the stand-in sign-in here
     may have none, and a signed-out block lives on the phone alone. */
  check('  and anything sent to the account names the post, never an account id',
    sent.blocks.every((one) => one.post === POSTS[0].id && !('owner' in one)), JSON.stringify(sent.blocks));
  await page.locator('[data-reportclose]').click();
  await page.waitForTimeout(400);
  const left = await page.locator('[data-livefeed]').innerText();
  check('every post of theirs leaves the room at once', !/Somebody Else Song|Another One Of Theirs/.test(left));
  check('  and nobody else’s does', /A Kind Song/.test(left) && /My Own Song/.test(left));
  check('  and the block is remembered on this phone',
    (await page.evaluate(() => localStorage.getItem('futurebox.blocked.v1'))) === '["aaaaaaaaaaaaaaaaaaaa"]');
  await page.screenshot({ path: shot('reports.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:reportwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:reportwalk — what the AI made can be reported from its own room, another member’s post can be reported and its member blocked, and their posts leave the room at once.');
