/**
 * Live, played the way a phone plays things.
 *
 * Carli moved Live onto a tab where the search used to be: "Dit is waar mense
 * die tiktik like videos van almal gaan kyk." A tab that is where everybody
 * else's work is has to play like the thing it is compared to — one at a time,
 * full screen, thumb up for the next one.
 *
 * ── Why the room is stood in for ─────────────────────────────────────────
 *
 * The live room needs a Supabase project with posts in it, and this
 * environment has neither. What is being checked is this app's own screen, so
 * the room's answer is stubbed and the audio is a real, tiny WAV served from
 * this origin — a blob: URL would be refused by our own Content-Security
 * Policy, which is the sort of thing a probe should find rather than dodge.
 *
 * ── What is asserted ─────────────────────────────────────────────────────
 *
 * That the room can be played rather than only listed. That the full-screen
 * view is actually full screen — the same containing-block trap that had the
 * song player and the teleprompter twenty pixels down twice. And that a thumb
 * moves it to the next one, which is the whole point of the shape.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3122';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** A tenth of a second of silence, as a real WAV a browser will decode. */
function wav() {
  const samples = 4410;
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples * 2, 4);
  bytes.write('WAVE', 8);
  bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(44100, 24);
  bytes.writeUInt32LE(88200, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  return bytes;
}

const POSTS = [
  { title: 'Karoo Wind', by: 'Anré', note: 'First thing I made here.' },
  { title: 'Second Song', by: 'Someone Else', note: '' },
  { title: 'Third Song', by: 'A Third Person', note: 'Made on a phone.' },
].map((one, i) => ({
  id: `post-${i}`,
  kind: 'track',
  title: one.title,
  note: one.note,
  seconds: 60,
  platform: '',
  link: '',
  startsAt: null,
  at: new Date().toISOString(),
  by: one.by,
  mine: false,
  audio: `/probe-room-${i}.wav`,
}));

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  /* A POST is answered the way the real route answers it, so the link rule
     can be exercised for real rather than described. Everything else is the
     stub: the room needs a Supabase project and this environment has none. */
  let refused = null;
  await p.route('**/api/live*', async (route) => {
    if (route.request().method() === 'POST') {
      const sent = JSON.parse(route.request().postData() ?? '{}');
      if (sent.what === 'elsewhere') {
        const link = String(sent.link ?? '');
        let ok = false;
        try {
          const url = new URL(link);
          const host = url.hostname.toLowerCase().replace(/^www\./, '');
          const sites = ['youtube.com', 'youtu.be', 'tiktok.com', 'facebook.com', 'fb.watch', 'fb.com',
            'vimeo.com', 'spotify.com', 'music.apple.com', 'soundcloud.com'];
          ok = url.protocol === 'https:' && !url.username && !url.password
            && sites.some((one) => host === one || host.endsWith(`.${one}`));
        } catch { ok = false; }
        if (!ok) {
          refused = link;
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Links in the room have to go to YouTube, TikTok, Facebook, Vimeo, Spotify, Apple Music or SoundCloud — so everybody knows where a link goes before they press it.',
            }),
          });
          return;
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ready: true,
        signedIn: true,
        here: 3,
        posts: POSTS,
        says: [
          { id: 's1', by: 'Riaan', body: 'Hierdie een is lekker.', at: '2026-09-06T09:00:00.000Z', mine: false },
          { id: 's2', by: 'You', body: 'Dankie! Nog een kom nou.', at: '2026-09-06T09:01:00.000Z', mine: true },
        ],
      }),
    });
  });
  await p.route('**/probe-room-*.wav', (route) =>
    route.fulfill({ status: 200, contentType: 'audio/wav', body: wav() }));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('liveroom@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('liveroom-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);

  const bar = p.locator('nav[aria-label]').first();
  await bar.locator('button').filter({ hasText: 'Live' }).first().click();
  await p.waitForTimeout(2000);

  const room = p.locator('div.fixed.inset-0.z-50').first();
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');
  check('the Live tab opens the room', (await says()).includes('Karoo Wind'), (await says()).slice(0, 60));

  /* ── The two questions, and the messages ────────────────────────────
 
     "die live kamer moet oop maak met die vraag of jy self liedjies wil post,
      en ook die vraag of jy iets in die live room wil pos, die boodskappe van
      die live room moet dan daar wys."
 
     Two cards, shut, then what the room is saying, then the room itself. */
  const asks = room.locator('section > div > button[aria-expanded]');
  check('the room opens on two questions', (await asks.count()) === 2, `${await asks.count()}`);
  const asked = (await asks.allInnerTexts()).map((one) => one.trim()).join(' | ');
  check('one about your own songs', /own songs/i.test(asked), asked);
  check('and one about putting something else in', /something else/i.test(asked), asked);
  check('and they are shut, so the room is what you see first',
    (await asks.evaluateAll((els) => els.every((el) => el.getAttribute('aria-expanded') === 'false'))));
  check('what the room is saying is on the screen',
    (await says()).includes('Hierdie een is lekker'), 'the messages');
  check('and it is above the songs, not under every one of them',
    (await says()).indexOf('Hierdie een is lekker') < (await says()).indexOf('Karoo Wind'));

  /* ── A post is a panel, not a small block ──────────────────────────
 
     "Dit moenie sulke klein blokkie wees soos dit nou is nie." Measured,
     because "bigger" is an opinion until somebody counts the pixels. */
  const panel = room.locator('article').first();
  const panelBox = await panel.boundingBox();
  check('a post fills most of the screen rather than three lines of it',
    (panelBox?.height ?? 0) >= 380, `${Math.round(panelBox?.height ?? 0)}px tall`);
  check('and is taller than it is wide, the way a phone shows video',
    (panelBox?.height ?? 0) > (panelBox?.width ?? 0),
    `${Math.round(panelBox?.width ?? 0)}×${Math.round(panelBox?.height ?? 0)}`);
  await p.screenshot({ path: shot('liveroom-panels.png') });

  /* ── The link rule, exercised rather than described ────────────────
 
     "mense mag net toegang hê om tiktok links te post vir live chats. Jy moet
      hierdie kan toets dat dit nie snaakse content deel nie." */
  await asks.nth(1).click();
  await p.waitForTimeout(500);
  /* The rule is written inside the form, so the form has to be open before it
     can be read. Asserted before opening it once, and it reported the rule
     missing when what was missing was the press. */
  const openIt = room.locator('button').filter({ hasText: /going live somewhere/i }).first();
  if (await openIt.count()) { await openIt.click(); await p.waitForTimeout(500); }
  check('the form names the sites it takes, before anything is typed',
    /YouTube, TikTok, Facebook, Vimeo, Spotify, Apple Music or SoundCloud/.test(await says()));
  check('and does not claim to have watched what is on the far end',
    (await says()).includes('cannot tell you what is on the far end'));
  const linkBox = room.locator('input[inputmode="url"]').first();
  check('there is one link field', (await linkBox.count()) === 1);
  await room.locator('input[placeholder*="What is it"]').first().fill('Live tonight');
  for (const [bad, what] of [
    ['https://evil.example/whatever', 'a stranger’s own server'],
    ['https://tiktok.com.evil.example/1', 'a lookalike domain'],
    ['https://twitter.com/someone/status/1', 'a platform that is not on the list'],
  ]) {
    /* The form is reopened each time. It closes itself on a successful post,
       and a loop that assumes it stayed open reports the second refusal
       missing when what is missing is the form. */
    if (!(await linkBox.isVisible().catch(() => false))) {
      await openIt.click().catch(() => undefined);
      await p.waitForTimeout(400);
    }
    refused = null;
    await room.locator('input[placeholder*="What is it"]').first().fill('Live tonight');
    await linkBox.fill(bad);
    await room.locator('button').filter({ hasText: /^Tell the room$/ }).last()
      .click().catch(() => undefined);
    for (let waited = 0; waited < 20 && !refused; waited += 1) await p.waitForTimeout(200);
    check(`refused: ${what}`, refused === bad, refused ?? 'nothing reached the route');
    /* `refused` is set the moment the request arrives at the route, which is
       before the browser has had the answer, let alone drawn it. Asserting
       straight after it is a race, and it reported the room silent about a
       refusal it was about to print. */
    await p.waitForTimeout(700);
    const shown = await says();
    check('and the room says why, in its own words',
      shown.includes('have to go to YouTube'), `${shown.slice(0, 120)}…`);
  }
  await asks.nth(1).click();
  await p.waitForTimeout(400);

  const playRoom = room.locator('button').filter({ hasText: /^Play the room$/ });
  check('and the room can be played, not only listed', (await playRoom.count()) === 1);

  await playRoom.first().click();
  await p.waitForTimeout(1500);

  const screen = p.locator('div.fixed.inset-0.z-\\[80\\]');
  check('pressing it opens a full-screen view', (await screen.count()) === 1);
  const box = await screen.first().boundingBox();
  /* The trap that caught the song player and the teleprompter, both times
     twenty pixels down: `position: fixed` is only relative to the window while
     no ancestor carries a transform, a filter or `contain`, and the studio
     around this carries all three. */
  check('and it is actually full screen, not offset by the studio around it',
    box?.y === 0 && box?.x === 0 && (box?.height ?? 0) > 800, JSON.stringify(box));

  /* Which panel is actually in front of the reader.
 
     `innerText` of the scroller holds every panel at once, so "the second
     song's title is somewhere in there" is true before anybody scrolls — the
     first version of this assertion passed without the feature working. Asked
     of the document at the middle of the window instead. */
  const showing = async () =>
    p.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      const panel = el?.closest('[data-at]');
      return panel
        ? { at: Number(panel.getAttribute('data-at')), text: (panel.textContent ?? '').replace(/\s+/g, ' ').trim() }
        : { at: -1, text: '' };
    });

  const first = await showing();
  check('opening on the first song in the room',
    first.at === 0 && first.text.includes('Karoo Wind'), `panel ${first.at}: ${first.text.slice(0, 46)}`);
  check('and saying where you are in it', /1 \/ 3/.test(first.text), first.text.slice(0, 46));
  await p.screenshot({ path: shot('liveroom.png') });

  /* A thumb, which is the whole point of the shape. */
  const scroller = screen.locator('div.overflow-y-auto').first();
  await scroller.evaluate((el) => el.scrollTo({ top: el.clientHeight, behavior: 'auto' }));
  await p.waitForTimeout(1500);
  const next = await showing();
  check('scrolling moves to the next one',
    next.at === 1 && next.text.includes('Second Song') && /2 \/ 3/.test(next.text),
    `panel ${next.at}: ${next.text.slice(0, 46)}`);

  /* The way out, and whether anything is sitting on top of it.

     The search button is fixed to the top-right corner of every screen and is
     above this one, so a close control in that corner is a close control
     nobody can press. That is not a guess: this probe failed on it, with
     Playwright naming the search icon as the thing intercepting the click.
     Asked of the document rather than of the layout, because a rectangle in
     the right place says nothing about what is in front of it. */
  const exit = screen.locator('button[aria-label]').first();
  const exitBox = await exit.boundingBox();
  const onTop = await p.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? (el.closest('button')?.getAttribute('aria-label') ?? el.tagName) : 'nothing';
    },
    [(exitBox?.x ?? 0) + (exitBox?.width ?? 0) / 2, (exitBox?.y ?? 0) + (exitBox?.height ?? 0) / 2],
  );
  check('nothing is sitting on top of the way out', onTop === 'Close', String(onTop));

  await exit.click();
  await p.waitForTimeout(800);
  check('and it closes back into the room',
    (await p.locator('div.fixed.inset-0.z-\\[80\\]').count()) === 0);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:liveroom — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:liveroom — the room plays one at a time, full screen, thumb up for the next.');
