/**
 * What to pick, and the reason read off the thing itself.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` has carried this as the second item in the
 * order of work since the first pass: *"`Recommend` on every consequential
 * field. Still at zero across the whole app."* A room full of controls that
 * says nothing about which way to set them is a room that only helps somebody
 * who already knows — and the fields that matter most are exactly the ones
 * where the vocabulary is the obstacle. "720p" means nothing to most people.
 *
 * ── The contract, and why it is this and not a value ────────────────────
 *
 * A recommendation is a value AND a reason, and the reason has to name the
 * fact it was read off. That is not politeness. A button that silently sets a
 * field is indistinguishable from a button that sets it wrongly, so there is
 * nothing to disagree with and no way to learn anything from pressing it. A
 * reason with a number in it can be checked by the person reading it:
 *
 *     "Six of your seven clips were shot upright, so a tall film crops none
 *      of them."
 *
 * She can count the clips. If the sentence is wrong she can see that it is
 * wrong, which is the only kind of advice worth putting on a screen.
 *
 * So every rule here answers `Advice`: the value, a line with placeholders,
 * and the facts that fill them. `check:recommend` holds two things about every
 * one of them — that the line names at least one fact, and that the ANSWER
 * changes when the facts change.
 *
 * ── Why there is no rule for the frame rate ─────────────────────────────
 *
 * Thirty is right for every film this room can make: the preview plays at
 * thirty, the clips arrive at thirty, and asking for sixty writes each frame
 * twice. A rule here would answer "30" whatever it was given.
 *
 * That is a label, not a recommendation, and it is the shape of advice this
 * app must not carry: a button that looks like it considered the film and did
 * not. `RATE_DEFAULT` already says thirty, and the room already starts there.
 * `check:recommend` calls every rule twice with different facts and fails on
 * one whose answer does not move — so a rate rule cannot be added here
 * without the build saying what is wrong with it.
 *
 * ── And why nothing here costs anything ─────────────────────────────────
 *
 * These are arithmetic over what is already on the clock. Nothing asks an
 * engine, so nothing has a price, so `check:priceonit` has nothing to hold
 * here — and a Recommend that quietly spent a credit would be the worst
 * button in the app.
 */

import type { Shape } from './videoedit';
import { GRADES, bitsFor, sizeFor, weighs } from './videoquality';

/**
 * One recommendation.
 *
 * `says` is an i18n pair and `facts` fills its `{placeholders}`, the same way
 * every other sentence in this app is written — a reason that cannot be read
 * in Afrikaans is a reason half the people here cannot read.
 */
export interface Advice<T> {
  readonly value: T;
  readonly says: readonly [string, string];
  readonly facts: Readonly<Record<string, string | number>>;
}

/** The sentence with its facts in it. */
export function reads(advice: Advice<unknown>, line: string): string {
  let out = line;
  for (const [name, fact] of Object.entries(advice.facts)) {
    out = out.split(`{${name}}`).join(String(fact));
  }
  return out;
}

/* ── The film's shape ──────────────────────────────────────────────────── */

/** Within this much of square counts as square rather than as either way up. */
const SQUARE_ENOUGH = 0.05;

/** The three ways up, which are `SHAPES`' own keys and have to stay so. */
type WayUp = 'tall' | 'wide' | 'square';

function wayUp(shot: { readonly width: number; readonly height: number }): WayUp {
  const ratio = shot.width / Math.max(1, shot.height);
  if (Math.abs(ratio - 1) <= SQUARE_ENOUGH) return 'square';
  return ratio > 1 ? 'wide' : 'tall';
}

/**
 * Which way up the film should be, read off the clips on the clock.
 *
 * `null` when nothing on the clock has been measured, and that is the
 * important branch: the room must then offer no recommendation at all rather
 * than fall back to tall and present the fallback as a reading. A clip that
 * arrived before `shot` was recorded, or one the browser could not decode,
 * has no measurement — and three unmeasured clips are not an argument for
 * anything.
 *
 * The majority wins and the sentence says by how much, because the honest
 * case is the mixed one: four upright and three wide is a real decision with
 * a cost either way, and "four of your seven" is what makes it a decision
 * rather than an instruction.
 */
export function shapeAdvice(
  pieces: readonly { readonly shot?: { readonly width: number; readonly height: number } }[],
): Advice<WayUp> | null {
  const measured = pieces
    .map((one) => one.shot)
    .filter((one): one is { width: number; height: number } => !!one && one.width > 0 && one.height > 0);
  if (!measured.length) return null;

  const counts: Record<WayUp, number> = { tall: 0, wide: 0, square: 0 };
  for (const shot of measured) counts[wayUp(shot)] += 1;

  /* Tall first, so a dead heat lands on tall — which is what most of what
     leaves this app is watched on, and is the room's own default. */
  const best = (['tall', 'wide', 'square'] as const)
    .reduce<WayUp>((a, b) => (counts[b] > counts[a] ? b : a), 'tall');

  const facts = { most: counts[best], all: measured.length };
  if (best === 'wide') {
    return {
      value: 'wide',
      says: ['advise.shape.wide', '{most} of your {all} measured clips are wider than they are tall, so a wide film crops none of them.'],
      facts,
    };
  }
  if (best === 'square') {
    return {
      value: 'square',
      says: ['advise.shape.square', '{most} of your {all} measured clips are square, so a square film uses all of the picture.'],
      facts,
    };
  }
  return {
    value: 'tall',
    says: ['advise.shape.tall', '{most} of your {all} measured clips were shot upright, so a tall film crops none of them.'],
    facts,
  };
}

/* ── How big a picture ─────────────────────────────────────────────────── */

/**
 * Above this many megabytes an upload stops being something that happens and
 * becomes something she waits for.
 *
 * A judgement, and written as one on purpose: every figure anybody quotes for
 * what WhatsApp or Instagram accepts differs by country and changes without
 * notice, so a reason on the screen that cited one would be a sentence that
 * goes quietly wrong. This one is ours and is arithmetic she can check — a
 * hundred megabytes is about two and a half minutes of 1080p upright video at
 * thirty, and a minute and a half on a 10 Mbps upload.
 *
 * It was fifty in the first draft, which put the line at seventy seconds and
 * would have recommended coming off 1080p for most music videos. 1080p is
 * what every platform wants; advice that gives it up for a film somebody is
 * going to post is advice pointing the wrong way.
 */
export const EASY_MB = 100;

/**
 * Which rung to write the picture at, for this film at this rate.
 *
 * The highest one whose file still uploads easily — and when the sharpest
 * rung already does, that is the answer and the sentence says so rather than
 * inventing a reason to come down.
 *
 * The sentence always carries two numbers: what the recommended rung costs,
 * and what the sharpest one would have. Somebody who would rather have the
 * detail can then overrule this with the number in front of them, which is
 * the difference between advice and a decision taken for her.
 */
export function gradeAdvice(
  seconds: number,
  shape: Shape,
  fps: number,
): Advice<string> | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  const mbAt = (id: string): number => {
    const frame = sizeFor(shape, id);
    return weighs(seconds, bitsFor(frame.width, frame.height, fps));
  };

  const sharpest = GRADES[GRADES.length - 1];
  /* Sharpest first, so the first one that fits is the best one that does. */
  const fits = [...GRADES].reverse().find((one) => mbAt(one.id) <= EASY_MB);
  const pick = fits ?? GRADES[0];

  if (pick.id === sharpest.id) {
    return {
      value: pick.id,
      says: ['advise.grade.top', '{name} writes about {mb} MB for a film this long, which uploads easily and is the one every platform wants.'],
      facts: { name: pick.name[1], mb: mbAt(pick.id) },
    };
  }
  if (!fits) {
    return {
      value: pick.id,
      says: ['advise.grade.none', 'Even {name} writes about {mb} MB for a film this long, so this is the smallest file there is — or make the film shorter.'],
      facts: { name: pick.name[1], mb: mbAt(pick.id) },
    };
  }
  return {
    value: pick.id,
    says: ['advise.grade.down', '{top} would write about {big} MB for a film this long. {name} writes about {mb} MB and is still sharp on a phone.'],
    facts: {
      top: sharpest.name[1],
      big: mbAt(sharpest.id),
      name: pick.name[1],
      mb: mbAt(pick.id),
    },
  };
}
