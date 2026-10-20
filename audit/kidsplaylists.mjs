/**
 * A child makes a playlist in the kids room and plays it.
 *
 * The owner, 19 October 2026: *"Mens moet in kids room ook playlists kan
 * create."* Real: the kids room, FutureBox TV, the playlist screen — pick a
 * sticker, tap songs in, move one, play, next, and the list still there
 * after a reload. Stubbed: the account's shelf, so three songs are on it
 * (`kid_shelf` rows and their audio), which needs a project that has
 * accounts — built here, and the ordinary build put back however it ends,
 * the way `presenter.mjs` does it.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = Number(process.argv[2] || 3376);
const STUB = { NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key' };
/* `PROBE_BUILT=1` when the stub build is already there — for running this
   again while working on it, not in CI. */
const built = process.env.PROBE_BUILT === '1';
if (!built) {
  console.log('building with a project that has accounts…');
  execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });
}
let putBack = built;
process.on('exit', () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try { execSync('npx next build', { stdio: 'ignore' }); } catch { console.error('run `npx next build`'); }
});

const server = await serve(PORT, { env: STUB });
const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
page.on('pageerror', (error) => problems.push(String(error).slice(0, 160)));
if (process.env.PROBE_DEBUG) page.on('request', (r) => { if (/stub\.supabase/.test(r.url())) console.log('  →', r.method(), r.url().slice(0, 160)); });

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'kind@futurebox.test' };
await page.addInitScript((who) => {
  try {
    window.localStorage.setItem('sb-stub-auth-token', JSON.stringify({
      access_token: 'stub-access-token', refresh_token: 'r', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400,
      user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
    }));
    window.sessionStorage.setItem('fb-kids-child-on', '1');
  } catch { /* none */ }
}, WHO);

/* Five seconds of silence, as a real WAV, for every song: long enough that
   a song is still playing when the screen is read. */
function wav() {
  const rate = 8000; const samples = rate * 5;
  const b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
  return b;
}
const SONGS = [['s1', 'Dino Dance'], ['s2', 'Moon Lullaby'], ['s3', 'Rocket Ride']];
await page.route('**/auth/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) }));
/* The catch-all first: Playwright asks the most recently added route first. */
await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
await page.route('**/rest/v1/kid_shelf*', (route) => {
  const url = route.request().url();
  if (!/kind=eq\.song/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  return route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify(SONGS.map(([id, title], i) => ({
      id, title, made_at: new Date(Date.now() - i * 60_000).toISOString(),
      body: { topic: 'dog', sound: 'happy', audio: `${WHO.id}/song/${id}/audio` },
    }))),
  });
});
await page.route('**/storage/v1/object/**', (route) => route.fulfill({ status: 200, contentType: 'audio/wav', body: wav() }));
await page.route('**/api/kids', (route) => route.fulfill({ json: { open: true, allowance: 40, spent: 0, left: 40, minutes: null, secondsLeft: null, signedIn: true } }));

try {
  await page.goto(`${server.url}/kids`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 40000 });
  await page.locator('[data-kidstab="projects"], [data-kidstab="tv"]').first().click();
  await page.waitForTimeout(2500);

  const lists = page.locator('[data-kidsplaylists]');
  check('My playlists is in FutureBox TV', await lists.isVisible().catch(() => false));
  await lists.locator('[data-kidslistnew]').click();
  check('a list is named from stickers, nothing to type', (await lists.locator('[data-kidslistname]').count()) >= 8
    && (await lists.locator('input, textarea').count()) === 0);
  await lists.locator('[data-kidslistname="dance"]').click();
  await page.waitForTimeout(300);
  check('the new list opens to be filled', await lists.locator('[data-kidslistedit]').isVisible());
  await lists.locator('[data-kidslistsong="s3"]').click();
  await lists.locator('[data-kidslistsong="s1"]').click();
  check('tapped songs go in', (await lists.locator('[data-kidslistsong][aria-pressed="true"]').count()) === 2);
  const firstBefore = await lists.locator('[data-kidslistorder] li').first().innerText();
  await lists.locator('[data-kidslistorder] li').nth(1).locator('button').first().click();
  const firstAfter = await lists.locator('[data-kidslistorder] li').first().innerText();
  check('a song can be moved up', /Rocket Ride/.test(firstBefore) && /Dino Dance/.test(firstAfter), `${firstBefore} → ${firstAfter}`);
  await lists.locator('[data-kidslistdone]').click();
  await page.waitForTimeout(300);
  const card = lists.locator('[data-kidslist]').first();
  check('the list shows its name and how many songs', /Dance party/.test(await card.innerText()) && /2 songs/.test(await card.innerText()), await card.innerText());

  await card.locator('[data-kidslistplay]').click();
  await page.waitForTimeout(600);
  const now = lists.locator('[data-kidslistnow]');
  check('playing shows what is playing, first in the list', await now.isVisible() && /Dino Dance/.test(await now.innerText()), await now.innerText().catch(() => ''));
  await now.locator('[data-kidslistnext]').click();
  await page.waitForTimeout(400);
  check('next plays the next one', /Rocket Ride/.test(await now.innerText()), await now.innerText().catch(() => ''));
  await page.screenshot({ path: shot('kids-playlists.png'), fullPage: false });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 40000 });
  await page.locator('[data-kidstab="projects"], [data-kidstab="tv"]').first().click();
  await page.waitForTimeout(2500);
  check('the list is still there after a reload', /Dance party/.test(await page.locator('[data-kidsplaylists]').innerText()));

  /* ── The video door, alive ─────────────────────────────────────────────
     The owner, 19 October 2026: "Whats up met die music video funksie by
     kids? Daar gaan niks aan nie." The stage stood still and only a song made
     in this same visit could become a video. */
  const filmed = [];
  await page.route('**/api/video*', async (route) => {
    if (route.request().method() === 'POST') {
      filmed.push(route.request().postDataJSON());
      return route.fulfill({ json: { id: 'job-1', state: 'running' } });
    }
    return route.fulfill({ json: { state: 'running' } });
  });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.locator('[data-kidsroomdoor="video"]').click();
  await page.waitForTimeout(1500);
  check('the video door offers the songs on the shelf',
    (await page.locator('[data-kidsvideosong]').count()) === 3, String(await page.locator('[data-kidsvideosong]').count()));
  await page.locator('[data-kidsvideosong="s2"]').click();
  await page.locator('[data-kidsvideoplay]').click();
  await page.waitForTimeout(400);
  check('  play starts the song under the stage',
    (await page.locator('[data-kidsvideoplay]').getAttribute('aria-pressed')) === 'true');
  let moved = false;
  for (let i = 0; i < 30 && !moved; i += 1) {
    moved = await page.locator('[data-kidsdancer]').first().evaluate((el) => /scale/.test(el.style.transform));
    if (!moved) await page.waitForTimeout(100);
  }
  check('  and the dancers move to it', moved);
  await page.locator('[data-kidsscene="cosmic"]').click();
  await page.locator('[data-kidsfilm]').click();
  await page.waitForTimeout(800);
  check('a shelf song can become a real video, of the scene on the stage',
    filmed.length === 1 && filmed[0].kids === true && /space/i.test(filmed[0].prompt ?? ''), JSON.stringify(filmed[0] ?? {}).slice(0, 200));

  /* ── The Song Lab ──────────────────────────────────────────────────────
     The owner, 19 October 2026: "Die bubbles moet weg … wat van multiple
     keuses, wat van style? Dalk ook wat van setting? … verse, chorus, brug …
     very cool and futuristic vir kids." */
  const asked = [];
  await page.route('**/api/music', (route) => {
    asked.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'audio/wav', body: wav() });
  });
  /* A fresh page: the video still being made above rightly holds every
     paid button in the room until it lands. */
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 40000 });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.locator('[data-kidsroomdoor="music"]').click();
  const lab = page.locator('[data-kidssonglab]');
  await lab.waitFor({ timeout: 10000 });
  check('the Song Lab is there, and no bubbles', (await page.locator('[data-kidsbubble]').count()) === 0);
  check('  with the song’s shape drawn as blocks', (await lab.locator('[data-kidsshapeblock]').count()) === 5);
  await lab.locator('[data-kidssongtile="dog"]').click();
  await lab.locator('[data-kidssongtile="space"]').click();
  check('two things to sing about can be picked', (await lab.locator('[data-kidstopics] [aria-pressed="true"]').count()) === 2);
  await lab.locator('[data-kidssongstep="sound"]').click();
  await lab.locator('[data-kidssongtile="rock"]').click();
  await lab.locator('[data-kidssongstep="place"]').click();
  await lab.locator('[data-kidssongtile="jungle"]').click();
  await lab.locator('[data-kidssongstep="chorus"]').click();
  check('a part says what it is for', /everybody sings/i.test(await lab.locator('[data-kidssongpart="chorus"]').innerText()));
  await lab.locator('[data-kidssongtile="chorus-brave"]').click();
  await lab.locator('[data-kidssongstep="verse"]').click();
  await lab.locator('[data-kidssongtile="verse-friend"]').click();
  await lab.locator('[data-kidssongstep="bridge"]').click();
  await lab.locator('[data-kidssongtile="bridge-countdown"]').click();
  check('  and the blocks light up as the parts are chosen', (await lab.locator('[data-kidsshapeblock].is-lit').count()) === 5);
  const said = await lab.locator('[data-kidssentence]').innerText();
  check('the sentence says the whole song', /Loud|Rock/i.test(said) && /dog/i.test(said) && /Space/i.test(said) && /jungle/i.test(said), said);
  check('the make button says its price', /\d+/.test(await lab.locator('[data-kidssongprice]').innerText().catch(() => '')));
  await page.screenshot({ path: shot('kids-songlab.png'), fullPage: false });
  await lab.locator('[data-kidsmake]').click();
  await page.waitForTimeout(2500);
  const sent = asked[0] ?? {};
  check('every choice reaches the music engine',
    /dog/.test(sent.prompt ?? '') && /rocket|planets/.test(sent.prompt ?? '') && /jungle/.test(sent.prompt ?? '')
    && /we can do it/i.test(sent.prompt ?? '') && /new friend/.test(sent.prompt ?? '') && /three, two, one/.test(sent.prompt ?? '')
    && /rock/.test(sent.style ?? '') && sent.kids === true, JSON.stringify(sent).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

console.log(problems.length ? `\nproblems: ${problems.join(' ;; ')}` : '\ncheck:kidsplaylistwalk — a child names a playlist from stickers, fills it, orders it, plays it, and finds it again; any song on the shelf dances on the video stage and can become a video; and the Song Lab builds a song from several topics, a style, a place and its parts.');
process.exit(problems.length ? 1 : 0);
