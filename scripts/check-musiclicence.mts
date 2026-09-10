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

/* ── The half of this check that was itself wrong ────────────────────────

   This asserted that the page must say "You may sell what you make", in as
   many words, so that naming the film/TV limit could not read as a blanket
   ban. Sound reasoning, wrong fact: it was written on the morning of
   9 September 2026 on the strength of ElevenLabs' answer about the ACCOUNT
   HOLDER's commercial use, hours before their second answer arrived about
   members:

     "the scenario you're describing — where your end users receive and
      commercially sell AI-generated output produced under your API key — is
      a platform/B2B2C arrangement that is not explicitly covered by
      ElevenLabs' self-serve plan terms."

   So a check meant to keep the terms honest was requiring, on pain of a red
   build, a sentence the supplier had declined to stand behind. This file even
   closed by saying not to soften the wording "without a newer answer from
   them in writing" — and the newer answer was already in the same inbox.

   The lesson is not about music licensing. A check that asserts a CLAIM
   rather than a CONSTRAINT inherits everything that was wrong with the claim,
   and then defends it. What is asserted below is the constraint: the page
   must not promise members a licence nobody has granted them, and must not
   leave them thinking they own nothing either. */

check(
  'the page does not promise members a resale licence the engine has not granted',
  !/You may sell what you make/i.test(terms),
  `${TERMS} says "You may sell what you make". ElevenLabs said in writing on ` +
    '9 September 2026 that a platform\'s end users selling output made under the ' +
    'platform\'s key is not covered by the self-serve terms. Do not put it back ' +
    'without an agreement that actually covers members.',
);

check(
  'and it says outright where the licence does stand',
  /not explicitly covered/i.test(terms) && /negotiating/i.test(terms),
  `${TERMS} no longer explains where resale rights stand — silence reads as ` +
    'permission to somebody about to release a record',
);

check(
  'and that what they make is still theirs',
  /what you make is yours/i.test(terms),
  `${TERMS} states the licence limit without stating ownership, which reads as ` +
    'a claim on their songs',
);

check(
  'and no credit to the engine is required',
  /no credit to the engine required|No credit to the engine is required/i.test(terms),
  `${TERMS} no longer says attribution is unnecessary — it is not, on a paid plan`,
);

if (problems.length) {
  console.error(`\ncheck:musiclicence — ${problems.length} wrong:\n`);
  for (const one of problems) console.error(`  ${one}`);
  console.error(
    '\nElevenLabs answered this in writing on 9 September 2026, twice, and the two\n' +
      'answers say different things: the account holder may sell, a member of a\n' +
      'platform selling under the platform\'s key is not explicitly covered. Do not\n' +
      'change either direction without a newer answer from them in writing —\n' +
      'docs/ELEVENLABS-SALES.md is the letter asking for one.\n',
  );
  process.exit(1);
}

console.log(
  '\ncheck:musiclicence — the terms say where a member\'s resale rights actually\n' +
    '  stand, keep ownership with the maker, and name film, television, radio and\n' +
    '  studio games as needing a separate agreement.',
);
