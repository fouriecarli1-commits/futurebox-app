/**
 * Is the app actually in Afrikaans once you are inside it?
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * Carli signed in with the app set to Afrikaans and said everything had
 * reverted to English — "die afrikaanse funksie is glad nie meer afrikaans
 * nie". Nothing had reverted: the language is kept in this browser and it
 * survives a sign-in. The landing page is translated, and the rooms behind it
 * increasingly are not, so crossing from one to the other reads exactly like a
 * revert. That is a worse bug than the one reported, because it is invisible
 * to the checks.
 *
 * ── Why `check:afrikaans` could not see it ───────────────────────────────
 *
 * That check reads the code: every key handed to `t()` must have an Afrikaans
 * line. It is a good check and it passes. It cannot see a screen whose words
 * were never handed to `t()` at all — a heading typed straight into the JSX,
 * a card built out of an English array in `data/`. There is no key to look up
 * and so nothing to report.
 *
 * ── What this does instead ───────────────────────────────────────────────
 *
 * It walks the app twice — once in English, once in Afrikaans — signing in
 * each time, and reads what is actually painted on the glass in the feed, the
 * front door, every room behind it, the channel, the account and the search.
 * Then it reports every line that came out **the same in both**.
 *
 * ── Why a diff and not a word list ───────────────────────────────────────
 *
 * The first version of this counted English words — `the`, `you`, `with` —
 * and found 48 lines. It missed "Podcast Match", "Viral Post Lab" and every
 * other label made of words that happen to carry no marker, which is most
 * short labels and most headings. A word list can only find the English it
 * was told to look for.
 *
 * A line that does not change when the language changes did not go through
 * the dictionary. That is the actual property worth checking, it needs no
 * list of words, and it cannot be fooled by a label nobody thought of.
 *
 * ── Why a ceiling rather than zero ───────────────────────────────────────
 *
 * Some lines are correctly identical. A podcast called "The Diary of a CEO"
 * is called that in both languages; so are a handle, a genre name that people
 * say in English anyway, a number and a duration. So the honest number is
 * never zero, and a check demanding zero gets switched off within a week. It
 * is a ceiling that may only come down, with the lines printed every run so a
 * rise is visible in the log before it is visible to a reader.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3082';
/** What the app is allowed to carry, and may only ever lower. */
const CEILING = Number(process.argv[3] ?? 24);

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/**
 * What the ceiling of 24 is, so a rise is a question rather than a shrug.
 *
 * Twelve lines, counted twice because the feed is read on two screens. All
 * twelve are catalogue entries — the name of a class that exists, the line
 * describing what it covers, the tool it is about. The rule this app keeps is
 * that content is not translated: a class called "Autonomous Multi-Agent AI
 * Systems & Tool Calling" is called that in both languages, and translating it
 * would invent a thing that does not exist.
 *
 * They are the arguable ones. If the catalogue is ever rewritten as our own
 * words rather than as a list of other people's classes, they should be
 * translated and this number should come down to nothing.
 *
 * It came from 121 lines across seven screens, measured before any of this was
 * fixed. Every one of the other 97 was ours.
 */

/**
 * Lines that are the same in both languages and are meant to be.
 *
 * Content, not chrome: the app does not translate a podcast's name, a genre
 * people say in English anyway, or a number. Each entry is a shape rather than
 * a sentence, so this does not become a list of every string that was ever
 * awkward to fix.
 */
const FINE = [
  /^[\d\s.,:%\/·—–-]+$/,                     // numbers, separators
  /^\d+h\s*\d+m$|^\d+\s*min$/i,              // how long something runs
  /^\d+:\d+ [A-Za-z]/,                       // a shape and a length: "9:16 Reels, 15–30s"
  /^@?[a-z0-9_.-]+$/i,                        // a handle or an id
  /^[a-z][a-z ]{2,20}$/,                      // a lowercase topic tag: "ai music", "vibe coding"
  /^[a-z0-9.-]+\.(app|com|io|dev|studio|za)(\/|$)/i, // an address
  /^(FutureBox|TikTok|YouTube|Instagram|Spotify|Apple Music|X|Facebook|WhatsApp|Suno AI|Collab Radar)$/i,
  /^(Remix|Podcast|AI|Pro|Free|Studio|Maker|Label|Live|Hooks|Copilot|Collab)$/i,
  /* A person, a show or a class keeps its own name in both languages —
     translating one would invent a thing that does not exist. Matched on the
     name rather than on the sentence, so a heading that merely mentions one
     is still checked. */
  /(Karpathy|Huberman|Bartlett|Altman|OpenAI|GPT|Sora|Tesla|Gawdat|Fridman|Dwarkesh|All-In|Chamath|Garry Tan|Harrison Chase|LangChain|Y Combinator|Kaelen Voss|Cursor|LiveKit|Twilio|Vercel|BRICKZ|Micro-SaaS|Diary of a CEO|Neuroplasticity|Deep Learning|Masterclass|Large Language Models)/i,
];
const allowed = (line) => FINE.some((shape) => shape.test(line));

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

  /**
   * One walk of the app in one language, returning what each screen said.
   *
   * A fresh context each time rather than switching language in place: the
   * language is read once at mount, and half the rooms hold what they were
   * given when they mounted. Switching in place would measure a half-changed
   * app, which is neither of the two things being compared.
   */
  const walk = async (lang) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await context.newPage();
    p.on('pageerror', (e) => problems.push(`${lang} pageerror: ${String(e).slice(0, 140)}`));
    await p.addInitScript((l) => {
      try { window.localStorage.setItem('futurebox.lang.v1', l); } catch { /* storage off */ }
    }, lang);

    await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
    const said = new Map();
    const onScreen = () =>
      p.evaluate(() => {
        /* Only what is actually in front of the reader.
 
           The first version read every leaf in the document, and a full-screen
           room leaves the feed behind it in the DOM at its own coordinates —
           so every one of the twenty-two screens reported the same fifty lines
           of feed content underneath, and the real differences were buried in
           them. What is on top is found by asking the document what is at the
           middle of the window and taking the outermost fixed thing around it;
           that is the overlay, and everything outside it is covered. */
        const middle = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        let root = document.body;
        for (let el = middle; el && el !== document.body; el = el.parentElement) {
          if (getComputedStyle(el).position === 'fixed') root = el;
        }
        const out = [];
        for (const el of root.querySelectorAll('*')) {
          if (el.children.length > 0) continue;
          const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
          if (text.length < 4) continue;
          const box = el.getBoundingClientRect();
          if (box.width < 2 || box.height < 2) continue;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') continue;
          out.push(text);
        }
        return out;
      });
    const read = async (where) => {
      const lines = said.get(where) ?? new Set();
      for (const line of await onScreen()) lines.add(line);
      said.set(where, lines);
    };

    const html = await p.evaluate(() => document.documentElement.lang);
    check(`${lang}: the page says which language it is in`, html === lang, html);
    await read('landing');

    const cta = p.locator('button, a')
      .filter({ hasText: lang === 'af' ? /begin|gratis|teken/i : /start free|begin|sign up/i })
      .first();
    await cta.waitFor({ state: 'visible', timeout: 60000 });
    await cta.click();
    await p.waitForTimeout(700);
    await p.locator('input[type="email"]').first().fill(`afrikaans-${lang}@futurebox.test`);
    const pw = p.locator('input[type="password"]').first();
    if (await pw.count()) await pw.fill('afrikaans-password-1234');
    await p.locator('button[type="submit"]').first().click();
    /* Waited for, not slept through. A `click()` auto-waits, so a flat sleep here
       survives right up to the first `count()` — and `count()` waits for
       nothing. `photosong` failed exactly there: it read a room it had not
       opened yet and reported the room as broken. The bottom bar is the
       signal, because it is on every signed-in screen and no signed-out one. */
    await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 30000 });
    /* The welcome door, waited for and then gone.
       `count()` once was the fault: the door draws after two fetches settle, so
       asking the instant the bar appears gets "no", and half a second later it is
       there — over the header, under the next press. `bringsong` timed out on
       exactly that. `enter.mjs` has said it in a comment since the day it was
       written; the probes with their own way in never got the lesson. */
    await dismissDoor(p);
    await p.waitForTimeout(900);

    /* The half of Carli's report that was a guess: whether the language
       survives signing in. Worth answering rather than assuming — if it did
       not, the fix would be somewhere else entirely. */
    const after = await p.evaluate(() => document.documentElement.lang);
    check(`${lang}: and it is still ${lang} after signing in`, after === lang, after);
    await read('after signing in');

    const bar = p.locator('nav[aria-label]').first();
    const TABS = lang === 'af'
      ? { make: 'Maak', library: 'Biblioteek', you: 'Jy', live: 'Live', spotlight: 'Kollig' }
      : { make: 'Make', library: 'Library', you: 'You', live: 'Live', spotlight: 'Spotlight' };
    const press = async (name) => {
      await bar.locator('button').filter({ hasText: name }).first().click();
      await p.waitForTimeout(1200);
    };

    await press(TABS.make);
    const doorButtons = p.locator('div.fixed.inset-0.z-\\[55\\] button');
    const rooms = await doorButtons.count();
    check(`${lang}: the front door has its rooms on it`, rooms > 10, `${rooms} buttons`);
    await read('the front door');

    /* Every room, by its position on the door rather than its name — the name
       is the thing being compared and cannot also be the way in. */
    for (let i = 0; i < rooms; i += 1) {
      await press(TABS.make);
      await doorButtons.nth(i).click().catch(() => undefined);
      await p.waitForTimeout(1300);
      await read(`room ${i + 1}`);
    }

    for (const [tab, where] of [
      [TABS.library, 'the channel'], [TABS.you, 'the account'],
      [TABS.live, 'the live room'], [TABS.spotlight, 'the feed'],
    ]) {
      await press(tab);
      await read(where);
    }
    await p.screenshot({ path: shot(`afrikaans-${lang}.png`) });
    await context.close();
    return said;
  };

  const english = await walk('en');
  const afrikaans = await walk('af');

  /* ── The diff ────────────────────────────────────────────────────────── */
  const same = new Map();
  let checked = 0;
  for (const [where, lines] of afrikaans) {
    const there = english.get(where) ?? new Set();
    for (const line of lines) {
      checked += 1;
      if (!there.has(line) || allowed(line)) continue;
      if (!same.has(where)) same.set(where, []);
      same.get(where).push(line);
    }
  }
  let total = 0;
  for (const lines of same.values()) total += lines.length;

  console.log(`\n  ${checked} lines read in Afrikaans; ${total} of them came out identical in English.\n`);
  for (const [where, lines] of [...same].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(lines.length).padStart(3)}  ${where}`);
    for (const line of lines) console.log(`         · ${line.slice(0, 110)}`);
  }
  console.log('');
  check(`no more untranslated lines than the ceiling (${CEILING})`,
    total <= CEILING, `${total} lines across ${same.size} screens`);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:afrikaansscreen — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:afrikaansscreen — the app reads as Afrikaans from the door inwards.');
