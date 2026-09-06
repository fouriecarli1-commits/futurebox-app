'use client';

/**
 * A film as a list of shots.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * The engines cap a single generation between four and thirty seconds and a
 * music video is three minutes, so a long one is a dozen short ones cut
 * together. `lib/stitch.ts` does the cutting. This is the list being cut: what
 * each shot is, how long it runs, which clip came back for it, and what order
 * they go in.
 *
 * It is the difference between twelve files and one film. Twelve generations
 * were always possible; keeping them in an order, against a song, with a
 * running total, was not.
 *
 * ── Why it survives a reload ─────────────────────────────────────────────
 *
 * Because somebody will spend an hour on it and money on every shot in it. A
 * storyboard that lived in React state would be gone on a refresh, taking a
 * dozen paid-for clips with it as far as the film is concerned — they would
 * still be in the history, unlabelled and out of order, which is not the same
 * thing at all.
 *
 * The shots are in `localStorage`; the clips stay where every other generation
 * on this desk already goes, in `lib/makes.ts`, and a shot holds the make's
 * id. That means one store for clips rather than two, and it means a shot
 * pointing at a clip that has been evicted can say so instead of showing a
 * broken frame — which is why every clip a storyboard uses is marked as a
 * favourite, the flag `makes.ts` already honours when it evicts.
 */

import { makeBlob } from './makes';

export interface Shot {
  readonly id: string;
  /** What is in it. The same sentence the desk would take. */
  readonly prompt: string;
  /** How long it should run. One of the lengths the chosen grade makes. */
  readonly seconds: number;
  /** The `makes.ts` id of the clip that came back, once one has. */
  readonly makeId?: string;
  /**
   * Where this shot starts and stops inside its clip, in seconds.
   *
   * A generation comes back at the length the engine makes, and the useful
   * part of it is rarely the whole thing — the first half-second is the model
   * finding the shot and the last is often it drifting off. Both are paid for
   * whatever happens, so trimming is the cheapest edit on this desk: no second
   * generation, no upload, just less of a file that already exists.
   *
   * Only meaningful once there is a clip, which is why it is set from the
   * clip's real duration rather than from `seconds` — the engine rounds a
   * request to a length it makes, and trimming against a number it ignored
   * would put the handles in the wrong place.
   */
  readonly from?: number;
  readonly to?: number;
  /**
   * The words printed over this shot, when the board is captioning.
   *
   * Filled from the shot's own quoted line the first time captions are turned
   * on, because the desk already treats quoted text as the line being said —
   * so in the common case there is nothing to type. Kept separately from the
   * prompt because they are different things: the prompt is what the camera
   * sees, and this is what the viewer reads.
   */
  readonly caption?: string;
}

export interface Storyboard {
  readonly shots: readonly Shot[];
  /** The track laid under the whole film, by its library id. */
  readonly songId?: string;
  /**
   * What fills the space around a shot that is not the film's shape.
   *
   * Kept on the board rather than in the component's own state so it survives
   * a reload with the shots and the song, which is the whole reason the board
   * is written down at all.
   */
  readonly background?: 'black' | 'blur';
  /**
   * Whether the words go on the film.
   *
   * Off by default, and worth the switch rather than always-on: a film cut for
   * a place that carries its own subtitle track wants clean pictures, and
   * burned-in words cannot be taken off afterwards. On is the right choice for
   * everywhere these actually get posted, where most people watch with the
   * sound off — which is why the room says so beside the switch.
   */
  readonly captions?: boolean;
  /**
   * The look every shot is made in.
   *
   * ── Why one line above rather than a phrase in each shot ─────────────
   *
   * Because it is one decision and twelve shots. Written into each prompt it
   * has to be typed twelve times, stays right only until somebody changes
   * their mind, and then the film has two looks in it — which is the exact
   * thing that makes a set of clips read as clips instead of as a film.
   *
   * Here it is written once and joined onto every shot at the moment that
   * shot is generated. The shot's own sentence stays about what happens in
   * it, which is also what makes the copilot's job legible: it writes what
   * the camera sees, and the look is set beside it and stays put.
   *
   * On the board rather than in component state, for the same reason as the
   * background and the captions: it has to survive a reload, or somebody
   * comes back to twelve shots that no longer agree with each other.
   */
  readonly look?: string;
}

const KEY = 'futurebox.storyboard.v1';

export const EMPTY: Storyboard = { shots: [] };

/**
 * The sentence actually sent for a shot: what happens, then how it looks.
 *
 * Joined here rather than at the call site so there is one answer to "what did
 * we ask for", and so the shot the person reads and the shot the engine gets
 * differ in exactly one documented way.
 *
 * The look goes last. A prompt is read most strongly at its front by every
 * engine this app talks to, and the subject of a shot is what is in it — a
 * film whose every prompt opens with "grainy super-8, warm" is a film of
 * grain, whatever the rest of the sentence asked for.
 */
export function askFor(shot: Shot, look?: string): string {
  const what = shot.prompt.trim();
  const how = (look ?? '').trim();
  return how ? `${what}. ${how}` : what;
}

/**
 * A written list of scenes, one per line, turned into shots.
 *
 * This is what the copilot hands over. It writes lines; numbering them is what
 * anybody writing a list does, so the numbers are taken off rather than left to
 * arrive in the prompt as "1." — which the engine would happily try to draw.
 *
 * `seconds` comes from the caller because only the desk knows what the engine
 * behind it will accept, and a board full of shots at a length the engine
 * refuses is a board that cannot be made.
 */
export function shotsFrom(text: string, seconds: number): Shot[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*\u2022])\s*/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, MOST_SHOTS)
    .map((prompt) => ({ id: shotId(), prompt, seconds }));
}

/**
 * A ceiling, because a browser cuts this in real time.
 *
 * Thirty shots at ten seconds is five minutes of export with the tab open,
 * which is already a lot to ask. It is not a technical limit — the stitcher
 * would take a hundred — it is a limit on how long somebody can reasonably be
 * asked to sit and watch a progress line.
 */
export const MOST_SHOTS = 30;

export function loadStoryboard(): Storyboard {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const said = JSON.parse(raw) as Storyboard;
    if (!Array.isArray(said?.shots)) return EMPTY;
    return {
      ...(typeof said.look === 'string' ? { look: said.look } : {}),
      shots: said.shots
        .filter((one) => one && typeof one.id === 'string')
        .slice(0, MOST_SHOTS)
        .map((one) => ({
          id: one.id,
          prompt: typeof one.prompt === 'string' ? one.prompt : '',
          seconds: Number.isFinite(one.seconds) ? one.seconds : 5,
          ...(typeof one.makeId === 'string' ? { makeId: one.makeId } : {}),
          ...(Number.isFinite(one.from) ? { from: one.from } : {}),
          ...(Number.isFinite(one.to) ? { to: one.to } : {}),
        })),
      ...(typeof said.songId === 'string' ? { songId: said.songId } : {}),
      /* Named rather than spread, like everything above it. What comes out of
         storage is whatever was last written there — an older version of this
         app, or a hand-edited value — so each field is read back by name and
         anything unrecognised is dropped. That is why a new field has to be
         added here as well as to the type: without this line the choice was
         written every time and read back never, which is a preference that
         quietly resets on every visit. */
      ...(said.background === 'blur' || said.background === 'black'
        ? { background: said.background }
        : {}),
    };
  } catch {
    return EMPTY;
  }
}

export function saveStoryboard(board: Storyboard): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(board));
  } catch {
    // Storage full or blocked. The board still works for this session, and
    // saying so on screen would be noise about something nobody can fix here.
  }
}

export function shotId(): string {
  return `shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * How long one shot plays, in the order the answers get more truthful.
 *
 * A trim, if there is one. Then the clip's own length, if the clip exists and
 * has been measured. Only then the length that was asked for, which before a
 * clip exists is the only estimate available and after one exists is the least
 * reliable number on the row: the engine rounds a request to a length it
 * makes, so a six-second ask can come back at ten or at five.
 *
 * That middle case is the one worth naming. The running total first added the
 * *requested* lengths for anything untrimmed, so a board of three five-second
 * asks holding three two-second clips promised fifteen seconds of film and cut
 * six. It looked right because every number on the row was a number somebody
 * had typed.
 */
export function playsFor(shot: Shot, clipLength?: number): number {
  if (typeof shot.from === 'number' && typeof shot.to === 'number' && shot.to > shot.from) {
    return shot.to - shot.from;
  }
  if (typeof clipLength === 'number' && clipLength > 0) return clipLength;
  return shot.seconds;
}

/**
 * How long the film runs, which is every shot added up as it will play.
 *
 * `lengths` is what each clip turned out to be, keyed by its make id — the
 * caller has measured them and this cannot. Without it the total falls back to
 * what was asked for, which is right for a board nothing has been made on yet.
 */
export function runtime(board: Storyboard, lengths?: Record<string, number>): number {
  return board.shots.reduce(
    (total, one) => total + playsFor(one, one.makeId ? lengths?.[one.makeId] : undefined),
    0,
  );
}

/** How many shots still have no clip behind them. */
export function missing(board: Storyboard): number {
  return board.shots.filter((one) => !one.makeId).length;
}

export function withShot(board: Storyboard, shot: Shot): Storyboard {
  return { ...board, shots: [...board.shots, shot].slice(0, MOST_SHOTS) };
}

export function withoutShot(board: Storyboard, id: string): Storyboard {
  return { ...board, shots: board.shots.filter((one) => one.id !== id) };
}

export function changed(board: Storyboard, id: string, fields: Partial<Shot>): Storyboard {
  return {
    ...board,
    shots: board.shots.map((one) => (one.id === id ? { ...one, ...fields } : one)),
  };
}

/**
 * A shot moved one place.
 *
 * Buttons rather than dragging, and that is a decision. Dragging a list is
 * the nicer thing on a laptop and is the harder thing on a phone, where this
 * app is mostly used — and a reorder that only works with a mouse is a reorder
 * half the people here cannot do. Two arrows work everywhere, including for
 * somebody using a keyboard.
 */
export function moved(board: Storyboard, id: string, by: -1 | 1): Storyboard {
  const at = board.shots.findIndex((one) => one.id === id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= board.shots.length) return board;
  const shots = [...board.shots];
  [shots[at], shots[to]] = [shots[to], shots[at]];
  return { ...board, shots };
}

/**
 * Every clip, in order, ready for the stitcher.
 *
 * Null where a shot has no clip or its clip has been evicted — the caller
 * decides what that means, because "not made yet" and "made and then lost" are
 * different things to say to somebody who paid for the second one.
 */
export async function clipsFor(board: Storyboard): Promise<(Blob | null)[]> {
  return Promise.all(
    board.shots.map((one) => (one.makeId ? makeBlob(one.makeId) : Promise.resolve(null))),
  );
}
