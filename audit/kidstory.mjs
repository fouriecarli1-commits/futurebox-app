/**
 * The kids story engine, used the way a child uses it.
 *
 * The owner, 19 October 2026: *"Die story mode moet 'n ander AI engine
 * gebruik, die voorlesing moet so mooi wees soos die podcast. Dalk 'n paar
 * avatar stemme opstel, en storie generasie moet meer motion en meer visual
 * wees. Dit moet regtig 'n kind se breim tickle."*
 *
 * The engines are stand-ins here — no keys exist on this machine — so what
 * is measured is everything the room does with what they send: the
 * storyteller chosen is the one asked for, the price is on the button, every
 * page is drawn (the later ones from the first, so they match), every page is
 * read in the story voices with its question at the end, and the book plays
 * — moving, sparkling, the speaker shown, the words lit, the question asked,
 * the page turned. Then the same room with the engine off still makes a book.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3377');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/** A WAV of a quiet tone, `seconds` long, as the reading. */
function wav(seconds) {
  const rate = 8000;
  const samples = Math.round(rate * seconds);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1) buffer.writeInt16LE(Math.round(Math.sin(i / 8) * 600), 44 + i * 2);
  return buffer;
}

const MOTIONS = ['zoom-in', 'pan-left', 'float', 'pan-right', 'tilt', 'zoom-out'];
const SPARKLES = ['stars', 'bubbles', 'fireflies', 'leaves', 'snow', 'confetti'];
const BOOK = {
  title: 'Mia and the Moon Muffin',
  cast: [
    { name: 'Mia', voice: 'pip', looks: 'a small grey mouse with a yellow scarf' },
    { name: 'Bruno', voice: 'bruno', looks: 'a big brown bear with a red hat' },
  ],
  pages: MOTIONS.map((motion, i) => ({
    lines: [
      { who: 'fairy', name: '', text: `Page ${i + 1}: Mia the mouse looked up at the big round moon. WHOOSH went the wind!` },
      { who: 'pip', name: 'Mia', text: '[excited] Bruno, look! The moon is a muffin!' },
      { who: 'bruno', name: 'Bruno', text: '[laughs] Then let us go and have a nibble.' },
    ],
    scene: `Mia the mouse and Bruno the bear under a moon shaped like a muffin, ${i + 3} stars in the sky`,
    motion,
    sparkle: SPARKLES[i],
    wonder: `Can you count the ${i + 3} stars?`,
  })),
};

const browser = await chromium.launch(launchOptions());

async function room(engine) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const thrown = [];
  page.on('pageerror', (error) => thrown.push(String(error).slice(0, 160)));
  const sent = { story: [], read: [], pictures: [] };
  await page.route('**/api/kids', (route) => route.fulfill({
    json: { open: true, allowance: 120, spent: 0, left: 120, minutes: null, secondsLeft: null, signedIn: true },
  }));
  await page.route('**/api/kids/story', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: engine } });
    sent.story.push(route.request().postDataJSON());
    return engine
      ? route.fulfill({ json: { story: BOOK, style: 'bright crayon picture book' } })
      : route.fulfill({ status: 503, json: { error: 'no_key', message: 'The story engine is not switched on, so the Story Maker writes this one itself.' } });
  });
  await page.route('**/api/kids/read', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { available: engine, samples: engine ? { owl: 'a', fairy: 'b', comet: 'c', ember: 'd' } : {} } });
    }
    sent.read.push(route.request().postDataJSON());
    return route.fulfill({ body: wav(1.6), headers: { 'Content-Type': 'audio/wav' } });
  });
  await page.route('**/api/google/picture**', async (route) => {
    sent.pictures.push({ url: route.request().url(), body: route.request().postDataJSON() });
    const png = await page.evaluate(async (n) => {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 240;
      const x = c.getContext('2d');
      x.fillStyle = `hsl(${n * 50}, 70%, 55%)`; x.fillRect(0, 0, 320, 240);
      const blob = await new Promise((done) => c.toBlob(done, 'image/png'));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, sent.pictures.length);
    await route.fulfill({ body: Buffer.from(png), headers: { 'Content-Type': 'image/png' } });
  });

  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.locator('[data-kidsroomdoor="story"]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-kidsworld]').first().click();
  for (let i = 0; i < 6 && (await page.locator('[data-kidsstorybuild]').count()) === 0; i += 1) {
    await page.locator('[data-kidsstorynext]').first().click();
    await page.waitForTimeout(250);
  }
  return { page, sent, thrown };
}

try {
  /* ── With the engine on ──────────────────────────────────────────────── */
  const { page, sent, thrown } = await room(true);
  check('four storytellers to choose from', (await page.locator('[data-kidsstoryteller]').count()) === 4);
  await page.locator('[data-kidsstoryteller="fairy"]').click();
  check('  and the one pressed is the one chosen',
    (await page.locator('[data-kidsstoryteller="fairy"]').getAttribute('aria-pressed')) === 'true');
  check('  and each can be heard first', (await page.locator('[data-kidsvoicesample]').count()) === 4);
  const price = await page.locator('[data-kidsstoryprice]').innerText().catch(() => '');
  check('the price is on the button', /\d+/.test(price), price);

  await page.locator('[data-kidsstorybuild]').click();
  check('pressing it shows the book being made', await page.locator('[data-kidsmaking]').isVisible().catch(() => false));
  await page.locator('[data-storyplayer]').waitFor({ timeout: 30000 });

  const asked = sent.story[0] ?? {};
  check('the engine is asked with the cards and the storyteller', asked.storyteller === 'fairy' && Boolean(asked.hero && asked.visual),
    JSON.stringify(asked));
  check('every page is drawn, on the storybook brake', sent.pictures.length === 6 && sent.pictures.every((one) => /book=1/.test(one.url)),
    `${sent.pictures.length}`);
  check('  the later pages from the first, so they match',
    sent.pictures.slice(1).every((one) => one.body?.from?.data) && !sent.pictures[0].body?.from);
  check('  and no page asks for words in the picture', sent.pictures.every((one) => /No words, letters or numbers/.test(one.body?.words ?? '')));
  check('every page is read in the story voices', sent.read.length === 6
    && sent.read.every((one) => one.lines?.some((line) => line.who === 'pip') && one.lines?.every((line) => !('voiceId' in line))),
    JSON.stringify(sent.read[0]).slice(0, 200));
  check('  with its question asked at the end, by the storyteller',
    sent.read.every((one, i) => {
      const last = one.lines?.[one.lines.length - 1];
      return last?.who === 'fairy' && last.text === BOOK.pages[i].wonder;
    }));

  check('the picture moves the way the page says', (await page.locator('[data-storymotion]').getAttribute('data-storymotion')) === 'zoom-in');
  check('  and something floats over it', (await page.locator('[data-storysparkle="stars"] span').count()) >= 8);
  const moving = await page.locator('[data-storymotion]').evaluate((el) => getComputedStyle(el).animationName);
  check('  really animated', /fb-story-zoom-in/.test(moving), moving);

  const box = await page.locator('[data-storypage]').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  check('a tap on the picture throws sparkles', (await page.locator('[data-storyburst]').count()) >= 1);

  await page.locator('[data-kidsreadtome]').click();
  await page.locator('[data-storyspeaker]').waitFor({ timeout: 4000 }).catch(() => undefined);
  const speakers = new Set();
  let lit = 0;
  let asks = false;
  for (let i = 0; i < 40; i += 1) {
    const who = await page.locator('[data-storyspeaker]').getAttribute('data-storyspeaker').catch(() => null);
    if (who) speakers.add(who);
    if (await page.locator('[data-storyword="on"]').count()) lit += 1;
    if (await page.locator('[data-storywonder]').count()) asks = true;
    if ((await page.locator('[data-storypage="1"]').count()) > 0) break;
    await page.waitForTimeout(150);
  }
  check('reading shows who is talking, voice by voice', speakers.has('fairy') && speakers.has('pip'), [...speakers].join(','));
  check('  and lights the words as they are said', lit >= 3, `${lit}`);
  check('  and asks the page’s question', asks);
  await page.locator('[data-storypage="1"]').waitFor({ timeout: 8000 }).catch(() => undefined);
  check('  and turns the page by itself', (await page.locator('[data-storypage="1"]').count()) === 1);
  check('  and the next picture moves its own way',
    (await page.locator('[data-storymotion]').getAttribute('data-storymotion').catch(() => '')) === 'pan-left');
  await page.locator('[data-kidsreadtome]').click();
  check('nothing threw', thrown.length === 0, thrown.join(' | '));
  await page.screenshot({ path: shot('kidstory.png') });
  await page.close();

  /* ── With the engine off: still a book ───────────────────────────────── */
  const off = await room(false);
  check('with the engine off, no price is promised', (await off.page.locator('[data-kidsstoryprice]').count()) === 0);
  await off.page.locator('[data-kidsstorybuild]').click();
  await off.page.locator('[data-kidsreader]').waitFor({ timeout: 15000 });
  check('  the Story Maker still makes its own book',
    (await off.page.locator('[data-kidspagetext]').innerText()).length > 20);
  check('  and draws nothing it would charge for', off.sent.pictures.length === 0 && off.sent.read.length === 0);
  check('  and nothing threw', off.thrown.length === 0, off.thrown.join(' | '));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:kidstorywalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:kidstorywalk — the storyteller chosen reads it, every page is drawn to match and read in voices with its question, and the book moves, sparkles, shows who is talking, lights the words and turns its own pages; with the engine off it is still a book.');
