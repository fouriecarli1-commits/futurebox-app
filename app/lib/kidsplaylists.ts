/**
 * A child's own playlists: named lists of their kept songs, in their order.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 19 October 2026: *"Mens moet in kids room ook playlists kan
 * create."* The sleep playlist (`KidsSleep.tsx`) already plays every song in
 * a row; what a child could not do was choose — the dance songs for the car,
 * the quiet ones for bed — and come back to that choice tomorrow.
 *
 * ── The names are stickers, not typing ───────────────────────────────────
 *
 * The kids room promises the parent that every choice is a button from a
 * list we wrote, with one typed line for a song (`KidsBanner`). A playlist
 * name is a choice like the others: a sticker and a name from `NAMES`, in
 * both languages, and the same sticker twice gets a number after it.
 *
 * ── Where they live ──────────────────────────────────────────────────────
 *
 * On the device, in `localStorage`: a list of ids and a sticker is a few
 * hundred bytes, and the songs it points at are already on the account. A
 * song that has gone from the shelf is simply passed over when the list is
 * played, and taken out the next time the list is saved.
 *
 * Pure apart from `loadLists` and `saveLists`, so `check:kidsplaylists`
 * runs every rule without a browser.
 */

/** How many playlists a child keeps. Enough for every mood; few enough to read. */
export const MOST_LISTS = 8;
/** How many songs one list holds. The shelf itself holds fewer. */
export const MOST_IN_LIST = 30;

export const LISTS_KEY = 'futurebox.kids.playlists.v1';

/** The stickers a list can be named, in English and Afrikaans. */
export const NAMES: readonly { readonly id: string; readonly emoji: string; readonly en: string; readonly af: string }[] = [
  { id: 'dance', emoji: '🕺', en: 'Dance party', af: 'Danspartytjie' },
  { id: 'bed', emoji: '🌙', en: 'Bedtime', af: 'Slapenstyd' },
  { id: 'car', emoji: '🚗', en: 'Car trip', af: 'Motorrit' },
  { id: 'happy', emoji: '😊', en: 'Happy songs', af: 'Bly liedjies' },
  { id: 'rain', emoji: '🌧️', en: 'Rainy day', af: 'Reënerige dag' },
  { id: 'party', emoji: '🎂', en: 'Birthday', af: 'Verjaarsdag' },
  { id: 'hero', emoji: '🦸', en: 'Super hero', af: 'Superheld' },
  { id: 'space', emoji: '🚀', en: 'Space trip', af: 'Ruimtereis' },
  { id: 'animals', emoji: '🦁', en: 'Animal songs', af: 'Diereliedjies' },
  { id: 'best', emoji: '⭐', en: 'My favourites', af: 'My gunstelinge' },
];

export interface Playlist {
  readonly id: string;
  /** One of `NAMES`. */
  readonly name: string;
  /** 1 for the first list with that name, 2 for the second… */
  readonly number: number;
  readonly songs: readonly string[];
  readonly made: number;
}

/** What a list is called on the screen: "Dance party", "Dance party 2". */
export function listName(list: Playlist, lang: 'en' | 'af'): string {
  const name = NAMES.find((one) => one.id === list.name) ?? NAMES[NAMES.length - 1];
  return `${name.emoji} ${lang === 'af' ? name.af : name.en}${list.number > 1 ? ` ${list.number}` : ''}`;
}

/** A new list, or null when there is no room for another. */
export function newList(lists: readonly Playlist[], name: string, now: number): Playlist | null {
  if (lists.length >= MOST_LISTS) return null;
  const known = NAMES.some((one) => one.id === name) ? name : NAMES[NAMES.length - 1].id;
  const taken = lists.filter((one) => one.name === known).map((one) => one.number);
  let number = 1;
  while (taken.includes(number)) number += 1;
  return { id: `list-${now}-${lists.length}`, name: known, number, songs: [], made: now };
}

/** In the list, or out of it. A song added goes to the end. */
export function toggled(list: Playlist, songId: string): Playlist {
  if (list.songs.includes(songId)) return { ...list, songs: list.songs.filter((one) => one !== songId) };
  if (list.songs.length >= MOST_IN_LIST) return list;
  return { ...list, songs: [...list.songs, songId] };
}

/** A song one place earlier (`by` -1) or later (+1); the ends stay put. */
export function moved(list: Playlist, songId: string, by: -1 | 1): Playlist {
  const at = list.songs.indexOf(songId);
  const to = at + by;
  if (at < 0 || to < 0 || to >= list.songs.length) return list;
  const songs = list.songs.slice();
  [songs[at], songs[to]] = [songs[to], songs[at]];
  return { ...list, songs };
}

/** The songs still on the shelf, in the list's order. */
export function playable<T extends { readonly id: string }>(list: Playlist, shelf: readonly T[]): T[] {
  const byId = new Map(shelf.map((one) => [one.id, one] as const));
  return list.songs.map((id) => byId.get(id)).filter((one): one is T => Boolean(one));
}

/** The list without songs that have left the shelf. */
export function pruned(list: Playlist, shelfIds: readonly string[]): Playlist {
  const kept = list.songs.filter((id) => shelfIds.includes(id));
  return kept.length === list.songs.length ? list : { ...list, songs: kept };
}

/**
 * An order to play in: the list's own, or shuffled with `random` (0..1) —
 * passed in, so the check can hand it a fixed sequence.
 */
export function order(count: number, shuffle: boolean, random: () => number = Math.random): number[] {
  const at = Array.from({ length: count }, (_, i) => i);
  if (!shuffle) return at;
  for (let i = at.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [at[i], at[j]] = [at[j], at[i]];
  }
  return at;
}

/** Anything read back that is not a list is dropped rather than trusted. */
export function readLists(raw: string | null): Playlist[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((one): one is Playlist => Boolean(one) && typeof one === 'object'
        && typeof (one as Playlist).id === 'string' && typeof (one as Playlist).name === 'string'
        && Array.isArray((one as Playlist).songs))
      .map((one) => ({
        id: one.id,
        name: one.name,
        number: Number(one.number) > 0 ? Math.floor(Number(one.number)) : 1,
        songs: one.songs.filter((id) => typeof id === 'string').slice(0, MOST_IN_LIST),
        made: Number(one.made) || 0,
      }))
      .slice(0, MOST_LISTS);
  } catch {
    return [];
  }
}

export function loadLists(): Playlist[] {
  try {
    return readLists(window.localStorage.getItem(LISTS_KEY));
  } catch {
    return [];
  }
}

export function saveLists(lists: readonly Playlist[]): void {
  try {
    window.localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  } catch {
    /* A private window: the lists last as long as the page. */
  }
}
