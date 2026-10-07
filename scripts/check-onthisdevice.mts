/**
 * A room that keeps her work on this device says so.
 *
 * ── Where this comes from ────────────────────────────────────────────────
 *
 * `docs/GOING_LIVE.md`, last line of what is not finished: *"And two things
 * that are true and not yet said everywhere they apply: that the work lives
 * on this device, and that publishing to the ad platforms is not connected."*
 *
 * ── Why it is worth a check rather than a once-over ──────────────────────
 *
 * Because the gap is silent in the direction that costs the most. Nothing on
 * screen is wrong; a room simply does not mention where the work went, and
 * everything in this app is shaped like a cloud app — an account, a sign-in,
 * a bill. The assumption somebody arrives with is that their work is on a
 * server, and the only thing standing between that assumption and a lost
 * afternoon on a new phone is a sentence.
 *
 * And it is a gap that reopens: every new room that files something is a new
 * room that can forget to say it. This one found the Video Editor's project
 * on the day it was written.
 *
 * ── The one that was worse than silent ───────────────────────────────────
 *
 * The dub rooms said *"You can close this and come back — it keeps going on
 * their side."* That is true about the dub and wrong about what to do with
 * it: the ticket this app needs to collect a finished dub is written to
 * localStorage on the device that started it. The job really does keep
 * running; it is this app, on her other phone, that will never go and fetch
 * it — and she has paid credits for it.
 *
 * A sentence true about the supplier and silent about the ticket is the most
 * expensive kind of half-truth here, which is why the last rule names that
 * key by hand.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

/**
 * The stores that only ever exist on one device, and how a room writes to one.
 *
 * Named here rather than derived, because "this never leaves the device" is a
 * promise about a module and not a shape a grep can see. The rule under it
 * makes the list answerable: each of these has to actually be device-only, so
 * a module that grows a `fetch` falls out of the list by failing rather than
 * by being quietly wrong in it.
 */
const STORES: readonly { readonly file: string; readonly writes: readonly string[] }[] = [
  { file: 'app/lib/library.ts', writes: ['putAudio(', 'saveTracks('] },
  { file: 'app/lib/assets.ts', writes: ['rememberAsset('] },
  { file: 'app/lib/brought.ts', writes: ['fileIt(', 'starBrought('] },
  { file: 'app/lib/filmkeep.ts', writes: ['keepFilm('] },
  { file: 'app/lib/makes.ts', writes: ['remember('] },
  { file: 'app/lib/uploads.ts', writes: ['addUpload(', 'editUpload('] },
  { file: 'app/lib/dubjob.ts', writes: ['remember('] },
];

for (const store of STORES) {
  const text = withoutComments(readFileSync(store.file, 'utf8'));
  ok(`${store.file.split('/').pop()} really does keep its own copy here`,
    /localStorage|indexedDB/.test(text),
    'the list is only worth having if being on it is a fact rather than a'
    + ' label');
}

/* ── Which rooms write, and which of those say so ──────────────────────── */

const dict = readFileSync('app/lib/i18n.tsx', 'utf8');

/* Sliced from one entry's opening to the next, the way `check:afrikaans`
   does it and for the same reason: a body matched with `\{([^}]*)\}` stops at
   the first closing brace, which inside "…{seconds} seconds…" belongs to a
   placeholder. The first version here used a lazy `[\s\S]{0,1200}?` instead
   and found ten entries where a plain grep finds seventy-seven lines — it was
   silently skipping every entry written on one line. */
const starts = [...dict.matchAll(/^\s*"([^"]+)":\s*\{/gm)];
const bodies = starts.map((hit, at) => ({
  key: hit[1],
  text: dict.slice(hit.index ?? 0, at + 1 < starts.length ? starts[at + 1].index ?? dict.length : dict.length),
}));

/* ── Two matchers, and the difference between them is the point ─────────

   `saysDevice` is "does this line TELL her where her work lives", so it takes
   the affirmative phrasings only, and only off the English — the parity rule
   below then guarantees the Afrikaans. "That file is missing from this
   device" mentions the device and promises nothing, and a room must not pass
   on an error message.

   The parity rule takes any mention at all, because what it is about is a
   fact going missing in one language rather than a promise being made. */
const saysDevice = new Set(
  bodies
    .filter((one) => {
      const english = /\ben:\s*"((?:[^"\\]|\\.)*)"/.exec(one.text)?.[1] ?? '';
      /* A promise, not a report. "That file is not on this device any more"
         mentions the device and says nothing about where work is kept, and a
         room passing on one of those is a room that tells her nothing until
         something has already gone missing. */
      if (/not (on|in) this device|missing from this device|no longer on this device/i.test(english)) {
        return false;
      }
      return /(on|to) this device|this device only|kept here, on this device/i.test(english);
    })
    .map((one) => one.key),
);

/* Both halves or neither. A line that says where the work is in English and
   not in Afrikaans is the sentence missing for the reader most likely to be
   reading it — and `check:afrikaans` cannot see this one, because both halves
   are present and translated; it is the FACT that goes missing. */
const halfSaid = bodies.filter((one) => {
  const [, english = '', afrikaans = ''] = /\ben:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?\baf:\s*"((?:[^"\\]|\\.)*)"/
    .exec(one.text) ?? [];
  if (!english) return false;
  return /this device/i.test(english) !== /hierdie toestel/i.test(afrikaans);
});

ok('the sentence is carried in both languages or in neither',
  halfSaid.length === 0,
  halfSaid.length
    ? halfSaid.map((one) => one.key).join(', ')
    : `${saysDevice.size} lines say where the work is, and none of them says it`
      + ' in one language only');

const every = STORES.flatMap((one) => one.writes);
const silent: string[] = [];
let filing = 0;
for (const file of walk('app/components')) {
  const text = withoutComments(readFileSync(file, 'utf8'));
  /* ── A bare call, not a method on something else ──────────────────
 
     The tokens are the names these store modules export — `remember(`,
     `fileIt(`, `keepFilm(` — and `includes` matched them anywhere, method
     calls included. The photo editor's undo stack has a `remember` of its
     own, in memory, about a picture nobody is filing anywhere, and this
     rule reported the room as filing something and saying nothing about
     where it went. A store function is called by its own name; a method is
     called after a dot. */
  const calls = (write: string): boolean =>
    new RegExp(`(^|[^.\\w])${write.replace('(', '\\(')}`, 'm').test(text);
  if (!every.some(calls)) continue;
  filing += 1;
  const keys = [...text.matchAll(/t\(\s*'([^']+)'/g)].map((hit) => hit[1]);
  /* Through the dictionary keys only. The first version also accepted the
     phrase appearing anywhere in the file, and that let the Video Editor pass
     on `"That file is not on this device any more."` — an error message about
     a file that has gone, which promises nothing about where work is kept.
     Proved by taking the room's real sentence out and watching the check stay
     green. Everything somebody reads in this app goes through `t`, and
     `check:afrikaans` is what keeps that true. */
  if (keys.some((key) => saysDevice.has(key))) continue;
  silent.push(file.replace('app/components/', ''));
}

ok('every room that files something says where it went',
  silent.length === 0,
  silent.length
    ? silent.join(', ')
    : `${filing} rooms file something on this device and all of them say so.`
      + ' Everything in this app is shaped like a cloud app — an account, a'
      + ' sign-in, a bill — so the assumption somebody arrives with is that'
      + ' their work is on a server, and a sentence is the only thing between'
      + ' that and a lost afternoon on a new phone');

/* ── And the one that was worse than silent ────────────────────────────── */

const leave = dict.slice(dict.indexOf('"dub.leave"'), dict.indexOf('"dub.leave"') + 900);

ok('the dub does not say "come back" without saying where',
  /on this device/i.test(leave) && /op hierdie toestel/i.test(leave),
  'it said "you can close this and come back — it keeps going on their side",'
  + ' which is true about the dub and wrong about what to do with it: the'
  + ' ticket to collect it is in localStorage on the device that started it,'
  + ' and she has paid credits for the job');

ok('  and neither does the fallback written beside it',
  /on this device/i.test(
    withoutComments(readFileSync('app/components/DubEpisode.tsx', 'utf8'))
      .split("t('dub.leave'")[1]?.slice(0, 300) ?? '',
  ),
  'a fallback is what somebody reads when the key is missing, so a fallback'
  + ' carrying the old sentence is the old sentence still shipping');

/* ── The other half of the same line in GOING_LIVE ─────────────────────── */

ok('the places that offer a post say whether they can post',
  /It cannot post for you/i.test(dict) && /Everything under it opens somebody/i.test(dict),
  'the queue says it reminds rather than posts, and the share row says which'
  + ' single one of its buttons really publishes');

if (bad) {
  console.error(`\ncheck:onthisdevice — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:onthisdevice — ${STORES.length} stores keep a copy on one device,`
  + ` all ${filing} rooms that write to one say so, and nothing says "come`
  + ' back" without saying where.',
);
