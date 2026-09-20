/**
 * When something refuses, does the person see a sentence — in their language?
 *
 * ── The two halves of one fault ──────────────────────────────────────────
 *
 * 19 September 2026, Carli photographed Make a song with this where four
 * written ideas belong:
 *
 *     400 {"type":"error","error":{"type":"invalid_request_error","message":
 *     "Your credit balance is too low..."},"request_id":"req_011CfCoJ..."
 *
 * The fix had a server half and a client half. `check:aifault` holds the
 * server half: no route may put a supplier's own words in a body. This holds
 * the client half, which nothing else does — that the room turns a refusal
 * CODE into our own sentence, in the language being read, instead of
 * printing whatever the server happened to send.
 *
 * ── Why this file was rewritten, 20 September 2026 ───────────────────────
 *
 * It existed, it did all of this, and it printed the answer:
 *
 *     console.log(`${name}: says something → ${said}`);
 *
 * Exit 0 either way, and nothing ran it. Found by the rule in
 * `check:everycheck` that a file filed as a tool may not contain assertions
 * — the same morning as `ads-af`, for the same reason, which is two in one
 * day and the reason that rule now exists.
 *
 * It also went to port 3000 and assumed a server. It starts its own.
 *
 * ── What is stubbed, and what is not ─────────────────────────────────────
 *
 * The API is answered with the shapes our own routes really emit now —
 * `{ error, message }` with a code from `aifault` — rather than with a
 * guess. The point is not whether a 503 renders; it is whether
 * `refusalText` reads the CODE. A room that prints the server's English
 * sentence passes a "does it say something" test and fails the person
 * reading it in Afrikaans, which is exactly what §W was about.
 */
import { spawn } from 'node:child_process';
import { enter, studio, unfold } from './enter.mjs';

const PORT = 3322;
const HERE = `http://localhost:${PORT}`;
const problems = [];
const check = (what, ok, detail = '') => {
  console.log(`  ${ok ? 'ok ' : 'NOT'}  ${what}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${what}${detail ? ` (${detail})` : ''}`);
};

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', String(PORT)], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`${HERE}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  /* Afrikaans, because that is where this fails and English does not: our
     own words for a code exist in both languages, and the server's sentence
     exists only in English. A room that prints the server's sentence looks
     perfect in English. */
  const opened = await enter({ at: HERE, lang: 'af' });
  browser = opened.browser;
  const page = opened.page;

  /* The body a route really sends now. `no_credit` is the one she hit: an
     empty model account, which arrives from the supplier as a 400 that reads
     like a malformed request. The English sentence is deliberately here —
     it is what the room must NOT show an Afrikaans reader. */
  const ENGLISH_FROM_THE_SERVER =
    'The writing help is switched off right now. Nothing you did caused it and nothing has been charged.';
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.continue();
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'no_credit', message: ENGLISH_FROM_THE_SERVER }),
    });
  });

  const room = await studio(page);
  /* Named in the language the run is in, and each room matched only by its
     own name. The first version asked for `^Make a song|^Advertensies` in an
     AFRIKAANS run: the song room is "Maak 'n liedjie" there, so the first
     case matched the second room, went to Adverts, and reported the song
     room's writing button as missing. A room matched by a name it does not
     have is a probe testing the wrong screen and saying so about the right
     one. */
  const CASES = [
    { name: 'Make a song', room: /^Maak .n liedjie/, button: /Skryf die volgende stuk/ },
    { name: 'Adverts', room: /^Advertensies/, button: /Skryf die advertensies/ },
  ];

  for (const { name, room: where, button } of CASES) {
    const door = room.locator('button').filter({ hasText: where }).first();
    check(`${name}: the room is reachable by its Afrikaans name`, (await door.count()) === 1);
    if (!(await door.count())) continue;
    await door.click();
    await page.waitForTimeout(1200);
    /* Every room opens as its own table of contents, so the button that asks
       for writing is inside a card nobody has opened. Unfolded here for the
       same reason `makesong` does it: a probe that reaches its room without
       `toRoom` does not get the unfolding that lives there. */
    await unfold(page);
    await page.waitForTimeout(600);
    if (/Advert/i.test(name)) {
      const what = room.locator('#ads-what');
      if (await what.count()) {
        await what.fill('n Bakkery in Bellville, suurdeeg, ses dae oop.');
        await page.waitForTimeout(300);
      }
    }
    const target = room.locator('button').filter({ hasText: button }).first();
    check(`${name}: the button that asks for writing is there`, (await target.count()) === 1);
    if (!(await target.count())) continue;

    /* What the press ADDED, not what is on the screen.

       The first version searched the whole room, which is a rail, a room
       list and a desk — thousands of characters that contain the word "nie"
       and a dozen other things this was matching against. It passed, and it
       would have passed with no refusal on the screen at all. The difference
       between before and after is the only text the press is responsible
       for. */
    const before = ((await room.innerText()) ?? '').replace(/\s+/g, ' ');
    await target.click({ timeout: 5000 }).catch(() => undefined);
    await page.waitForTimeout(1800);
    const whole = ((await room.innerText()) ?? '').replace(/\s+/g, ' ');
    const after = whole.split(' ').filter((word) => !before.includes(word)).join(' ')
      || whole.replace(before, '').trim();

    /* 1. It says something at all. A refusal with nothing on the screen is
          indistinguishable from a button that does nothing. */
    check(
      `  ${name}: the room says something`,
      /afgeskakel|kon nie|probeer weer|niks is gehef/i.test(after),
      after.slice(0, 120),
    );

    /* 2. In Afrikaans — the half that "does it say something" cannot see.
          This is the assertion the old version of this file was one line
          away from making and never did. */
    check(
      `  ${name}: and says it in Afrikaans, not in the server's English`,
      !after.includes(ENGLISH_FROM_THE_SERVER),
      after.includes(ENGLISH_FROM_THE_SERVER) ? 'the server sentence is on the screen as it was sent' : '',
    );

    /* 3. And never the plumbing. A code, a status line, a JSON brace or a
          request id on a member's screen is the fault in the photograph. */
    const plumbing = ['no_credit', 'request_id', '"error"', '{"', 'invalid_request_error', '503']
      .filter((one) => after.includes(one));
    check(
      `  ${name}: and never shows the plumbing`,
      plumbing.length === 0,
      plumbing.join(', '),
    );
  }
} finally {
  if (browser) await browser.close();
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:refusals — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:refusals — a refusal is a sentence, in the reader’s language, with none of the plumbing on it.');
