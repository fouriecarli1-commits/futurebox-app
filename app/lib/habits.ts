/**
 * What this person keeps doing, read off what they have already made.
 *
 * ── Why there is no tracker here ─────────────────────────────────────────
 *
 * The ask was for the app to notice how somebody uses it and greet them with
 * it: "another dubstep song today?". The obvious way to build that is to start
 * logging what they click, and it would be the wrong way. Everything needed is
 * already written down for other reasons — `lib/library.ts` keeps their songs
 * with the genre they asked for, and `lib/makes.ts` keeps what came out of
 * each room — so this reads those two and derives the answer. Nothing new is
 * collected, nothing leaves the device, and there is no second store to keep
 * in step with the first.
 *
 * That also makes the whole thing testable as arithmetic, which is why it is a
 * library with no I/O rather than a hook.
 *
 * ── The thresholds, and why they are not one ─────────────────────────────
 *
 * A greeting that claims a preference from a single song is worse than a
 * greeting that claims nothing. Somebody who tried drum and bass once and went
 * back to gospel, asked every morning whether they want more drum and bass,
 * learns that the app is guessing — and once it has been caught guessing about
 * something small, nothing it says later is trusted.
 *
 * So a habit has to be a habit: seen at least twice, and at least a third of
 * recent work. Below that the answer is `null`, and the screen says something
 * true and general instead. `null` is a first-class answer here, not a failure
 * to compute one.
 */

import type { SurfaceId } from './surfaces';

/** One song, as much of it as this file cares about. */
export interface SongLike {
  readonly genre?: string;
  readonly style?: string;
  readonly createdAt?: string;
}

/** One thing made in a room, as much of it as this file cares about. */
export interface MakeLike {
  readonly surface?: string;
  readonly createdAt?: string;
}

export interface Habit {
  /** Their own name, as they typed it on their channel. Empty when unset. */
  readonly name: string;
  /** The room they work in most, once that is more than a coincidence. */
  readonly room: SurfaceId | null;
  /** The genre they keep coming back to, in their own spelling. */
  readonly genre: string | null;
  readonly songs: number;
  readonly makes: number;
  /** The most recent thing they made, of either kind. */
  readonly lastAt: string | null;
  /** Have they been here before at all? Decides greeted-back or greeted-first. */
  readonly returning: boolean;
}

/**
 * How far back a habit is read.
 *
 * Somebody who made trance for a year and has spent this month on gospel is
 * doing gospel. A window keeps the greeting current instead of averaging over
 * everything they have ever done, which would take months to move.
 */
export const RECENT_SONGS = 12;
export const RECENT_MAKES = 30;

/** Seen this many times before it counts as anything. */
const LEAST_TIMES = 2;
/** And this much of the window, so two out of eleven is still a coincidence. */
const LEAST_SHARE = 1 / 3;

function newestFirst<T extends { createdAt?: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/**
 * The most common value, if it is common enough to mean something.
 *
 * Returns the winner in the spelling it was most recently written in, because
 * "Dubstep" typed by them reads better back to them than a lowercased key.
 */
function commonest(values: readonly string[]): string | null {
  const counts = new Map<string, { times: number; shown: string }>();
  values.forEach((raw) => {
    const value = raw.trim();
    if (!value) return;
    const key = value.toLowerCase();
    const had = counts.get(key);
    // Newest first on the way in, so the first spelling seen is the latest one.
    counts.set(key, { times: (had?.times ?? 0) + 1, shown: had?.shown ?? value });
  });
  if (!counts.size) return null;

  const named = [...counts.values()].sort((a, b) => b.times - a.times);
  const top = named[0];
  const total = values.filter((one) => one.trim()).length;
  if (top.times < LEAST_TIMES || top.times / total < LEAST_SHARE) return null;
  /* A tie is not a habit either. Two genres level on three each says they do
     both, and picking one of them by sort order would be inventing a
     preference out of an implementation detail. */
  if (named[1] && named[1].times === top.times) return null;
  return top.shown;
}

/** The genre of a song, falling back to the first word of its style. */
function genreOf(song: SongLike): string {
  const said = (song.genre ?? '').trim();
  if (said) return said;
  return (song.style ?? '').trim().split(/[,\s]+/)[0] ?? '';
}

export function habitOf(
  songs: readonly SongLike[],
  makes: readonly MakeLike[],
  /* Their name comes from their channel, which is a server round trip, so it
     is passed in rather than fetched here — this file stays arithmetic. */
  name = '',
): Habit {
  const recentSongs = newestFirst(songs).slice(0, RECENT_SONGS);
  const recentMakes = newestFirst(makes).slice(0, RECENT_MAKES);

  const lastAt =
    [recentSongs[0]?.createdAt, recentMakes[0]?.createdAt]
      .filter((one): one is string => Boolean(one))
      .sort()
      .pop() ?? null;

  return {
    name: firstName(name),
    room: (commonest(recentMakes.map((one) => one.surface ?? '')) as SurfaceId | null) ?? null,
    genre: commonest(recentSongs.map(genreOf)),
    songs: songs.length,
    makes: makes.length,
    lastAt,
    returning: songs.length + makes.length > 0,
  };
}

/**
 * What to put in front of them, and on what grounds.
 *
 * The wording is not here on purpose. This says *which* thing is true about
 * them and hands the screen the pieces; the screen says it in their language.
 * Keeping the sentence out of this file is what lets the whole decision be
 * checked as arithmetic in both languages at once.
 */
export type Suggestion =
  /** Nothing is known yet, so nothing is claimed. */
  | { readonly kind: 'first'; readonly room: SurfaceId }
  /** They keep making one kind of song. */
  | { readonly kind: 'genre'; readonly room: SurfaceId; readonly genre: string }
  /** No clear genre, but a room they live in. */
  | { readonly kind: 'room'; readonly room: SurfaceId }
  /** They have been here, but not enough of either to say more. */
  | { readonly kind: 'again'; readonly room: SurfaceId };

/** Where somebody with no history should start, which is where everyone starts. */
const FIRST_ROOM: SurfaceId = 'make';

export function suggest(habit: Habit): Suggestion {
  if (!habit.returning) return { kind: 'first', room: FIRST_ROOM };
  /* Genre before room, because it is the more specific true thing. "Another
     dubstep song?" is a better offer than "back to the video desk?" even when
     both are earned — it names what they make rather than where they were. */
  if (habit.genre) return { kind: 'genre', room: FIRST_ROOM, genre: habit.genre };
  if (habit.room) return { kind: 'room', room: habit.room };
  return { kind: 'again', room: FIRST_ROOM };
}

/**
 * Morning, afternoon or evening, for the greeting itself.
 *
 * The device's own clock, because it is the only one that knows where they
 * are. A server would have to be told, and getting it wrong means saying good
 * morning to somebody at nine at night — which is the kind of small wrongness
 * that makes a whole screen feel automated.
 */
export type PartOfDay = 'morning' | 'afternoon' | 'evening';

export function partOfDay(at: Date): PartOfDay {
  const hour = at.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * The first name alone, which is what a greeting uses.
 *
 * "Hello, Carli" rather than "Hello, Carli Fourie". A channel name is not
 * always a person's name, so anything that does not look like one is left
 * whole: "Hello, Blue Room Records" is right and "Hello, Blue" is not.
 */
export function firstName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const words = clean.split(' ');
  if (words.length !== 2) return clean;
  // Two words that both read as names: take the first. Anything with a
  // non-letter in it is a stage name and is left alone.
  return words.every((one) => /^[\p{L}'’-]+$/u.test(one)) ? words[0] : clean;
}
