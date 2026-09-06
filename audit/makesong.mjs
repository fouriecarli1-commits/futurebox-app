/**
 * The room this app is for, pressed the way somebody presses it.
 *
 * Two things Carli reported, in Afrikaans, an hour apart:
 *
 *   "By make a song is daar nie 'n lengte keuse vir liedjies nie."
 *   "Die make a song generate glad nie reg nie … net klank het uitgekom."
 *
 * The first was true because the length sat behind the Everything switch — the
 * one control there that changes what a song costs, so Simple was hiding the
 * price while charging it. The second was a fault on the server, and is tested
 * where it lives by `check:makesong`.
 *
 * What this adds is the half a unit test cannot reach: that the room asks for
 * a length before anything is spent, that it says plainly when a song is going
 * to come back with nobody singing on it, and that the request it actually
 * sends carries the words that were typed into the box. The last one is the
 * whole product in one assertion, and it is checked by reading the request on
 * its way out rather than by trusting the code that builds it.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3093';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const WORDS = [
  '[Verse]',
  'Ek ry alleen deur die Karoo',
  'Die pad is lank en stil',
  '[Chorus]',
  'En ek sing vir jou',
].join('\n');

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
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  /* The engine, stood in for.

     There is no ElevenLabs key here and there must not be one — a probe that
     needs a paid account is a probe nobody runs. What is being checked is what
     leaves this app, so the stub answers "yes, I am switched on" and hands
     back a few bytes of audio, and the request on the way past is kept. */
  let sent = null;
  await p.route('**/api/music', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
      return;
    }
    sent = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'X-Music-Model': 'ElevenLabs Music' },
      body: Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    });
  });

  /* The link bar's route, stood in for the same way.

     There is no Anthropic key here either. What is being checked is that the
     bar sends the link somebody pasted and puts the answer in the style box —
     the model's judgement is not this probe's business. */
  let linked = null;
  await p.route('**/api/songlink', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
      return;
    }
    linked = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        style: 'boeremusiek revival, concertina, walking bass, mid tempo, sung close',
        known: true,
        because: 'A well known Afrikaans rock ballad.',
        title: 'De la Rey',
        author: 'Bok van Blerk',
        provider: 'YouTube',
      }),
    });
  });

  /* The songwriter, stood in for.

     `docs/PACKAGING.md` §2 has had a wand on every card header for four
     sessions and nothing ever filled it. What is checked here is the wand,
     not the writing: that pressing it sends the room's state, that what comes
     back lands in the box, and — the one that matters — that it is added to
     what was already typed rather than over it. */
  let waved = null;
  await p.route('**/api/songwriter', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
      return;
    }
    waved = JSON.parse(route.request().postData() ?? '{}');
    const text = waved.mode === 'style'
      ? 'brushed drums, upright bass, close-mic vocal'
      : '[Chorus]\nEn die pad vat my huis toe';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ suggestions: [{ label: 'One', text, why: 'because' }] }),
    });
  });

  /* The photo route, stood in for.

     The card's own instruction is the thing being checked. It never reaches a
     screen — it goes to the model and nowhere else — so the only way to know
     the right card sent the right one is to read the request. */
  let photographed = null;
  await p.route('**/api/photosong', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
      return;
    }
    photographed = route.request().postData() ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Ouma se kombuis',
        style: 'boeremusiek, concertina, brushed drums',
        lyrics: '[Vers 1]\nDie ketel op die stoof\n\n[Refrein]\nEn die deur staan altyd oop',
        saw: 'a kitchen, warm light, a kettle',
      }),
    });
  });

  /* A microphone that is not one.

     `getUserMedia` needs a device and a permission, and a probe that needs
     either is a probe nobody runs. A silent track off an AudioContext is a
     real MediaStream as far as MediaRecorder is concerned, which is the part
     being checked — that pressing a card starts a recording, that pressing it
     again stops one, and that what comes back gets sent on. */
  await p.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const Ctx = window.AudioContext;
      const ctx = new Ctx();
      const out = ctx.createMediaStreamDestination();
      const tone = ctx.createOscillator();
      tone.connect(out);
      tone.start();
      return out.stream;
    };
  });

  let transcribed = null;
  await p.route('**/api/transcribe', async (route) => {
    transcribed = (route.request().postData() ?? '').length;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        words: [{ text: 'Ek', start: 0, end: 0.3 }],
        text: 'Vanoggend het die verkeer by die brug gestaan en ek was ’n uur laat.',
      }),
    });
  });
  let fromSaid = null;
  await p.route('**/api/songfrom', async (route) => {
    fromSaid = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: 'Die brug om sewe',
        style: 'afrikaanse rock, driving drums, close vocal',
        lyrics: '[Vers 1]\nDie brug staan stil om sewe',
        heard: 'traffic at the bridge, an hour late',
      }),
    });
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('makesong@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('makesong-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(900);

  const bar = p.locator('nav[aria-label]').first();
  await bar.locator('button').filter({ hasText: 'Make' }).first().click();
  await p.waitForTimeout(1300);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Make a song/i.test(first)) {
      await door.nth(i).click();
      break;
    }
  }
  await p.waitForTimeout(1600);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* Simple, which is where somebody starts and where she was looking. */
  await room.locator('button').filter({ hasText: /^Simple$/ }).first().click();
  await p.waitForTimeout(700);
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');

  /* ── The card shape ─────────────────────────────────────────────────
 
     `docs/PACKAGING.md` §2, read off the screenshots: a heading you can fold,
     one box, and the options as small buttons underneath. Asserted on the two
     cards that carry the room — the words and the sound — because a shape
     that is only in a document is a shape that never arrives. */
  const cards = room.locator('section > div > button[aria-expanded]');
  check('the words and the sound are cards that fold',
    (await cards.count()) >= 2, `${await cards.count()} foldable headings`);
  /* The words box by its own placeholder, not "the first textarea in the
     room". Folding the card removes it, and `.first()` then resolves to the
     style box instead — so the check for "it is gone" found a different box,
     still visible, and failed while the feature worked. */
  const wordsBox = room.locator('textarea[placeholder*="Verse 1"]');
  check('and the box inside one is open to start with', (await wordsBox.count()) === 1);
  await cards.first().click();
  await p.waitForTimeout(500);
  check('pressing the heading folds it away', (await wordsBox.count()) === 0);
  check('and says so rather than leaving an empty card',
    (await says()).includes('Folded away'));
  await cards.first().click();
  await p.waitForTimeout(500);
  check('and pressing it again brings the box back', (await wordsBox.count()) === 1);

  check('Simple asks how long the song should be', (await says()).includes('How long?'));
  /* Not "the words How long are on the page" — the buttons themselves, because
     a label over nothing pressable is the same bug in a different shape. */
  const lengths = room.locator('button').filter({ hasText: /credits$/ });
  check('and offers real lengths to press', (await lengths.count()) >= 3,
    `${await lengths.count()} choices`);
  check('with what each one costs on it', /\d+ credits/.test(await says()));

  /* ── Nobody singing, said out loud ─────────────────────────────────── */
  check('an empty words box says the song will come back unsung',
    (await says()).includes('nobody singing'));

  await room.locator('textarea').first().fill(WORDS);
  await p.waitForTimeout(700);
  check('and the warning goes once there are words',
    !(await says()).includes('nobody singing'));
  await p.screenshot({ path: shot('makesong-simple.png') });

  /* ── What actually leaves the app ──────────────────────────────────── */
  /* `:visible`, because the two "learn it from a file" buttons each carry a
     hidden file input and both sit above the title field. Reaching for the
     first input in the room found one of those and waited a minute for
     something invisible to become fillable. */
  await room.locator('input:visible').first().fill('Karoo');
  await room.locator('button').filter({ hasText: /^Make my song$/ }).first().click();
  for (let waited = 0; waited < 40 && !sent; waited += 1) await p.waitForTimeout(500);

  check('pressing Make sends a request to the music route', Boolean(sent));
  const sections = sent?.sections ?? [];
  const sung = sections.filter((one) => (one.lines ?? []).length > 0);
  check('carrying the words as sections, not as a bare prompt',
    sung.length >= 2, `${sections.length} parts, ${sung.length} of them sung`);
  const lines = sections.flatMap((one) => one.lines ?? []);
  for (const line of ['Ek ry alleen deur die Karoo', 'En ek sing vir jou']) {
    check(`"${line}" is in what leaves the app`, lines.includes(line));
  }
  check('the parts are named, so the words land in the right place',
    sung.every((one) => one.name === 'Verse' || one.name === 'Chorus'),
    sections.map((one) => one.name).join(' · '));
  /* A song, not one long stretched verse and not a row of fragments.
 
     The old plan handed the model one part and the whole length and asked it
     to fill the gap. The first fix went the other way and cut a minute into
     six eight-second pieces, which sounds cut into pieces — each chunk is
     conditioned on its own. So what is asserted is the property, not a part
     count: it opens with something played rather than sung, and no sung part
     is short enough to be a fragment. */
  check('and the song has a shape — it opens on something played',
    sections[0]?.name === 'Intro',
    sections.map((one) => `${one.name} ${one.seconds}s`).join(' · '));
  check('with no sung part chopped into a fragment',
    sung.every((one) => one.seconds >= 12),
    sung.map((one) => `${one.name} ${one.seconds}s`).join(' · '));
  const runs = sections.reduce((sum, one) => sum + (one.seconds ?? 0), 0);
  check('and the plan adds up to the length that was chosen',
    Math.abs(runs - (sent?.seconds ?? 0)) <= 3, `${runs}s against ${sent?.seconds}s`);
  check('and it is not asked for as an instrumental',
    sent?.instrumental === false, JSON.stringify(sent?.instrumental));
  check('the chosen length goes with it', typeof sent?.seconds === 'number' && sent.seconds > 0,
    String(sent?.seconds));
  /* And the language, which nothing ever said before. The words above are
     Afrikaans, so the room should have worked that out without being told —
     that is the case that matters, because somebody writing in their own
     language should not have to find a control first. */
  check('the engine is told to sing it in Afrikaans',
    (sent?.style ?? '').includes('sung in Afrikaans'), sent?.style ?? '');
  /* And the person's own style is not outvoted by ours.
 
     Everything in this list competes: the model weights early entries most, so
     a genre written in two words against nine of our own is a genre that does
     not arrive. The default request — a voice nobody chose and a language read
     off the words — is the worst case, and it is the one measured here. */
  const ours = (sent?.style ?? '').split(',').filter(Boolean).length;
  check('and our own words do not outnumber the room',
    ours <= 6, `${ours} style words with nothing typed in the box`);
  /* ── Something to start from ────────────────────────────────────────
 
     Last, and deliberately: picking one fills the title, the words and the
     style, so doing it earlier would have made every assertion above about a
     room somebody had already been given. It was written first and did
     exactly that — three checks passed for the wrong reason, and one failed
     because the style it was counting was no longer ours. */
  check('and offers to take the style off a song or a photo',
    (await says()).includes('From a song') && (await says()).includes('From a photo'));
  check('saying it reads the light rather than the subject, and that nothing is uploaded',
    (await says()).includes('not what is in it') && (await says()).includes('leaves this device'));

  /* ── The prompt cards ───────────────────────────────────────────────
 
     `docs/PACKAGING.md` §4: a row of cards, each a sentence and a camera. It
     is called the single best idea in those screenshots and the reason is not
     about design — a generator is only as good as the sentence it is given,
     and the one almost everybody gives it under pressure is "write me a
     song". */
  const promptCards = room.locator('button:has(svg)').filter({ hasText: /Ouma se kombuis|Turn any photo/ });
  check('the room opens with cards to press instead of an empty box',
    (await promptCards.count()) >= 1, `${await promptCards.count()}`);
  check('and says the picture is not kept, before anything is picked',
    (await says()).includes('not kept'));

  /* Pressing one opens a file picker, so the file is handed straight to the
     input rather than through a dialogue Playwright would have to drive. */
  const picture = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  /* The card first, then the file. The component remembers which card was
     pressed so the file that arrives knows what it is for — setting the input
     without pressing anything sends a picture with no instruction, which is
     the blank box with a photograph attached and is exactly what this feature
     is not. The first version of this probe did that and reported the feature
     broken. */
  p.on('filechooser', () => undefined);
  await promptCards.first().click();
  await p.waitForTimeout(400);
  await room.locator('input[type="file"][accept="image/*"]').first()
    .setInputFiles({ name: 'kombuis.png', mimeType: 'image/png', buffer: picture });
  for (let waited = 0; waited < 40 && !photographed; waited += 1) await p.waitForTimeout(300);
  check('picking a photograph sends it', Boolean(photographed));
  /* The card's instruction, on the wire. This is the assertion the whole
     feature turns on: a card that sends no idea is the blank box with a
     picture attached. */
  check('with the card’s own instruction on it, which no screen ever shows',
    /name="idea"/.test(photographed ?? '') && (photographed ?? '').length > 200,
    `${(photographed ?? '').length} bytes`);
  check('and the reader’s language, so the words come back in it',
    /name="lang"/.test(photographed ?? ''));
  await p.waitForTimeout(900);
  check('what comes back fills the room in — the title',
    (await room.locator('input:visible').first().inputValue()) === 'Ouma se kombuis');
  check('the words',
    (await room.locator('textarea[placeholder*="Verse 1"]').inputValue()).includes('ketel op die stoof'));
  check('and the style', (await room.locator('textarea').nth(1).inputValue()).includes('concertina'));
  check('and it says what it saw, so the words can be judged before spending',
    (await says()).includes('warm light'));

  /* ── The talking cards ──────────────────────────────────────────────
 
     The other half of `docs/PACKAGING.md` §4. Nothing is typed at all, which
     on a phone is the shortest way in this app has — and it is the only one
     of these that costs a credit, so the card has to say so before it is
     pressed rather than in a receipt afterwards. */
  /* By its id, not by its words: the label becomes "Press to stop" while it
     records, so a locator that matched on the text lost the card at the exact
     moment it was meant to be watching it. */
  const talkCard = room.locator('button[data-card="talk-traffic"]');
  check('there are cards you talk to as well', (await talkCard.count()) === 1);
  check('and the price is on the screen before anything is pressed',
    /Costs \d+ credits/.test(await says()), 'the price');
  check('with what it does said, and that the recording is not kept',
    (await says()).includes('is not kept'));

  await talkCard.click();
  await p.waitForTimeout(1200);
  check('pressing one starts recording', (await talkCard.getAttribute('aria-pressed')) === 'true');
  check('and it says how to stop', (await says()).includes('Press to stop'));
  check('and counts down, so nobody talks into a card that stopped',
    /\d+s/.test((await talkCard.innerText()) ?? ''), (await talkCard.innerText())?.split('\n')[0]);

  /* Long enough to be a sentence. Under two seconds the card throws the clip
     away rather than spending a credit to be told nothing was said, and the
     first version of this stopped after one — which reported the whole chain
     broken while the guard was doing its job. */
  await p.waitForTimeout(3000);
  await talkCard.click();
  for (let waited = 0; waited < 40 && !fromSaid; waited += 1) await p.waitForTimeout(300);
  check('pressing it again sends the recording to be read', Boolean(transcribed) && transcribed > 100,
    `${transcribed} bytes`);
  check('and what was said goes on to be turned into a song',
    (fromSaid?.said ?? '').includes('verkeer by die brug'), (fromSaid?.said ?? '').slice(0, 40));
  /* The card's own instruction, which no screen ever shows. Same assertion as
     the picture cards, and the same reason: a card that sends no idea is the
     blank box with a recording attached. */
  check('with the card’s own instruction, which no screen ever shows',
    (fromSaid?.idea ?? '').length > 60, `${(fromSaid?.idea ?? '').length} characters`);
  await p.waitForTimeout(900);
  check('and the song fills the room in',
    (await room.locator('input:visible').first().inputValue()) === 'Die brug om sewe');
  check('and it says what it understood, before a generation is spent',
    (await says()).includes('an hour late'),
    (await says()).includes('It saw') ? 'the line is there with other words' : 'no “it saw” line at all');

  /* ── The wand ───────────────────────────────────────────────────────
 
     One press that fills the card in. The whole point is that it is one
     press: the panel underneath already offers four options to choose
     between, which is the right shape for somebody deciding and the wrong
     one for somebody who has run out of decisions. */
  const wands = room.locator('button[aria-label="Write the next part for me"]');
  check('the words card carries a wand', (await wands.count()) === 1);
  const wordsBefore = await room.locator('textarea[placeholder*="Verse 1"]').inputValue();
  check('and there are already words in the box to protect', wordsBefore.length > 20);
  await wands.first().click();
  for (let waited = 0; waited < 30 && !waved; waited += 1) await p.waitForTimeout(300);
  check('pressing it asks the songwriter to continue', waved?.mode === 'continue', JSON.stringify(waved?.mode));
  /* Against what is actually in the box, not against a line typed earlier in
     this file. The prompt card above replaces the words, so a hard-coded
     "Karoo" reported the wand broken when what had changed was the fixture. */
  check('and sends what is already written, so it does not start over',
    (waved?.lyrics ?? '').includes(wordsBefore.split('\n')[1] ?? wordsBefore.slice(0, 20)),
    (waved?.lyrics ?? '').slice(0, 40));
  await p.waitForTimeout(700);
  const wordsAfter = await room.locator('textarea[placeholder*="Verse 1"]').inputValue();
  check('what comes back lands in the box', wordsAfter.includes('En die pad vat my huis toe'));
  /* The assertion this exists for. A wand that overwrote a verse somebody had
     typed would be pressed exactly once, by everybody, and never again. */
  check('added to what was typed, not over it',
    wordsAfter.startsWith(wordsBefore.trimEnd()),
    `${wordsBefore.length} characters became ${wordsAfter.length}`);

  waved = null;
  const styleWand = room.locator('button[aria-label="Work the style out from the words"]');
  check('the sound card carries one too', (await styleWand.count()) === 1);
  /* Two words typed by hand first. Written without them once and the "beside
     whatever was there" half passed because there was nothing there — the
     same way the link bar's version of this assertion passed for the wrong
     reason before it was fixed. */
  await room.locator('textarea').nth(1).fill('amapiano, log drum');
  await p.waitForTimeout(300);
  const wandStyleBefore = await room.locator('textarea').nth(1).inputValue();
  await styleWand.first().click();
  for (let waited = 0; waited < 30 && !waved; waited += 1) await p.waitForTimeout(300);
  check('and it asks for a style rather than for words', waved?.mode === 'style');
  await p.waitForTimeout(700);
  const wandStyleAfter = await room.locator('textarea').nth(1).inputValue();
  check('the style lands beside the two words that were typed by hand',
    wandStyleBefore === 'amapiano, log drum'
      && wandStyleAfter.includes('upright bass')
      && wandStyleAfter.includes('amapiano')
      && wandStyleAfter.includes('log drum'),
    `was "${wandStyleBefore}", now "${wandStyleAfter.slice(0, 60)}"`);

  /* ── The link bar ───────────────────────────────────────────────────
 
     "is dit moontlik om 'n link bar ook in te sit, waar jy dan na 'n youtube
      liedjie ens luister, sodat jy die styl daar op tel."
 
     What it does is read the song's *name* off the site's own oEmbed endpoint
     — it does not listen to it, and it must not claim to. That sentence is
     asserted here rather than left to a code review, because it is the whole
     difference between an honest feature and one that gets blamed for being
     wrong about a cover version. */
  const linkBar = room.locator('input[type="url"]');
  check('there is a bar to paste a song link into', (await linkBar.count()) === 1);
  check('and it says it reads the name rather than listening to it',
    (await says()).includes('does not listen to it'));
  /* Two words typed by hand first, so the "it does not replace what is
     there" assertion below has something to lose. It was written against an
     empty box and passed for that reason rather than for the right one. */
  await room.locator('textarea').nth(1).fill('kwaito, heavy bass');
  await p.waitForTimeout(300);
  const styleBefore = await room.locator('textarea').nth(1).inputValue();
  await linkBar.first().fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await room.locator('button[aria-label="Read the style off it"]').first().click();
  for (let waited = 0; waited < 30 && !linked; waited += 1) await p.waitForTimeout(300);
  check('pressing it sends the link', linked?.link === 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    JSON.stringify(linked));
  await p.waitForTimeout(700);
  const styleAfter = await room.locator('textarea').nth(1).inputValue();
  check('and the style it comes back with lands in the style box',
    styleAfter.includes('concertina') && styleAfter.length > styleBefore.length,
    styleAfter.slice(0, 80));
  /* Added, never replacing. Somebody who typed their own two words and then
     pointed at a song should still have their two words. */
  check('without throwing away the two words that were typed by hand',
    styleBefore === 'kwaito, heavy bass' && styleAfter.includes('kwaito') && styleAfter.includes('heavy bass'),
    `was "${styleBefore}", now "${styleAfter.slice(0, 60)}"`);
  check('and says whether it actually knew the song',
    (await says()).includes('recognised'));

  const startsButton = room.locator('button').filter({ hasText: /^Give me a song to start from$/ });
  check('the room offers a song to start from', (await startsButton.count()) === 1);
  await startsButton.first().click();
  await p.waitForTimeout(600);
  check('and says they are not AI', (await says()).includes('not by a model'));
  const pick = room.locator('button').filter({ hasText: /BPM$/ });
  check('with real starting points on it', (await pick.count()) >= 4, `${await pick.count()} shown`);
  /* The one it actually pressed, so the assertion can compare rather than
     shrug. "The title is not empty" passed while pressing a starting point
     filled in everything except the name of the song. */
  const pressed = ((await pick.first().innerText()) ?? '').split('\n')[0].trim();
  await pick.first().click();
  await p.waitForTimeout(600);
  const title = await room.locator('input:visible').first().inputValue();
  const words = await room.locator('textarea').first().inputValue();
  check('pressing one fills the room in — its title, not just its words',
    title === pressed && words.includes('[Verse]'),
    `pressed "${pressed}", box says "${title}"`);
  const styleBox = await room.locator('textarea').nth(1).inputValue();
  check('including a style the engine can work with',
    styleBox.split(',').length >= 3, styleBox.slice(0, 60));

} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:makeroom — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:makeroom — the room asks how long, says when nobody will sing, and sends the words.');
