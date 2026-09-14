/**
 * The dub transcript goes to the endpoint that is not deprecated.
 *
 * ── What this is about ───────────────────────────────────────────────────
 *
 * `@elevenlabs/elevenlabs-js` 2.65.0 marks
 *
 *     GET /v1/dubbing/{id}/transcript/{lang}?format_type=…
 *
 * `@deprecated`, and carries the replacement beside it under a plural name
 * with the format moved into the path:
 *
 *     GET /v1/dubbing/{id}/transcripts/{lang}/format/{srt|webvtt|json}
 *
 * Both calls in this app were on the old one. Task #114 was written as "our
 * dubbing path is now labelled legacy", which sounded like a rewrite of the
 * whole dubbing surface and is not: `POST /v1/dubbing`, `GET /v1/dubbing/{id}`
 * and the delete carry no marker. What was deprecated is this one call and the
 * Dubbing Studio speaker/segment editing surface, which this app has never
 * touched.
 *
 * ── What is held, and what cannot be ─────────────────────────────────────
 *
 * Held: the plural path is what gets tried first, both callers go through the
 * one function, and the deprecated path appears exactly once — inside that
 * function, as the fallback.
 *
 * Not held, and it is the important half: whether the new endpoint actually
 * answers. This machine cannot reach api.elevenlabs.io. The first dub whose
 * subtitles arrive is what settles it, and the comment on `dubTranscriptIn`
 * says to delete the fallback then. A check cannot make somebody do that; it
 * can make sure the fallback stays one line in one place, where deleting it
 * is a two-second edit rather than an archaeology project.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const source = readFileSync('app/lib/server/eleven.ts', 'utf8');

/* Calls, not prose. Every URL in this file is built in a template literal off
   `${BASE}`, and the comments quote both paths on purpose — so a naive search
   for the old string finds the explanation of why it is old. */
const calls = [...source.matchAll(/\$\{BASE\}\/dubbing\/[^`]*`/g)].map((m) => m[0]);

ok('the dub transcript is fetched somewhere', calls.length > 0, `${calls.length} found`);

const live = calls.filter((one) => /\/transcripts\/.*\/format\//.test(one));
const old = calls.filter((one) => /\/transcript\/[^s].*format_type=/.test(one));

ok('the current endpoint is called', live.length === 1, `${live.length} call(s) to /transcripts/…/format/…`);
ok(
  'and the deprecated one survives only as the single fallback',
  old.length <= 1,
  `${old.length} call(s) to /transcript/…?format_type= — it may appear once, inside dubTranscriptIn`,
);

/* One door. Two callers reaching for the endpoint themselves is how half a
   migration ships: the subtitles move and the word timings do not, and both
   look fine in a diff. */
ok(
  'both callers go through one function',
  /const response = await dubTranscriptIn\(id, language, 'json'\)/.test(source)
    && /const response = await dubTranscriptIn\(id, language, format\)/.test(source),
  'dubTranscript and dubSubtitles must each call dubTranscriptIn',
);

/* The fallback is only tried where a route that is gone would answer. Falling
   back on every failure would send a 401 or a 429 down the old path too, and
   then the old path is not a fallback, it is the second half of every call. */
ok(
  'the fallback fires only on a missing route',
  /if \(now\.status !== 404 && now\.status !== 405\) return now;/.test(source),
  'expected the new answer to be returned unless it is 404 or 405',
);

/* So that deleting it is a decision somebody made, not something that quietly
   never happened. */
ok(
  'and the code says when to take the fallback out',
  /Delete the fallback after the first dub whose subtitles arrive/.test(source),
  'dubTranscriptIn must name the event that ends the fallback',
);

if (failures) {
  console.error(
    '\ncheck:dubpath — the dub transcript must go to /v1/dubbing/{id}/transcripts/{lang}/format/{…},\n' +
      'with the deprecated /transcript/{lang}?format_type= path kept only as the one fallback inside\n' +
      'dubTranscriptIn, and only for a 404 or 405.\n',
  );
  process.exit(1);
}
console.log('\ncheck:dubpath — the dub transcript is on the live endpoint, with one named fallback behind it.');
