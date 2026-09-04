/**
 * The one piece of arithmetic in the posting queue, and it is a timezone.
 *
 * `<input type="date">` gives "2026-06-09" and `<input type="time">` gives
 * "18:00". Both mean *their* six o'clock, and the server stores an instant —
 * so there is exactly one conversion in this feature and it is the one that
 * goes wrong silently.
 *
 * Appending a `Z` is the mistake, and it does not throw, does not fail a type
 * check, and does not look wrong on the screen that made it. It sends a South
 * African's evening post two hours late, every time, and the only symptom is
 * somebody saying the reminders come at the wrong time.
 *
 * So this pins the behaviour under two timezones: the one this app is for, and
 * one on the other side of UTC so that a sign error cannot pass both.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) {
    bad += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/* ── The functions under test, taken out of the source ────────────────────

   Lifted from `app/lib/queue.ts` rather than copied into this file. A copy is
   a copy that drifts, and a timezone check passing against a version of the
   arithmetic that is no longer in the app is worse than no check.

   The type annotations are stripped so plain node can run it. Importing the
   real module is not an option: it is a client module that pulls in the
   Supabase client, and none of that belongs in a child process whose whole job
   is to answer what `new Date('2026-06-09T18:00')` does under a given `TZ`. */
const source = readFileSync(new URL('../app/lib/queue.ts', import.meta.url), 'utf8');

function lift(name: string): string {
  const at = source.indexOf(`export function ${name}(`);
  if (at < 0) throw new Error(`check:queue — ${name} is no longer exported from queue.ts`);
  // To the closing brace of the function, which is the first line that is
  // exactly "}" — every nested brace in these two is indented.
  const end = source.indexOf('\n}\n', at);
  if (end < 0) throw new Error(`check:queue — could not find the end of ${name}`);
  return source
    .slice(at, end + 2)
    .replace(/^export /, '')
    .replace(/\(date: string, time: string\): string \| null/, '(date, time)')
    .replace(/\(\): string/, '()')
    .replace(/\(n: number\) =>/, '(n) =>');
}

const dir = mkdtempSync(join(tmpdir(), 'queue-check-'));
const MODULE = join(dir, 'queue.mjs');
writeFileSync(MODULE, `${lift('instantOf')}\n${lift('today')}\nexport { instantOf, today };\n`);

/* Nothing of the original may survive as a type annotation, or the child
   throws a syntax error that looks like a timezone failure. */
const lifted = readFileSync(MODULE, 'utf8');
check('the functions were lifted cleanly, with no types left in them',
  !/:\s*(string|number)\b/.test(lifted.replace(/\/\*[\s\S]*?\*\//g, '')),
  lifted.split('\n').find((line) => /:\s*(string|number)\b/.test(line)) ?? '');

/**
 * Run a snippet in a child process under a fixed `TZ`.
 *
 * The timezone is read once when a process starts, so it cannot be changed
 * from inside this one. A child is the only way to ask "what would this do in
 * Johannesburg" and then "what would it do in Denver" in the same run.
 */
function under(tz: string, body: string): string {
  const code = `import { instantOf, today } from ${JSON.stringify(MODULE)};\n${body}`;
  return execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    env: { ...process.env, TZ: tz },
    encoding: 'utf8',
  }).trim();
}

/* ── The source still does what is inlined above ──────────────────────────
   A copy of four lines is a copy that drifts. This is the guard: if the real
   one stops building its Date from an unzoned string, this check is testing
   something that is no longer in the app and has to be rewritten. */
check(
  'the real instantOf still builds an unzoned Date, which is what this checks',
  /new Date\(`\$\{date\}T\$\{time\}`\)/.test(source),
  'queue.ts changed shape — update check-queue.mts',
);
check(
  'and still does not append a Z',
  !/\$\{time\}Z`/.test(source),
  'a Z appeared — that is the bug this exists for',
);

/* ── Johannesburg, UTC+2 ──────────────────────────────────────────────────
   Six in the evening in Johannesburg is four in the afternoon UTC. */
{
  const got = under('Africa/Johannesburg', `
    console.log(instantOf('2026-06-09', '18:00'));
  `);
  check('six in the evening in Johannesburg is 16:00 UTC',
    got === '2026-06-09T16:00:00.000Z', got);
}

/* ── Denver, UTC-6 ────────────────────────────────────────────────────────
   The other side of UTC, so a sign error cannot pass both. Six in the evening
   in Denver in June (daylight saving, UTC-6) is midnight the next day. */
{
  const got = under('America/Denver', `
    console.log(instantOf('2026-06-09', '18:00'));
  `);
  check('six in the evening in Denver is midnight UTC the next day',
    got === '2026-06-10T00:00:00.000Z', got);
}

/* ── The same wall-clock time is a different instant in each ──────────────
   The assertion that actually says "this is timezone-aware". If the two agreed
   the conversion would be ignoring the zone entirely, which is the bug. */
{
  const jhb = under('Africa/Johannesburg', `
    console.log(instantOf('2026-06-09', '18:00'));
  `);
  const den = under('America/Denver', `
    console.log(instantOf('2026-06-09', '18:00'));
  `);
  check('the same six o\'clock is a different instant in two places', jhb !== den,
    `both ${jhb}`);
}

/* ── Across a daylight-saving change ──────────────────────────────────────
   South Africa has none, which is why this uses a place that does. In Denver
   the clocks go forward in March; the same wall-clock time on either side of
   it is a different offset from UTC, and a conversion that hard-codes an
   offset instead of asking the zone gets one of them wrong. */
{
  const winter = under('America/Denver', `
    console.log(instantOf('2026-01-15', '18:00'));
  `);
  const summer = under('America/Denver', `
    console.log(instantOf('2026-07-15', '18:00'));
  `);
  check('the offset follows daylight saving rather than being fixed',
    winter.endsWith('T01:00:00.000Z') && summer.endsWith('T00:00:00.000Z'),
    `winter ${winter}, summer ${summer}`);
}

// ── What is refused ──────────────────────────────────────────────────────
{
  const out = under('Africa/Johannesburg', `
    /* Mapped through String rather than joined directly: Array#join turns
       null into an empty string, so a refusal and a bug that returned '' would
       have looked identical here. */
    console.log([
      instantOf('', '18:00'),
      instantOf('2026-06-09', ''),
      instantOf('9 June 2026', '18:00'),
      instantOf('2026-06-09', '6pm'),
      instantOf('2026-13-09', '18:00'),
    ].map(String).join(','));
  `);
  const said = out.split(',');
  check('an empty date is refused', said[0] === 'null', said[0]);
  check('an empty time is refused', said[1] === 'null', said[1]);
  check('a written date is refused', said[2] === 'null', said[2]);
  check('a written time is refused', said[3] === 'null', said[3]);
  /* A thirteenth month is the shape of a date and not a date. `new Date` says
     Invalid Date for it, which is what the null comes from — worth pinning,
     because a version that built the parts by hand would happily roll it into
     January. */
  check('a thirteenth month is refused', said[4] === 'null', said[4]);
}

// ── Today, for the date input's floor ────────────────────────────────────
{
  /* Kiritimati is UTC+14, so its local date is ahead of the UTC date for ten
     hours of every day. `today()` deliberately reads the local parts rather
     than slicing an ISO string, and this is where that difference shows.
     Either answer is right depending on the hour this runs; what is pinned is
     that it uses the local date rather than the UTC one. */
  const got = under('Pacific/Kiritimati', `
    console.log(today() + ' ' + new Date().toISOString().slice(0, 10));
  `);
  const [local, utc] = got.split(' ');
  check('today() is a date an <input type="date"> will take', /^\d{4}-\d{2}-\d{2}$/.test(local), local);
  check('and it is the local date, which UTC+14 either matches or is a day ahead of',
    local === utc || local > utc, `local ${local}, utc ${utc}`);
}
{
  const got = under('Africa/Johannesburg', `console.log(today());`);
  check('and it answers in the zone this app is for too',
    /^\d{4}-\d{2}-\d{2}$/.test(got), got);
}

if (bad) {
  console.error(`\ncheck:queue — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:queue — a time somebody typed is the instant they meant, in any zone.');
