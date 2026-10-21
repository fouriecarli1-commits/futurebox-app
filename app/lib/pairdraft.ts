/**
 * What travels between two people in a pair room: the work so far.
 *
 * The owner, 21 October 2026, testing a collab: *"Ek het klaar geskryf en die
 * ander persoon kans gegee, maar daar wys niks aan hulle kant nie."* The pen
 * moved; the words stayed on her phone. A turn handed over without the
 * thing being worked on is a turn at an empty page.
 *
 * Make a song is the room this covers: its whole work in progress is a few
 * fields of text, the `Canvas` the studio already holds. The rooms whose work
 * is audio or pictures are not sent this way — a booth session is megabytes,
 * not a row — so `draftFor` answers null for them and the room says nothing
 * travels rather than pretending it does.
 *
 * Shared by the route and the page: the server cleans what it is given with
 * the same function the page reads it back with, so a field one side drops
 * the other never sees.
 */
import { MOODS, type Mood } from '../data/songstarts';
import type { SurfaceId } from './surfaces';

export interface SongDraft {
  readonly title: string;
  readonly lyrics: string;
  readonly style: string;
  readonly about: string;
  readonly feeling: Mood | null;
}

/** Room enough for a long song with every section written out, and no more. */
export const DRAFT_LIMITS = { title: 200, lyrics: 20_000, style: 2_000, about: 2_000 } as const;

const text = (value: unknown, most: number): string =>
  (typeof value === 'string' ? value : '').slice(0, most);

/** The rooms whose work travels with the turn. */
export const DRAFT_ROOMS: readonly SurfaceId[] = ['make'];

/**
 * The draft for this room, cleaned: only the known fields, each cut to its
 * limit, the feeling only when it is one of the app's own. Null for a room
 * that does not carry one, or for something that is not an object.
 */
export function draftFor(surface: SurfaceId | string, raw: unknown): SongDraft | null {
  if (!DRAFT_ROOMS.includes(surface as SurfaceId)) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const given = raw as Record<string, unknown>;
  const feeling = MOODS.some((one) => one.id === given.feeling) ? (given.feeling as Mood) : null;
  return {
    title: text(given.title, DRAFT_LIMITS.title),
    lyrics: text(given.lyrics, DRAFT_LIMITS.lyrics),
    style: text(given.style, DRAFT_LIMITS.style),
    about: text(given.about, DRAFT_LIMITS.about),
    feeling,
  };
}

/** True when two drafts say the same thing, so an unchanged one is not sent again. */
export const sameDraft = (one: SongDraft | null, two: SongDraft | null): boolean =>
  JSON.stringify(one) === JSON.stringify(two);
