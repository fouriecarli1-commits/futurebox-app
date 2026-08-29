'use client';

/**
 * Playlists: songs put in an order somebody chose.
 *
 * Kept on the device, in the same place the songs themselves are kept, because
 * a playlist of tracks that live locally is only meaningful locally — a list
 * synced to an account that then opens on a phone with none of those files
 * would be a list of things that will not play.
 *
 * They hold ids, never copies. A song deleted from the channel disappears from
 * every list it was in, which is the behaviour anybody expects and the reason
 * the read below drops ids it cannot resolve rather than showing a dead row.
 */

const KEY = 'futurebox.playlists.v1';

export interface Playlist {
  readonly id: string;
  readonly name: string;
  /** Track ids, in the order they play. */
  readonly trackIds: readonly string[];
  readonly createdAt: string;
}

export function loadPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Playlist[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((one) => one && typeof one.id === 'string' && Array.isArray(one.trackIds))
      : [];
  } catch {
    return [];
  }
}

export function savePlaylists(lists: readonly Playlist[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
  } catch {
    // Storage full or blocked. The list stays in memory for this session, which
    // is better than refusing to make one.
  }
}

export function newPlaylist(name: string): Playlist {
  return {
    id: `p-${Date.now()}`,
    name: name.trim() || 'Untitled playlist',
    trackIds: [],
    createdAt: new Date().toISOString(),
  };
}

/** Adds a song, or moves nothing if it is already in the list. */
export function withTrack(list: Playlist, trackId: string): Playlist {
  if (list.trackIds.indexOf(trackId) !== -1) return list;
  return { ...list, trackIds: list.trackIds.concat(trackId) };
}

export function withoutTrack(list: Playlist, trackId: string): Playlist {
  return { ...list, trackIds: list.trackIds.filter((id) => id !== trackId) };
}

/** Moves one song up or down. Out-of-range moves are no-ops, not errors. */
export function moved(list: Playlist, trackId: string, by: -1 | 1): Playlist {
  const at = list.trackIds.indexOf(trackId);
  const to = at + by;
  if (at === -1 || to < 0 || to >= list.trackIds.length) return list;
  const next = list.trackIds.slice();
  next[at] = next[to];
  next[to] = trackId;
  return { ...list, trackIds: next };
}
