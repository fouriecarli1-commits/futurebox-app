/**
 * A picker may not quietly fall through to the first row.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"Die cast het nie gewerk nie ... dit het
 * heeltemal 'n ander persoon uitgegooi."*
 *
 * `Presenter.tsx` chose the presenter like this:
 *
 *     const member = cast.find((one) => one.id === who) ?? cast[0] ?? null;
 *
 * `who` stops matching for entirely ordinary reasons — the panel re-reads the
 * cast whenever a member is written, and an id that is not in the rows that
 * come back matches nothing. The `?? cast[0]` then animated whoever was first,
 * and the rows arrive newest-first, so "first" is the member added most
 * recently. A different person, in a clip she had paid credits for.
 *
 * It is the same shape as the sixteen ordering rules hunted down on
 * 8 September: **a missing thing reads as the first thing.** `indexOf` returns
 * −1 and −1 sorts before everything; `find` returns undefined and `?? list[0]`
 * turns undefined into the front of the queue. Different operator, one fault.
 *
 * What made it survive every check in this repository is that the highlight
 * was computed from the same expression, so the strip lit up whoever the
 * fallback had picked. The screen agreed with itself perfectly. The only place
 * the disagreement appeared was in the finished clip.
 *
 * ── The rule, and the line it draws ──────────────────────────────────────
 *
 * A fixed catalogue MAY fall back to its first entry: `LAYOUTS`, `SURFACES`,
 * `PLATFORMS` and the rest are written in this repository, an id that misses
 * one is a bug in our own code, and the first entry is a sane answer to a bug.
 *
 * Somebody's own rows MAY NOT. Rows get added, removed and re-read while the
 * screen is open — a miss there is ordinary life, not a bug, and answering it
 * with a stranger is the fault above.
 *
 * The two are told apart by how this codebase already writes them: a catalogue
 * is a SCREAMING_CASE module constant, runtime rows are ordinary lower-case
 * names. That is not a convention invented for this check; it is what every
 * one of the sites below was already doing.
 *
 * An exemption is a comment, on the line before, that says why. There is one,
 * and writing the reason down is the price of it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
/* The prose blanked first, and that is not optional: the very first run of
   this check reported the comment in `Presenter.tsx` that documents the bug
   it exists to catch. A check that reads its own explanation as code is
   measuring something adjacent to the real thing. */
import { code } from './prose.mts';

const FILES = readdirSync('app', { recursive: true, encoding: 'utf8' })
  .filter((one) => one.endsWith('.ts') || one.endsWith('.tsx'))
  .map((one) => join('app', one));

/** `something.find(...) ?? something[0]` — the list named the same both ends. */
const FALL = /([A-Za-z_$][\w$]*)\s*\.find\s*\([^;]*?\)\s*\?\?\s*\1\s*\[\s*0\s*\]/g;

/** A catalogue is written in capitals. Anything else is somebody's rows. */
const CATALOGUE = /^[A-Z][A-Z0-9_]*$/;

/** What an exemption must say on the line above it. */
const EXCUSE = /first[- ]?is[- ]?fine/i;

let bad = 0;
let allowed = 0;
let checked = 0;

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');
  const text = code(raw);
  /* Reported off the REAL lines — `code()` keeps every line number true, so
     the message quotes what was written rather than a row of spaces. */
  const lines = raw.split('\n');

  for (const hit of text.matchAll(FALL)) {
    const list = hit[1];
    checked += 1;
    if (CATALOGUE.test(list)) continue;

    /* The line the match STARTS on, counted off the real text rather than
       guessed — a `.find` spanning three lines is exactly the kind that hides
       from a line-by-line reader, which is how four of the ordering sites
       survived the last hunt. */
    const upto = text.slice(0, hit.index ?? 0);
    const at = upto.split('\n').length;
    const before = lines.slice(Math.max(0, at - 4), at - 1).join(' ');

    if (EXCUSE.test(before)) {
      allowed += 1;
      console.log(`  ok  ${file}:${at} — ${list}[0], with a written reason`);
      continue;
    }

    bad += 1;
    console.log(
      `  ✗   ${file}:${at} — \`${list}.find(...) ?? ${list}[0]\`. ` +
        `${list} is somebody's rows, not a catalogue: an id that stops matching ` +
        `would silently use the first row instead. Move the state onto a real ` +
        `row in an effect, or write why first is fine.`,
    );
  }
}

console.log(
  `\n${checked} first-row fallback(s) read; ${allowed} written down as deliberate.`,
);

if (bad > 0) {
  console.log(`check:whofirst — ${bad} picker(s) can quietly work on the wrong row.`);
  process.exitCode = 1;
} else {
  console.log('check:whofirst — no picker falls through to a row nobody chose.');
}
