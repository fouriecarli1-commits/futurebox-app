/**
 * The greeting's arithmetic.
 *
 * This decides what the app says it knows about somebody, so the thing worth
 * checking is not that it finds a habit — it is that it *refuses* to find one
 * that is not there. A greeting which claims a preference off a single song is
 * worse than a greeting which claims nothing: once the app has been caught
 * guessing about something small, nothing it says later is trusted.
 *
 * So most of what follows is a list of shapes that must come back `null`.
 */

import {
  habitOf,
  suggest,
  partOfDay,
  firstName,
  RECENT_SONGS,
  type MakeLike,
  type SongLike,
} from '../app/lib/habits.ts';
import type { TasteLine } from '../app/lib/taste.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) {
    bad += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/** Songs newest-last, so the dates are easy to read in the cases below. */
function songs(...genres: string[]): SongLike[] {
  return genres.map((genre, at) => ({
    genre,
    createdAt: new Date(2026, 0, at + 1).toISOString(),
  }));
}

function makes(...surfaces: string[]): MakeLike[] {
  return surfaces.map((surface, at) => ({
    surface,
    createdAt: new Date(2026, 0, at + 1).toISOString(),
  }));
}

// ── Nothing known ────────────────────────────────────────────────────────
{
  const habit = habitOf([], []);
  check('an empty history claims no genre', habit.genre === null, String(habit.genre));
  check('and no room', habit.room === null, String(habit.room));
  check('and does not call them returning', !habit.returning);
  check('and is offered a first song', suggest(habit).kind === 'first', suggest(habit).kind);
}

// ── One of something is not a habit ──────────────────────────────────────
{
  const habit = habitOf(songs('dubstep'), makes('make'));
  check('one song is not a genre habit', habit.genre === null, String(habit.genre));
  check('one make is not a room habit', habit.room === null, String(habit.room));
  check('but they are still a returning visitor', habit.returning);
  check('and are asked simply to make again', suggest(habit).kind === 'again', suggest(habit).kind);
}

// ── Two of something, and nothing else, is ───────────────────────────────
{
  const habit = habitOf(songs('dubstep', 'dubstep'), []);
  check('twice out of two is a habit', habit.genre === 'dubstep', String(habit.genre));
  const said = suggest(habit);
  check('and it is offered back', said.kind === 'genre', said.kind);
  check('with the genre carried', said.kind === 'genre' && said.genre === 'dubstep');
}

// ── Twice, but drowned out ───────────────────────────────────────────────
{
  // Two dubstep in eleven songs is 18% — under a third, so it means nothing.
  const habit = habitOf(
    songs('dubstep', 'dubstep', 'gospel', 'kwaito', 'house', 'rock', 'jazz', 'soul', 'folk', 'pop', 'trap'),
    [],
  );
  check('twice out of eleven is a coincidence, not a habit', habit.genre === null, String(habit.genre));
}

// ── A tie is not a preference ────────────────────────────────────────────
{
  const habit = habitOf(songs('dubstep', 'dubstep', 'gospel', 'gospel'), []);
  check('two genres level on two each is not a preference', habit.genre === null, String(habit.genre));
}

// ── They moved on ────────────────────────────────────────────────────────
{
  /* Forty trance songs from last year, twelve gospel ones this month. Over the
     whole history trance wins four to one and would keep winning for months;
     over the window it is not there at all. That is the difference the window
     is for. */
  const before = Array.from({ length: 40 }, (_, at) => ({
    genre: 'trance',
    createdAt: new Date(2025, 0, at + 1).toISOString(),
  }));
  const lately = Array.from({ length: 12 }, (_, at) => ({
    genre: 'gospel',
    createdAt: new Date(2026, 5, at + 1).toISOString(),
  }));
  const habit = habitOf([...before, ...lately], []);
  check('a habit is read off recent work, not everything ever', habit.genre === 'gospel', String(habit.genre));
  check(`and the window is ${RECENT_SONGS} songs`, RECENT_SONGS === 12, String(RECENT_SONGS));
  check('the count still reports everything', habit.songs === 52, String(habit.songs));

  /* And it does not turn on a sixpence. Four new songs against eight older
     ones inside the same window leave the old answer standing, which is right:
     one afternoon on something else is not a change of direction, and a
     greeting that follows every whim reads as noise rather than attention. */
  const dabbling = habitOf(
    [
      ...Array.from({ length: 8 }, (_, at) => ({
        genre: 'trance',
        createdAt: new Date(2026, 0, at + 1).toISOString(),
      })),
      ...Array.from({ length: 4 }, (_, at) => ({
        genre: 'gospel',
        createdAt: new Date(2026, 1, at + 1).toISOString(),
      })),
    ],
    [],
  );
  check('four new songs do not overturn eight', dabbling.genre === 'trance', String(dabbling.genre));
}

// ── Their spelling, not ours ─────────────────────────────────────────────
{
  const habit = habitOf(songs('Amapiano', 'amapiano', 'AMAPIANO'), []);
  check('spellings are counted as one thing', habit.genre !== null, String(habit.genre));
  check('and it comes back in the most recent spelling', habit.genre === 'AMAPIANO', String(habit.genre));
}

// ── The genre falls back to the style ────────────────────────────────────
{
  const habit = habitOf(
    [
      { style: 'boom bap, dusty', createdAt: '2026-01-01T00:00:00.000Z' },
      { style: 'boom bap warm', createdAt: '2026-01-02T00:00:00.000Z' },
    ],
    [],
  );
  check('a song with no genre falls back to its style', habit.genre === 'boom', String(habit.genre));
}

// ── Rooms ────────────────────────────────────────────────────────────────
{
  const habit = habitOf([], makes('canvas', 'canvas', 'canvas', 'make'));
  check('a room worked in repeatedly is a habit', habit.room === 'canvas', String(habit.room));
  const said = suggest(habit);
  check('with no genre, the room is what is offered', said.kind === 'room', said.kind);
  check('and it is that room', said.room === 'canvas', said.room);
}

{
  // A genre beats a room: it names what they make rather than where they were.
  const habit = habitOf(songs('kwaito', 'kwaito'), makes('canvas', 'canvas', 'canvas'));
  check('a genre is offered ahead of a room', suggest(habit).kind === 'genre', suggest(habit).kind);
}

// ── Nothing here throws on rubbish ───────────────────────────────────────
{
  const habit = habitOf(
    [{ genre: '   ' }, { genre: '' }, { style: '' }],
    [{ surface: '' }, {}],
  );
  check('blank genres are not a genre', habit.genre === null, String(habit.genre));
  check('blank rooms are not a room', habit.room === null, String(habit.room));
  check('and undated rows do not break the sort', habit.lastAt === null, String(habit.lastAt));
}

// ── The account, which outranks the device ───────────────────────────────
const kept = (kind: 'genre' | 'room', label: string, times: number): TasteLine =>
  ({ kind, label, times, last_at: '2026-06-01T00:00:00.000Z' });

{
  /* The case the whole table exists for: a browser that has never seen them.
     No songs, no history, and the account still knows what they make. */
  const habit = habitOf([], [], '', [kept('genre', 'amapiano', 9), kept('genre', 'gospel', 2)]);
  check('a fresh browser still knows them, from the account',
    habit.genre === 'amapiano', String(habit.genre));
  check('and they are not treated as a first-time visitor', habit.returning);
  check('and the screen is told where it came from', habit.source === 'account', habit.source);
  check('which is what gets offered', suggest(habit).kind === 'genre', suggest(habit).kind);
}

{
  // Where they disagree, the account wins: it describes the person, the
  // device describes one browser.
  const habit = habitOf(songs('trance', 'trance', 'trance'), [], '', [kept('genre', 'kwaito', 20)]);
  check('the account outranks the device where they disagree',
    habit.genre === 'kwaito', String(habit.genre));
}

{
  // And the same thresholds apply to it. A count of one arriving from a
  // server is no more a habit than a single song in a library.
  const habit = habitOf([], [], '', [kept('genre', 'amapiano', 1)]);
  check('one on the account is still not a habit', habit.genre === null, String(habit.genre));
  check('but it is still proof they have been here', habit.returning);
  check('and the source is the device — the account answered nothing',
    habit.source === 'none', habit.source);
}

{
  const habit = habitOf([], [], '', [kept('genre', 'amapiano', 3), kept('genre', 'gospel', 3)]);
  check('a tie on the account is two things they do, not a preference',
    habit.genre === null, String(habit.genre));
}

{
  // Drowned out on the account, exactly as on the device.
  const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((one) => kept('genre', one, 2));
  const habit = habitOf([], [], '', [kept('genre', 'amapiano', 2), ...many]);
  check('two out of eighteen on the account is a coincidence too',
    habit.genre === null, String(habit.genre));
}

{
  // A room from the account, with no genre anywhere.
  const habit = habitOf([], [], '', [kept('room', 'canvas', 12), kept('room', 'make', 2)]);
  check('a room the account remembers is offered', suggest(habit).kind === 'room', suggest(habit).kind);
  check('and it is that room', suggest(habit).room === 'canvas', suggest(habit).room);
}

{
  // Nothing anywhere: the device answers, and says so.
  const habit = habitOf(songs('dubstep', 'dubstep'), [], '', []);
  check('with an empty account the device still answers', habit.genre === 'dubstep', String(habit.genre));
  check('and the screen is told it was the device', habit.source === 'device', habit.source);
}

check('and with nothing at all, nothing is claimed',
  habitOf([], [], '', []).source === 'none', habitOf([], [], '').source);

// ── The name ─────────────────────────────────────────────────────────────
check('a first name is used alone', firstName('Carli Fourie') === 'Carli', firstName('Carli Fourie'));
check('one name is left as it is', firstName('Carli') === 'Carli');
check('a stage name is not chopped in half',
  firstName('Blue Room Records') === 'Blue Room Records', firstName('Blue Room Records'));
check('nor is one with a number in it',
  firstName('Studio 7') === 'Studio 7', firstName('Studio 7'));
check('an accented name survives', firstName('José Marais') === 'José', firstName('José Marais'));
check('an apostrophe is part of a name', firstName("D'Arcy Smit") === "D'Arcy", firstName("D'Arcy Smit"));
check('extra spaces do not make a third word',
  firstName('  Carli   Fourie ') === 'Carli', firstName('  Carli   Fourie '));
check('no name is no name', firstName('   ') === '');

// The name reaches the habit, first name only.
check('the habit carries the first name',
  habitOf([], [], 'Carli Fourie').name === 'Carli', habitOf([], [], 'Carli Fourie').name);

// ── The clock ────────────────────────────────────────────────────────────
check('midnight is morning', partOfDay(new Date(2026, 0, 1, 0, 1)) === 'morning');
check('eleven is morning', partOfDay(new Date(2026, 0, 1, 11, 59)) === 'morning');
check('noon is afternoon', partOfDay(new Date(2026, 0, 1, 12, 0)) === 'afternoon');
check('four is afternoon', partOfDay(new Date(2026, 0, 1, 16, 59)) === 'afternoon');
check('five is evening', partOfDay(new Date(2026, 0, 1, 17, 0)) === 'evening');
check('eleven at night is evening', partOfDay(new Date(2026, 0, 1, 23, 0)) === 'evening');

if (bad) {
  console.error(`\ncheck:habits — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:habits — the greeting claims nothing it has not earned.');
