/**
 * The words travel with the song into the room, and are gated on the way.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Die play room moet die liedjie se woorde
 * speel."*
 *
 * The full-screen panel in the live room has been silent since it was
 * written, and the reason is structural rather than an oversight: a song's
 * words live on its maker's own row and on its maker's own device, and
 * everybody reading the live room is somebody else. There is nothing in
 * there to look up. So the post has to carry them, which is a column, a
 * sender, a store, a reader and a screen — and the symptom of any one of the
 * five missing is the same silent panel.
 *
 * ── The plan, not the timings ────────────────────────────────────────────
 *
 * What travels is the `[Section]` plan: names, lines, and how long each
 * section runs. The room spreads it over whatever the file actually plays,
 * so a song a second longer than its row says stays in step, and a lyric
 * sheet stays a few kilobytes instead of a full set of stamps.
 *
 * ── The half that is not about the feature ───────────────────────────────
 *
 * This is the longest piece of somebody else's writing the room has ever
 * shown to strangers, and it arrives as JSON from a browser into a `jsonb`
 * column. Two things therefore have to be true and are checked here as hard
 * as the feature itself:
 *
 *   · nothing of the sent shape is kept — each section is rebuilt from the
 *     three fields the room uses, bounded in all three directions;
 *   · the words go through the same moderation gate as the title and the
 *     note. The gate was there; the words were simply not in the string
 *     handed to it, which is a gate that passes everything it cannot see.
 *
 *   npm run check:roomwords
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const sql = readFileSync('supabase/live.sql', 'utf8');
const post = readFileSync('app/components/PostToLive.tsx', 'utf8');
const route = readFileSync('app/api/live/route.ts', 'utf8');
const live = readFileSync('app/components/LiveChannel.tsx', 'utf8');
const room = readFileSync('app/components/RoomScreen.tsx', 'utf8');
const plan = readFileSync('app/lib/timeline.ts', 'utf8');

/* ── All five steps, because any one of them alone is silence ─────────── */
ok('a post has somewhere to keep the words',
  /add column if not exists words jsonb/.test(sql),
  'live_posts needs the column, and this file has to be re-runnable');
/* ── BOTH places that post, not the one this check was written against ──

   Carli reported the silent room twice. The first fix went into the share
   sheet in the Library, this check was written against that file, and both
   were right — while the room's OWN composer, the "put one of your own songs
   in" card that somebody standing in Live actually uses, sent no words at
   all. A check that names one of two callers proves half a feature and reads
   as proving the whole one.

   So: one function decides what a post's words are, it lives in `timeline.ts`
   where the shape does, and every path that posts a song has to call it. */
ok('  the plan lives in one place, not in whichever screen posts',
  /export function planOf\(/.test(plan) &&
    /stored\.length \? stored : partsOf\(track\.lyrics \?\? ''\)/.test(plan),
  'only songs made since plans were kept carry one; without this every older song is silent');
ok('  the share sheet sends them', /words: planOf\(track\)/.test(post));
ok('  and so does the room\u2019s own composer', /words: planOf\(track\)/.test(live),
  'a song posted from inside Live carried no words at all');
ok('    and its genre with them', /genre: track\.genre,/.test(live));
ok('  the route stores them', /words: words\.length \? words : null/.test(route));
ok('    as null rather than an empty array where there are none',
  /words\.length \? words : null/.test(route),
  'a reader cannot otherwise tell "no words" from "posted before the column existed"');
ok('  and hands them back', /words: Array\.isArray\(post\.words\) \? post\.words : null/.test(route));
ok('  the room passes them to the panel', /words: one\.words,/.test(live));
ok('  and the panel spreads them over the song',
  /timelineOf\(plan, one\?\.seconds \|\| 0\)/.test(room));
ok('    and follows the sound rather than a guess',
  /addEventListener\('timeupdate'/.test(room) && /lineAt\(timed, along\)/.test(room));

/* ── Rebuilt, not trusted ─────────────────────────────────────────────── */
const built = /const words = \(Array\.isArray\(body\.words\)[\s\S]{0,1400}?\.filter\(\(part\) => part\.lines\.length > 0\);/.exec(route);
ok('what is stored is rebuilt field by field, not the object that arrived',
  Boolean(built) && /name: String\(one\.name/.test(built?.[0] ?? '') &&
    /seconds: Math\.max\(0, Math\.min\(1800/.test(built?.[0] ?? ''),
  'a jsonb column written from a browser keeps whatever it is given');
ok('  bounded in how many sections', /\.slice\(0, 40\)/.test(built?.[0] ?? ''));
ok('  in how many lines one holds', /\.slice\(0, 60\)/.test(built?.[0] ?? ''));
ok('  and in how long a line is', /\.slice\(0, 300\)/.test(built?.[0] ?? ''));

/* ── And through the gate, which is the part that fails silently ──────── */
ok(
  'the words go through the same moderation gate as the title and the note',
  /const sung = words\.flatMap\(\(part\) => part\.lines\)\.join\('\\n'\);/.test(route) &&
    /guard\(request, `\$\{title\}\\n\$\{note\}\\n\$\{sung\}`, 'room', caller\)/.test(route),
  'a gate handed a string the new field is not in passes everything it cannot see',
);

/* ── The screen, on the terms this one screen is built on ─────────────── */
ok(
  'the words do not swallow the tap that pauses the song',
  /pointer-events-none[^"`]*absolute inset-x-6 top-1\/2/.test(room),
  'the whole panel is the pause control, so anything drawn over it has to let a press through',
);
ok(
  'and they are painted in literal light, not in the palette',
  /color: now \? INK : INK_DIM/.test(room),
  'this app remaps Tailwind`s white onto a theme variable, which is near-black in the light theme',
);

if (failures) {
  console.error(
    '\ncheck:roomwords — a song`s words are on its maker`s own row and own device, and\n' +
      'everybody reading the live room is somebody else. The post has to carry them, and\n' +
      'what it carries has to be rebuilt, bounded and moderated like every other string\n' +
      'the room shows to strangers.\n',
  );
  process.exit(1);
}
console.log('\ncheck:roomwords — the words travel with the song, bounded and gated.');
