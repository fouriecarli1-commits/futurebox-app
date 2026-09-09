/**
 * What the terms promise about selling a song, kept to what the engine allows.
 *
 * ── Why this is a check and not just a paragraph ─────────────────────────
 *
 * ElevenLabs support answered this in writing on 9 September 2026: the paid
 * plan carries a commercial licence over music generated through it, no credit
 * to them is required — and **film, television, radio and studio games are
 * carved out** and need an Enterprise Music plan.
 *
 * That carve-out is the whole reason this file exists. Every other sentence in
 * the terms is FutureBox's own position and can be rewritten by whoever is
 * writing them. This one is not ours to change: it describes somebody else's
 * licence, and a member who reads "you may sell what you make", places a song
 * in a television advert, and is then told it was never licensed has been told
 * something untrue by us. A general "satisfy yourself that you are entitled
 * to" does not fix that, because it does not name the one thing that is
 * actually carved out.
 *
 * ── Both directions ──────────────────────────────────────────────────────
 *
 * The carve-out has to be there, and the permission has to be there with it.
 * A terms page that names the limit and forgets to say that ordinary
 * commercial release *is* allowed is its own kind of wrong: it makes members
 * cautious about the thing they are paying for. So both are asserted, and the
 * failure says which half is missing.
 *
 * The help assistant answers out of `handbook.generated.ts`, which
 * `check:handbook` already holds to these pages — so getting this right here
 * gets it right in the support conversation too.
 */
import { readFileSync } from 'node:fs';

const TERMS = 'app/terms/page.tsx';
const terms = readFileSync(TERMS, 'utf8');

const problems: string[] = [];
const check = (label: string, ok: boolean, why: string): void => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) problems.push(`${label} — ${why}`);
};

/* The clause itself, not the words scattered anywhere on the page.

   The first version of this check looked for 'film', 'television', 'radio'
   and 'game' anywhere in the file. It passed with the carve-out's headline
   sentence deleted, because those four words still appeared in the sentence
   after it — which is the check testing that a legal page mentions television
   somewhere, and calling that a guarantee.

   So the clause is found first, by the one phrase that says what to do about
   the limit, and the four places are required *inside it*. A check that
   cannot fail is worse than no check: it is a claim that somebody is
   watching. */
const clause =
  terms.split(/<li[\s>]/).find((one) => /separate agreement/i.test(one)) ?? '';

check(
  'the carve-out is one clause, not four words scattered about',
  clause.length > 0,
  `${TERMS} has no list item saying a separate agreement is needed — the carve-out is gone`,
);

for (const place of ['film', 'television', 'radio', 'game']) {
  check(
    `and that clause names ${place}`,
    new RegExp(`\\b${place}`, 'i').test(clause),
    `the carve-out in ${TERMS} no longer tells members that ${place} is outside the engine's licence`,
  );
}

check(
  'ordinary commercial release is still allowed in as many words',
  /You may sell what you make/i.test(terms),
  `${TERMS} states the limit without stating the permission, which reads as a ban`,
);

check(
  'and no credit to the engine is required',
  /No credit to the engine is required/i.test(terms),
  `${TERMS} no longer says attribution is unnecessary — it is not, on a paid plan`,
);

if (problems.length) {
  console.error(`\ncheck:musiclicence — ${problems.length} wrong:\n`);
  for (const one of problems) console.error(`  ${one}`);
  console.error(
    '\nElevenLabs confirmed this in writing on 9 September 2026. Do not soften or\n' +
      'remove it without a newer answer from them in writing.\n',
  );
  process.exit(1);
}

console.log(
  '\ncheck:musiclicence — the terms say a song may be sold with no credit to the engine,\n' +
    '  and name film, television, radio and studio games as needing a separate agreement.',
);
