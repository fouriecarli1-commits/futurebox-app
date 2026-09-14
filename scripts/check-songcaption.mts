/**
 * A song window says what it is, who made it, and what kind it is.
 *
 * Named `songcaption` and not `songwindow`: `audit/songwindow.mjs` already
 * exists and is about something else entirely — the video desk's song picker
 * and the bar you drag to choose the piece a video is cut against. Two checks
 * a letter apart in name and unrelated in subject is how somebody edits the
 * wrong one.
 *
 * ── The brief ────────────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"in die live room en in channel wys die liedjie
 * se naam op die liedjie window, die artist name, en die genre van die
 * liedjie. Dit gaan dit makliker maak vir ander users om by mekaar te leer en
 * te hoor watter genre regtig werk en mooi klink."*
 *
 * Three fields, on two screens, and the reason decides the shape: somebody
 * learning which genre works is SCANNING. A genre folded into "pop · 120 BPM
 * · C" at the smallest size on the screen is a fact that is present and not
 * read, which is why both windows carry it as a chip of its own.
 *
 * ── What was actually missing on each ────────────────────────────────────
 *
 * They were missing different things, which is why this holds both rather
 * than one rule applied twice.
 *
 * The **live room** had the name and the maker and no genre — and the genre
 * is the one of the three that cannot be derived: a song's genre lives on its
 * maker's own row, on their own device, and everybody in that room is
 * somebody else. So it needed a column, a post that sends it, and a screen
 * that shows it, and this holds all three so half a migration cannot ship.
 *
 * The **channel** had the name and the genre and no maker, on the one screen
 * where somebody is actually listening.
 *
 * ── The part that is not about layout ────────────────────────────────────
 *
 * Whose name a song carries. `by` is the artist named on a brought-in song,
 * `givenBy` is whoever handed one over in a collab room, and the account's
 * own name comes last. A file somebody else made must not take the reader's
 * name just because it is sitting in their channel — and that ordering is a
 * claim about authorship, so it is held rather than left to a reader of the
 * JSX to notice.
 *
 * The generation style is deliberately NOT here. It is saved with the song,
 * which is what she asked for; putting somebody's prompt in a public table
 * is a different decision and was not one of the three.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const live = readFileSync('app/components/LiveChannel.tsx', 'utf8');
const song = readFileSync('app/components/SongScreen.tsx', 'utf8');
const channel = readFileSync('app/components/Channel.tsx', 'utf8');
const route = readFileSync('app/api/live/route.ts', 'utf8');
const post = readFileSync('app/components/PostToLive.tsx', 'utf8');
const sql = readFileSync('supabase/live.sql', 'utf8');

/* ── The live room: all three, and the whole path behind the genre ─────── */
ok('the live room shows the name', /\{post\.title\}/.test(live));
ok('  and who made it', /\{post\.by\}/.test(live));
ok('  and what kind of song it is', /\{post\.genre\}/.test(live));

/* A screen showing a field nothing stores is a screen showing nothing. Each
   step is held separately because each can be forgotten separately, and the
   symptom of any one of them is the same empty chip. */
ok('a post has somewhere to keep a genre',
  /add column if not exists genre text/.test(sql),
  'live_posts needs the column, and this file has to be re-runnable');
ok('  the poster sends it', /genre: track\.genre/.test(post));
ok('  the route stores it', /genre: String\(body\.genre \?\? ''\)/.test(route));
ok('  and hands it back', /genre: post\.genre \?\? ''/.test(route));

/* Trimmed and bounded like every other string that arrives over the wire and
   is then shown to strangers. */
ok('  and bounds what it stores', /\.trim\(\)\.slice\(0, 60\)/.test(route));

/* ── The channel's window: the same three ─────────────────────────────── */
ok('the channel window shows the name', /\{one\.title\}/.test(song));
ok('  and what kind of song it is', /\{one\.genre\}/.test(song));
ok('  and who made it', /one\.by \|\| one\.givenBy \|\| artist/.test(song));
ok('  which the channel passes in', /artist=\{creator\?\.name/.test(channel));

/* ── Whose name, in which order ───────────────────────────────────────── */
ok(
  'a brought-in song keeps the name it was given, over the reader’s own',
  /\{one\.by \|\| one\.givenBy \|\| artist\}/.test(song),
  'a file somebody else made must not take the reader’s name',
);

/* ── Scannable, on both, for the reason it exists ─────────────────────── */
/* Matched on both spellings, because the two files solve the same
   theme problem differently and both are right: the live room writes its
   colours inline, and `SongScreen` keeps literals at the top of the file
   (`GLASS`, `INK`) because this app remaps Tailwind's white onto a theme
   variable — `bg-white/20` paints near-black on the light theme. */
const chips = (source: string): boolean =>
  /rounded-full[^"`]*text-xs font-bold/.test(source) || /rounded-full[^"`]*\$\{GLASS\}/.test(source);
ok('the genre is a chip in the live room, not a clause', chips(live));
ok('  and a chip in the channel too', chips(song));

/* ── And the style stays where it was ─────────────────────────────────── */
ok(
  'the generation style is not published with the post',
  !/genre.*style|style: track\.style,[\s\S]{0,80}genre/.test(sql) && !/add column if not exists style/.test(sql),
  'saving a style with a song is not the same decision as publishing it',
);

if (failures) {
  console.error(
    '\ncheck:songcaption — a song window shows its name, its maker and its genre, on both\n' +
      'screens. The genre needs a column, a sender, a store and a reader: any one missing\n' +
      'looks exactly like the other three being missing.\n',
  );
  process.exit(1);
}
console.log('\ncheck:songcaption — both song windows say what it is, who made it, and what kind it is.');
