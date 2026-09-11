/**
 * The music quiz, pressed in a real browser.
 *
 * ── Why the source check is not enough ───────────────────────────────────
 *
 * `check:quiz` reads the question bank and the component's source. It proves
 * thirty questions are well formed and that the reveal button is written as
 * disabled. It cannot prove any of the things that actually decide whether
 * this feature exists for somebody:
 *
 *   · that the card renders at all at the bottom of the studio's home page,
 *   · that four lettered boxes appear,
 *   · that the answer is genuinely unreachable before one is ticked,
 *   · that ticking then revealing shows the EXPLANATION and not just a mark,
 *   · that "another question" gives a different one rather than the same.
 *
 * The card picks its question in an effect after mount and reads
 * localStorage. A component that throws there renders nothing and the page
 * around it is unaffected — which is exactly the shape of a feature that is
 * "shipped" and invisible. This app has done that before.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor, studio, toRoom } from './enter.mjs';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3112';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

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

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('quiz@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('quiz-password-1234');
  await p.locator('button[type="submit"]').first().click();
  /* Waited for, not slept through. A fixed pause is how a probe reports a
     working app as broken on a machine that was busy for a second — the
     bottom bar is on every signed-in screen and no signed-out one, so it is
     the honest signal that the app is actually there. `check:probes` holds
     every probe to this, and caught this file trying to sleep 2600ms. */
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await dismissDoor(p);
  await p.waitForTimeout(900);

  /* Into the studio, which opens on its front door.

     Third home for this card, and hers each time. It was on the landing
     page; she said it made no sense in Spotlight and asked for it inside
     Make; then, 11 September 2026: "hoekom kan die music quiz nie op die
     home page onder wees van die creative studio nie?"

     No reason at all, and it is better than where I had put it. This door
     IS the creative studio's home page — every signed-in session lands on
     it, whichever room the person is heading for — so the question is now
     put to everybody who opens the app, rather than only to somebody who
     had already chosen to write a song, which is the smallest possible
     audience for a thing meant to teach.

     Signing in above shuts the door behind it, so pressing Studio in the
     header is what brings it back. That is also what a person does. */
  await studio(p);
  await p.waitForTimeout(1200);

  const door = p.locator('div.fixed.inset-0.z-\\[55\\]').first();
  await door.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  check('the studio opens on its home page', await door.isVisible().catch(() => false),
    'no door — every check below would be measuring the wrong screen');

  /** Back out of a room to the door, the way the app offers it. */
  const toDoor = async () => {
    const back = p.locator('button').filter({ hasText: /All rooms|Alle kamers/ }).first();
    if (await back.count()) {
      await back.click();
      await door.locator('button').first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(600);
    }
  };

  /* The card is a radiogroup, which is the one thing on the screen that is
     one — so it is found by what it IS rather than by a class name that a
     restyle would break. Scoped to the door rather than to the page,
     because "somewhere on screen" is the assertion that passed happily
     while the card was in the wrong room. */
  const group = door.locator('[role="radiogroup"]').first();
  await group.waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
  check('the quiz renders on the studio home page', (await group.count()) > 0,
    'the card picks its question in an effect — one that throws renders nothing at all');

  /* "Heel onder" was the ask, both times she asked for it. Measured rather
     than read off the source: `check:quiz` proves nothing is written after
     it in page.tsx, which is a different claim from nothing being drawn
     below it. A quiz sitting between the greeting and the room buttons
     satisfies the source check and still delays the button people came to
     press. */
  if ((await group.count()) > 0) {
    const where = await door.evaluate((root) => {
      const card = root.querySelector('[role="radiogroup"]');
      /* Up to the card's own slot on the page, so the reveal and the
         "another question" button — siblings of the radiogroup, not
         children of it — are not counted as things drawn below it. */
      let wrap = card;
      while (wrap.parentElement && wrap.parentElement !== root.firstElementChild) wrap = wrap.parentElement;
      let lowest = 0;
      for (const b of Array.from(root.querySelectorAll('button'))) {
        if (wrap.contains(b)) continue;
        lowest = Math.max(lowest, b.getBoundingClientRect().bottom);
      }
      return { top: card.getBoundingClientRect().top, lowest };
    });
    check('  under the rooms rather than above them', where.top >= where.lowest - 4,
      `the card starts at ${Math.round(where.top)} and the last room button ends at ${Math.round(where.lowest)}`);
  }

  /* And ONLY there. Every earlier version of this card was in one place too
     many — on Spotlight, then in a room — and a card that renders in two
     places passes every assertion below while being exactly the fault she
     reported. */
  await toRoom(p, 'Make a song');
  await p.waitForTimeout(1400);
  check('and not inside the rooms, where it used to be',
    (await p.locator('[role="radiogroup"]').count()) === 0,
    `${await p.locator('[role="radiogroup"]').count()} found in Make`);

  await toRoom(p, 'Channel');
  await p.waitForTimeout(1200);
  check('  nor in the rooms that are for reading rather than making',
    (await p.locator('[role="radiogroup"]').count()) === 0,
    `${await p.locator('[role="radiogroup"]').count()} found in the channel`);

  await toDoor();
  await p.waitForTimeout(600);

  if ((await group.count()) > 0) {
    await group.scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    await p.screenshot({ path: shot('quiz-asked.png') });

    const options = group.locator('button[role="radio"]');
    check('with four options', (await options.count()) === 4, String(await options.count()));

    const letters = (await options.allInnerTexts()).map((one) => one.trim()[0]);
    check('lettered A, B, C, D as she asked', letters.join('') === 'ABCD', letters.join(''));

    /* The whole design rests on this one. Reading the answer without having
       guessed is the version that teaches nothing, and a button that can be
       pressed is a button that gets pressed. */
    const reveal = door.locator('button').filter({ hasText: /Show me the answer|Tick an answer first|Wys my die antwoord|Merk eers/ }).first();
    check('and the answer cannot be reached before ticking',
      await reveal.isDisabled(), 'the reveal is live with nothing chosen');

    await options.nth(1).click();
    await p.waitForTimeout(300);
    check('  ticking one turns the reveal on', !(await reveal.isDisabled()), '');

    const before = (await group.innerText()).replace(/\s+/g, ' ');
    await reveal.click();
    await p.waitForTimeout(500);
    await p.screenshot({ path: shot('quiz-answered.png') });

    /* An explanation, not a mark. This is the feature; the tick boxes are
       only how somebody is made to commit before reading it. */
    const card = door.locator('[role="radiogroup"]').first().locator('xpath=..');
    const said = (await card.innerText()).replace(/\s+/g, ' ');
    check('the answer comes out at the end', /That is it\.|Not that one\.|Dis dit\.|Nie daai een nie\./.test(said),
      said.slice(0, 90));
    check('  and it explains itself rather than only marking',
      said.length > before.length + 80,
      `${said.length} against ${before.length} — an explanation is the point of the card`);

    /* ── Readable, measured rather than eyeballed ─────────────────────
 
       `check:contrast` walks six rooms and the creative page is not one of
       them, so this card is not covered by it. A grey sub-line on a white
       card is exactly the shape of thing that reads fine to whoever wrote it
       and not at all to somebody in the sun, so it is measured here, on the
       same AA rule and with the same maths as contrast.mjs. */
    const dim = await card.evaluate((root) => {
      const lum = (rgb) => {
        const [r, g, b] = rgb.map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const opaque = (el) => {
        let node = el;
        while (node) {
          const parts = (getComputedStyle(node).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
          if (parts.length >= 3 && (parts.length < 4 || parts[3] > 0.85)) return parts.slice(0, 3);
          node = node.parentElement;
        }
        return [255, 255, 255];
      };
      const bad = [];
      for (const el of Array.from(root.querySelectorAll('*'))) {
        const text = Array.from(el.childNodes)
          .filter((n) => n.nodeType === 3 && n.textContent.trim())
          .map((n) => n.textContent.trim()).join(' ');
        if (!text) continue;
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || Number(style.opacity) < 0.5) continue;
        const fg = parse(style.color);
        if (fg.length < 3) continue;
        const a = lum(fg), b = lum(opaque(el));
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const size = parseFloat(style.fontSize);
        const need = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5;
        if (ratio < need) bad.push(`${Math.round(ratio * 100) / 100}:1 "${text.slice(0, 30)}"`);
      }
      return bad;
    });
    check('  and every word on it is readable', dim.length === 0, dim.slice(0, 3).join('; '));

    const asked = () => card.locator('p.font-semibold').first().innerText();
    const first = await asked();
    const another = door.locator('button').filter({ hasText: /Another question|Nog ’n vraag/ }).first();
    check('  and there is a way to another question', (await another.count()) > 0, '');
    if (await another.count()) {
      await another.click();
      await p.waitForTimeout(600);
      check('which is a different question', (await asked()) !== first,
        'sixty-odd in the bank and the same one twice in a row');
    }
  }
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nOn the studio home page, under the rooms: four lettered boxes, the answer locked until one is ticked, and an explanation when it opens.');
