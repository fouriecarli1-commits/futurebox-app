/**
 * "Want to do something with it?" — when the app may ask, and when it may not.
 *
 * The owner, 27 October 2026: *"bou notifications in wat vra of hulle nie
 * iets met die image wil doen nie, dit is deel van ons in app bemarking en
 * om kliente aan te moedig."* A picture somebody has just made or saved is
 * the moment they are most likely to want more from it, so the app offers
 * what it can become, with the price on every offer (`lib/becomes.ts`).
 *
 * An offer that comes every time is a nag, and a nag gets every offer
 * ignored, the good ones too. So the asking is rationed, here, in one place:
 *
 *  - the same moment is not offered again within ten minutes;
 *  - no more than four offers a day, all moments together;
 *  - "Not now" twice for the same moment rests that moment for three days;
 *  - saying yes to one clears its "Not now"s.
 *
 * What was offered is kept on this device only (`fb.ideas.v1`): it says
 * nothing about anybody and is nobody's business but the phone's.
 */
import type { BecomeId } from './becomes';

export type IdeaMoment = 'photoOpened' | 'postSaved' | 'stickerPeeled' | 'coverKept';

export interface Idea {
  /** What is offered, in this order. */
  readonly offers: readonly BecomeId[];
  /** The heading on the card, as a translation key and its English. */
  readonly head: readonly [string, string];
  /** One line under it. */
  readonly why: readonly [string, string];
}

export const IDEAS: Readonly<Record<IdeaMoment, Idea>> = {
  photoOpened: {
    offers: ['alive', 'sticker'],
    head: ['idea.openedHead', 'This photo can do more'],
    why: ['idea.openedWhy', 'Make it move, or peel something off it as a sticker.'],
  },
  postSaved: {
    offers: ['alive', 'sticker'],
    head: ['idea.savedHead', 'Saved. Want to do more with it?'],
    why: ['idea.savedWhy', 'Six seconds of movement with its own sound, or a sticker peeled straight off it.'],
  },
  stickerPeeled: {
    offers: ['model3d', 'alive'],
    head: ['idea.peeledHead', 'Your sticker can go further'],
    why: ['idea.peeledWhy', 'Turn it into a 3D model you can spin with a finger.'],
  },
  coverKept: {
    offers: ['alive'],
    head: ['idea.coverHead', 'Make your cover move?'],
    why: ['idea.coverWhy', 'Six seconds of movement with its own sound, made from this cover.'],
  },
};

export const IDEA_MOMENTS = Object.keys(IDEAS) as readonly IdeaMoment[];

const MINUTE = 60_000;
export const IDEA_GAP = 10 * MINUTE;
export const IDEAS_A_DAY = 4;
export const IDEA_REST = 3 * 24 * 60 * MINUTE;
const NOTS_TO_REST = 2;

/** What this phone has been offered. */
export interface Seen {
  /** When each moment was last offered. */
  readonly at: Readonly<Partial<Record<IdeaMoment, number>>>;
  /** The day (YYYY-MM-DD, the phone's own) the count below is for. */
  readonly day: string;
  readonly count: number;
  /** "Not now"s in a row, per moment. */
  readonly nots: Readonly<Partial<Record<IdeaMoment, number>>>;
  /** Rested until, per moment. */
  readonly until: Readonly<Partial<Record<IdeaMoment, number>>>;
}

export const NOTHING_SEEN: Seen = { at: {}, day: '', count: 0, nots: {}, until: {} };

function dayOf(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mayAsk(moment: IdeaMoment, now: number, seen: Seen): boolean {
  if ((seen.until[moment] ?? 0) > now) return false;
  const last = seen.at[moment];
  if (last !== undefined && now - last < IDEA_GAP) return false;
  return seen.day !== dayOf(now) || seen.count < IDEAS_A_DAY;
}

export function asked(moment: IdeaMoment, now: number, seen: Seen): Seen {
  const today = dayOf(now);
  return { ...seen, at: { ...seen.at, [moment]: now }, day: today, count: (seen.day === today ? seen.count : 0) + 1 };
}

export function notNow(moment: IdeaMoment, now: number, seen: Seen): Seen {
  const nots = (seen.nots[moment] ?? 0) + 1;
  if (nots < NOTS_TO_REST) return { ...seen, nots: { ...seen.nots, [moment]: nots } };
  return { ...seen, nots: { ...seen.nots, [moment]: 0 }, until: { ...seen.until, [moment]: now + IDEA_REST } };
}

export function tookIt(moment: IdeaMoment, seen: Seen): Seen {
  return { ...seen, nots: { ...seen.nots, [moment]: 0 } };
}

/* ── On this phone ────────────────────────────────────────────────────── */

const KEY = 'fb.ideas.v1';

export function readSeen(): Seen {
  try {
    const raw = window.localStorage.getItem(KEY);
    const got = raw ? JSON.parse(raw) as Partial<Seen> : null;
    if (!got || typeof got !== 'object') return NOTHING_SEEN;
    return {
      at: got.at && typeof got.at === 'object' ? got.at : {},
      day: typeof got.day === 'string' ? got.day : '',
      count: typeof got.count === 'number' ? got.count : 0,
      nots: got.nots && typeof got.nots === 'object' ? got.nots : {},
      until: got.until && typeof got.until === 'object' ? got.until : {},
    };
  } catch {
    return NOTHING_SEEN;
  }
}

function writeSeen(seen: Seen): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* this visit only */ }
}

/** Whether to offer now; if so, it is counted as offered. */
export function offerIf(moment: IdeaMoment): boolean {
  const now = Date.now();
  const seen = readSeen();
  if (!mayAsk(moment, now, seen)) return false;
  writeSeen(asked(moment, now, seen));
  return true;
}

export function saidNotNow(moment: IdeaMoment): void {
  writeSeen(notNow(moment, Date.now(), readSeen()));
}

export function saidYes(moment: IdeaMoment): void {
  writeSeen(tookIt(moment, readSeen()));
}
