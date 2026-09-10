/**
 * The register's front door, and the one way it rots.
 *
 * ── Why there is a front door at all ─────────────────────────────────────
 *
 * `docs/OPEN-QUESTIONS.md` is 2,600 lines and grows every session. Eleven
 * sections were appended to it on 10 September alone. Carli said she would
 * "alles later kyk" — and nobody reads 2,600 lines of chronological append,
 * so a register in that shape is not a register, it is an archive with a
 * misleading name.
 *
 * So the top of it carries a short block in Afrikaans: what is waiting on
 * her, what is stuck and on what, and the one lesson worth keeping. The body
 * stays exactly as it was, in the order things happened, because that is the
 * record and rewriting a record to be tidy is how a record stops being one.
 *
 * ── The one way a front door fails ───────────────────────────────────────
 *
 * It goes stale. Somebody appends a section at the bottom, does not touch
 * the top, and now the first thing she reads is a confident summary of last
 * week — which is worse than no summary, because she has no reason to doubt
 * it.
 *
 * That is checkable, and it is the only part of this that is. So: the date
 * in the front-door heading must equal the file's own "Last updated" date.
 * Append without touching the top and the build goes red, naming both dates.
 *
 * What is NOT checkable is whether the summary is TRUE. Nothing here can
 * read the body and decide whether "what is waiting on her" is still what is
 * waiting on her. The date rule only guarantees somebody looked. That is a
 * smaller promise than it appears and it is written down so nobody mistakes
 * a green build for a current summary.
 */
import { existsSync, readFileSync } from 'node:fs';

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

const REGISTER = 'docs/OPEN-QUESTIONS.md';
const page = readFileSync(REGISTER, 'utf8');

const door = page.match(/^## Lees dit eerste — waar dinge staan, (\d{1,2}) (\w+) (\d{4})$/m);
ok('the register opens with a front door', Boolean(door),
  `${REGISTER} is 2,600 lines and nobody reads that from the top`);

const stamped = page.match(/^Last updated: (\d{4})-(\d{2})-(\d{2})\.$/m);
ok('and it says when it was last touched', Boolean(stamped), '');

if (door && stamped) {
  const MONTHS: Record<string, string> = {
    Januarie: '01', Februarie: '02', Maart: '03', April: '04', Mei: '05', Junie: '06',
    Julie: '07', Augustus: '08', September: '09', Oktober: '10', November: '11', Desember: '12',
  };
  const doorDate = `${door[3]}-${MONTHS[door[2]] ?? '??'}-${door[1].padStart(2, '0')}`;
  const fileDate = `${stamped[1]}-${stamped[2]}-${stamped[3]}`;
  ok('and the front door is as new as the file',
    doorDate === fileDate,
    `the door says ${doorDate}, the file says ${fileDate} — somebody appended a section and left the summary behind`);
}

/* The door points at four things. A pointer to something that is gone is the
   other way a summary lies, and unlike its truth this part IS checkable. */
const front = page.slice(0, page.indexOf('\n---\n', page.indexOf('Lees dit eerste')));
for (const [what, where] of [
  ['the sales letter', 'docs/ELEVENLABS-SALES.md'],
  ['the dictionary route', 'app/api/eleven/dictionary/route.ts'],
] as const) {
  const named = front.includes(where.replace('app/api', '/api').replace('/route.ts', ''))
    || front.includes(where);
  if (!named) continue;
  ok(`  and ${what} it points at exists`, existsSync(where), `${where} is named and is not there`);
}

if (failures) {
  console.error(`\ncheck:frontdoor — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:frontdoor — the register opens with a summary, and it is as new as the file it summarises.');
