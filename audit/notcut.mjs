/**
 * A name is never cut off.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * The channel header called itself "Your chan…" on a 390-pixel phone. Five
 * pixels short, on the shortest name the app can show — a real one loses
 * considerably more, and the one thing on that card that must not be guessed
 * at is whose channel it is. `Card` carries a comment about the same fault
 * in its own header ("A card whose name has been truncated to one letter is
 * a card with no name"), which was fixed by hand and never turned into a
 * rule. So it came back somewhere else.
 *
 * Nothing measured it. `audit/phone.mjs` measures whether the PAGE spills
 * sideways, which is a different question: a `truncate` never spills, it
 * eats the word instead and the layout stays perfect.
 *
 * ── The line between a name and a teaser ─────────────────────────────────
 *
 * Most clipped text in this app is deliberate. Every room's explanations
 * were moved behind a question mark, and what is left on the line is a
 * one-line teaser that is SUPPOSED to end in an ellipsis — there are forty
 * of those and they are all `text-xs` at weight 400.
 *
 * So the rule is drawn where the app itself draws it: **semibold or heavier,
 * at 14 pixels or more, is a name or a heading and must fit.** Lighter or
 * smaller is prose, and prose may be trimmed. That is a property of the
 * rendered element, not of a class name — a rule that reads a class passes a
 * class that has been renamed and stopped working.
 *
 * Both languages, because hers is the longer one and every string in this
 * app is two strings. "From a photo" fit and "Uit ’n foto" did not.
 *
 * ── And both SHAPES, because a phone was not the screen she was on ───────
 *
 * Carli, 10 and 11 October 2026: *"Kyk hoe sny alles af op die rekenaar se
 * skerm"*, and a day later, still: *"Die kamer met die afgesnyde woorde is
 * ook nog nie reg op die rekenaar se website nie."*
 *
 * This file was green through all of it, because every pass it made was at
 * 390 pixels. That is the fault she objects to most and she is right about
 * it: a check that is green because it measured the screen NEXT to the
 * broken one is worse than no check, because it is also an argument that
 * nothing is wrong.
 *
 * So it walks a desk as well, and the desk pass carries two rules the phone
 * pass cannot have:
 *
 * **Nothing is scrolled sideways.** The studio's work pane was sitting at
 * `scrollLeft: 12` — the width of its own scrollbar — so the first letter
 * of every line in every room was scrolled out of view. On screen it looks
 * exactly like something covering the text, which is why two attempts at
 * fixing it went at the navigation.
 *
 * **A short heading fits on one line.** "Photo Editor" was given a box 52
 * pixels wide by the buttons beside it and wrapped into "Photo" / "Editor",
 * each clipped. Nothing overflowed, no ellipsis appeared, so the rule above
 * could not see it. A heading of three words or fewer, on a 1512-pixel
 * screen, that cannot fit on one line was squeezed, not long.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';
import { ROOMS, ROOMS_AF } from './rooms.mjs';

const PORT = process.argv[2] || '3193';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** Clipped, and big and bold enough that being clipped is a fault. */
/**
 * Where to look.
 *
 * The room, the studio's front DOOR, and the tab bar — because the first
 * version of this scanned only the room, and Carli photographed the door with
 * "Sound trai…" and "Make a so…" on it. Eleven rooms, and the one screen whose
 * whole job is to name them was the one screen this did not read.
 *
 * The same shape as `rooms.mjs`'s own warning: a check can be wrong by
 * measuring a subset as easily as by measuring the wrong thing, and the subset
 * version is harder to see because nothing about the output looks partial.
 */
const WHERE = 'div.fixed.inset-0.z-50, div.fixed.inset-0.z-\\[55\\], nav[aria-label]';

const CUT = () => {
  const out = [];
  const roots = [...document.querySelectorAll('div.fixed.inset-0.z-50, div.fixed.inset-0.z-\\[55\\], nav[aria-label]')];
  const root = roots.length ? { querySelectorAll: (sel) => roots.flatMap((r) => [...r.querySelectorAll(sel)]) } : document.body;
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== 'ellipsis') continue;
    /* One pixel of slack: a sub-pixel font metric rounds the two apart on a
       line that is drawing perfectly. */
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    if (parseFloat(cs.fontSize) < 14) continue;
    if (Number(cs.fontWeight) < 600) continue;
    /* An input reports a scrollWidth against its placeholder, which is not
       a name and is not being cut off — it scrolls when you type in it. */
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') continue;
    out.push(`${(el.textContent || '').trim().slice(0, 34)} (${el.scrollWidth - el.clientWidth}px short)`);
  }
  return out;
};

/**
 * Panes that have been scrolled sideways, and short headings that wrapped.
 *
 * Desk only. A phone legitimately wraps a two-word heading and legitimately
 * scrolls a wide strip sideways; a 1512-pixel screen does neither by
 * design, so on a desk both are faults rather than choices.
 */
const SQUEEZED = () => {
  const out = [];

  for (const el of document.querySelectorAll('*')) {
    const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 4).join(' ') : '';
    if (el.scrollLeft > 0) {
      out.push(`${el.tagName}.${cls} is scrolled ${el.scrollLeft}px sideways, so its left edge is off screen`);
      continue;
    }
    /* ── Why the question is CAN it, not IS it ──────────────────────────
 
       The first version of this rule asked whether a pane was sitting at a
       non-zero `scrollLeft`, which is the state Carli was looking at. Put
       the original fault back and run it, and it passed: the pane only
       slides sideways once the browser has scrolled something into view,
       and a walk that opens a room and reads it never does that. A rule
       that cannot fail on the bug it was written for is decoration, and it
       took putting the bug back to find out.
 
       So the question is whether the pane is ABLE to scroll sideways,
       which is true the instant the room renders. A box that scrolls
       vertically and is also wider than itself will slide left sooner or
       later — on a focus, on a click, on a phone rotating — and when it
       does it eats the first letter of every line.
 
       A strip that is MEANT to scroll sideways — a filmstrip, a row of
       chips — scrolls in x and not in y, so it is not caught by this. */
    const cs = getComputedStyle(el);
    const scrollsDown = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
    const canScrollAcross = cs.overflowX !== 'visible' && cs.overflowX !== 'clip';
    if (scrollsDown && canScrollAcross && el.scrollWidth > el.clientWidth + 1) {
      out.push(
        `${el.tagName}.${cls} can scroll sideways: ${el.scrollWidth}px of content`
        + ` in a ${el.clientWidth}px box, so its left edge goes off screen as soon`
        + ' as anything is scrolled into view',
      );
    }
  }

  for (const el of document.querySelectorAll('h1, h2, h3')) {
    const words = (el.textContent || '').trim();
    if (!words || words.split(/\s+/).length > 3) continue;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 14) continue;
    if (Number(cs.fontWeight) < 600) continue;
    if (!el.offsetParent && cs.position !== 'fixed') continue;
    /* What it would need on one line, measured by asking for one line. A
       clone rather than a style change on the real element: this runs on a
       live screen and must not reflow what somebody is looking at. */
    const copy = el.cloneNode(true);
    copy.style.cssText = `${cs.cssText};position:absolute;visibility:hidden;white-space:nowrap;width:auto;max-width:none;`;
    el.parentElement.appendChild(copy);
    const needs = copy.getBoundingClientRect().width;
    copy.remove();
    if (needs > el.clientWidth + 1) {
      out.push(`"${words.slice(0, 30)}" needs ${Math.round(needs)}px and was given ${el.clientWidth}px`);
    }
  }

  return out;
};

const server = await serve(PORT);
let browser = null;
try {
  for (const { name: shape, width, height, touch } of [
    { name: 'phone', width: 390, height: 844, touch: true },
    /* A 1512-wide screen, which is a 16-inch laptop — hers. Not 1920: the
       wider the screen the more room everything has, so the narrowest desk
       is the one that finds things. */
    { name: 'desk', width: 1512, height: 900, touch: false },
  ]) {
  for (const lang of ['en', 'af']) {
    console.log(`\n— ${shape} · ${lang}`);
    const opened = await enter({ at: server.url, width, height, touch, lang });
    browser = opened.browser;
    const page = opened.page;
    await studio(page);

    const cut = [];
    const squeezed = [];
    const missed = [];
    for (const english of ROOMS) {
      const name = lang === 'af' ? ROOMS_AF[english] : english;
      if (!name) { missed.push(english); continue; }
      try {
        await toRoom(page, name);
      } catch {
        /* A room this probe cannot reach is reported, never skipped. A rename
           that made twelve rooms into eleven is exactly what `rooms.mjs`
           exists to stop, and a silent `catch` here would put it back. */
        missed.push(`${english} → ${name}`);
        continue;
      }
      await page.waitForTimeout(600);
      await unfold(page);
      for (const one of await page.evaluate(CUT)) cut.push(`${english}: ${one}`);
      if (shape === 'desk') {
        /* With a side bench open, because that is the layout the fault
           showed up in: the dock takes the width, the heading beside it is
           squeezed to the width of its longest word, and a room measured
           with every panel shut never gets there. */
        const bench = page.locator('[data-cutbench]').first();
        if ((await bench.count()) > 0) {
          await bench.click().catch(() => {});
          await page.waitForTimeout(500);
        }
        for (const one of await page.evaluate(SQUEEZED)) squeezed.push(`${english}: ${one}`);
      }
    }

    check(`${shape} · ${lang} · every room on the door was found`, missed.length === 0, missed.join(', '));
    check(`${shape} · ${lang} · no name or heading is cut off`, cut.length === 0,
      cut.slice(0, 6).join(' · ') + (cut.length > 6 ? ` (+${cut.length - 6} more)` : ''));
    if (shape === 'desk') {
      check(`${shape} · ${lang} · nothing is scrolled sideways or squeezed`, squeezed.length === 0,
        squeezed.slice(0, 6).join(' · ') + (squeezed.length > 6 ? ` (+${squeezed.length - 6} more)` : ''));
    }

    await page.screenshot({ path: shot(`notcut-${shape}-${lang}.png`) });
    await browser.close();
    browser = null;
  }
  }
} finally {
  if (browser) await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:notcut — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:notcut — every name and heading fits, in both languages,'
  + ' on a 390-pixel phone and on a 1512-pixel desk, with nothing scrolled sideways.');
