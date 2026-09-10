/**
 * Every button has to look like a button.
 *
 * Carli: "Die button, made here before is amper onsienbaar want dit lyk nie
 *  soos 'n button."
 *
 * She reported one. `ShareRow`'s own trigger — the single control that gets a
 * song or a video off the device — was the same faint grey text, found in the
 * same minute. "All buttons get boxes" has been a standing instruction since
 * the look was rebuilt, and nothing has ever enforced it, which is how two of
 * the most load-bearing controls in the app drifted back into looking like
 * captions.
 *
 * ── What counts as looking like one ──────────────────────────────────────
 *
 * A box and a thumb's worth of height. Concretely: a border, or a background
 * that is not the same as whatever is behind it, and at least forty pixels
 * tall. That is measured off the rendered page rather than off class names,
 * because a class list is a claim about the intent and the computed style is
 * what she is looking at.
 *
 * ── What is allowed not to ───────────────────────────────────────────────
 *
 * Named below with a reason each, the way `audit/cards.mjs` names the rooms
 * that carry no cards. An exception with no reason beside it is a rule being
 * quietly dropped, and this whole check exists because a rule was quietly
 * dropped once already.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';
import { ROOMS } from './rooms.mjs';

const PORT = process.argv[2] || '3091';
/* Six of the twelve until 10 September 2026, and reporting on all of them.
   Widening `contrast.mjs` the same day found a real fault in the seventh
   room it reached, so this one is widened too rather than trusted. */

/** The smallest thing a thumb can be asked to hit. */
const THUMB = 40;

/**
 * Buttons that are deliberately not boxes.
 *
 * Matched against the button's own visible text, collapsed.
 */
const ALLOWED = [
  {
    is: /^(Spotlight|Live|Make|Library|You)$/,
    why: 'the bottom bar: five tabs in a row of their own, where a box each would be a second bar',
  },
  {
    is: /^\?$/,
    why: 'the question mark that opens an explanation, which is a mark and not a control',
  },
  {
    is: /^(Clear|Maak skoon)$/,
    why: 'the small reset in a card heading, beside the heading it resets',
  },
];

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const server = await serve(PORT);
const { browser, page } = await enter({ width: 390, height: 844, at: server.url, touch: true });

/** Every flat button on the screen right now. */
const flatOnes = async (allowed) =>
  page.evaluate(({ thumb, rules }) => {
    const skip = rules.map((one) => new RegExp(one));
    const out = [];
    /* The room she is standing in, not the whole document.

       The studio is a fixed layer over the marketing site, and the site's own
       header is still in the DOM behind it — so scanning `document` counted
       the nav links, the sign-out and the site's category chips, and reported
       218 flat buttons out of 463 in rooms nobody was looking at. Those are a
       different surface with a different design, and mixing them in is a
       number that cannot be acted on. */
    const room = document.querySelector('div.fixed.inset-0.z-50');
    if (!room) return [{ label: '(no room open)', why: 'the studio was not on the screen' }];
    for (const one of room.querySelectorAll('button')) {
      const box = one.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) continue;

      /* Text, not markup. A button whose only content is an icon is a mark on
         the screen and is judged by its size rather than by its edges. */
      const label = (one.textContent || '').replace(/\s+/g, ' ').trim();
      if (!label) continue;
      if (skip.some((rule) => rule.test(label))) continue;

      /* A card's own heading is a disclosure, not a control.

         It folds the card it names, its affordance is the chevron beside it,
         and drawing a box round it would put a button inside a button — the
         card already is one. Recognised by `aria-expanded`, which is what
         makes it a disclosure to a screen reader as well, rather than by its
         words: naming fourteen headings in a list is a list that goes stale
         the first time somebody writes a fifteenth card. */
      if (one.getAttribute('aria-expanded') !== null) continue;

      const style = getComputedStyle(one);
      const alpha = (colour) => {
        const parts = (colour.match(/[\d.]+/g) ?? []).map(Number);
        return parts.length >= 4 ? parts[3] : 1;
      };
      const bordered =
        parseFloat(style.borderTopWidth) > 0 ||
        parseFloat(style.borderBottomWidth) > 0 ||
        parseFloat(style.borderLeftWidth) > 0;
      /* Against the parent rather than against nothing: a button painted the
         same colour as the card it sits on has no edge, whatever its own
         background says. */
      const behind = one.parentElement ? getComputedStyle(one.parentElement).backgroundColor : '';
      /* A gradient is a fill.

         Reading `backgroundColor` alone reported "Make my song", "Make it —
         15 credits" and "Cut it into one film" as having no fill at all —
         the four most prominent buttons in the app. They are painted with
         `bg-gradient-to-r`, which is a `background-image`, and leaves
         `backgroundColor` transparent. A check that was about to send me
         redesigning the primary action of three rooms. */
      const filled =
        style.backgroundImage !== 'none' ||
        (alpha(style.backgroundColor) > 0.05 && style.backgroundColor !== behind);

      const how = (one.className || '').toString().slice(0, 120);
      if (!bordered && !filled) out.push({ label: label.slice(0, 40), why: 'no border and no fill', how });
      else if (box.height < thumb) {
        out.push({ label: label.slice(0, 40), why: `${Math.round(box.height)}px tall`, how });
      }
    }
    return out;
  }, { thumb: THUMB, rules: allowed.map((one) => one.is.source) });

try {
  await studio(page);

  let total = 0;
  const flat = [];
  for (const name of ROOMS) {
    await toRoom(page, name);
    await page.waitForTimeout(1200);
    const seen = await page.evaluate(() =>
      document.querySelector('div.fixed.inset-0.z-50')?.querySelectorAll('button').length ?? 0);
    total += seen;
    const bad = await flatOnes(ALLOWED);
    console.log(`  ${String(seen).padStart(3)} buttons  ${name}${bad.length ? `  —  ${bad.length} flat` : ''}`);
    for (const one of bad) flat.push(`${name}: "${one.label}" (${one.why})\n        ${one.how}`);
  }

  console.log('');
  for (const one of ALLOWED) console.log(`  allowed: ${one.is.source} — ${one.why}`);
  console.log('');

  check(`every button with words on it has a box and a thumb's worth of height`,
    flat.length === 0, `${flat.length} of ${total}\n      ${flat.slice(0, 60).join('\n      ')}`);

  await page.screenshot({ path: shot('buttonlook.png'), fullPage: false });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 220)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:buttonlook — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:buttonlook — nothing that can be pressed is drawn as a caption.');
