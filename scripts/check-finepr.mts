/**
 * The fine print she asked off the welcome screen, and where it went.
 *
 * Carli, 14 September 2026, with a photograph of the screen: *"Haal daai fyn
 * skrif uit op die make a song room."*
 *
 * Six lines of grey type under the doors, explaining what the suggestion is
 * read off, that it follows the account rather than the device, and that it
 * can be cleared. All of it true, and all of it on the one screen that is
 * meant to be a set of choices — so it read as terms rather than as an
 * answer.
 *
 * ── Why this is a check and not a probe assertion ────────────────────────
 *
 * `audit/greeting.mjs` asserted the opposite for three days: that the
 * paragraph WAS on the welcome screen. It could not report the contradiction
 * because the terms box was stopping it at the front door, and when the door
 * was repaired it failed — correctly, against a screen that is now right.
 *
 * The obvious repair was to move the assertion to the account screen's own
 * probe. I wrote it and then took it out: the section is drawn only when
 * `taste.ready`, the probe's run has no counting in it, and the assertion
 * never executed. A check that cannot run is worse than no check, because it
 * reads in the file as though something is being held.
 *
 * Both halves are properties of the source, so they belong here:
 *
 *   · the welcome screen carries neither of those two paragraphs;
 *   · the account screen carries the disclosure AND the button that acts on
 *     it, in one section — a notice you cannot act on is a notice, and one
 *     beside `Forget` is an answer.
 *
 * `audit/greeting.mjs` keeps the first half as a browser assertion too, in
 * the negative, because a paragraph somebody asked to have removed is
 * exactly the kind of thing that comes back.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const hello = readFileSync('app/components/Greeting.tsx', 'utf8');
const account = readFileSync('app/components/Account.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');
const walk = readFileSync('audit/greeting.mjs', 'utf8');

/* ── Off the welcome screen ───────────────────────────────────────────── */

ok(
  'the welcome screen prints no small-type disclosure',
  !/t\(\s*'hello\.basis'/.test(hello) && !/t\(\s*'hello\.basisAccount'/.test(hello),
  'she asked for this paragraph off this screen, with a photograph of it',
);
ok(
  '  and its probe holds that in the negative',
  /does not explain itself in fine print/.test(walk),
  'a paragraph somebody asked to have removed is the kind of thing that comes back',
);
ok(
  '  and the two strings it used are gone from the dictionary',
  !/"hello\.basis"/.test(words) && !/"hello\.basisAccount"/.test(words),
  'a dead string is an invitation to print it again somewhere',
);

/* ── And onto the account screen, beside the button ───────────────────── */

ok(
  'the account screen says what the app has noticed',
  /t\(\s*'account\.taste'/.test(account),
);
ok(
  '  and says what is counted, in its own words',
  /'account\.tasteNote'/.test(account) &&
    /not a record of when you work/.test(words),
  'the point of the disclosure is that it is a count and not a diary',
);
ok(
  '  and the way to make it forget is in the same section',
  /forgetTaste\(\)/.test(account),
  'a notice you cannot act on is a notice; one beside Forget is an answer',
);
ok(
  '  in both languages',
  /"account\.tasteNote": \{ en: "[^"]+", af: "[^"]+" \}/.test(words),
);

if (failures) {
  console.error(
    '\ncheck:finepr — the welcome door offers choices and does not explain itself in small\n' +
      'type. The disclosure lives on the account screen, next to the button that clears the\n' +
      'thing being disclosed. Moving a notice is only an improvement if it lands somewhere.\n',
  );
  process.exit(1);
}
console.log('\ncheck:finepr — off the door, and beside the button that acts on it.');
