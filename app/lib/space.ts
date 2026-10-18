/**
 * Cloud space: how much a member keeps, how much the plan holds, and saying
 * so when it is full.
 *
 * The owner, 16 October 2026: *"Please impliment the storage plan as you
 * suggested."* — 1 GB on Free, 10 GB on Maker, 50 GB on Studio, 200 GB on
 * Label. The numbers are `spaceGb` in `lib/plans.ts`; the limit itself is a
 * policy on storage, in `supabase/berging.sql`, because most files go up
 * from the browser and a limit kept in the app is one any browser can skip.
 *
 * What the policy cannot do is explain itself: a refused upload comes back
 * as "new row violates row-level security policy", which says nothing to
 * anybody. So every place that puts a member's file into storage calls
 * `refusedForSpace` when the upload fails. It asks `/api/space` whether the
 * member is full, and if they are, `SpaceFull` — mounted once in the root
 * layout — puts one plain sentence on the screen: how much, of how much, and
 * what to do about it. A failure for any other reason is left to the room's
 * own sentence, as before.
 */
import { accessToken } from './cloud';
import type { Tier } from './plans';

/** Sent on `window` when an upload was refused because the space is full. */
export const SPACE_FULL_EVENT = 'fb-space-full';

/** Sent on `window` by the notice's plans button; the studio opens its plans. */
export const SEE_PLANS_EVENT = 'fb-see-plans';

export interface Space {
  /** False when the app has no accounts set up, so nothing is counted. */
  readonly metered: boolean;
  readonly signedIn?: boolean;
  /** False when the count could not be taken — the SQL is not run yet, or the database did not answer. */
  readonly ready?: boolean;
  readonly cap?: number;
  readonly used?: number;
  readonly full?: boolean;
  readonly tier?: Tier;
}

/** What `/api/space` says for the member signed in on this device. */
export async function loadSpace(): Promise<Space | null> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/space', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return (await response.json()) as Space;
  } catch {
    return null;
  }
}

/**
 * After an upload failed: was it the space? When it was, the notice says so
 * and this answers true, so a room that has its own sentence can use it.
 */
export async function refusedForSpace(): Promise<boolean> {
  const space = await loadSpace();
  const full = Boolean(space?.ready && space.full);
  if (full && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<Space>(SPACE_FULL_EVENT, { detail: space as Space }));
  }
  return full;
}

/** Bytes as a person says them: "740 MB", "3.2 GB", "50 GB". */
export function sizeOf(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  return `${Math.max(0, Math.round(bytes / 1024 ** 2))} MB`;
}
