/**
 * The daily shuffle, which has to be three things at once.
 *
 *   "Dit sal goed wees as daardie radar elke dag die suggestions skommel."
 *
 * A list sorted by when somebody joined puts the same six names at the top
 * for ever, and the seventh person is never introduced to anybody. But a
 * shuffle is easy to get wrong in ways nobody notices:
 *
 *   · `Math.random` reorders the list while somebody is reading it, and the
 *     server's first paint disagrees with the browser's second one.
 *   · A shuffle keyed on the hour changes under a person mid-session.
 *   · A shuffle that drops or duplicates somebody is worse than no shuffle,
 *     because the person who was dropped is invisible and never complains.
 *
 * So: the same all day, different tomorrow, everybody present exactly once.
 * The day boundary is the one in the Republic rather than UTC's, because the
 * people using this are living in that day.
 */
import { shuffledForToday } from '../app/lib/radar';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const PEOPLE = Array.from({ length: 12 }, (_, i) => `person-${i + 1}`);
const at = (iso: string) => new Date(iso);

/* ── Nobody lost, nobody twice ─────────────────────────────────────────── */
for (const day of ['2026-09-06T08:00:00Z', '2026-09-07T08:00:00Z', '2026-12-31T22:00:00Z']) {
  const out = shuffledForToday(PEOPLE, at(day));
  check(`everybody is still there on ${day.slice(0, 10)}`,
    out.length === PEOPLE.length && new Set(out).size === PEOPLE.length,
    `${out.length} of ${PEOPLE.length}, ${new Set(out).size} distinct`);
}

/* ── The same all day ──────────────────────────────────────────────────── */
const morning = shuffledForToday(PEOPLE, at('2026-09-06T06:00:00Z'));
const evening = shuffledForToday(PEOPLE, at('2026-09-06T19:30:00Z'));
check('the order does not change between morning and evening',
  morning.join() === evening.join(), morning.slice(0, 3).join(' · '));

/* ── Different tomorrow ────────────────────────────────────────────────── */
const tomorrow = shuffledForToday(PEOPLE, at('2026-09-07T06:00:00Z'));
check('and it is a different order the next day', morning.join() !== tomorrow.join(),
  `${morning.slice(0, 3).join(' · ')} → ${tomorrow.slice(0, 3).join(' · ')}`);

/* The day rolls over at midnight in the Republic, not at midnight UTC. South
   Africa is two hours ahead, so 22:30 UTC is already the next day here — and
   somebody opening the app at half past midnight should see the new order. */
const lateHere = shuffledForToday(PEOPLE, at('2026-09-06T22:30:00Z'));
check('the day turns over at midnight in South Africa, not in UTC',
  lateHere.join() === tomorrow.join(),
  `22:30 UTC on the 6th is 00:30 on the 7th here`);

/* ── Over a fortnight, the top of the list actually moves ──────────────── */
const tops = new Set<string>();
for (let d = 1; d <= 14; d += 1) {
  tops.add(shuffledForToday(PEOPLE, at(`2026-09-${String(d).padStart(2, '0')}T08:00:00Z`))[0]);
}
check('over two weeks the first name is not always the same person',
  tops.size >= 5, `${tops.size} different people led the list in 14 days`);

/* ── The degenerate sizes, because a testing app has two people on it ──── */
check('an empty radar shuffles to an empty radar', shuffledForToday([]).length === 0);
check('one person shuffles to that person', shuffledForToday(['only']).join() === 'only');
const two = shuffledForToday(['a', 'b']);
check('two people are both still there', two.length === 2 && new Set(two).size === 2);

/* And the original is not reordered under the caller. */
const before = PEOPLE.slice();
shuffledForToday(PEOPLE);
check('the list it was given is left alone', PEOPLE.join() === before.join());

if (failures) {
  console.error(`\ncheck:radarshuffle — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:radarshuffle — the same all day, different tomorrow, and nobody falls out of it.');
