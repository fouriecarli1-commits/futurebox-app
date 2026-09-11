/**
 * Every format the advert desk recommends must be one somebody can go and make.
 *
 * ── Why this is the check that matters for this feature ──────────────────
 *
 * The whole point of putting the advice inside the studio rather than reading
 * it somewhere is that the recommendation is one press from the thing itself.
 * "Make a podcast episode" is worth about as much as a magazine article.
 * "Make a podcast episode, here is the room, the title is already in it" is a
 * different product.
 *
 * That only holds while every entry in the catalogue names a room that exists
 * and an operation that room actually registers. Rename an op in a component
 * and the card still draws, still opens the room, and quietly sets nothing —
 * which is the fault this whole week has been made of, and the one a screen
 * cannot show you.
 *
 * `check:ops` guards the other direction: an op a room registers must be
 * described in the registry. Nothing guarded a third file naming ops from the
 * outside. This does.
 *
 *   npm run check:adformats
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AD_FORMATS, FORMAT_IDS, describeFormats, formatById } from '../app/lib/adformats';
import { SURFACES, isSurfaceId } from '../app/lib/surfaces';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw = '') => {
  if (!ok) problems.push(`  ${what}${saw ? `\n      ${saw}` : ''}`);
};

check('the catalogue is not empty', AD_FORMATS.length > 0);
check(
  'and no format id is used twice',
  new Set(FORMAT_IDS).size === FORMAT_IDS.length,
  FORMAT_IDS.join(', '),
);

for (const one of AD_FORMATS) {
  /* The room. */
  if (!isSurfaceId(one.room)) {
    problems.push(`  "${one.id}" is made in "${one.room}", which is not a room in this app.`);
    continue;
  }

  /* The operation, against the registry — which check:ops holds against the
     components, so agreeing with it is agreeing with what is really wired. */
  if (one.op) {
    const ops = SURFACES[one.room].ops ?? {};
    check(
      `"${one.id}" sets up ${one.room} with "${one.op}", which that room takes`,
      Boolean(ops[one.op]),
      `${one.room} takes: ${Object.keys(ops).join(', ') || '(no operations at all)'}`,
    );
  }

  /* Both languages. An Afrikaans reader meeting an English format name has
     no way to tell a missing translation from a deliberate one. */
  check(`"${one.id}" has a name in both languages`, Boolean(one.en && one.af));
  check(`"${one.id}" says what it is in both languages`, Boolean(one.whatEn && one.whatAf));

  /* The line that makes a choice a choice.

     A catalogue where everything is good for everything ranks nothing, and a
     model handed one picks the first. `fails` is what forces each entry to
     rule itself out of something. Measured as a floor because the property —
     "this actually excludes a case" — cannot be read from a string; the floor
     at least stops it being "not always ideal". */
  check(
    `"${one.id}" says what makes it the WRONG answer`,
    one.fails.trim().length > 60,
    `fails: ${one.fails.slice(0, 60)}`,
  );
  check(`"${one.id}" says when it is the right answer`, one.fits.trim().length > 60);
}

/* ── The route may not accept an id the catalogue does not have ─────────
 
   The schema restricts it and a schema is not a contract, so the route
   filters too. Without that filter a hallucinated id reaches the screen as a
   card offering to open a room that does not exist. */
const route = readFileSync('app/api/adformats/route.ts', 'utf8');
check(
  'the route builds its choices from the catalogue rather than listing them again',
  /FORMAT_IDS/.test(route) && /describeFormats\(\)/.test(route),
  'a second list of formats in the route is a list that drifts',
);
check(
  'and drops anything the catalogue does not have, rather than trusting the schema',
  /formatById\(one\.id\) !== null/.test(route),
  'an invented id reaches the screen as a card that opens nothing',
);

/* ── And the screen opens the room the catalogue names ──────────────────── */
const screen = readFileSync('app/components/AdFormats.tsx', 'utf8');
check(
  'the screen reads the room and the operation off the catalogue entry',
  /formatById\(pick\.id\)/.test(screen) && /format\.room/.test(screen) && /format\.op/.test(screen),
  'the screen has its own idea of where a format is made',
);
check(
  'and sets the room up before moving to it, not after',
  screen.indexOf('onSetUp(format.room') < screen.indexOf('onGoTo(format.room'),
  'setting up after the move puts the value in the room being left',
);

/* ── What the model is shown is what the catalogue says ─────────────────── */
const shown = describeFormats();
for (const one of AD_FORMATS) {
  check(`"${one.id}" reaches the model`, shown.includes(one.id) && shown.includes(one.fails));
}
check(
  'and the model is shown what each one is bad at, not only what it is for',
  AD_FORMATS.every((one) => shown.includes(one.fails)),
  'a list of eight things that are all good for everything chooses nothing',
);

/* ── The catalogue is reachable from a room that is mounted ─────────────
 
   A format whose room nothing can navigate to is a card with a dead button.
   Checked against the studio's own room list rather than a list here. */
const page = readFileSync('app/page.tsx', 'utf8');
for (const one of AD_FORMATS) {
  check(
    `the studio can actually open "${one.room}" for "${one.id}"`,
    new RegExp(`studioTab === '${one.room}'`).test(page),
    `nothing in page.tsx renders ${one.room}`,
  );
}

/* One honest note about coverage: this reads the catalogue, the route and the
   screen. It does not read what the model replies — that needs a key. The
   route's filter is what makes the reply safe, and the filter is checked. */
const probes = readdirSync('audit').filter((name) => name.endsWith('.mjs'));
check(
  'the scan found the files it claims to be reading',
  route.length > 0 && screen.length > 0 && page.length > 0 && probes.length > 0,
);

if (problems.length > 0) {
  console.error(`check:adformats — a recommendation the desk cannot deliver:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:adformats — all ${AD_FORMATS.length} formats name a real room, ` +
    `${AD_FORMATS.filter((one) => one.op).length} of them an operation that room takes, ` +
    'each says what it is wrong for, and the route drops anything not in the list.',
);
