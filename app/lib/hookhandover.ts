/**
 * A hook, arriving at the video desk as something you can press Make on.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Al die kamers se AI praat nie met mekaar nie.
 * Ek het nou dieselfde gesien by hooks. Ek wou 'n video maak, maar die
 * liedjie hook lê nie daar in video nie en daar is geen prompt in die video
 * desk nie."*
 *
 * "Make a video for it" sent two things: the song's id, and the shape. Not
 * the moment — `seconds` was in the callback's own type and thrown away by
 * the studio — and not a shot. So the desk opened with the right song under
 * it, the right shape on it, an empty box where the shot goes, and no sign
 * anywhere that the clip was supposed to be about a particular twenty-two
 * seconds of that song. Pressing Make from there produces a video of
 * nothing in particular over the start of the track.
 *
 * ── Why the shot is written here and not asked of a model ────────────────
 *
 * The same argument as `lib/adhandover.ts`. A hand-off that has to wait for
 * a model is a hand-off that is sometimes empty, sometimes late and always
 * costs money; and everything needed to write this shot is already known in
 * the room — the genre, the pace, and which moment was chosen and why.
 *
 * The look itself is not invented here either. `lib/videoscenes.ts` already
 * carries a written look per genre — what the light is, the hour, the way
 * the camera moves — and this picks the one that fits and adds the one
 * sentence it cannot know: what the cut lands on.
 *
 * ── The line it does not cross ───────────────────────────────────────────
 *
 * No quotation marks, ever. The desk reads a quoted phrase as a line that is
 * SAID, turns on the subtitle and has the engine speak it. A hook plays the
 * song underneath; a voice over it is two things fighting, which is the
 * argument `MUSIC_LOOKS` already makes. `check:hookcarry` holds this.
 */

import type { SurfaceId } from './surfaces';
import { GENRES, LENGTHS, MUSIC_LOOKS } from './videoscenes';

export interface Wire {
  readonly room: SurfaceId;
  readonly op: string;
  readonly value: string;
}

/** What a hook knows about itself, as the room has it. */
export interface HookCarry {
  /** The song's own title. Used to say what the clip is for, never quoted. */
  readonly title: string;
  /** The song's genre, as it is stored — a label, not one of our ids. */
  readonly genre: string;
  /** Beats a minute, when the song has one. */
  readonly bpm?: number;
  /** Where the moment starts, in seconds. */
  readonly startSeconds: number;
  /** How long it runs. */
  readonly seconds: number;
  /** Why this moment was picked. `Hook['kind']`, kept loose on purpose. */
  readonly kind: 'section' | 'arrival' | 'fullest' | 'steady';
  /** The section's name, when the reason is that it is one. */
  readonly label?: string;
  /** What arrives, when something does. */
  readonly arrived?: string;
}

/** 0:22, the way a person reads a time. */
export function clockOf(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The genre's written look, matched loosely.
 *
 * A stored genre is whatever the song was tagged with — "Amapiano", "afro
 * house", "Sokkie / Afrikaans". The ids here are single words, so an exact
 * lookup finds a look for about none of them. Either way round as a
 * substring, and null rather than a wrong one: a gospel look on a gqom track
 * is worse than the neutral performance look below.
 */
export function lookForGenre(genre: string): string | null {
  const wanted = genre.trim().toLowerCase();
  if (!wanted) return null;
  const found =
    GENRES.find((one) => one.id === wanted || one.label.toLowerCase() === wanted)
    ?? GENRES.find((one) => wanted.includes(one.id) || wanted.includes(one.label.toLowerCase()))
    ?? GENRES.find((one) => one.label.toLowerCase().includes(wanted));
  return found?.scaffolds[0] ?? null;
}

/**
 * What the cut lands on, in one sentence, in English.
 *
 * English because this goes to a video engine and every video engine is
 * English-first — the same rule `set_style` follows for the music model, and
 * for the same reason. Everything said to HER stays in her language.
 */
function landsOn(hook: HookCarry): string {
  const at = clockOf(hook.startSeconds);
  if (hook.kind === 'section' && hook.label) {
    return `The clip is cut to the ${hook.label.toLowerCase()} at ${at}`;
  }
  if (hook.kind === 'arrival') {
    const what =
      hook.arrived === 'low' ? 'the bass and the kick come in'
      : hook.arrived === 'top' ? 'the top opens up'
      : hook.arrived === 'fuller' ? 'twice as much starts happening'
      : hook.arrived === 'louder' ? 'it gets louder'
      : 'something arrives';
    return `The clip is cut to ${at}, where ${what}`;
  }
  if (hook.kind === 'fullest') return `The clip is cut to ${at}, the fullest the song gets`;
  return `The clip is cut to ${at}, where the song is at its steadiest`;
}

/** How the camera should behave at that moment, from the pace. */
function moves(hook: HookCarry): string {
  const fast = (hook.bpm ?? 0) >= 120;
  if (hook.kind === 'arrival' || hook.kind === 'fullest') {
    return fast
      ? 'hold the frame still until it lands and cut hard into a closer one on the beat'
      : 'hold the frame still until it lands and push in slowly as it does';
  }
  return fast ? 'one steady move across the whole clip, no cuts' : 'almost no movement at all';
}

/**
 * The shot, whole.
 *
 * Built the way every other shot on this desk is — subject, what it is
 * doing, the shot, the light, the mood — by taking the genre's written look
 * and adding the two things it cannot know: what this cut lands on, and what
 * the camera does when it does.
 */
export function shotForHook(hook: HookCarry): string {
  const base = lookForGenre(hook.genre) ?? MUSIC_LOOKS[0].scaffolds[0];
  return [
    base,
    `${landsOn(hook)} — ${moves(hook)}.`,
    'Shot upright for a phone. No words on screen and nobody speaking: the song is the sound.',
  ].join(' ');
}

/**
 * The length, snapped to one the desk offers.
 *
 * A hook is whatever the finder measured, and the price list has rows. The
 * nearest offered length, and never longer than the hook — a clip that runs
 * past the moment is a clip whose last second is the thing after the moment.
 */
export function lengthForHook(seconds: number): number {
  const under = LENGTHS.filter((one) => one.seconds <= Math.round(seconds));
  return (under.length ? under[under.length - 1] : LENGTHS[0]).seconds;
}

/**
 * What the copilot in the video desk is told, so the conversation carries.
 *
 * Carli: *"Al die kamers se AI praat nie met mekaar nie."* Arriving at a
 * desk that has been set up by a copilot which then knows nothing about it
 * means changing one thing costs describing the whole thing again, to the
 * app that just wrote it. Her own words are not paraphrased: what it is
 * handed is what it will be asked to change.
 */
export function briefForHook(hook: HookCarry): string {
  return [
    `They came from the hooks room. They picked the moment at ${clockOf(hook.startSeconds)}`
    + ` in their own song, ${hook.title}, and want a clip for it.`,
    `Why that moment: ${landsOn(hook).replace(/^The clip is cut to /, '')}.`,
    'The song is already under the desk and plays under the clip, so there is nothing to be said or sung in it.',
    'The shot, the shape and the length are already set from the song. Change them if they ask, and say what you would change if they do not.',
  ].join('\n\n');
}

/** Everything that travels, in the order the desk should receive it. */
export function videoFromHook(hook: HookCarry): readonly Wire[] {
  const room: SurfaceId = 'canvas';
  return [
    { room, op: 'set_prompt', value: shotForHook(hook) },
    /* Upright, because a hook is cut for a feed that is held upright. */
    { room, op: 'set_aspect', value: '9:16' },
    { room, op: 'set_seconds', value: String(lengthForHook(hook.seconds)) },
    { room, op: 'brief', value: briefForHook(hook) },
  ];
}
