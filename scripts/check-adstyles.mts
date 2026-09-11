/**
 * The looks are dated opinion, and they have to behave like it.
 *
 * ── What this file is for ────────────────────────────────────────────────
 *
 * Carli asked whether the advert desk could look at what is stylish and
 * current for a product range. Pinterest, Canva and Pinterest Trends are all
 * blocked from the machine this was written on, so what they offer could not
 * be checked and was not guessed at.
 *
 * `app/lib/adstyles.ts` is the answer that does not depend on an API: craft
 * rather than fashion, with a date on every entry and the age of the oldest
 * one printed on the screen. A trends feed that breaks returns last year's
 * answer with a confident face; a dated file says how old it is.
 *
 * That only holds while the dates are real and the screen shows them. This
 * is what makes the honesty mechanical rather than a good intention.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does NOT fail when an entry gets old. A build that breaks because time
 * passed is a build that breaks for something that is not a defect, on a
 * change that had nothing to do with it — and the fix would be to touch the
 * date rather than to look, which is worse than no rule. The age goes on the
 * screen, where the person deciding can weigh it.
 *
 *   npm run check:adstyles
 */
import { readFileSync } from 'node:fs';
import { AD_FORMATS } from '../app/lib/adformats';
import { AD_STYLES, RANGES, STYLE_IDS, daysSince, describeStyles, oldestReview } from '../app/lib/adstyles';

const problems: string[] = [];
const check = (what: string, ok: boolean, saw = '') => {
  if (!ok) problems.push(`  ${what}${saw ? `\n      ${saw}` : ''}`);
};

check('there are styles at all', AD_STYLES.length > 0);
check('and no id is used twice', new Set(STYLE_IDS).size === STYLE_IDS.length, STYLE_IDS.join(', '));

const today = new Date();
const formats = new Set(AD_FORMATS.map((one) => one.id));

for (const one of AD_STYLES) {
  check(`"${one.id}" is spelled as an id`, /^[a-z0-9_]+$/.test(one.id), one.id);
  check(`"${one.id}" is named in both languages`, Boolean(one.en && one.af));

  /* ── The date, which is the whole point of the file ─────────────────── */
  check(
    `"${one.id}" carries a real review date`,
    /^\d{4}-\d{2}-\d{2}$/.test(one.reviewed) && Number.isFinite(daysSince(one.reviewed, today)),
    one.reviewed,
  );
  check(
    `"${one.id}" was not reviewed in the future`,
    daysSince(one.reviewed, today) >= 0 && new Date(`${one.reviewed}T00:00:00Z`) <= today,
    `${one.reviewed} is ahead of today — a date nobody can have looked on`,
  );

  /* ── Concrete enough to build a shot from ───────────────────────────
 
     The test in the type's own comment: could somebody who has never seen
     an advert write the prompt from this line alone? A floor rather than a
     reading, because the property cannot be read from a string — but
     "authentic and relatable" cannot reach it and the ones here do. */
  check(`"${one.id}" says what it LOOKS like, concretely`, one.looks.trim().length > 120, one.looks.slice(0, 60));

  /* ── And what makes it done ─────────────────────────────────────────
 
     The line that dates, and the reason every entry is dated. A catalogue
     of twelve looks that are all good is a catalogue a model picks the
     first item from. */
  check(`"${one.id}" says what makes it look done`, one.tired.trim().length > 60, one.tired.slice(0, 60));
  check(`"${one.id}" says why it works`, one.works.trim().length > 60);

  /* ── It suits some things and not others ────────────────────────────── */
  check(`"${one.id}" names the ranges it suits`, one.ranges.length > 0);
  check(
    `"${one.id}" does not claim to suit everything`,
    one.ranges.length < RANGES.length,
    'a style that suits every range chooses nothing',
  );
  for (const range of one.ranges) {
    check(`"${one.id}" names "${range}", which is a range`, (RANGES as readonly string[]).includes(range), range);
  }

  /* ── And it is a way of doing a format that exists ───────────────────
 
     A style attached to no real format is one the adviser can recommend
     and nobody can act on — the same fault as a format naming a room that
     does not exist, which check:adformats already holds. */
  check(`"${one.id}" is a way of doing at least one format`, one.formats.length > 0);
  for (const id of one.formats) {
    check(`"${one.id}" names the format "${id}", which exists`, formats.has(id), [...formats].join(', '));
  }
}

/* ── Every format can be made in some look ───────────────────────────────
 
   Otherwise the adviser recommends a format and has no style to offer with
   it, and either invents one or leaves the card half-built. */
for (const format of AD_FORMATS) {
  const some = AD_STYLES.some((one) => one.formats.includes(format.id));
  check(
    `the "${format.id}" format has at least one look`,
    some,
    'the adviser would recommend it with no way to say how it should look',
  );
}

/* ── The model is shown the part that makes a choice a choice ──────────── */
const shown = describeStyles();
for (const one of AD_STYLES) {
  check(`"${one.id}" reaches the model with its "looks done when" line`,
    shown.includes(one.id) && shown.includes(one.tired), '');
}

/* ── The route picks from the catalogue and drops anything else ────────── */
const route = readFileSync('app/api/adformats/route.ts', 'utf8');
check(
  'the route offers the styles from the catalogue rather than listing them again',
  /STYLE_IDS/.test(route) && /describeStyles\(\)/.test(route),
  'a second list of looks in the route is a list that drifts',
);
check(
  'and drops a style the catalogue does not have',
  /styleById\(one\.style\) !== null/.test(route),
  'z.enum is a description, not a constraint — see check:adschema',
);

/* ── And the screen shows the age ────────────────────────────────────────
 
   The one mechanism that makes a dated file honest rather than merely
   dated. Without it this is an undated opinion with a timestamp nobody
   sees, which is the thing a reader trusts most and should trust least. */
const screen = readFileSync('app/components/AdFormats.tsx', 'utf8');
check(
  'the screen prints how old each look is',
  /daysSince\(style\.reviewed\)/.test(screen),
  'the date is in the file and invisible to the person deciding',
);
check(
  'and how old the oldest one is',
  /oldestReview\(\)/.test(screen),
  'an average would hide the entry nobody has looked at since it was written',
);
check(
  'and carries the "looks done when" line onto the card',
  /style\.tired/.test(screen),
  'the half that dates is the half worth showing',
);

if (problems.length > 0) {
  console.error(`check:adstyles — the looks are not behaving like dated opinion:\n${problems.join('\n')}`);
  process.exit(1);
}

console.log(
  `check:adstyles — ${AD_STYLES.length} looks, each dated, each saying what makes it look done, ` +
    `each a way of doing a format that exists. Oldest entry: ${oldestReview()} days.`,
);
