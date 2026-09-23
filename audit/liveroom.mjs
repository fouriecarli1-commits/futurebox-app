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
import { agreeAndSubmit, launchOptions, shot } from './where.mjs';

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

/* `song` is the track behind the post, and it is deliberately not the post's
   own id. The last two are the same song put in the room twice — which is the
   case that caught the fault: `Cover` draws from its seed, so a cover seeded
   on the post gave one song two different pictures, and neither of them was
   the picture that song has in Make a song. */
const POSTS = [
  { title: 'Karoo Wind', by: 'Anré', note: 'First thing I made here.', song: 't-1700000000001' },
  { title: 'Second Song', by: 'Someone Else', note: '', song: 't-1700000000002' },
  { title: 'Third Song', by: 'A Third Person', note: 'Made on a phone.', song: 't-1700000000003' },
  { title: 'Karoo Wind', by: 'Anré', note: 'Put it back in.', song: 't-1700000000001' },
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
  sourceId: one.song,
  audio: `/probe-room-${i}.wav`,
  /* Distinct per post, and never equal, so an assertion cannot pass by
     reading the wrong panel's number. The third is null on purpose: that is
     what `/api/live` sends when the count could not be read at all, and the
     screen has to draw a dash rather than a confident nought. */
  hearts: [7, 12, null, 3][i],
  hearted: i === 1,
  plays: [41, 5, null, 88][i],
}));

/* ── And one that is not a song ──────────────────────────────────────────

   Carli: *"Music videos en music shorts moet ook na live toe kan post."*

   The room holds two shapes now — a sleeve with a song under it, and a moving
   picture with its own sound — and they are drawn by different elements and
   played through different ones. A stub that only ever sent songs would have
   proved the half that already worked.

   `video` rather than `audio`, deliberately: a post that carried its film in
   the audio field would draw a still with a player under it and play the
   sound of something nobody could see, which is the fault this field exists
   to make impossible. */
POSTS.push({
  id: 'post-film',
  kind: 'video',
  title: 'A filmed take',
  note: 'Sang it into the phone.',
  seconds: 2,
  platform: '',
  link: '',
  startsAt: null,
  at: new Date().toISOString(),
  by: 'Anré',
  mine: false,
  audio: null,
  video: '/probe-room-film.webm',
  hearts: 2,
  hearted: false,
  plays: 0,
});

/* ── And one that cannot be played, which knows why ──────────────────────
 
   Carli, 23 September 2026, fourth time: *"die video werk steeds nie op live
   nie."*
 
   `/api/live` has worked out which of four things went wrong since 21
   September, and the LIST prints the sentence. The scroller — the room as
   anybody actually uses it — filtered the post out: `posts.filter(one =>
   one.audio || one.video)`. So a film she posted was simply not there, with
   no sentence anywhere near it, and four rounds of looking found nothing
   because there was nothing on the screen to look at.
 
   `video: null` with a `why`, which is exactly the shape the route sends
   when the row is gone. */
POSTS.push({
  id: 'post-gone',
  kind: 'video',
  title: 'A film with no file',
  note: '',
  seconds: 2,
  platform: '',
  link: '',
  startsAt: null,
  at: new Date().toISOString(),
  by: 'Anré',
  mine: false,
  audio: null,
  video: null,
  why: 'no_row',
  hearts: 0,
  hearted: false,
  plays: 0,
});

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

  browser = await chromium.launch(launchOptions());
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
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

  /* ── A clip the browser made for itself ───────────────────────────────

     There is no sample video in this repository and no encoder on the build
     machine that can make one — so the page makes it: a canvas, a stream off
     it, and `MediaRecorder`, which is the same path `FollowWords` takes when
     somebody films a take. Whatever this browser can record, it can play, so
     the file is guaranteed decodable by the one thing that has to decode it.

     Bytes rather than a blob URL. A blob URL belongs to the page that minted
     it and the room reloads between here and there; the route hands the same
     bytes to whoever asks for the film's address. */
  const film = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 320;
    const paint = canvas.getContext('2d');
    let turn = 0;
    const tick = setInterval(() => {
      turn += 24;
      paint.fillStyle = `hsl(${turn % 360} 80% 50%)`;
      paint.fillRect(0, 0, 180, 320);
    }, 60);
    const type = ['video/webm;codecs=vp8', 'video/webm'].find((one) =>
      MediaRecorder.isTypeSupported(one));
    if (!type) return null;
    const chunks = [];
    const recorder = new MediaRecorder(canvas.captureStream(15), { mimeType: type });
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise((done) => { recorder.onstop = done; });
    recorder.start();
    await new Promise((done) => setTimeout(done, 1400));
    recorder.stop();
    await stopped;
    clearInterval(tick);
    const bytes = new Uint8Array(await new Blob(chunks, { type }).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return { type, base64: btoa(binary) };
  });
  check('the probe could make a clip for the room to play', Boolean(film?.base64));
  await p.route('**/probe-room-film.webm', (route) =>
    route.fulfill({
      status: 200,
      contentType: film?.type ?? 'video/webm',
      body: Buffer.from(film?.base64 ?? '', 'base64'),
    }));
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('liveroom@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('liveroom-password-1234');
  await agreeAndSubmit(p);
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

  /* ── One song, one picture ─────────────────────────────────────────

     "die liedjies moet lyk soos dit lyk in make a song."

     `Cover` draws deterministic artwork from a hash of its seed and names its
     gradient after that hash, so the gradient's id is the seed's signature in
     the DOM — two covers with the same id are the same picture, and the probe
     needs no copy of the hash to say so.

     The room seeded it on the *post*. The first and last fixture posts are the
     same song, so that gave one song two pictures — and a third, different
     again, in Make a song and the library and the channel, which seed on the
     song. This is the assertion that the seed is the song. */
  const coverId = async (index) =>
    room.locator('article').nth(index).locator('svg linearGradient').first().getAttribute('id');
  const firstCover = await coverId(0);
  const sameSongCover = await coverId(3);
  const otherCover = await coverId(1);
  check('the same song put in the room twice draws the same picture',
    Boolean(firstCover) && firstCover === sameSongCover, `${firstCover} vs ${sameSongCover}`);
  check('and a different song draws a different one',
    Boolean(otherCover) && otherCover !== firstCover, `${otherCover} vs ${firstCover}`);

  /* ── Whose song it is, on the song ─────────────────────────────────

     "die liedjie se naam en die persoon se handels naam moet wys. want die
      liedjie behoort dan aan daardie persoon." */
  const topPanel = ((await room.locator('article').first().innerText()) ?? '').replace(/\s+/g, ' ');
  check('the newest song is the first one in the room',
    topPanel.includes('Karoo Wind'), topPanel.slice(0, 60));
  check('and it carries the name of the person whose song it is',
    topPanel.includes('Anré'), topPanel.slice(0, 60));

  /* ── Play opens the room, it does not play under the list ──────────

     "wanneer mens op play druk, moet jy met 'n swipe skuif van een liedjie na
      die volgende."

     It played the audio in place and left the page where it was: sound, and a
     list. The swiping screen could only be reached by pressing the picture
     instead — two controls, one obvious and one not, and the obvious one went
     to the lesser place. */
  const panelPlay = room.locator('article').first().locator('button[aria-label="Listen"]');
  check('every song panel has a play button', (await panelPlay.count()) === 1);
  await panelPlay.first().click();
  await p.waitForTimeout(1200);
  const opened = p.locator('div.fixed.inset-0.z-\\[80\\]');
  check('pressing play opens the room full screen, where a swipe moves on',
    (await opened.count()) === 1, `${await opened.count()} full-screen views`);

  /* And the panel it opened on has a picture behind it. These were black —
     a title and a name over nothing, which reads as a song that failed to
     load rather than as a song being played. */
  const openCover = await opened.first().locator('section svg linearGradient').first().getAttribute('id');
  check('and the song being played has its picture behind it',
    Boolean(openCover), String(openCover));
  check('the same picture it has in the list',
    openCover === firstCover, `${openCover} vs ${firstCover}`);

  await p.locator('button[aria-label="Close"]').first().click().catch(() => undefined);
  await p.waitForTimeout(600);

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
  check('and saying where you are in it',
    new RegExp(`1 / ${POSTS.length}`).test(first.text), first.text.slice(0, 46));
  await p.screenshot({ path: shot('liveroom.png') });

  /* A thumb, which is the whole point of the shape. */
  const scroller = screen.locator('div.overflow-y-auto').first();
  await scroller.evaluate((el) => el.scrollTo({ top: el.clientHeight, behavior: 'auto' }));
  await p.waitForTimeout(1500);
  const next = await showing();
  check('scrolling moves to the next one',
    next.at === 1 && next.text.includes('Second Song')
      && new RegExp(`2 / ${POSTS.length}`).test(next.text),
    `panel ${next.at}: ${next.text.slice(0, 46)}`);

  /* ── The one that cannot be played is IN the scroller, saying why ────
 
     Carli's fourth report. The route worked out the reason, the list printed
     it, and this screen — the only one somebody scrolling ever reaches —
     dropped the post. A film she had posted was simply absent, and there was
     no sentence anywhere near it to photograph.
 
     Counted rather than sought by eye: every panel's markup exists at once,
     so the assertion is that the panel EXISTS and carries its reason, which
     is what the filter used to remove. */
  const gone = screen.locator('[data-roomgone]');
  check('a post the room cannot play is in the scroller rather than dropped',
    (await gone.count()) === 1,
    `${await gone.count()} — it used to be filtered out, so she saw nothing at all`);
  check('  and it says which of the four things went wrong',
    (await gone.first().getAttribute('data-roomgone').catch(() => null)) === 'no_row',
    'the panel is there and does not carry the reason the route sent');
  check('  in words, not a code',
    /not in the account any more|nie meer in die rekening/i.test(
      await gone.first().innerText().catch(() => ''),
    ),
    (await gone.first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 90));

  /* ── The heart and the listens, inside the full-screen room ─────────

     "ek sien nou die hartjie en views, maar dit moet binne die play the room
      funksie ook wees wanneer mens scroll van 1 liedjie na die volgende."

     They were on the list and not in here, which is the wrong way round: the
     list is the directory of the room and this is the room. A heart you have
     to leave the song to give is a heart nobody gives.

     Three things have to be true and only the first is about layout.

     The number has to belong to the panel in front. It is read off the panel
     under the middle of the window rather than off the DOM, because every
     panel's markup exists at once and "a 12 is somewhere in the scroller" is
     true before anybody scrolls.

     It has to be reachable. The tab bar is `z-[95]` and this screen is
     `z-[80]`, so anything near the bottom of it is painted over — the fault
     she has reported three times in three different rooms. A rectangle in the
     right place proves nothing; `elementFromPoint` is the only thing that
     says what a thumb actually lands on.

     And it must not pause the song. The whole panel is a play control, so a
     heart drawn over it without `stopPropagation` gives the heart and stops
     the music in the same press. */
  const railOn = async () =>
    p.evaluate(() => {
      const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      const panel = mid?.closest('[data-at]');
      const heart = panel?.querySelector('button[aria-pressed]');
      if (!heart) return null;
      const box = heart.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      return {
        at: Number(panel?.getAttribute('data-at')),
        said: (heart.textContent ?? '').trim(),
        pressed: heart.getAttribute('aria-pressed'),
        /* What is actually painted at the heart's own middle. Anything but
           the heart means something is over it. */
        reaches: hit ? Boolean(hit.closest('button[aria-pressed]')) : false,
        onTop: hit?.closest('button')?.getAttribute('aria-label') ?? hit?.tagName ?? 'nothing',
        bottom: Math.round(window.innerHeight - box.bottom),
      };
    });

  const rail = await railOn();
  check('the second song carries its own heart count in the full-screen room',
    rail?.at === 1 && rail?.said === '12', JSON.stringify(rail));
  check('and it opens filled in for a song this reader has hearted',
    rail?.pressed === 'true', JSON.stringify(rail));
  check('nothing is painted on top of it',
    rail?.reaches === true, `${rail?.onTop} is in front of the heart`);
  check('and it clears the bottom button bar',
    (rail?.bottom ?? 0) >= 64, `${rail?.bottom}px above the bottom`);

  /* The listens, beside it. Hearts are people and plays are times. */
  const plays = await p.evaluate(() => {
    const mid = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    const panel = mid?.closest('[data-at]');
    const span = panel?.querySelector('[title]');
    return (span?.textContent ?? '').trim();
  });
  check('the listen count is beside it, and is the right song’s', plays === '5', plays);

  /* A count that could not be read is a dash, never a nought. The third song
     is the one `/api/live` had no answer for. */
  /* One panel at a time. `scroll-snap-stop: always` is on these sections on
     purpose — it is what stops a flick throwing four songs past somebody —
     and it refuses a programmatic jump of two panels just as firmly. The
     first version of this assertion asked for `clientHeight * 2` in one go
     and read the second song's number while believing it was the third's. */
  const scrollTo = async (panel) => {
    /* Scoped to `screen`, not to the page. Unscoped, `div.overflow-y-auto`
       first matches a scroller in the room *behind* this portal, and every
       scroll went there — the panel never moved and the assertion read the
       second song's number believing it was the third's. The same mistake
       boothwalk made counting an anchor behind an overlay. */
    const box = screen.locator('div.overflow-y-auto').first();
    for (let step = 0; step < panel + 2; step += 1) {
      const at = (await railOn())?.at ?? -1;
      if (at === panel) return;
      await box.evaluate((el, want) => el.scrollTo({ top: el.clientHeight * want, behavior: 'auto' }),
        at < panel ? at + 1 : at - 1);
      await p.waitForTimeout(900);
    }
  };

  await scrollTo(2);
  const unknown = await railOn();
  check('a count that could not be read draws a dash rather than a nought',
    unknown?.at === 2 && unknown?.said === '–', JSON.stringify(unknown));

  /* Back to the second, and press it. */
  await scrollTo(1);
  const wasPlaying = await p.evaluate(() =>
    Array.from(document.querySelectorAll('audio')).some((one) => !one.paused));
  await p.locator('[data-at="1"] button[aria-pressed]').first().click();
  await p.waitForTimeout(600);
  const afterPress = await p.evaluate(() =>
    Array.from(document.querySelectorAll('audio')).some((one) => !one.paused));
  check('pressing the heart does not pause the song underneath it',
    wasPlaying === afterPress, `playing ${wasPlaying} before, ${afterPress} after`);

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

  /* ── The other shape in the scroller ─────────────────────────────────

     Carli: *"Music videos en music shorts moet ook na live toe kan post. Ek
     sien huidiglik dat my videos nie 'n opsie het om na live toe te kan post
     nie."*

     Scrolled to rather than opened at, because the thing worth proving is
     that the two shapes live in one scroller: a song, a song, a song, a song,
     and then a film, with the transport following whichever is on screen.

     Three questions. Is it drawn as a video at all — a post whose film ended
     up in the audio field would draw a still here. Is it the whole panel
     rather than a thumbnail in the corner. And does it actually play, which
     is the one the element switch is for: the room's play button reaches for
     a shared `<audio>`, and on this panel that element has nothing in it. */
  const filmScroller = screen.locator('div.h-full.w-full.overflow-y-auto').first();
  await filmScroller.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await p.waitForTimeout(2500);

  const clip = screen.locator('[data-roomvideo]').first();
  check('a filmed take is a panel in the same scroller', (await clip.count()) > 0,
    ((await screen.innerText()) ?? '').replace(/\s+/g, ' ').slice(-120));

  if ((await clip.count()) > 0) {
    const clipBox = await clip.boundingBox();
    check('  and it fills the panel rather than sitting in a corner',
      (clipBox?.height ?? 0) > 700 && (clipBox?.width ?? 0) > 380,
      JSON.stringify(clipBox));

    /* Pressed rather than waited for: a browser refuses autoplay with sound
       until somebody has touched the page, which is a real rule and not a
       fault — and the press is what a person does. */
    const press = screen.locator('button[aria-label]').filter({ hasText: '' });
    await clip.click({ position: { x: 20, y: 400 } }).catch(() => undefined);
    await p.waitForTimeout(1200);
    const rolling = await clip.evaluate((el) => ({
      paused: el.paused,
      time: el.currentTime,
      ready: el.readyState,
      src: (el.getAttribute('src') ?? '').slice(-20),
    }));
    check('  and the film itself plays, not the empty song element',
      rolling.ready > 0 && (!rolling.paused || rolling.time > 0),
      JSON.stringify(rolling));
    void press;
  }

  /* Back to the top, so the close below is pressed on the panel it was
     measured against. */
  await filmScroller.evaluate((el) => { el.scrollTop = 0; });
  await p.waitForTimeout(800);

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
