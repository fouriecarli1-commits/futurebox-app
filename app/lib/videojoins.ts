/**
 * How one piece arrives after the one before it.
 *
 * ── Why these five and not twenty ────────────────────────────────────────
 *
 * Carli, 3 October 2026: *"net 'n praktiese video editing en die elemente wat
 * moontlik is."* A transition between two shots is the most ordinary element
 * a timeline editor has and ours had none: every join was a hard cut.
 *
 * ── The one honest constraint, written down before anything else ──────────
 *
 * `stitch.ts` renders in the browser, in real time, with ONE `<video>`
 * decoding at a time. That is what makes this room free to use — there is no
 * per-minute render bill anywhere in it — and it is also what a transition
 * runs into, because a true cross-dissolve needs both shots moving at once.
 *
 * So the outgoing side of a dissolve, a wipe and a slide is the outgoing
 * clip's LAST FRAME, held still, not its moving picture. For a join of a few
 * tenths of a second nobody can tell: the eye reads the mix, not the motion
 * inside the half that is leaving. At a second and a half it would read as a
 * freeze, which is why `LONGEST_JOIN` is six tenths and not two seconds.
 *
 * Saying it here rather than discovering it on a film: a control that looks
 * like a cross-dissolve and quietly freezes for two seconds would be the kind
 * of wrong somebody only sees after they have paid to export.
 *
 * ── And the film does not get shorter ────────────────────────────────────
 *
 * A dissolve in a desk editor OVERLAPS the two clips, so a film with ten
 * half-second dissolves in it is five seconds shorter than the sum of its
 * pieces. Ours does not: the join happens inside the head of the arriving
 * piece, over the frame the outgoing one left behind.
 *
 * That is a deliberate trade and this is the reason. The strip, the ruler, the
 * playhead, the clock and the price are all worked out from `runs()`, which
 * adds the pieces up. An overlapping join would make every one of those wrong
 * by a different amount, and "the film came out shorter than the timeline said"
 * is a fault that costs a credit to discover.
 */

/** Which join, by name. */
export const JOINS = [
  { id: 'cut', en: 'Straight cut', af: 'Reguit sny' },
  { id: 'dissolve', en: 'Dissolve', af: 'Oorvloei' },
  { id: 'dip', en: 'Through black', af: 'Deur swart' },
  { id: 'flash', en: 'Flash', af: 'Blits' },
  { id: 'wipe', en: 'Wipe across', af: 'Vee oor' },
  { id: 'slide', en: 'Slide away', af: 'Gly weg' },
] as const satisfies readonly {
  readonly id: string; readonly en: string; readonly af: string;
}[];

export type Join = typeof JOINS[number]['id'];

/** No join at all, which is what every cut in this app was until today. */
export const NO_JOIN: Join = 'cut';

/**
 * The longest a join may be, in seconds.
 *
 * Six tenths. Two reasons, and the second is the real one:
 *
 * A join is punctuation. Past about half a second it stops reading as "and
 * then" and starts reading as an effect somebody is doing at you.
 *
 * And the outgoing half of a dissolve, a wipe or a slide is a held frame —
 * see the note at the top. At six tenths that is invisible. At two seconds it
 * is a freeze, and a control that silently freezes the picture is worse than
 * no control.
 */
export const LONGEST_JOIN = 0.6;

/** How long a join is when nobody has said. */
export const JOIN_FOR = 0.4;

/** Whether this join needs the outgoing frame held, or only a colour. */
export function needsHeld(join: Join): boolean {
  return join === 'dissolve' || join === 'wipe' || join === 'slide';
}

/** Where the colour joins wash to. */
function washes(join: Join): string | null {
  if (join === 'dip') return '#000';
  if (join === 'flash') return '#fff';
  return null;
}

/**
 * How long a join may actually be, here, on this piece.
 *
 * Clamped three ways, and the third is the one that bites: a six-tenth join on
 * a four-tenth piece would still be arriving when the piece ended, so the
 * shot would never be seen on its own at all. Half the piece is the ceiling.
 */
export function joinFits(wanted: number | undefined, runs: number): number {
  const asked = Number.isFinite(wanted) ? Math.max(0, wanted ?? JOIN_FOR) : JOIN_FOR;
  if (!Number.isFinite(runs) || runs <= 0) return 0;
  return Math.max(0, Math.min(LONGEST_JOIN, asked, runs / 2));
}

/** A colour over the whole frame, and how solid it is. */
export interface Wash {
  readonly colour: string;
  readonly solid: number;
}

/** The outgoing frame, held: how solid it still is and where it has got to. */
export interface Held {
  /** Nought to one. One is "the outgoing frame, entirely". */
  readonly solid: number;
  /** How far it has slid off to the left, as a share of the width. */
  readonly slid: number;
  /** A wipe: the held frame still shows from this share of the width across. */
  readonly keepFrom: number;
}

/** What to paint over the arriving picture, at this moment. */
export interface Joining {
  readonly wash?: Wash;
  readonly held?: Held;
}

/**
 * The join, at one moment of one piece.
 *
 * One pure function with every number in it, so the rule can be read by
 * `check:joins` with no browser, no canvas and no export. The renderer calls
 * this and paints what it answers; it works nothing out for itself.
 *
 * `arrive` is how THIS piece comes in. `leave` is how the NEXT one comes in —
 * because the first half of a through-black join is the darkening at the end
 * of the piece BEFORE it, and only the next piece knows that it wanted one.
 */
export function joiningAt(when: {
  readonly arrive: Join;
  readonly arriveFor?: number;
  readonly leave: Join;
  readonly leaveFor?: number;
  /** Seconds into this piece. */
  readonly into: number;
  /** How long this piece runs, in seconds. */
  readonly runs: number;
  /** Nothing before it, so it has nothing to arrive from. */
  readonly first: boolean;
  /** Nothing after it, so there is no join to leave into. */
  readonly last: boolean;
}): Joining {
  const into = Math.max(0, when.into);
  const left = Math.max(0, when.runs - into);

  /* ── The colour joins, which have a half on each side of the cut ────────

     A through-black join is the picture darkening at the end of one shot and
     lightening at the start of the next. So the length is split: half spent
     on the way out, half on the way in. The two halves are measured from
     DIFFERENT pieces' settings, which is why both are passed in. */
  let wash: Wash | undefined;
  const paint = (join: Join, len: number, how: number): void => {
    const colour = washes(join);
    if (!colour || how <= 0) return;
    if (!wash || how > wash.solid) wash = { colour, solid: Math.min(1, how) };
  };

  if (!when.first) {
    const half = joinFits(when.arriveFor, when.runs) / 2;
    if (half > 0) paint(when.arrive, half, 1 - Math.min(1, into / half));
  }
  if (!when.last) {
    const half = joinFits(when.leaveFor, when.runs) / 2;
    if (half > 0) paint(when.leave, half, 1 - Math.min(1, left / half));
  }

  /* ── The held joins, which happen entirely on the arriving side ─────────

     Over the frame the outgoing piece left behind. See the note at the top of
     this file for why the outgoing half is a still: one decoder, real time,
     no render bill. */
  let held: Held | undefined;
  if (!when.first && needsHeld(when.arrive)) {
    const len = joinFits(when.arriveFor, when.runs);
    const through = len > 0 ? Math.min(1, into / len) : 1;
    if (through < 1) {
      if (when.arrive === 'dissolve') held = { solid: 1 - through, slid: 0, keepFrom: 0 };
      else if (when.arrive === 'slide') held = { solid: 1, slid: through, keepFrom: 0 };
      else held = { solid: 1, slid: 0, keepFrom: through };
    }
  }

  return { ...(wash ? { wash } : {}), ...(held ? { held } : {}) };
}

/** The name of a join, in her language or in English. */
export function joinName(id: Join, lang: string): string {
  const found = JOINS.find((one) => one.id === id);
  if (!found) return '';
  return lang === 'af' ? found.af : found.en;
}
