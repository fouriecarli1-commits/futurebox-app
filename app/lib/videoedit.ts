'use client';

/**
 * An edit: pieces of video on a clock, with what happens to each of them.
 *
 * ── Why this exists, and what it is not ──────────────────────────────────
 *
 * Carli, 24 September 2026: *"Jy sê ons het een, maar ek vermoed jy meen die
 * long shot funksie. wat ek bedoel is 'n editing program soos 'n video editor
 * lyk amper soos die probooth. Waar jy tydlyne het, asook kan jy filters
 * apply en export."*
 *
 * She is right and I was wrong. The long board arranges shots somebody is
 * about to generate; it is a storyboard with a render button. An editor is
 * the other thing: material you already have, laid on a clock, cut and
 * shaped and exported.
 *
 * ── Built on what is already here, because she chose that ────────────────
 *
 * Asked whether to buy an editor SDK or build on our own bones, she chose to
 * build. That is only sensible because most of the bones exist:
 *
 * - `lib/stitch.ts` already lays clips end to end in real time in the
 *   browser, with a trim, a filter and words per piece, and a song beneath.
 * - `lib/videofilters.ts` has the looks.
 * - The Pro Booth's timeline already knows how to be dragged with a thumb,
 *   with a magnet and lanes.
 * - `lib/undo.ts` already holds a history that counts its own memory.
 *
 * So this module is the part that was missing: the MODEL of an edit, and the
 * arithmetic that turns it into a `Cut` the existing stitcher can render. It
 * has no drawing in it and no React, for the same reason `lib/session.ts`
 * has none — the sums can then be tested without a screen, and the screen
 * can be argued about without touching the sums.
 *
 * ── What it deliberately does not do yet ─────────────────────────────────
 *
 * Taking an object out, and taking a background out, are not in here. They
 * are not edits, they are model calls — somebody else's, billed by the
 * minute — and pretending they are a switch on a clip would be the same
 * fault as a card that offers what the room cannot do. When they arrive they
 * arrive as a new `Piece.through`, and the cost goes on the button.
 */

import { filterCss } from './videofilters';
import type { Cut, Scene } from './stitch';
import type { Join } from './videojoins';
import { gradeCss, type Adjust } from './videoadjust';
import { BACK_DEFAULT, INK_DEFAULT, paintFor, roundFor, type BoxShape } from './videopaint';
import { bitsFor, rateFor, sizeFor } from './videoquality';
import { stretches, withSkip, wordsSpan } from './videospan';
import type { CoverFrom } from './videocover';
import type { Came } from './filmrights';

/** A piece of video on the clock. */
export interface Piece {
  readonly id: string;
  /** The material. What came off a phone, out of an engine, or off a take. */
  readonly clip: Blob;
  /** For the strip, and for a progress line that says which one is laying. */
  readonly name: string;
  /**
   * The picture the material actually holds, measured when it came in.
   *
   * Absent on a clip that arrived before this was recorded, and on one the
   * browser could not decode — so anything reading it has to cope with not
   * knowing, rather than assuming a default and calling the assumption a
   * measurement. That distinction is the whole point of it: the room could
   * only ever offer a DEFAULT shape, and a default dressed up as a reading is
   * worse than no reading. See `lib/recommend.ts`.
   */
  readonly shot?: { readonly width: number; readonly height: number };
  /**
   * Where this shot came from: filmed here, made here, or carried in.
   *
   * Carli, 5 October 2026: *"Copyright check for export."* This app cannot
   * check copyright and does not claim to — see `lib/filmrights.ts` — but it
   * does know which parts of a film came out of itself, and a piece made from
   * a file off a phone used to be indistinguishable from one taken out of her
   * own channel.
   *
   * Absent counts as carried in, and that direction is deliberate: a film made
   * before this existed has nothing on it, and the safe reading of "I do not
   * know" is "I cannot vouch for it".
   */
  readonly came?: Came;
  /** Where in the piece's own material it starts and stops, in seconds. */
  readonly from: number;
  readonly to: number;
  /** A look from `videofilters.ts`. Absent leaves the picture alone. */
  readonly look?: string;
  /** Words over this piece for as long as it is up. */
  readonly words?: string;
  /**
   * How those words are set: the face, the size as a share of frame height,
   * and where on the picture they sit.
   *
   * Carli, 30 September 2026: *"Die teks moet font opsies hê, en dit moet ook
   * gemanipuleer moet kan word op die skerm van die video, deur dit rond te
   * kan skuif, en groter en kleiner te kan maak."*
   *
   * All three optional, and absent means exactly what it meant before they
   * existed — plain type, the ladder of sizes `drawCaption` already tries,
   * and the bottom of the frame. An edit made before today opens looking the
   * way it looked.
   */
  readonly wordsFont?: string;
  readonly wordsSize?: number;
  readonly wordsAt?: { readonly x: number; readonly y: number } | null;
  /** Turned, in degrees. How solid, nought to one. How round its band is. */
  readonly wordsTurn?: number;
  readonly wordsSolid?: number;
  readonly wordsRound?: number;
  /**
   * The colour of the words, the shape behind them, and that shape's colour.
   *
   * Carli, 4 October 2026: *"Onthou dat die teks 'n kleur keuse ook moet hê, en
   * 'n keuse van agtergrond vir woorde, 'n square, 'n square met ronde punte,
   * 'n verfkwas. Die agtergrond moet ook kleur keuse hê."*
   *
   * Held as swatch IDS here and resolved to colours on the way to the
   * renderer. The edit is what gets saved and reloaded, and an id survives the
   * palette being retuned — a hex frozen into a saved edit would keep a colour
   * that is no longer one of the twenty on offer. `videopaint.ts` owns both.
   */
  /**
   * When the words come up and go down, in seconds into this piece.
   *
   * Carli, 4 October 2026: *"Dit kan nie die hele video bar vol wees nie, want
   * teks is gewoonlik net daar vir gedeeltes van 'n video."*
   *
   * Both absent is the whole piece, which is what a caption did before it
   * could be timed and is still the right default: text typed and not timed
   * should appear rather than vanish.
   *
   * Into the PIECE, not into the film, so a caption stays with its shot when
   * the shot moves or the film is cut in front of it. A caption pinned to film
   * seconds would slide off its own picture the first time anything before it
   * changed length — which is the whole reason the pieces themselves are
   * stored as trims rather than as positions.
   */
  readonly wordsFrom?: number;
  readonly wordsTo?: number;
  readonly wordsInk?: string;
  readonly wordsBack?: string;
  readonly wordsBox?: BoxShape;
  /**
   * How fast this piece plays, as a multiple. One is as filmed.
   *
   * A speed, which every clip toolbar carries and ours did not. It changes how
   * LONG the piece is as well as how it
   * looks, which is why `lengthOfPiece` has to divide by it: a four-second
   * take at two times is two seconds of film, and a timeline that drew it as
   * four would be a ruler that lies.
   */
  readonly speed?: number;
  /**
   * How this piece arrives after the one before it, and over how long.
   *
   * On the arriving piece, because that is where somebody looks for it: a join
   * belongs to the shot being chosen. Ignored on the first piece — there is
   * nothing behind it to arrive from — and `videojoins.ts` holds every number,
   * every clamp and the honest note about what the outgoing half of a dissolve
   * actually is in this renderer.
   */
  readonly join?: Join;
  readonly joinFor?: number;
  /**
   * The dials under the look: brightness, contrast, colour, warmth, softness.
   *
   * Separate from `look` because they are a different KIND of decision. A look
   * is one of thirteen, chosen; these are a correction — the shot was dark, the
   * shot was flat — and they compose with whichever look is on. See
   * `videoadjust.ts` for why, and for the honest list of what a browser can and
   * cannot do here.
   */
  readonly adjust?: Adjust;
  /**
   * How long the MATERIAL is, in seconds, whatever this window shows of it.
   *
   * ── Why this has to be kept ──────────────────────────────────────────────
   *
   * `from` and `to` are a window on a file, and until 3 October 2026 nothing
   * remembered how long the file was. That was fine while trimming was two
   * number boxes you typed into — you could type `to` back up. The moment the
   * edge of a block can be DRAGGED, it stops being fine: dragging the right edge
   * inward and then back out needs a ceiling, and without one the only honest
   * ceiling is wherever it is now. A trim you cannot drag back out is a one-way
   * door, which is the same objection that put a "back to a corner" button under
   * the logo.
   *
   * Absent means "as much as the window already shows", so an edit made by
   * anything that does not set it still trims inward and simply cannot be pulled
   * back past where it starts. Honest, and not a crash.
   */
  readonly holds?: number;
  /**
   * Fill the frame, cropping what will not fit, instead of letterboxing it.
   *
   * ── Why this is per piece and not per film ───────────────────────────────
   *
   * A film is one shape and its material is not: a phone clip shot upright and
   * a camera clip shot wide go into the same vertical film, and the right
   * answer is different for each. The wide establishing shot wants its whole
   * frame and can live with bars; the close-up of a face wants to fill the
   * screen and can lose its sides.
   *
   * Off by default, which is the behaviour this app has always had: fit the
   * whole picture in, and put the blurred wash behind it. Nothing anybody has
   * already made changes.
   */
  readonly fill?: boolean;
  /** Carry this piece's own sound. Off by default: most material is room tone. */
  readonly sound?: boolean;
  /**
   * How loud this piece's own sound is, 0 to 2.
   *
   * Separate from `sound` on purpose. Off and at nought look the same in a
   * render and are different things to a person: one is a decision about
   * this piece, the other is a slider they moved and can move back.
   */
  readonly loud?: number;
}

/**
 * The shape the film comes out, in pixels.
 *
 * On the edit rather than worked out at export, because it changes what the
 * person is looking at while they work: a piece framed for a tall phone and
 * a piece framed for a wide screen are different edits, not one edit with a
 * setting at the end.
 */
export interface Shape {
  readonly width: number;
  readonly height: number;
}

/** Tall for a phone, wide for everywhere else, and square for the rest. */
export const SHAPES: Readonly<Record<string, Shape>> = {
  tall: { width: 1080, height: 1920 },
  wide: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
  /* ── The one that was missing, 9 October 2026 ────────────────

     Four by five, 1080 × 1350: the feed post. It is the shape Instagram and
     Facebook give the most height to in a scroll, and a square posted there
     is a square with the feed's own margins around it.

     Three shapes covered the story, the screen and the square and left out
     the one most people are actually posting. */
  post: { width: 1080, height: 1350 },
};

/** The smallest and largest side a custom size may have. */
export const SIDE_MIN = 240;
export const SIDE_MAX = 4096;

/**
 * The same three shapes in the words the rest of the app uses.
 *
 * `videos` carries an aspect as `9:16`, and this room carries a shape as
 * `tall`, because a room that works in pixels needs the pixels. One mapping,
 * here beside the shapes, so a fourth shape cannot be added without the
 * question of what it is called on the way out being answered in the same
 * place.
 */
export const ASPECTS: Readonly<Record<string, '9:16' | '16:9' | '1:1'>> = {
  tall: '9:16',
  wide: '16:9',
  square: '1:1',
  /* Four by five is 0.8, and of the three the engines take, one by one is the
     nearest. It is also the one that loses least: a square cropped to 4:5
     loses a sliver off each side, where a 9:16 clip cropped to 4:5 throws
     away a third of the picture top and bottom. */
  post: '1:1',
};

/**
 * The shape this edit is actually framed at.
 *
 * ── Why a function and not `SHAPES[edit.shape]` ──────────────────────────
 *
 * Carli, 9 October 2026: *"Die video desk en photo editor moet 'n opsie hê
 * om custom sizes te kies. Dat die ratios perfek is."*
 *
 * Named shapes cover the common cases and will never cover all of them — a
 * billboard, a printed poster, a screen in a shop window, whatever the
 * client's spec sheet says. So an edit can carry its own size, and
 * everything that needs the frame asks here instead of reaching into the
 * table.
 *
 * Clamped rather than trusted: a zero or a negative is a canvas that throws,
 * and forty thousand pixels is a tab that dies. `sizeFor` makes the sides
 * even afterwards, which encoders need, so that is not repeated here.
 */
export function shapeOf(edit: { readonly shape?: string; readonly size?: Shape }): Shape {
  if (edit.shape === 'custom' && edit.size) {
    const hold = (n: number): number => Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(n)));
    return { width: hold(edit.size.width), height: hold(edit.size.height) };
  }
  return SHAPES[edit.shape ?? 'tall'] ?? SHAPES.tall;
}

/**
 * What to ask a video engine for, given the shape this edit is framed at.
 *
 * The engines take three aspects and no others, so a custom frame has to be
 * told which of the three it is nearest — by ratio, which is the only
 * honest answer, and then the clip is fitted into the real frame the way
 * every other clip is.
 *
 * Said out loud because it is a downgrade rather than a translation: a clip
 * generated for a 2:1 banner is a 16:9 clip with the top and bottom going
 * spare, and somebody should be able to find out why from the code.
 */
export function aspectOf(
  edit: { readonly shape?: string; readonly size?: Shape },
): '9:16' | '16:9' | '1:1' {
  if (edit.shape !== 'custom') return ASPECTS[edit.shape ?? 'tall'] ?? '9:16';
  const { width, height } = shapeOf(edit);
  const ratio = width / height;
  const near: ['9:16' | '16:9' | '1:1', number][] = [['9:16', 9 / 16], ['1:1', 1], ['16:9', 16 / 9]];
  return near.reduce((best, one) =>
    Math.abs(ratio - one[1]) < Math.abs(ratio - best[1]) ? one : best)[0];
}

/** An edit, whole. */
export interface Edit {
  readonly pieces: readonly Piece[];
  /**
   * What the film is called.
   *
   * On the edit rather than asked for at the end, so it is kept with the
   * project and is the same name in all three places the film has one: the
   * file that downloads, the row in her channel, and the strip she is looking
   * at while she works.
   *
   * Absent falls back to the first clip's name, which is a camera's filename
   * and is a poor title — the whole reason this field exists. Her channel
   * filling up with `VID_20261005_123456` is the shape of a feature that
   * works and nobody wants to use.
   */
  readonly title?: string;
  /** Absent is tall: most of what leaves this app is watched on a phone. */
  /** A named shape, or `custom` — in which case `size` carries the pixels. */
  readonly shape?: keyof typeof SHAPES | 'custom';
  /** The frame, when `shape` is `custom`. Clamped by `shapeOf`. */
  readonly size?: Shape;
  /**
   * What the file is written at.
   *
   * Carli, 4 October 2026: *"Die export moet ook 'n keuse van kwaliteit hê
   * waarin dit export."* A grade id from `videoquality.ts` and a frame rate;
   * the bitrate is worked out from those two rather than being a third thing
   * to choose, because the number that matters is bits per pixel per frame and
   * nobody should have to know that.
   */
  readonly grade?: string;
  readonly fps?: number;
  /**
   * The two red lines, and whether the song comes with the cut.
   *
   * Carli, 4 October 2026: *"twee ekstra rooi lyne ... en ook die keuse van
   * interlock net soos by probooth."*
   *
   * `span` is where the lines are, in film seconds, and is absent until she
   * puts one down. `locked` is the interlock, and it is ON by default: a cut
   * made to the music is the common case, and the surprising one is the film
   * sliding against its own soundtrack.
   *
   * `underSkips` is what the interlock has already done, in SONG seconds —
   * see `withSkip` in `videospan.ts` for why those two clocks cannot be the
   * same number.
   */
  /**
   * The film's cover, and where it came from.
   *
   * Carli, 4 October 2026: *"'n opsie ... om 'n cover foto vir die video te
   * screen shot uit die video, of een in te bring wat dan die video se
   * voorblad foto word ook wanneer die video ge-export word."*
   *
   * Not part of the film and deliberately not in `cutFrom`: a cover is a
   * separate picture shown in the film's place, and there is no way to put one
   * inside a webm the browser writes — see `videocover.ts` for why, and why
   * making it the first frame would be worse.
   *
   * `coverFrom` is only so the room can say which of the two it was. A grabbed
   * frame and a brought-in picture behave identically once they exist.
   */
  readonly cover?: Blob | null;
  readonly coverFrom?: CoverFrom;
  readonly span?: { readonly from: number; readonly to: number } | null;
  readonly locked?: boolean;
  /**
   * The magnet, which can be off.
   *
   * On by default and rarely turned off, but it has to be possible: a line
   * that will not go where the hand puts it is worse than no magnet, and it is
   * the same argument the Pro Booth's Snap box settles the same way.
   */
  readonly magnet?: boolean;
  readonly underSkips?: readonly { readonly from: number; readonly to: number }[];
  /** A song under the whole thing, and where in it to start. */
  readonly under?: Blob | null;
  /** Where that song came from, and what it is called. See `Piece.came`. */
  readonly underCame?: Came;
  readonly underName?: string;
  readonly underFrom?: number;
  /** How loud the song is against the pieces, 0 to 2. */
  readonly underLoud?: number;
  /**
   * The two sound lanes, switched off and soloed.
   *
   * Carli, 5 October 2026: *"Mens moet op 'n music track kan kliek en dit
   * mute, net soos in probooth die s, m."*
   *
   * The same pair the Pro Booth's desk carries, and the same rule: solo wins
   * over mute, because solo is the louder statement — somebody who has
   * soloed the music is listening to the music, and a mute left on another
   * lane from ten minutes ago must not be the reason they hear nothing.
   * `heard` below is the one place that resolves the two.
   */
  readonly underMute?: boolean;
  readonly shotsMute?: boolean;
  readonly solo?: 'shots' | 'music' | null;
  /**
   * How far the music drops while a shot is speaking, as a multiplier.
   *
   * Carli, 5 October 2026: *"Dit moet ook die funksie en button in hê wanneer
   * 'n video praat, dan moet die musiek sagter gaan elke keer wanneer die
   * praat stem in kom."*
   *
   * Keyed on the shot's own `sound` switch rather than on listening for a
   * voice inside the clip, and that is a decision rather than a shortcut.
   * `sound` is exactly the flag that says THIS SHOT TALKS — she sets it, she
   * can see it on the lane, and the duck therefore happens where she expects
   * it to and nowhere else. A detector would duck on a door slam and not on a
   * whisper, and there would be nothing on the screen explaining either.
   *
   * Absent is no ducking at all, so every film already made sounds the way it
   * did.
   */
  readonly duck?: number;
  /**
   * Stereo, or folded to mono.
   *
   * Carli asked for "stereo, mono surround". Two of those three are real
   * here: the file this browser writes is a webm with a stereo track, and
   * mono is that track with both sides the same. Surround is not something
   * `MediaRecorder` can be asked for — there is no six-channel webm at the
   * end of this — so it is not offered. A button that cannot do what it says
   * is worse than a missing one, and `lib/channels.ts` already holds the
   * fold for the one place surround is real: a song being taken down.
   */
  readonly mix?: 'stereo' | 'mono';
  /**
   * How fast the song under the film plays, as a multiple.
   *
   * Carli, 5 October 2026: *"Op die sound tracks moet mens die spoed van die
   * klank ook kan verstel."*
   *
   * The shots have had this since the speed slider was built; the bed never
   * did, so a song that is four beats-per-minute out of step with a cut could
   * be scrubbed along but never stretched to fit.
   *
   * It changes the PITCH as well as the length — this is a playback rate, not
   * a time stretch, and a browser has no time stretch to offer. Said out loud
   * on the slider, because a song that comes back a semitone up and nothing
   * explaining it is the kind of wrong that reads as the app being broken.
   */
  readonly underSpeed?: number;
  /**
   * Repeat the song when the film outlasts it.
   *
   * Carli: *"Duplicate funksie."* The song stops and the rest of the film is
   * silent; this plays it again from wherever the bed was scrubbed to, as
   * many times as the film needs.
   */
  readonly underLoop?: boolean;
  /**
   * Take the rumble and the hiss off the shots' own sound.
   *
   * Carli: *"daar moet ook 'n reduce noise funksie wees."*
   *
   * Two filters and nothing more, and it is named for what it does rather
   * than for what the phrase usually promises. It is not a model that
   * separates a voice from a room: it rolls off below `NOISE_LOW`, where
   * traffic, handling and air conditioning live and almost no voice does,
   * and above `NOISE_HIGH`, where tape and preamp hiss live and a phone
   * microphone has nothing worth keeping anyway.
   *
   * On the shots and not on the song, because a song is a finished record and
   * cutting the top off one is damage. The noise is in the room the camera
   * was in.
   */
  readonly denoise?: boolean;
  /** Seconds of black fading up at the start, and down at the end. */
  readonly fadeIn?: number;
  readonly fadeOut?: number;
}

/**
 * The longest a fade may be, in seconds.
 *
 * Two. A fade is punctuation, not a scene: three seconds of black at the
 * front of a thirty-second advert is a tenth of the thing somebody paid for,
 * spent on nothing. It is also the figure at which a fade stops reading as
 * "this is beginning" and starts reading as "has it loaded?".
 */
export const LONGEST_FADE = 2;

/** Nothing on the clock. */
export const NOTHING: Edit = { pieces: [] };

/** How long a piece is on screen, in seconds. */
export function lengthOfPiece(piece: Piece): number {
  /* Divided by the speed, and this is the line that makes the ruler honest.
     A four-second take at two times is two seconds OF FILM, and a timeline
     drawing it as four would put every block after it in the wrong place and
     the playhead on the wrong frame. Any editor draws a sped-up clip shorter
     on its timeline for the same reason. */
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  return Math.max(0, (piece.to - piece.from) / fast);
}

/** How long the whole edit runs, in seconds. */
export function runs(edit: Edit): number {
  return edit.pieces.reduce((all, one) => all + lengthOfPiece(one), 0);
}

/**
 * How far a caption on this piece may run, in seconds from its piece's start.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Dit wil wel nie verby een video stretch nie. As hy
 * op sy eie tydlyn is moet hy ruimte hê om verby 'n ander video te kan
 * stretch."*
 *
 * A caption used to be clamped to its own piece, and that was never a decision
 * anybody made: the piece was the only thing the span knew about. A lane of
 * its own is only a lane if something on it can cross a cut — a line that
 * carries over the next two shots is the ordinary case in anything with
 * subtitles on it.
 *
 * ── Why it stops at the next caption and not at the end of the film ──────
 *
 * Because there is one words lane, and two captions on the same second is not
 * a lane — it is two pieces of text drawn on top of each other in the same
 * place on the frame, both unreadable. Stopping at the next one makes an
 * overlap impossible rather than ugly, which is also what lets the renderer
 * stay simple: at most one caption is ever up.
 *
 * The next caption's own start is included, so dragging this one all the way
 * to the right leaves the two touching rather than overlapping by a frame.
 */
export function wordsReach(edit: Edit, id: string): number {
  const mine = startsAt(edit, id);
  if (!Number.isFinite(mine)) return 0;
  let seen = false;
  let at = 0;
  for (const one of edit.pieces) {
    const long = lengthOfPiece(one);
    if (seen && (one.words ?? '').trim()) {
      /* Where the NEXT caption comes up on the film, brought back onto this
         piece's own clock, which is what the span is measured in. */
      return Math.max(0, at + Math.max(0, one.wordsFrom ?? 0) - mine);
    }
    if (one.id === id) seen = true;
    at += long;
  }
  return Math.max(0, at - mine);
}

/**
 * Which caption is up at `second` on the film's clock, if any.
 *
 * The piece it belongs to, because the words and every one of their settings
 * live on it. Needed the moment a caption could outlive its own shot: the
 * piece under the playhead is no longer the piece whose words are on screen,
 * and the preview that assumed it was showed nothing over the shots a caption
 * had been stretched across.
 */
export function captionAt(edit: Edit, second: number): Piece | null {
  let at = 0;
  for (const one of edit.pieces) {
    const long = lengthOfPiece(one);
    if ((one.words ?? '').trim()) {
      const when = wordsSpan(one, long, wordsReach(edit, one.id));
      if (second >= at + when.from && second <= at + when.to) return one;
    }
    at += long;
  }
  return null;
}

/** Where a piece starts on the edit's own clock, in seconds. */
export function startsAt(edit: Edit, id: string): number {
  let at = 0;
  for (const one of edit.pieces) {
    if (one.id === id) return at;
    at += lengthOfPiece(one);
  }
  /* ── Not `at`, which is the end of the film ─────────────────────────────

     This fell out of the loop returning `at`, so a piece that is not in the
     edit was told it starts where the film ends. A real, plausible second for
     something that does not exist, which is the `indexOf`-answers-minus-one
     fault in another costume: every caller got a number it could do arithmetic
     with and none of them could tell it was meaningless.

     The caller that mattered was the split button, which asks for the start of
     the piece it is about to cut. A stale id — a piece dropped between the
     render and the tap — would have cut at the end of the film instead of
     refusing, and `split` guards on the OFFSET rather than on the id, so it
     would have gone through.

     NaN, because it is the one number that cannot be quietly used. Anything
     built on it is NaN, every comparison against it is false, and a block
     positioned at it does not appear — which is a visible fault rather than a
     cut in the wrong place. Found by `check:cutmaths`. */
  return Number.NaN;
}

/**
 * Which piece is on screen at a given second, and how far into its own
 * material that second falls.
 *
 * ── Why this is here and not in the room ─────────────────────────────────
 *
 * A playhead needs exactly two answers — what am I looking at, and where do I
 * seek it to — and both are arithmetic over the pieces. Working them out in
 * the component would put a second understanding of what "the clock" means
 * next to `startsAt` and `runs`, and the two would drift the first time
 * anything about trimming changed.
 *
 * `into` is an offset into the piece's OWN material, so it already has
 * `from` added. That is the number a `<video>` element wants, and returning
 * the offset-from-the-piece's-start instead would mean every caller adding
 * `from` and one of them forgetting.
 *
 * Past the end returns null rather than the last piece. A playhead dragged
 * off the end is at nothing, and answering "the last frame" would make the
 * end of the film indistinguishable from a second after it.
 */
export function atSecond(
  edit: Edit,
  second: number,
): { readonly piece: Piece; readonly into: number } | null {
  let start = 0;
  for (const piece of edit.pieces) {
    const length = lengthOfPiece(piece);
    if (second < start + length) {
      /* ── Multiplied by the speed ──────────────────────────────────────

         `second - start` is a position on the FILM's clock. `into` has to be a
         position in the FILE, because it is what a `<video>` is seeked to — and
         a piece at twice the speed covers two seconds of material per second of
         film.

         Missing until 3 October 2026, put there by making `lengthOfPiece`
         divide by the speed the night before. The playhead on a sped-up piece
         therefore showed a frame from earlier in the shot than the line said,
         and the faster the piece the further out it was. Invisible to every
         check there was: the probe scrubs across a split at one times, where
         the speed is one and multiplying by it changes nothing.

         The same bug `split` had, in the same place, from the same cause.
         `check:cutmaths` now reads both. */
      const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
      return { piece, into: piece.from + Math.max(0, second - start) * fast };
    }
    start += length;
  }
  return null;
}

/**
 * The other direction: a position in a piece's own material, back on the film's
 * clock.
 *
 * ── Why this is a function and not a line in the component ────────────────
 *
 * It is the exact inverse of `atSecond`'s `into`, and it was a line in
 * `VideoEditor.tsx` reading `startsAt(edit, id) + (currentTime - from)` — with
 * no divide by the speed. So while a piece at twice the speed played, the
 * playhead ran at twice the rate of the film underneath it: the line finished
 * the block while the picture was halfway through it.
 *
 * Three places were doing this conversion by hand and two of them were wrong,
 * each in a different direction. Written once, it can be checked once — and
 * `check:cutmaths` checks it the only way that proves both halves at the same
 * time, by going out through `atSecond` and back through here and landing on the
 * second it started from.
 */
export function filmSecond(edit: Edit, id: string, into: number): number {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece) return Number.NaN;
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  return startsAt(edit, id) + Math.max(0, into - piece.from) / fast;
}

/**
 * A fade, clamped to something the edit can actually hold.
 *
 * Both ends against `LONGEST_FADE`, and both together against the run: a one
 * second fade in and out on a one-and-a-half second edit is a film that is
 * never fully up, which is not what anybody meant by "fade". Halved rather
 * than refused, because a slider that can be dragged there is a slider
 * somebody will drag there, and losing the edit over it is a poor trade for
 * a validation message.
 */
export function fadesFor(edit: Edit): { readonly in: number; readonly out: number } {
  const total = runs(edit);
  let up = Math.max(0, Math.min(LONGEST_FADE, edit.fadeIn ?? 0));
  let down = Math.max(0, Math.min(LONGEST_FADE, edit.fadeOut ?? 0));
  if (total <= 0) return { in: 0, out: 0 };
  if (up + down > total) {
    const share = total / (up + down);
    up *= share;
    down *= share;
  }
  return { in: up, out: down };
}

/**
 * The edit, as the stitcher's `Cut`.
 *
 * One direction only, and that is the whole point: the editor never learns
 * to render. There is one renderer, it is the one the video desk already
 * uses, and a second one would be a second answer to "what does this look
 * like" — which is the fault this repository keeps finding in other things.
 */
export function cutFrom(edit: Edit): Cut {
  const kept = edit.pieces.filter((one) => lengthOfPiece(one) > 0);
  const scenes: Scene[] = kept
    .map((one) => ({
      clip: one.clip,
      name: one.name,
      from: one.from,
      to: one.to,
      /* `filterCss` answers '' for a look that is not in the list, and an
         empty grade leaves the canvas filter untouched — which is not the
         same as setting it to `none`, and is the right behaviour for a
         browser that does not honour the property at all. */
      /* The look and the dials as one filter string, through `gradeCss`, so
         the preview and the render cannot compose them in different orders.
         `filterCss` answers '' for a look that is not in the list, and an empty
         grade leaves the canvas untouched — which is not the same as `none`,
         and is right for a browser that does not honour the property at all. */
      ...(gradeCss(filterCss(one.look), one.adjust)
        ? { grade: gradeCss(filterCss(one.look), one.adjust) }
        : {}),
      ...(one.speed && one.speed !== 1 ? { speed: one.speed } : {}),
      ...(one.loud !== undefined ? { loud: one.loud } : {}),
      ...(one.fill ? { fill: true } : {}),
      /* A shot speaks only if the shots lane is being heard at all. Resolved
         here, where the edit becomes a cut, so the mute on the lane is the
         same mute in the film — see `heard`. */
      ...(one.sound && heard(edit).shots ? { sound: true } : {}),
      /* The hard cut is the default everywhere, so it is not carried: a scene
         with no `join` and a scene with `join: 'cut'` render the same, and
         sending the second one would put a field on every scene of every film
         ever made in this room to say "nothing happens here". */
      ...(one.join && one.join !== 'cut' ? { join: one.join } : {}),
      ...(one.join && one.join !== 'cut' && one.joinFor ? { joinFor: one.joinFor } : {}),
    }));

  /* ── The captions, laid out on the FILM and then cut up again ─────────

     Carli, 5 October 2026: *"As hy op sy eie tydlyn is moet hy ruimte hê om
     verby 'n ander video te kan stretch."*

     A caption used to be a field on its own scene, which is the one shape that
     cannot say "this line carries on over the next two shots". So each one is
     put on the film's clock here, where both clocks are known, and then handed
     to every scene it touches with ends measured in THAT scene's seconds —
     negative at the front for one that started earlier.

     The renderer still only ever draws one, because `wordsReach` stops each
     caption where the next one begins. This loop could hand a scene two, and
     that is deliberate: a scene can have a line arriving from before it AND
     its own starting later in the same shot.

     A swatch id becomes a colour here, at the one place an edit becomes a cut.
     An unknown id falls back to the default rather than to the first swatch: a
     caption that quietly turns white is one somebody can see is wrong, and one
     that quietly turns pink is not. */
  const starts: number[] = [];
  let along = 0;
  for (const one of kept) {
    starts.push(along);
    along += lengthOfPiece(one);
  }

  const bands = kept.flatMap((one, index) => {
    const said = (one.words ?? '').trim();
    if (!said) return [];
    const when = wordsSpan(one, lengthOfPiece(one), wordsReach(edit, one.id));
    return [{
      from: starts[index] + when.from,
      to: starts[index] + when.to,
      said: {
        text: said,
        ...(one.wordsFont ? { font: one.wordsFont } : {}),
        ...(one.wordsSize ? { size: one.wordsSize } : {}),
        ...(one.wordsAt ? { at: one.wordsAt } : {}),
        ...(one.wordsTurn ? { turn: one.wordsTurn } : {}),
        ...(one.wordsSolid !== undefined ? { solid: one.wordsSolid } : {}),
        ...(one.wordsInk ? { ink: paintFor(one.wordsInk)?.hex ?? INK_DEFAULT } : {}),
        ...(one.wordsBack ? { back: paintFor(one.wordsBack)?.hex ?? BACK_DEFAULT } : {}),
        ...(one.wordsBox ? { box: one.wordsBox } : {}),
        /* The shape decides the corner radius, so a square really is square —
           but only when she has not set one by hand. A number she dragged is
           hers, and a shape button overruling it would undo a gesture. */
        ...(one.wordsRound !== undefined
          ? { round: one.wordsRound }
          : one.wordsBox ? { round: roundFor(one.wordsBox) } : {}),
      },
    }];
  });

  const told: Scene[] = scenes.map((scene, index) => {
    const begins = starts[index];
    const ends = begins + lengthOfPiece(kept[index]);
    const over = bands.filter((band) => band.to > begins && band.from < ends);
    if (!over.length) return scene;
    return {
      ...scene,
      captions: over.map((band) => ({
        ...band.said,
        from: band.from - begins,
        to: band.to - begins,
      })),
    };
  });

  const shape = shapeOf(edit);
  /* The chosen grade applied HERE, at the one place an edit becomes a cut.
 
     So the renderer never learns what a grade is — by the time a cut reaches
     it the film simply is that size, and every measurement downstream (the
     letterbox, the caption's size as a share of height, the logo's corner)
     goes on being a share of the real frame. A renderer that scaled at the end
     would have a caption sized for one frame drawn into another. */
  const frame = sizeFor(shape, edit.grade);
  const fps = rateFor(edit.fps);
  const on = heard(edit);
  return {
    scenes: told,
    audio: on.music ? edit.under ?? null : null,
    ...(edit.mix === 'mono' ? { mix: 'mono' as const } : {}),
    /* Only when there is a song for them to act on, for the same reason the
       duck is: a number on a cut that cannot use it is a number the renderer
       has to decide to ignore. */
    ...(edit.under && on.music && edit.underSpeed !== undefined && edit.underSpeed !== 1
      ? { audioSpeed: Math.max(0.5, Math.min(2, edit.underSpeed)) } : {}),
    ...(edit.under && on.music && edit.underLoop ? { audioLoop: true } : {}),
    /* And only when a shot actually speaks: filtering silence is work for
       nothing, and a flag the renderer has to look past is a flag that will
       one day be looked past wrongly. */
    ...(edit.denoise && on.shots && kept.some((one) => one.sound) ? { denoise: true } : {}),
    /* Only when there is both a song to duck and a shot to duck it for. A
       number on a cut that cannot use it is a number the renderer has to
       decide to ignore, and a renderer making decisions about the edit is
       the thing `cutFrom` exists to prevent. */
    ...(edit.duck !== undefined && edit.under && on.music && on.shots
      && kept.some((one) => one.sound)
      ? { duck: Math.max(0, Math.min(1, edit.duck)) } : {}),
    width: frame.width,
    height: frame.height,
    fps,
    bits: bitsFor(frame.width, frame.height, fps),
    ...(edit.underFrom ? { audioFrom: edit.underFrom } : {}),
    ...(edit.underSkips?.length ? { audioSkips: edit.underSkips } : {}),
  };
}

/**
 * Which of the two sound lanes is actually heard.
 *
 * Mute and solo in one place, because they are one question and answering it
 * twice is how a preview and a film end up disagreeing about silence — the
 * hardest kind of disagreement to notice, since both of them are quiet.
 *
 * Solo beats mute. Somebody who has soloed the music is listening to the
 * music, and a mute left on the other lane ten minutes ago must not be the
 * reason they hear nothing.
 */
export function heard(edit: Edit): { readonly music: boolean; readonly shots: boolean } {
  if (edit.solo === 'music') return { music: true, shots: false };
  if (edit.solo === 'shots') return { music: false, shots: true };
  return { music: !edit.underMute, shots: !edit.shotsMute };
}

/**
 * Where in the song the film is, at `second` on the film's clock.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Binne die video editor. Wanneer ek die musiek
 * tydlyn in sit en ek druk play, dan hoor mens nie die klank binne die video
 * nie."*
 *
 * The room never played the bed at all. The song was mixed in `stitch.ts`,
 * when the film is put together, and the preview was the picture and nothing
 * else — so laying a track under a film and pressing play gave silence, and
 * the only way to hear what she had made was to pay for the render.
 *
 * ── Why the arithmetic lives here ────────────────────────────────────────
 *
 * Because the song does not run straight: it starts at `underFrom`, and every
 * stretch cut out of it with the red lines makes it jump. `stretches` already
 * works that out for the renderer, which schedules one source per run.
 *
 * So this asks `stretches` the same question the renderer asks and reads the
 * answer back the other way round. A preview with its own copy of "where is
 * the song now" is a preview that drifts from the film the first time either
 * is touched — and the drift would be audible rather than visible, which is
 * the kind nobody can point at.
 *
 * `null` when the film has run past the end of the song, which is a real
 * answer: there is nothing to play, and a number there would be a position in
 * a file that has ended.
 */
export function songSecond(edit: Edit, second: number): number | null {
  if (!edit.under) return null;
  const long = runs(edit);
  if (long <= 0) return null;
  /* Times the rate, because `stretches` answers in FILM seconds and this has
     to answer in the song's. A song at one and a half consumes one and a half
     seconds of itself per second of film, and leaving the multiplication out
     is a fault that is invisible at one times — which is every film made
     before the speed existed, and every test anybody writes first. */
  const rate = Math.max(0.5, Math.min(2, edit.underSpeed ?? 1));
  for (const run of stretches(edit.underSkips ?? [], edit.underFrom ?? 0, long)) {
    if (second >= run.at && second < run.at + run.long) {
      return run.from + (second - run.at) * rate;
    }
  }
  return null;
}

/**
 * Take the span out of the SONG and leave the picture alone.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Die sound tracks onder videos moet ook geselect kan
 * word, sodat mens daardie tyd lyne ook kan split. Huidiglik kan mens nie die
 * musiek tydlyne select nie."*
 *
 * The music lane could be dragged along and nothing else. Cutting a stretch
 * out of the song — so the rest of it moves up against a picture that has not
 * changed — is the one edit a bed actually needs, and there was no way to ask
 * for it.
 *
 * ── Why this is `withSkip` and not a second mechanism ────────────────────
 *
 * Because the interlock has been doing exactly this since the red lines were
 * built: when she cuts a span out of the FILM with the interlock on, the song
 * loses the same span through this same call. All that was missing was a way
 * to ask for the song half on its own.
 *
 * So there is one answer to "what does the song do when something is taken out
 * of it", and the renderer plays it the one way `stretches` already schedules.
 * A second mechanism would be a second answer, and the two would disagree the
 * first time either was touched.
 */
export function cutSong(edit: Edit, span: { from: number; to: number }): Edit {
  /* Nothing to cut out of. A skip list on a film with no track under it is a
     fact about nothing, and it would survive a track being added later and
     silently chop the new one — the same reason `cutOut` only records one when
     there is a song. */
  if (!edit.under || span.to <= span.from) return edit;
  return {
    ...edit,
    span: null,
    underSkips: withSkip(edit.underSkips ?? [], { from: span.from, to: span.to }),
  };
}

/* ── The edits themselves, as pure functions ──────────────────────────────

   Every one takes an edit and hands back a new one. Nothing is changed in
   place, so a history is the array that was there — see `lib/undo.ts`, which
   the booth uses for exactly this reason. */

/** A piece added at the end. */
export function add(edit: Edit, piece: Piece): Edit {
  return { ...edit, pieces: [...edit.pieces, piece] };
}

/**
 * One edge of a piece's window, moved.
 *
 * `at` is a position in the FILE, because that is what an edge of a window is —
 * and the room converts a pixel on the strip into one by multiplying by the
 * speed, the same way `split` does. The two clocks are described at length on
 * `filmSecond`; this function is on the file's side of them.
 *
 * Every clamp is here rather than at the three call sites a drag, a number box
 * and an arrow key would otherwise be:
 *
 * - the start cannot go below nought, and the end cannot pass `holds`;
 * - neither may cross the other, and they must stay `SHORTEST_PIECE` apart,
 *   because a block thinner than that cannot be picked up again;
 * - an unknown id changes nothing, so a stale selection is a no-op rather than
 *   an edit of whatever `find` reached first.
 */
export function trim(edit: Edit, id: string, which: 'from' | 'to', at: number): Edit {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece || !Number.isFinite(at)) return edit;
  /* Absent `holds` means "no more than it already shows". See the note on the
     field: it trims inward and refuses to be pulled back out, which is a limit
     somebody can feel rather than a ceiling nobody set. */
  const ceiling = Number.isFinite(piece.holds) ? (piece.holds as number) : piece.to;
  const put = which === 'from'
    ? Math.max(0, Math.min(at, piece.to - SHORTEST_PIECE))
    : Math.max(piece.from + SHORTEST_PIECE, Math.min(at, ceiling));
  if (put === piece[which]) return edit;
  return change(edit, id, { [which]: put } as Partial<Omit<Piece, 'id'>>);
}

/**
 * A piece copied, and the copy put straight after it.
 *
 * Every grade, caption, speed and placement comes with it. That is the whole
 * value of it: a shot that has been framed, graded and captioned is twenty
 * seconds of work, and wanting the same shot twice — a beat repeated, a product
 * shown again at the end — should not mean doing all of it again.
 *
 * A new id, because two pieces with one id is a selection that picks whichever
 * `find` reaches first and a history that restores the wrong one.
 */
export function duplicate(edit: Edit, id: string): Edit {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece) return edit;
  const copy: Piece = {
    ...piece,
    id: `${id}-copy-${Math.random().toString(36).slice(2, 8)}`,
  };
  return {
    ...edit,
    pieces: edit.pieces.flatMap((one) => (one.id === id ? [one, copy] : [one])),
  };
}

/** A piece taken out. */
export function drop(edit: Edit, id: string): Edit {
  return { ...edit, pieces: edit.pieces.filter((one) => one.id !== id) };
}

/** A piece changed. Unknown ids leave the edit alone rather than throwing. */
export function change(edit: Edit, id: string, how: Partial<Omit<Piece, 'id'>>): Edit {
  return {
    ...edit,
    pieces: edit.pieces.map((one) => (one.id === id ? { ...one, ...how } : one)),
  };
}

/**
 * A piece moved one place earlier or later.
 *
 * By one, rather than to an index. Dragging a clip past its neighbour is the
 * gesture, and an index is what that gesture produces on a mouse and not on
 * a thumb — the booth's lanes learned this and `lib/laneorder.ts` is the
 * same shape for the same reason.
 */
export function move(edit: Edit, id: string, way: 'earlier' | 'later'): Edit {
  const at = edit.pieces.findIndex((one) => one.id === id);
  if (at === -1) return edit;
  const to = way === 'earlier' ? at - 1 : at + 1;
  if (to < 0 || to >= edit.pieces.length) return edit;
  const next = [...edit.pieces];
  [next[at], next[to]] = [next[to], next[at]];
  return { ...edit, pieces: next };
}

/**
 * A piece cut in two at a moment on the edit's clock.
 *
 * The material is not touched: both halves point at the same blob with
 * different windows, which is what makes the cut free and what makes undoing
 * it a matter of putting the window back. The same rule the Pro Booth's
 * lanes follow.
 *
 * A cut at or past either edge is refused by returning the edit unchanged: a
 * split that leaves nothing on one side is a piece somebody cannot see, grab
 * or delete, and two of them are worse than one.
 */
export const SHORTEST_PIECE = 0.1;

export function split(edit: Edit, id: string, at: number): Edit {
  const piece = edit.pieces.find((one) => one.id === id);
  if (!piece) return edit;
  /* `at` is a second on the FILM's clock. `into` is therefore how far into this
     piece the cut falls, also in film seconds. */
  const into = at - startsAt(edit, id);
  if (!(into > SHORTEST_PIECE && into < lengthOfPiece(piece) - SHORTEST_PIECE)) return edit;
  /* ── And film seconds are not clip seconds ─────────────────────────────

     Multiplied by the speed, and this line was missing until 3 October 2026.

     `lengthOfPiece` started dividing by the speed the night before, so `into`
     above is film time — but `piece.from + into` is a position in the FILE, and
     a piece playing at two times covers two seconds of file per second of film.
     Splitting a 2x piece in the middle of the film cut it a quarter of the way
     into the material instead of halfway.

     Invisible in every check there was: `check:editor` split one piece at one
     times and asserted the film was still as long as it was, which is true
     wherever the cut lands. */
  const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
  const cut = piece.from + into * fast;
  const left: Piece = { ...piece, id: `${piece.id}-a`, to: cut };
  const right: Piece = { ...piece, id: `${piece.id}-b`, from: cut };
  return {
    ...edit,
    pieces: edit.pieces.flatMap((one) => (one.id === id ? [left, right] : [one])),
  };
}

/**
 * Split whatever the playhead is standing on, where it is standing.
 *
 * Carli, 4 October 2026: *"'n funksie om bloot net waar die curser is te
 * split."*
 *
 * `split` already existed and already took a film second — what it also took
 * was the id of the piece to cut, which means the room had to work out which
 * piece the playhead was in before it could ask. That is `atSecond`'s job, so
 * it is done here once rather than at every call site.
 *
 * Returns the edit unchanged when the playhead is in nothing, or is within a
 * breath of a cut that already exists. A split that makes a piece of four
 * frames is a piece nobody wanted and one more thing to drag off again.
 */
export function splitHere(edit: Edit, second: number): Edit {
  const here = atSecond(edit, second);
  if (!here) return edit;
  return split(edit, here.piece.id, second);
}

/**
 * Take a span out of the film, and let everything after it close up.
 *
 * Carli, 4 October 2026: *"die oomblik wanneer 'n mens 'n stuk uit cut moet
 * die video wat verder is die gaping toe maak en terug spring."*
 *
 * ── Which it does by construction, and that is worth saying ──────────────
 *
 * A piece's start is the sum of the lengths before it — `startsAt` computes
 * it, nothing stores it. So there is no gap to close and no "ripple" mode to
 * get wrong: shortening or removing a piece moves everything after it back by
 * exactly that much, because that is what the arithmetic says.
 *
 * ── What this does have to get right ─────────────────────────────────────
 *
 * The three ways a span meets a piece, and all three happen on one cut:
 *
 *  · the piece is wholly inside the span — it goes;
 *  · the span starts inside the piece and runs past its end — the piece keeps
 *    its head;
 *  · the span is wholly inside one piece — the piece keeps a head and a tail,
 *    which is two pieces, not one with a hole in it.
 *
 * Measured in FILE seconds on the way in, because a piece at two times covers
 * two seconds of material per second of film — the same multiplication `split`
 * and `atSecond` each lost once, recorded in their own notes.
 *
 * A piece left shorter than `SHORTEST_PIECE` is dropped rather than kept: a
 * sliver of a frame is a flash in the finished film and nothing in the room is
 * big enough to grab it by.
 */
export function cutOut(edit: Edit, span: { from: number; to: number }): Edit {
  const from = Math.max(0, Math.min(span.from, span.to));
  const to = Math.max(span.from, span.to);
  if (!(to - from > 0)) return edit;

  const pieces: Piece[] = [];
  let start = 0;
  for (const piece of edit.pieces) {
    const long = lengthOfPiece(piece);
    const ends = start + long;
    const fast = Math.max(0.1, Math.min(4, piece.speed ?? 1));
    /* No overlap at all — kept whole, and that includes every piece after the
       span: they are unchanged, and they move back because the pieces before
       them got shorter. */
    if (ends <= from || start >= to) {
      pieces.push(piece);
      start = ends;
      continue;
    }
    const head = Math.max(0, from - start);
    const tail = Math.max(0, ends - to);
    if (head >= SHORTEST_PIECE) {
      pieces.push({ ...piece, id: `${piece.id}-h`, to: piece.from + head * fast });
    }
    if (tail >= SHORTEST_PIECE) {
      pieces.push({
        ...piece,
        id: `${piece.id}-t`,
        from: piece.to - tail * fast,
        /* The tail is a new start, so it opens on a straight cut rather than
           keeping a transition that was built to arrive from the piece in
           front of it — which is no longer the piece in front of it. */
        join: head >= SHORTEST_PIECE ? 'cut' : piece.join,
      });
    }
    start = ends;
  }
  /* ── The interlock ────────────────────────────────────────────────────

     On, the song loses the same span, so every shot keeps the music it was
     cut to. Off, the song plays straight through and the film is simply
     shorter against it — which is right when the music is a bed rather than
     something the cuts were made to.

     Recorded only when there is a song to cut: a skip list on a film with no
     track under it is a fact about nothing, and it would survive a track being
     added later and silently chop the new one. */
  const locked = edit.locked ?? true;
  const next: Edit = { ...edit, pieces, span: null };
  if (!locked || !edit.under) return next;
  return { ...next, underSkips: withSkip(edit.underSkips ?? [], { from, to }) };
}
