/**
 * Handles, links, and the boost queue.
 *
 * Everything here is per-device: the handles a creator enters live in this
 * browser's localStorage and reach no server, because there is no server. That
 * is a real limitation and the UI says so rather than implying an account.
 */
import { PLATFORMS, FUTUREBOX_TAG, type Platform } from '../data/social.ts';

export type Handles = Record<string, string>;

const STORAGE_KEY = 'futurebox.handles.v1';

/** Strips what people paste — a full URL, a leading @, stray spaces. */
export function normaliseHandle(raw: string, platform: Platform): string {
  let value = raw.trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      const last = url.pathname.split('/').filter(Boolean).pop() ?? '';
      value = last;
    } catch {
      // Not a URL after all — fall through and treat it as a handle.
    }
  }
  return value.replace(/^@+/, '').replace(/\s+/g, '');
}

export function profileUrlFor(platform: Platform, handle: string): string | null {
  const clean = normaliseHandle(handle, platform);
  return clean ? platform.profileUrl.replace('{handle}', encodeURIComponent(clean)) : null;
}

export function loadHandles(): Handles {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Handles) : {};
  } catch {
    return {};
  }
}

export function saveHandles(handles: Handles): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
  } catch {
    // Storage blocked. The handles still work for this visit.
  }
}

/**
 * Builds the caption that actually gets posted.
 *
 * Crediting FutureBox is what makes a collab findable later — an untagged post
 * is invisible to the channel that would boost it — so the tag goes in the
 * text, not only in a database the platform cannot see.
 */
export function buildCaption(
  base: string,
  hashtags: readonly string[],
  options: { creditFuturebox: boolean; collaborator?: string },
): string {
  const parts = [base.trim()];
  const mentions: string[] = [];
  if (options.creditFuturebox) mentions.push(FUTUREBOX_TAG);
  if (options.collaborator?.trim()) {
    const handle = options.collaborator.trim().replace(/^@*/, '@');
    mentions.push(handle);
  }
  if (mentions.length) parts.push(`Made with ${mentions.join(' × ')}`);
  if (hashtags.length) parts.push(hashtags.map((h) => `#${h}`).join(' '));
  return parts.join('\n\n');
}

/** The X intent is the only public URL that can carry text for you. */
export function shareUrlFor(platform: Platform, caption: string): string {
  if (platform.shareIntent) {
    return platform.shareIntent.replace('{text}', encodeURIComponent(caption));
  }
  return platform.composerUrl;
}

export interface BoostRequest {
  readonly id: string;
  readonly platformId: string;
  readonly postUrl: string;
  readonly note: string;
  readonly createdAt: string;
}

const BOOST_KEY = 'futurebox.boosts.v1';

export function loadBoosts(): BoostRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOST_KEY);
    return raw ? (JSON.parse(raw) as BoostRequest[]) : [];
  } catch {
    return [];
  }
}

export function saveBoosts(boosts: readonly BoostRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOOST_KEY, JSON.stringify(boosts));
  } catch {
    // As above.
  }
}

export function platformById(id: string): Platform {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}
