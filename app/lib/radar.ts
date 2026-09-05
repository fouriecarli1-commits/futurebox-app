'use client';

/**
 * The collab radar's data: your songs, and the ones other people have shown.
 *
 * The matching itself is not new — `app/lib/matching.ts` already scores key,
 * tempo and shared style words, and shows its reasons. What was missing was
 * anything real to match against: it compared demo tracks with demo tracks,
 * which demonstrated matching rather than finding anybody.
 *
 * Both sides are converted to the one shape the matcher already speaks, so the
 * scoring is untouched and the same reasons appear against real people.
 */

import { accessToken } from './cloud';
import type { Track } from './library';
import type { TrackFlavour } from '../data/studio';

export interface RadarTrack {
  readonly id: string;
  readonly title: string;
  readonly genre: string;
  readonly bpm: number;
  readonly key: string;
  readonly style: string;
  readonly models: readonly string[];
  readonly creator: string;
  readonly handle: string;
  readonly links: Record<string, string>;
}

/**
 * Style words as tags.
 *
 * The matcher counts shared tags, so "warm analogue character" has to become
 * one tag rather than three words — splitting on commas keeps the phrases the
 * style field was written in.
 */
export function tagsOf(style: string): string[] {
  return style
    .split(/[,\n]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 12);
}

/** One of your own songs, in the shape the matcher reads. */
export function mineAsFlavour(track: Track, handle: string): TrackFlavour {
  return {
    id: track.id,
    title: track.title,
    creator: 'You',
    handle: handle || '@you',
    genre: track.genre,
    tags: tagsOf(track.style),
    bpm: track.bpm,
    key: track.key,
    models: track.models,
    onChannel: true,
  };
}

/** Somebody else's, in the same shape. */
export function theirsAsFlavour(track: RadarTrack): TrackFlavour {
  return {
    id: track.id,
    title: track.title,
    creator: track.creator,
    handle: track.handle,
    genre: track.genre,
    tags: tagsOf(track.style),
    bpm: track.bpm,
    key: track.key,
    models: track.models,
    onChannel: true,
  };
}

export interface RadarReply {
  readonly tracks: RadarTrack[];
  /** Which of your own songs are already showing, so the switches start right. */
  readonly mineShared: string[];
}

export async function fetchRadar(): Promise<RadarReply> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/radar', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return { tracks: [], mineShared: [] };
    const data = (await response.json()) as { tracks?: RadarTrack[]; mineShared?: string[] };
    return { tracks: data.tracks ?? [], mineShared: data.mineShared ?? [] };
  } catch {
    return { tracks: [], mineShared: [] };
  }
}

/** Turns sharing on or off for one song. Returns what went wrong, or null. */
export async function setShared(id: string, shared: boolean): Promise<string | null> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/radar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, shared }),
    });
    if (response.ok) return null;
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    return data.message ?? 'That did not work.';
  } catch {
    return 'Could not reach the radar.';
  }
}

export interface Creator {
  name: string;
  handle: string;
  about: string;
  links: Record<string, string>;
  /**
   * Where the profile picture sits in the `avatars` bucket, or empty.
   *
   * The stored path rather than a URL: the bucket is public, so the URL is a
   * pure function of the path (`avatar.publicUrl`), and keeping the path means
   * the row survives the project moving to a different Supabase URL.
   *
   * Snake case because it is the column name and this object is upserted as a
   * row — every other field here is the same.
   */
  avatar_path?: string | null;
}

/**
 * The profile row, and the one rule about it the browser needs to know.
 *
 * `mayUseReserved` is whether this caller is allowed the app's own name. It is
 * one bit, about the person asking, so the name field can refuse "FutureBox
 * Official" while it is being typed without also refusing the one account that
 * may use it. The owner list itself never leaves the server — see
 * `server/owners.ts` — so this is the answer, not the list.
 */
export async function fetchCreatorState(): Promise<{
  creator: Creator | null;
  mayUseReserved: boolean;
  ownerSet: boolean;
}> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/creator', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return { creator: null, mayUseReserved: false, ownerSet: true };
    const data = (await response.json()) as {
      creator?: Creator | null;
      mayUseReserved?: boolean;
      ownerSet?: boolean;
    };
    return {
      creator: data.creator ?? null,
      mayUseReserved: data.mayUseReserved === true,
      /* True unless the route says otherwise, so a request that could not be
         read does not accuse a working deployment of having no owner. */
      ownerSet: data.ownerSet !== false,
    };
  } catch {
    return { creator: null, mayUseReserved: false, ownerSet: true };
  }
}

export async function fetchCreator(): Promise<Creator | null> {
  return (await fetchCreatorState()).creator;
}

export async function saveCreator(creator: Creator): Promise<string | null> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/creator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(creator),
    });
    if (response.ok) return null;
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    return data.message ?? 'That did not work.';
  } catch {
    return 'Could not reach the radar.';
  }
}
