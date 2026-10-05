'use client';

/**
 * Many short clips, one long film.
 *
 * ── The problem this exists for ──────────────────────────────────────────
 *
 * Every video engine on the shelf caps a single generation somewhere between
 * four and thirty seconds. A music video is three minutes. That gap is not
 * something a better prompt closes — it is a hard limit of the models — so a
 * long video has to be built the way a film always has been: shot by shot,
 * cut together.
 *
 * The cutting is the part that was missing. Generating twelve clips was
 * already possible and left somebody with twelve files and no way to make one.
 *
 * ── Why it runs in the browser ───────────────────────────────────────────
 *
 * The clips are already here. Sending twelve of them up to a server, encoding
 * there, and sending one back is a lot of somebody's mobile data for work a
 * laptop can do, and it needs a machine this app does not run — a Vercel
 * function has neither the time nor the memory for a three-minute encode.
 *
 * ── How, and what that costs ─────────────────────────────────────────────
 *
 * Each clip is played onto one canvas in order while a `MediaRecorder` records
 * the canvas the whole way through. It is the same mechanism the booth and the
 * selfie recorder already use, so it works everywhere they do.
 *
 * The cost is honest and unavoidable: **it happens in real time**. A
 * three-minute film takes three minutes, with the tab open and awake. That is
 * not slowness in this code, it is what recording a canvas means — the frames
 * are captured as they are painted, and painting them faster does not make the
 * video shorter.
 *
 * `VideoEncoder` (WebCodecs) would beat that handsomely: decode and re-encode
 * without playing anything, several times faster than real time. It is not
 * used here for a reason that matters more than speed — it is absent from the
 * browser this project runs its checks in, so a WebCodecs path could be
 * written and could not be verified. Everything else in this repository is
 * measured before it is claimed, and an export nobody has watched work is the
 * worst thing to make an exception for. The note in `docs/LONG_VIDEO.md` says
 * what it would take to add it later.
 *
 * ── The sound ────────────────────────────────────────────────────────────
 *
 * `canvas.captureStream()` carries pictures and nothing else, so a music video
 * built this way would come out silent. The song is played through an
 * `AudioContext` into a `MediaStreamAudioDestinationNode`, and that track is
 * added to the same stream the recorder is given — one file, sound and
 * picture, in one pass.
 *
 * The clips' own sound is not carried by default. Every one of them is a
 * separate generation with its own room tone, and twelve of those cutting
 * against each other under a song is noise.
 *
 * That was written as though room tone were the only thing in a clip, and it
 * is not. Carli, 23 September 2026: *"Dit wil ook voorkom dat daai kamer glad
 * nie klank wat praat genereer nie."* A shot generated with a spoken line has
 * a voice in it, and muting every clip threw that away along with the hiss —
 * so a film whose shots had been paid to speak came out silent, twice over.
 *
 * So it is per scene now. `Scene.sound` carries that clip's own audio and
 * nothing else does, which keeps the original decision exactly where it was
 * right: a shot nobody asked to speak is still muted.
 */

import { drawMark, MARK_SHARE, type Corner, type Spot } from './logomark';
import { fontFor } from './videofonts';
import { brushPath } from './videopaint';
import { stretches, wordsUp } from './videospan';
import { joiningAt, needsHeld, type Join } from './videojoins';

export interface Scene {
  /** The clip itself, as it came back from the engine. */
  readonly clip: Blob;
  /**
   * Carry this clip's own sound into the film.
   *
   * Off unless asked, because most shots hold nothing but room tone — see the
   * note at the top. On for a shot generated with a spoken line, which is the
   * only kind that has anything in it worth hearing.
   */
  readonly sound?: boolean;
  /** Named only so a progress line can say which one is being laid down. */
  readonly name?: string;
  /**
   * The grade for this piece, as a `context.filter` value.
   *
   * Per scene rather than per film, because the case it exists for is the
   * mixed one — see `lib/videofilters.ts`. Empty or absent leaves the canvas
   * filter alone entirely, which is not the same as setting it to `none`:
   * a browser that does not honour the property must never have it touched.
   */
  readonly grade?: string;
  /**
   * Where to start and stop inside the clip, in seconds.
   *
   * A generation comes back at the length the engine makes, which is rarely
   * the length the cut wants: the first half-second is the model finding the
   * shot, and the last second is often it drifting off. Both are paid for
   * either way, so trimming is the cheapest edit available — no second
   * generation, no upload, just less of the same file.
   *
   * Left out means the whole clip. Out of order or out of range is clamped
   * rather than refused: a slider that can be dragged past the end is a
   * slider somebody will drag past the end, and losing a scene over it would
   * be a poor trade for a validation message.
   */
  readonly from?: number;
  readonly to?: number;
  /**
   * Words printed over this scene, for the whole time it is on screen.
   *
   * Burned into the picture rather than carried as a subtitle track, and that
   * is a decision rather than a shortcut: a `.vtt` beside the file is ignored
   * by every place these get posted. Instagram, TikTok and a WhatsApp forward
   * all play the picture and nothing else, so words that are not in the
   * picture are words nobody sees — and the whole reason to caption is that
   * most of these are watched with the sound off.
   *
   * The cost is that they cannot be turned off afterwards. That is why it is
   * a choice made on the board, per shot, and why the film can be cut again
   * without them for anywhere that does carry a subtitle track.
   */
  readonly caption?: string;
  /** How fast this scene plays, as a multiple. One is as filmed. */
  readonly speed?: number;
  /**
   * Fill the frame, cropping the overflow, instead of fitting the whole picture
   * in and putting something behind the bars.
   *
   * `covering` has been in this file since it was written, for the blurred
   * background. It was never offered for the picture itself, which meant a wide
   * clip in a vertical film was always letterboxed — right for an establishing
   * shot, wrong for a face.
   */
  readonly fill?: boolean;
  /**
   * How this scene ARRIVES after the one before it, and over how long.
   *
   * On the arriving scene rather than on the one it leaves, because that is
   * where somebody looks for it: a join belongs to the shot being chosen, the
   * way a fade-in belongs to the thing fading in. The renderer reads the NEXT
   * scene's `join` to know whether to darken the end of this one, which is why
   * `joiningAt` takes both.
   *
   * Ignored on the first scene of a film: there is nothing behind it to arrive
   * from, and `videojoins.ts` answers nothing rather than holding the frame of
   * a film that has not started.
   */
  readonly join?: Join;
  readonly joinFor?: number;
  /**
   * How loud its own sound is, 0 to 2, when `sound` is on.
   *
   * The same range `Piece.loud` has carried since it was written, and the
   * range matters: an element's `volume` stops at one, so anything above it
   * is clamped here rather than silently ignored. Louder than the material
   * needs a gain node, which is the Pro Booth's job and not this one's.
   */
  readonly loud?: number;
  /**
   * Which face the caption wears, which size, and where it sits.
   *
   * All three are per scene rather than per film, for the same reason the
   * grade is: the case that matters is the mixed one. A title card wants
   * heavy type across the middle; the line under it wants plain type at the
   * bottom, out of the way of what the shot is showing.
   *
   * `captionAt` is in fractions of the frame to the text's CENTRE — see
   * `Spot` in `logomark.ts`, and for the same reason: the preview is 480
   * wide and the film is 1080, and only a fraction means the same thing in
   * both. Left out, the caption sits where it always has, clear of the
   * bottom eighth where every app puts its own furniture.
   */
  readonly captionFont?: string;
  readonly captionSize?: number;
  readonly captionAt?: Spot | null;
  /**
   * Turned, how solid, and how round its band is.
   *
   * Carli, 2 October 2026. Turned, how solid, and how round its band is: the
   * three handles any editor puts on something sitting on a frame. Ours carried
   * a place, a size and a face. The three below are what turns "words on a
   * picture" into an element somebody is designing with.
   */
  readonly captionTurn?: number;
  readonly captionSolid?: number;
  readonly captionRound?: number;
  /**
   * The colour of the words, the shape behind them and that shape's colour.
   *
   * Carli, 4 October 2026: *"die teks 'n kleur keuse ook moet hê, en 'n keuse
   * van agtergrond vir woorde, 'n square, 'n square met ronde punte, 'n
   * verfkwas. Die agtergrond moet ook kleur keuse hê."*
   *
   * Hex rather than a swatch id, because this type is what the renderer reads
   * and a renderer that has to look an id up in a palette is a renderer that
   * can be handed an id the palette does not have. `videopaint.ts` owns the
   * swatches; by the time a scene reaches here it is a colour.
   */
  /**
   * When the words come up and go down, in this scene's own film seconds.
   *
   * Carli, 4 October 2026: *"Video editor se teks moet ook sy eie tydlyn hê ...
   * gedrag kan word om die lengte van die teks oor die video te bepaal. Dit kan
   * nie die hele video bar vol wees nie, want teks is gewoonlik net daar vir
   * gedeeltes van 'n video."*
   *
   * Absent is the whole scene, which is what a caption did before this existed
   * and is still the right default — a caption typed and not timed should
   * appear, not vanish.
   *
   * In the SCENE's seconds rather than the film's, because that is the only
   * clock this loop has: the renderer plays one scene at a time and knows how
   * far into it is, not how far into the film. `cutFrom` does the conversion,
   * which is the one place that knows both.
   */
  readonly captionFrom?: number;
  readonly captionTo?: number;
  readonly captionInk?: string;
  readonly captionBack?: string;
  readonly captionBox?: 'none' | 'square' | 'round' | 'brush';
  /**
   * More than one caption over this scene, each with its own ends.
   *
   * ── Why this exists beside the single fields above ───────────────────
   *
   * Carli, 5 October 2026: *"As hy op sy eie tydlyn is moet hy ruimte hê om
   * verby 'n ander video te kan stretch."*
   *
   * A caption may now outlive the shot it starts on. The fields above can
   * only say "this scene's own words", so a line carried over from the shot
   * before has nowhere to go — and a scene can need both: one arriving from
   * earlier, and its own starting later.
   *
   * `from` and `to` are this scene's own seconds and may be NEGATIVE, which
   * is what "it started before this shot did" means. Nothing else changes:
   * the renderer still only ever draws one, because `wordsReach` stops each
   * caption at the next one's start so two can never be up at once.
   *
   * The single fields stay because two other screens use them —
   * `Storyboard.tsx` and `VideoCanvas.tsx` put one untimed caption on a
   * scene, and making them build a list to say that would be ceremony. There
   * is exactly one place that reads either, `captionsOf` below, so the two
   * shapes cannot drift into two behaviours.
   */
  readonly captions?: readonly Caption[];
}

/** One caption over a scene, in that scene's own seconds. */
export interface Caption {
  readonly text: string;
  /** May be negative: the caption came up before this scene did. */
  readonly from?: number;
  readonly to?: number;
  readonly font?: string;
  readonly size?: number;
  readonly at?: Spot | null;
  readonly turn?: number;
  readonly solid?: number;
  readonly round?: number;
  readonly ink?: string;
  readonly back?: string;
  readonly box?: 'none' | 'square' | 'round' | 'brush';
}

/**
 * The captions over one scene, however the scene chose to say it.
 *
 * The single place the two shapes meet. A scene carrying a list uses it; one
 * carrying the older single fields is read as a list of one; a scene with
 * neither has none.
 */
export function captionsOf(scene: Scene): readonly Caption[] {
  if (scene.captions?.length) return scene.captions;
  const said = scene.caption?.trim() ?? '';
  if (!said) return [];
  return [{
    text: said,
    from: scene.captionFrom,
    to: scene.captionTo,
    font: scene.captionFont,
    size: scene.captionSize,
    at: scene.captionAt,
    turn: scene.captionTurn,
    solid: scene.captionSolid,
    round: scene.captionRound,
    ink: scene.captionInk,
    back: scene.captionBack,
    box: scene.captionBox,
  }];
}

export interface Cut {
  readonly scenes: readonly Scene[];
  /**
   * How far the song drops while a scene is speaking, as a multiplier.
   *
   * Carli, 5 October 2026: *"wanneer 'n video praat, dan moet die musiek
   * sagter gaan elke keer wanneer die praat stem in kom."*
   *
   * Ramped rather than switched, over `DUCK_IN`: a song that drops to a
   * third between one frame and the next is a fault somebody can hear, and
   * the thing being imitated — a hand on a fader — takes about a tenth of a
   * second.
   *
   * Absent is no ducking, so every film made before this sounds the way it
   * did.
   */
  readonly duck?: number;
  /**
   * `mono` folds the finished track to one channel on both sides.
   *
   * There is no `surround`, and that is not an omission: `MediaRecorder`
   * writes a stereo webm and cannot be asked for six channels, so a button
   * offering it would be a button that lies. `lib/channels.ts` holds the fold
   * for the one place surround is real, which is a song being taken down.
   */
  readonly mix?: 'stereo' | 'mono';
  /**
   * How fast the song plays, as a multiple. Absent is as recorded.
   *
   * A playback rate on the source, so it changes the pitch as well as the
   * length. There is no time stretch in a browser worth having, and pretending
   * otherwise would mean shipping one that sounds worse than this does.
   */
  readonly audioSpeed?: number;
  /** Play the song again when the film outlasts it. */
  readonly audioLoop?: boolean;
  /**
   * Roll the rumble and the hiss off the scenes that speak.
   *
   * Two filters: nothing below `NOISE_LOW`, nothing above `NOISE_HIGH`. Not a
   * model that separates a voice from a room, and the room says so — see
   * `denoise` in `lib/videoedit.ts`.
   */
  readonly denoise?: boolean;
  /** The song, laid under the whole thing. Optional: a silent film is allowed. */
  readonly audio?: Blob | null;
  /**
   * Where in the song to start, in seconds.
   *
   * A five-second clip cut against the first five seconds of a track is cut
   * against the intro, which on most records is the one part with nothing in
   * it. The desk lets somebody drag a window onto the part they want — the
   * chorus, the drop — and this is where that window arrives.
   *
   * Only the start is needed: the film stops when the last scene does, so the
   * end of the window is the start plus however long the pictures run. An
   * offset past the end of the song is silence, which is what asking for it
   * means; `AudioBufferSourceNode.start` handles that without complaint.
   *
   * Defaults to 0, which is what every existing cut was made with.
   */
  readonly audioFrom?: number;
  /**
   * Stretches of the song to skip, in the song's own seconds.
   *
   * Carli, 4 October 2026: *"ook die keuse van interlock net soos by
   * probooth."* With the interlock on, a span cut out of the picture is cut
   * out of the music too, so every shot keeps the music it was cut to.
   *
   * In SONG time, not film time, because the film's clock has already lost
   * those seconds by the time a cut reaches here — see `withSkip` in
   * `videospan.ts`, which is where the arithmetic that keeps the two clocks
   * apart lives.
   */
  readonly audioSkips?: readonly { readonly from: number; readonly to: number }[];
  /**
   * How loud the song sits under the film, 0 to 2. Absent is 1.
   *
   * On the cut rather than baked into the file, because the same song under
   * a spoken advert and under a montage wants two different levels and
   * neither is the file's fault.
   */
  readonly audioLoud?: number;
  /**
   * Seconds of black fading up at the start, and down at the end.
   *
   * Both the picture and the sound, from one number. A film that fades to
   * black with the music still playing is the thing that reads as a bug —
   * and it is the version you get for free if the fade is drawn on the
   * canvas and nobody remembers the gain.
   *
   * Clamped here as well as in `lib/videoedit.ts`. The editor is one caller
   * and the cut is the thing that renders: a second caller with a five
   * second fade on a four second film must not be able to produce a film
   * that is never up.
   */
  readonly fadeIn?: number;
  readonly fadeOut?: number;
  /** The film's shape. Clips are fitted into it, never stretched. */
  readonly width: number;
  readonly height: number;
  /**
   * How the file is written: frames a second, and bits a second.
   *
   * Carli, 4 October 2026: *"Die export moet ook 'n keuse van kwaliteit hê
   * waarin dit export."* The SIZE is already `width`/`height` above — a grade
   * is applied by `videoquality.ts` before a cut is built, so by the time it
   * reaches here the film simply is that size. These two are the parts the
   * recorder needs told.
   */
  readonly fps?: number;
  readonly bits?: number;
  /**
   * What goes in the space a clip does not fill.
   *
   * `'black'` is the plain letterbox. `'blur'` fills it with an enlarged,
   * blurred copy of the same frame, so a wide shot dropped into a tall film
   * reads as one picture rather than a small picture with two dead bands
   * around it. Neither one crops: the clip itself is drawn identically in both
   * cases, and this is only about what sits behind it.
   *
   * Defaults to `'black'`, which is what every existing cut was made with.
   */
  readonly background?: 'black' | 'blur';
  /**
   * The brand kit's logo, already decoded, to burn into every frame.
   *
   * Passed in rather than loaded here, for the same reason the song is: this
   * function draws and records, and a draw loop that waits on an image
   * decode is a draw loop that drops frames. `app/lib/logomark.ts` loads it
   * and says where it goes; the caller decides whether this film wants one.
   *
   * Left out, nothing is drawn — which is what every existing cut does.
   */
  readonly mark?: HTMLImageElement | null;
  /** Which corner the mark sits in. Defaults to bottom right. */
  readonly markCorner?: Corner;
  /**
   * Where the mark sits instead, if it has been dragged somewhere.
   *
   * Overrides the corner. In fractions of the frame to its centre, so the
   * place chosen in a 480-wide viewer is the place it lands in a 1080-wide
   * render — see `Spot` in `logomark.ts`.
   */
  readonly markAt?: Spot | null;
  /** How wide the mark is, as a share of the frame. Defaults to `MARK_SHARE`. */
  readonly markShare?: number;
  /** Turned, in degrees, about its own centre. */
  readonly markTurn?: number;
  /** How solid, as a share of full. Defaults to `MARK_OPACITY`. */
  readonly markSolid?: number;
  /**
   * Drawn UNDER the words rather than over them.
   *
   * Layer order, which is a list in an editor with many layers and one flag
   * here, because there are only two things on this canvas that are ours: the
   * mark and the caption. The
   * default keeps what was always true — the mark last, over everything —
   * because a caption sliding over a logo is the fault the ordering comment
   * below was written for.
   */
  readonly markUnder?: boolean;
  /** Called as each scene starts, so a screen can say where it is. */
  readonly onScene?: (index: number, total: number) => void;
}

export type Made =
  | { readonly ok: true; readonly blob: Blob; readonly seconds: number; readonly ext: 'webm' | 'mp4' }
  | { readonly ok: false; readonly why: 'unsupported' | 'no_scenes' | 'unreadable' | 'failed' };

/**
 * What this browser will record into, best first.
 *
 * Exported since 18 September because `logomark.ts` records too, when it
 * brands a filmed take, and a second list would be a second answer to the
 * same question — which is how one of the two ends up writing a file the
 * other cannot open.
 */
export function recordable(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const wanted = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return wanted.find((one) => MediaRecorder.isTypeSupported(one)) ?? null;
}

export function canStitch(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    recordable() !== null
  );
}

/**
 * The whole clip drawn inside the frame, letterboxed rather than cropped.
 *
 * Scenes come back in whatever shape the engine made them, and a film built
 * from a mix of wide and tall is normal — the desk offers both. Cropping to
 * fill would cut the top off a tall shot; stretching would make every face in
 * it wrong. Bars are the honest option and are what the black background is
 * for.
 */
export function fitted(
  video: HTMLVideoElement,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const source = video.videoWidth / Math.max(1, video.videoHeight);
  const frame = width / height;
  if (source > frame) {
    const h = Math.round(width / source);
    return { x: 0, y: Math.round((height - h) / 2), w: width, h };
  }
  const w = Math.round(height * source);
  return { x: Math.round((width - w) / 2), y: 0, w, h: height };
}

/**
 * The frame filled edge to edge, overflowing on the long side.
 *
 * The opposite of `fitted`: nothing is left over, and what does not fit is
 * pushed off the sides. Only ever used for the background, where losing the
 * edges of a copy of the picture costs nothing — the picture itself is still
 * drawn whole, on top.
 */
export function covering(
  video: HTMLVideoElement,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const source = video.videoWidth / Math.max(1, video.videoHeight);
  const frame = width / height;
  if (source > frame) {
    const w = Math.round(height * source);
    return { x: Math.round((width - w) / 2), y: 0, w, h: height };
  }
  const h = Math.round(width / source);
  return { x: 0, y: Math.round((height - h) / 2), w: width, h };
}

/**
 * Whether this browser will honour `context.filter`.
 *
 * Every browser this app supports does, but a blurred background is a
 * preference rather than a requirement, and a browser that quietly ignores the
 * filter would draw a sharp, enormously enlarged copy of the clip behind the
 * clip — much worse than the black bars it replaced. So it is asked rather
 * than assumed, and a no falls back to black.
 */
function blurs(context: CanvasRenderingContext2D): boolean {
  try {
    context.filter = 'blur(2px)';
    const took = context.filter.includes('blur');
    context.filter = 'none';
    return took;
  } catch {
    return false;
  }
}

/**
 * The blurred background, painted the cheap way.
 *
 * A `blur(60px)` over a 1280 × 720 canvas, thirty times a second, for three
 * minutes, is real work — and this already runs in real time, so a draw loop
 * that cannot keep up drops frames straight into the file.
 *
 * It does not have to cost that. The frame is first drawn onto a scratch
 * canvas about a sixteenth of the size, where a two-pixel blur is the same
 * picture as a thirty-two-pixel blur at full size and costs a sixteenth as
 * much; enlarging that back over the frame does the rest, because a bilinear
 * upscale is itself a blur. What comes out is indistinguishable at a glance
 * from the expensive version.
 *
 * It is then darkened a little. Undarkened, a bright background competes with
 * the shot in front of it, which is the opposite of the point.
 */
const SCRATCH_LONG = 96;

function backdrop(
  context: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement,
  video: HTMLVideoElement,
  width: number,
  height: number,
): void {
  const paint = scratch.getContext('2d');
  if (!paint) return;
  const small = covering(video, scratch.width, scratch.height);
  paint.filter = `blur(${Math.max(2, Math.round(SCRATCH_LONG / 24))}px)`;
  paint.drawImage(video, small.x, small.y, small.w, small.h);
  paint.filter = 'none';

  const big = covering(video, width, height);
  context.imageSmoothingEnabled = true;
  context.drawImage(scratch, 0, 0, scratch.width, scratch.height, big.x, big.y, big.w, big.h);
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, width, height);
}

/**
 * The window a scene actually plays, given what its clip turned out to be.
 *
 * Clamped in one place so the drawing loop below and anything that wants to
 * add the lengths up cannot disagree about what a trim means. A window that
 * collapses to nothing is widened to the whole clip: a scene somebody put in
 * the film should appear in the film, and an empty trim is far more likely to
 * be a slider mishandled than an intention.
 */
/**
 * Words over the picture, sized to the film rather than to a guess.
 *
 * Everything here is a fraction of the frame's height, so the same caption is
 * the same size on a 1080-tall vertical film as on a 720-tall wide one. The
 * band behind it is the part that makes this legible: white text over
 * arbitrary footage is white text over a white wall about a tenth of the time,
 * and an outline thick enough to survive that is thick enough to read badly.
 *
 * Three lines at most. A fourth means somebody wrote a paragraph, and cutting
 * it off is a clearer signal than shrinking the type until it is unreadable.
 */
const CAPTION_LINES = 3;

function wrapped(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): { lines: string[]; over: boolean } {
  const lines: string[] = [];
  let line = '';
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i += 1) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (context.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i];
    if (lines.length === CAPTION_LINES) return { lines, over: true };
  }
  if (line) lines.push(line);
  return { lines, over: false };
}

/**
 * How quickly the song steps back when a shot starts speaking, in seconds.
 *
 * A time constant rather than a duration: `setTargetAtTime` is most of the
 * way there in about three of them, so a tenth here is the third of a second
 * a hand on a fader takes. Shorter reads as a glitch and longer loses the
 * first words of the line it is making room for.
 */
export const DUCK_IN = 0.1;

/**
 * Where "reduce noise" stops and starts, in hertz.
 *
 * Eighty at the bottom: traffic, handling, footsteps and air conditioning
 * live below it and a speaking voice has almost nothing there — the lowest
 * note a bass voice reaches is about eighty-five, and the part of it anybody
 * recognises is an octave up.
 *
 * Nine thousand at the top: hiss is broadband and keeps going, speech
 * intelligibility is nearly all under four thousand, and a phone microphone
 * has very little worth keeping above this. Lower would start to dull the
 * consonants, which is the one thing a voice cannot spare.
 */
export const NOISE_LOW = 80;
export const NOISE_HIGH = 9000;


/**
 * How round the caption's band is by default, as a share of its own height.
 *
 * Named because two places need it: the renderer below, and the slider in the
 * cutting room that has to open at the value the film is already using. A
 * slider that opened at nought would square off every caption the moment it
 * was touched.
 */
export const CAPTION_ROUND = 0.34;

export function drawCaption(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  set?: {
    readonly font?: string;
    readonly size?: number;
    readonly at?: Spot | null;
    readonly turn?: number;
    readonly solid?: number;
    readonly round?: number;
    readonly ink?: string;
    readonly back?: string;
    readonly box?: 'none' | 'square' | 'round' | 'brush';
  },
): void {
  const words = text.trim();
  if (!words) return;

  const chosen = fontFor(set?.font);
  const face = chosen.stack;
  const weight = chosen.weight;
  const room = width * 0.86;

  /* Made smaller before it is cut short.

     Three lines is the ceiling, and a line that spills past it used to be
     dropped — so a caption ending "…nie terug nie" came out ending "…nie
     terug", which is a different sentence. Two smaller sizes are tried first,
     and only a caption that will not fit even at the smallest is trimmed,
     with a mark to say so. */
  /* A size she set is tried first and alone: the ladder exists to make an
     unset caption fit, and running it over a chosen size would quietly
     shrink the thing she had just made bigger. It still wraps, and it is
     still cut at three lines — what it will not do is overrule her. */
  const ladder = set?.size ? [set.size] : [0.048, 0.041, 0.035];
  let size = 0;
  let lines: string[] = [];
  for (const share of ladder) {
    size = Math.max(14, Math.round(height * share));
    context.font = `${weight} ${size}px ${face}`;
    const fit = wrapped(context, words, room);
    lines = fit.lines;
    if (!fit.over) break;
    if (share === ladder[ladder.length - 1]) {
      const last = lines[lines.length - 1] ?? '';
      lines[lines.length - 1] = `${last.replace(/[\s,.;:]+$/, '')}\u2026`;
    }
  }
  if (!lines.length) return;

  context.save();
  context.globalAlpha = Math.max(0, Math.min(1, set?.solid ?? 1));
  context.font = `${weight} ${size}px ${face}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';

  const step = Math.round(size * 1.28);
  const pad = Math.round(size * 0.42);
  /* Clear of the bottom eighth, which is where every app that plays these
     puts its own furniture — the caption, the handle, the progress bar. A
     subtitle under that is a subtitle behind a username. */
  const bottom = set?.at
    /* Dragged somewhere, so the BLOCK's centre goes there and the last
       baseline is worked back from it. Clamped inside the frame, because a
       caption pushed off the bottom is a caption nobody can get back. */
    ? Math.max(
        step * lines.length,
        Math.min(height - pad, set.at.y * height + (step * (lines.length - 1)) / 2),
      )
    : height - Math.round(height * 0.12);
  const firstBaseline = bottom - step * (lines.length - 1);
  const middle = set?.at ? Math.max(0, Math.min(width, set.at.x * width)) : width / 2;
  /* Measured rather than assumed: a box built on the font size is lopsided,
     because the size includes room for descenders the first line does not
     use, and the caption then sits visibly low inside its own band. */
  const metrics = context.measureText(lines[0]);
  const ascent = metrics.actualBoundingBoxAscent || size * 0.72;
  const descent = metrics.actualBoundingBoxDescent || size * 0.24;
  const boxTop = firstBaseline - ascent - pad;
  const boxHeight = bottom + descent + pad - boxTop;
  const widest = Math.max(...lines.map((one) => context.measureText(one).width));
  const boxWidth = Math.min(width * 0.94, widest + pad * 2.4);

  /* Turned about the middle of its own band, which is what a thumb is
     holding. Applied after the band has been measured and before anything is
     painted, so the words and the box behind them turn together — turning
     them separately is two elements at two angles. */
  if (set?.turn) {
    const spin = { x: middle, y: boxTop + boxHeight / 2 };
    context.translate(spin.x, spin.y);
    context.rotate((set.turn * Math.PI) / 180);
    context.translate(-spin.x, -spin.y);
  }

  /* ── What sits behind the words ───────────────────────────────────────

     `none` draws nothing at all, which is a title card and is a choice rather
     than the absence of one. `brush` is a painted stroke from `videopaint.ts`.
     Everything else is the rounded box this has always drawn, with the corner
     radius coming from the shape.

     The fill was `rgba(0, 0, 0, 0.62)` — black at 62%. A chosen colour keeps
     that same 62%, so a caption she has coloured sits on the picture the way
     the black one did rather than becoming an opaque slab: the whole point of
     a caption box is that you can still see what is behind it. */
  const boxLeft = Math.max(0, Math.min(width - boxWidth, middle - boxWidth / 2));
  const shape = set?.box ?? 'round';

  if (shape !== 'none') {
    context.fillStyle = tint(set?.back ?? '#000000', 0.62);
    if (shape === 'brush') {
      brushPath(context, boxLeft, boxTop, boxWidth, boxHeight);
    } else {
      context.beginPath();
      context.roundRect(
        boxLeft, boxTop, boxWidth, boxHeight,
        /* Rounded as a share of the band's own height, so the setting
           means the same thing at any size. Zero is a square box, one is a
           lozenge; the default is what it has always been. */
        Math.round((set?.round ?? CAPTION_ROUND) * Math.min(size, boxHeight / 2)),
      );
    }
    context.fill();
  }

  context.fillStyle = set?.ink ?? '#ffffff';
  lines.forEach((one, index) => {
    context.fillText(one, middle, firstBaseline + step * index);
  });
  context.restore();
}

/**
 * A hex colour at an alpha, as a canvas fill.
 *
 * The caption box has always been painted at 62% so the picture shows through
 * it; a chosen colour has to keep that, or picking a colour would also be
 * picking an opaque slab over the shot. Written out rather than using
 * `globalAlpha`, which is already carrying the caption's own `solid` and would
 * multiply the two.
 */
function tint(hex: string, alpha: number): string {
  const full = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!full) return `rgba(0, 0, 0, ${alpha})`;
  const n = parseInt(full[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function windowOf(scene: Scene, duration: number): { from: number; to: number } {
  if (!Number.isFinite(duration) || duration <= 0) return { from: 0, to: 0 };
  const from = Math.min(Math.max(0, scene.from ?? 0), duration);
  const to = Math.min(Math.max(0, scene.to ?? duration), duration);
  return to - from < 0.05 ? { from: 0, to: duration } : { from, to };
}

/** A blob's length, which a recorded webm will not admit to without a seek. */
/**
 * How long a clip runs, and how big a picture it holds.
 *
 * The size comes free: `loadedmetadata` is the moment `videoWidth` becomes
 * readable, and this function was already waiting for it and throwing the
 * number away. Nothing in the app knew the shape of its own material, which
 * is why the cutting room could only offer a DEFAULT shape rather than read
 * one off the clips — see `lib/recommend.ts`.
 *
 * Zeroes for a file the browser could not decode, so a caller can tell "not
 * a video" from "a video that is 320 wide".
 */
export async function measure(
  blob: Blob,
): Promise<{ seconds: number; width: number; height: number }> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(blob);
  video.src = url;
  video.muted = true;
  await new Promise<void>((done) => {
    video.onloadedmetadata = () => done();
    video.onerror = () => done();
  });
  if (!Number.isFinite(video.duration) || video.duration === Infinity) {
    /* A webm from `MediaRecorder` carries no duration in its header, because
       the header is written before the length is known. Seeking past the end
       makes the browser work it out. This is a known quirk, not a bug here. */
    video.currentTime = 1e101;
    await new Promise<void>((done) => {
      video.onseeked = () => done();
      setTimeout(done, 1200);
    });
  }
  const out = {
    seconds: Number.isFinite(video.duration) ? video.duration : 0,
    width: video.videoWidth || 0,
    height: video.videoHeight || 0,
  };
  URL.revokeObjectURL(url);
  return out;
}

export async function lengthOf(blob: Blob): Promise<number> {
  return (await measure(blob)).seconds;
}

export async function stitch(cut: Cut): Promise<Made> {
  if (!cut.scenes.length) return { ok: false, why: 'no_scenes' };
  const mimeType = recordable();
  if (!mimeType || !canStitch()) return { ok: false, why: 'unsupported' };

  const canvas = document.createElement('canvas');
  canvas.width = cut.width;
  canvas.height = cut.height;
  const context = canvas.getContext('2d');
  if (!context) return { ok: false, why: 'unsupported' };

  /* The scratch the blurred background is built on, at the film's own shape
     so the cover maths below is the same maths at both sizes. Made once for
     the whole export rather than per scene, and left unused when the
     background is black. */
  const wantsBlur = cut.background === 'blur' && blurs(context);
  const scratch = document.createElement('canvas');
  const scale = SCRATCH_LONG / Math.max(cut.width, cut.height);
  scratch.width = Math.max(2, Math.round(cut.width * scale));
  scratch.height = Math.max(2, Math.round(cut.height * scale));

  /* The rate she chose, not a constant thirty.

     `captureStream` takes the rate the canvas is sampled at, so this is the
     film's real frame rate rather than a hint: asking for 24 and sampling at
     30 would write a 30fps file with duplicated frames in it, which is the
     file size of 30 and the motion of 24. */
  const stream = canvas.captureStream(cut.fps ?? 30);

  /* The song, on the same stream as the pictures.

     A separate audio context rather than an <audio> element, because an
     element's output cannot be added to a MediaStream — and a music video that
     comes out silent is not a music video. */
  let audioContext: AudioContext | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;
  let song: AudioBufferSourceNode | null = null;
  /** The song's level, and where its fade is drawn. */
  let songGain: GainNode | null = null;
  /* Kept so a skipping song can be built from the same decoded buffer rather
     than decoding it once per stretch, and so every stretch can be stopped
     when the render ends. */
  let songBuffer: AudioBuffer | null = null;
  /* Where every sound in the film meets, so the fold to mono is one node. */
  let mixer: GainNode | null = null;
  const songRuns: AudioBufferSourceNode[] = [];
  /* Either reason is enough to need a graph: a song laid under the film, or
     a single shot that was paid to speak. */
  const talks = cut.scenes.some((one) => one.sound);
  if (cut.audio || talks) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioContext = new Ctx();
      destination = audioContext.createMediaStreamDestination();
      /* ── Everything through one place ──────────────────────────────

         The song and the talking shots both end here, which is what lets
         `mono` be one node rather than a rule each of them has to remember.

         A gain told to take ONE channel explicitly is how the Web Audio
         graph folds: the down-mix happens on the way in, and the stereo
         destination then carries the same signal on both sides. That is what
         mono is — not silence on the right. */
      const out = audioContext.createGain();
      if (cut.mix === 'mono') {
        out.channelCount = 1;
        out.channelCountMode = 'explicit';
        out.channelInterpretation = 'speakers';
      }
      out.connect(destination);
      mixer = out;
      try {
        if (cut.audio) {
          songBuffer = await audioContext.decodeAudioData(await cut.audio.arrayBuffer());
          song = audioContext.createBufferSource();
          song.buffer = songBuffer;
          /* A rate on the source, which changes the pitch with the length.
             `cutFrom` only sends one when she has moved it off one. */
          if (cut.audioSpeed) song.playbackRate.value = cut.audioSpeed;
          /* And round again when the film outlasts the song, rather than
             leaving the rest of it silent. */
          if (cut.audioLoop) song.loop = true;
          /* Through a gain rather than straight at the destination, so the
             level and the fade have somewhere to live. A song connected
             directly is a song that can only be as loud as it was recorded,
             and a fade drawn on the canvas with the music still at full is
             the thing that reads as a bug. */
          songGain = audioContext.createGain();
          songGain.gain.value = Math.max(0, Math.min(2, cut.audioLoud ?? 1));
          song.connect(songGain);
          songGain.connect(out);
        }
      } catch {
        // A song that will not decode is a film without one, not a failure.
        song = null;
      }
      /* The track joins the stream only when something will come out of it.
         A song that failed to decode with no talking shots used to mean no
         audio track at all, and adding a silent one would change the file
         this browser writes for a case that has already gone wrong. */
      if (song || talks) {
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
      } else {
        destination = null;
      }
    }
  }

  /* ── The fades, worked out once ────────────────────────────────────────

     Against the whole film rather than the first and last scene, which is
     what "fade in" means: a two-second fade over a one-second opening shot
     should carry into the second one, not stop at the cut.

     Clamped here as well as in `lib/videoedit.ts`. That module is ONE caller
     of this one, and the day a second appears — a template, a copilot, an
     import — a five-second fade on a four-second film must not be able to
     produce a film that is never fully up. The rule belongs where the
     rendering is. */
  const filmRuns = cut.scenes.reduce((all, one) => {
    const view = windowOf(one, Number.POSITIVE_INFINITY);
    return all + Math.max(0, view.to - view.from);
  }, 0);
  const fade = ((): { up: number; down: number } => {
    let up = Math.max(0, cut.fadeIn ?? 0);
    let down = Math.max(0, cut.fadeOut ?? 0);
    if (!Number.isFinite(filmRuns) || filmRuns <= 0) return { up: 0, down: 0 };
    if (up + down > filmRuns) {
      const share = filmRuns / (up + down);
      up *= share;
      down *= share;
    }
    return { up, down };
  })();
  /** Seconds of film laid down before the scene now playing. */
  let laid = 0;

  /* ── The frame the last scene left behind ───────────────────────────────

     A dissolve, a wipe and a slide need the OUTGOING picture while the
     arriving one plays. One `<video>` decodes at a time in this renderer —
     that is what makes the room free, there is no per-minute render bill
     anywhere in it — so the outgoing half is the last frame of the shot
     before, held on a canvas of its own.

     Built only when a scene actually asks for one of those three. A film of
     hard cuts and dips copies nothing: a full-size canvas copied every frame
     of every film, for a feature nobody switched on, is the sort of cost that
     shows up as "the export is slower than it was" with nothing to point at.

     `videojoins.ts` carries the honest note about what a held frame is and is
     not, and `LONGEST_JOIN` is six tenths of a second because of it. */
  const wantsHeld = cut.scenes.some((one, i) => i > 0 && one.join && needsHeld(one.join));
  const heldFrame = wantsHeld ? document.createElement('canvas') : null;
  if (heldFrame) {
    heldFrame.width = cut.width;
    heldFrame.height = cut.height;
  }
  const holder = heldFrame?.getContext('2d') ?? null;
  /** Whether anything has been held yet. False through the whole first scene. */
  let heldReady = false;

  /* The bitrate too, and `?? undefined` rather than a default written here:
     an undefined `videoBitsPerSecond` means "the browser decides", which is
     what this did before and is still right when nothing was chosen.
     `videoquality.ts` works out the number from the frame and the rate. */
  const recorder = new MediaRecorder(stream, {
    mimeType,
    ...(cut.bits ? { videoBitsPerSecond: cut.bits } : {}),
  });
  const parts: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) parts.push(event.data);
  };
  const finished = new Promise<void>((done) => {
    recorder.onstop = () => done();
  });

  const urls: string[] = [];
  try {
    recorder.start();
    await audioContext?.resume();
    /* The second argument is the offset into the buffer, which is the whole
       reason `audioFrom` exists — the same call with no offset would play the
       intro under a window somebody deliberately dragged onto the chorus. */
    /* ── One source, or one per surviving stretch ─────────────────────

       With no skips this is what it always was: start the whole track at the
       offset somebody dragged onto the chorus.

       With skips it is one `BufferSource` per stretch, each scheduled at the
       film second it belongs at. A single source cannot jump a hole in the
       middle of itself — `start(when, offset, duration)` plays one run — so a
       skip HAS to be more than one node, and scheduling them all up front is
       what keeps them sample-accurate against each other rather than drifting
       by whatever the main thread was doing. */
    const skips = cut.audioSkips ?? [];
    if (song && songBuffer && skips.length > 0 && audioContext && songGain) {
      song = null;
      const begin = audioContext.currentTime;
      for (const run of stretches(skips, Math.max(0, cut.audioFrom ?? 0), filmRuns)) {
        if (!(run.long > 0)) continue;
        const piece = audioContext.createBufferSource();
        piece.buffer = songBuffer;
        /* ── The rate, and the duration measured in the song's own time ──

           `stretches` answers in FILM seconds: `at` is when this run starts
           on the film's clock and `long` is how much film it covers. The
           third argument of `start` is a duration in the BUFFER's time, so a
           song played at one and a half consumes one and a half seconds of
           itself per second of film.

           Multiplying is the whole fix, and leaving it out is the kind of
           fault that shows up as the song ending early on a sped-up film and
           as nothing at all at one times — which is every test anybody writes
           first. `check:soundtools` puts a rate through `songSecond` for the
           same reason. */
        const rate = cut.audioSpeed ?? 1;
        if (rate !== 1) piece.playbackRate.value = rate;
        piece.connect(songGain);
        piece.start(begin + run.at, run.from, run.long * rate);
        songRuns.push(piece);
      }
    } else {
      song?.start(0, Math.max(0, cut.audioFrom ?? 0));
    }

    for (let index = 0; index < cut.scenes.length; index += 1) {
      cut.onScene?.(index, cut.scenes.length);
      const video = document.createElement('video');
      const url = URL.createObjectURL(cut.scenes[index].clip);
      urls.push(url);
      video.src = url;
      video.playsInline = true;
      /* Muted unless this shot was asked to speak — see the note at the top.
 
         Unmuting alone would not put it in the film: `captureStream` on a
         canvas carries pictures only, and an element's audio has to be routed
         into the same graph the song is in. `createMediaElementSource` also
         takes the sound away from the speakers, which is what we want — the
         export is a recording, not a playback. */
      const talking = Boolean(cut.scenes[index].sound) && Boolean(audioContext && destination);
      /* ── The music steps back while the shot speaks ────────────────

         Carli, 5 October 2026: *"wanneer 'n video praat, dan moet die musiek
         sagter gaan elke keer wanneer die praat stem in kom."*

         Ramped over `DUCK_IN` rather than switched: a song that drops to a
         third between one frame and the next is a fault somebody can hear,
         and the thing being imitated is a hand on a fader.

         `setTargetAtTime` and not `linearRampToValueAtTime`, because the
         ramps have to be scheduled one scene at a time as the film plays and
         a linear ramp needs both ends known in advance. The constant is a
         time constant, so the level is most of the way there in about three
         of them. */
      if (songGain && audioContext && cut.duck !== undefined) {
        const base = Math.max(0, Math.min(2, cut.audioLoud ?? 1));
        const want = talking ? base * Math.max(0, Math.min(1, cut.duck)) : base;
        songGain.gain.setTargetAtTime(want, audioContext.currentTime, DUCK_IN);
      }
      video.muted = !talking;
      /* A volume, per clip. Only meaningful where the clip is
         heard at all — `sound` is whether, this is how much — and the two are
         kept apart because somebody who wants a room quietly under a song
         should not have to choose between all of it and none. */
      /* Clamped at one because `HTMLMediaElement.volume` is: above it the
         browser throws, and a thrown export over a slider is the worse
         trade. Carrying 0–2 anyway keeps one range across the app. */
      if (talking) video.volume = Math.max(0, Math.min(1, cut.scenes[index].loud ?? 1));
      /* And the speed. Set before play, because a rate changed mid-play
         is audible as a lurch, and read back into `lengthOfPiece` on the
         editor's side so the ruler and the film agree about how long this
         piece now is. */
      const fast = Math.max(0.1, Math.min(4, cut.scenes[index].speed ?? 1));
      if (fast !== 1) video.playbackRate = fast;
      if (talking && audioContext && destination) {
        try {
          const from = audioContext.createMediaElementSource(video);
          const into = mixer ?? destination;
          if (cut.denoise) {
            /* ── Reduce noise, named for what it is ────────────────────

               Two filters in series and nothing more. It does not separate a
               voice from a room — no browser has that to give — it rolls off
               where a voice is not and noise is: below `NOISE_LOW`, where
               traffic, handling and air conditioning live, and above
               `NOISE_HIGH`, where hiss lives and a phone microphone has
               almost nothing worth keeping.

               Built per scene because `createMediaElementSource` is per
               element, and a shot is an element. */
            const low = audioContext.createBiquadFilter();
            low.type = 'highpass';
            low.frequency.value = NOISE_LOW;
            const high = audioContext.createBiquadFilter();
            high.type = 'lowpass';
            high.frequency.value = NOISE_HIGH;
            from.connect(low);
            low.connect(high);
            high.connect(into);
          } else {
            from.connect(into);
          }
        } catch {
          // Already routed, or this browser will not have it. The shot plays
          // on silently rather than the export failing over one clip.
          video.muted = true;
        }
      }

      const ready = await new Promise<boolean>((done) => {
        video.onloadedmetadata = () => done(true);
        video.onerror = () => done(false);
      });
      // One clip that will not open is a gap, not a ruined export.
      if (!ready) continue;

      /* Trimmed by seeking, not by cutting the file.

         The clip is played from `from` and abandoned at `to`, which is the
         whole of it: the recorder is capturing the canvas, so whatever is not
         painted is not in the film. The seek is awaited because playing from
         zero while the browser catches up would put the discarded head of the
         clip into the cut — a bug that would look like the trim being ignored
         and would only show on a slow device. */
      /* Named `view` as well as `window`: the caption gate below reads it, and
         `window.from` inside a browser file is a line that stops the next
         reader to work out whether it means the global. */
      const window = windowOf(cut.scenes[index], video.duration);
      const view = window;
      if (window.from > 0) {
        video.currentTime = window.from;
        await new Promise<void>((done) => {
          let settled = false;
          const go = () => {
            if (settled) return;
            settled = true;
            done();
          };
          video.onseeked = go;
          // A seek that never reports is a scene that plays whole, not a cut
          // that hangs.
          setTimeout(go, 2000);
        });
      }

      await video.play().catch(() => undefined);
      /* `covering` when the scene asked to fill the frame. The same function
         the blurred background has always used, pointed at the picture — so
         there is one piece of arithmetic for "fill this frame" rather than two,
         and the editor's `object-cover` is showing the same crop. */
      const box = cut.scenes[index].fill
        ? covering(video, cut.width, cut.height)
        : fitted(video, cut.width, cut.height);
      /* A clip already the shape of the film has no bars to fill, and painting
         a background behind an opaque frame would be work for nothing. The
         slack is for rounding, not for a shape that is nearly right: an eight
         pixel band still wants filling. */
      const fills = (box.w * box.h) / (cut.width * cut.height);
      const captions = captionsOf(cut.scenes[index]);

      await new Promise<void>((done) => {
        let stop = false;
        const end = () => {
          if (stop) return;
          stop = true;
          done();
        };
        video.onended = end;
        const draw = () => {
          if (stop) return;
          if (video.ended || video.currentTime >= window.to) {
            end();
            return;
          }
          /* Repainted every frame rather than once: a clip narrower than the
             frame would otherwise leave the previous scene showing in the
             bars. The blurred background is repainted for the same reason and
             one more — it is a copy of *this* frame, so it moves with the
             shot instead of being a still behind a moving picture. */
          context.fillStyle = '#000';
          context.fillRect(0, 0, cut.width, cut.height);
          /* The grade goes on before the picture and comes off before the
             words. Both halves matter.
 
             Before the backdrop as well as the picture: `backdrop` sets the
             blur on the SCRATCH canvas and draws the result through this
             one, so a grade set here reaches it — which is what makes a
             black-and-white shot sit in a black-and-white fill rather than
             in a wash of the colour it just had taken out.
 
             And off again before the caption and the logo. Words tinted
             sepia and a mark pushed through a contrast curve are the two
             things on this canvas that are ours rather than hers, and the
             one thing a grade must not touch is the text somebody has to
             read. */
          const grade = cut.scenes[index].grade ?? '';
          if (grade) context.filter = grade;
          if (wantsBlur && fills < 0.995) backdrop(context, scratch, video, cut.width, cut.height);
          context.drawImage(video, box.x, box.y, box.w, box.h);
          if (grade) context.filter = 'none';
          /* Over the picture and over the bars alike, so a caption on a wide
             shot in a tall film sits in the black band rather than across a
             face. Painted every frame because the frame under it is. */
          const painted = cut.scenes[index];
          const words = (): void => {
            if (!captions.length) return;
            /* ── Up for its own stretch, not for the whole shot ───────────

               `video.currentTime` is a position in the FILE, so the scene's own
               film clock is how far past the window's start we are, divided by
               the speed — a shot at two times covers two seconds of material
               per second of film. The same multiplication `split`, `atSecond`
               and `cutOut` each needed, in the one place that reads it back.

               Undefined ends mean the whole shot, which is what a caption did
               before it could be timed. */
            const shown = (video.currentTime - view.from) / fast;
            /* The one copy of "are the words up yet", shared with the room's
               preview — see `wordsUp`. This gate used to be written out here
               and nowhere else, so the preview showed a shortened caption over
               the whole clip while the film it made was right, and the only
               way to find that out was to pay for the render and watch it. */
            const up = captions.find((one) => wordsUp(one, shown));
            if (!up) return;
            drawCaption(context, up.text, cut.width, cut.height, {
              font: up.font,
              size: up.size,
              at: up.at,
              ink: up.ink,
              back: up.back,
              box: up.box,
              turn: up.turn,
              solid: up.solid,
              round: up.round,
            });
          };
          const badge = (): void => {
            if (!cut.mark) return;
            drawMark(
              context, cut.mark, cut.width, cut.height,
              cut.markCorner, cut.markShare ?? MARK_SHARE, cut.markAt,
              cut.markTurn, cut.markSolid,
            );
          };
          /* ── Which of the two is on top ──────────────────────────────

             Layer order — a list of layers in an editor that has many, one
             flag here, because exactly two things on this canvas are ours
             rather than hers.

             The DEFAULT keeps what was always true: the mark last, over
             everything. A caption that slid over the logo would be the worse
             of the two and the caption is the one that moves, so the mark
             only goes underneath when the cut asks for it.

             Costs nothing either way: this loop already runs for every frame,
             so the mark is one more `drawImage` on a canvas being painted
             anyway — which is the whole reason the logo is burned in at the
             cut rather than in a pass of its own.

             `check:logomark` asserts this dispatch and not the order the two
             closures are WRITTEN in. It used to assert the latter, which
             stayed green with the branches swapped. */
          if (cut.markUnder) { badge(); words(); } else { words(); badge(); }

          /* ── The join, over the picture and its furniture ───────────────

             Over the words and the mark, and under the film-wide fade.

             Over the words, because a caption sitting at full brightness on a
             dissolving picture reads as a rendering fault rather than as a
             transition — the same reason the film-wide fade below is painted
             last of all, written in its own note. And a held frame carries the
             words that were on the OUTGOING shot, because they were on the
             canvas when it was copied, which is exactly right: they leave with
             their own shot.

             Every number comes out of `joiningAt`. Nothing here decides what a
             dissolve looks like; it paints what that function answers, so there
             is one copy of the arithmetic and `check:joins` can read it without
             a browser. */
          const joining = (): void => {
            const now = joiningAt({
              arrive: painted.join ?? 'cut',
              arriveFor: painted.joinFor,
              leave: cut.scenes[index + 1]?.join ?? 'cut',
              leaveFor: cut.scenes[index + 1]?.joinFor,
              into: Math.max(0, video.currentTime - window.from),
              runs: Math.max(0, window.to - window.from),
              first: index === 0,
              last: index === cut.scenes.length - 1,
            });
            if (now.held && heldFrame && heldReady) {
              context.save();
              context.globalAlpha = Math.max(0, Math.min(1, now.held.solid));
              if (now.held.keepFrom > 0) {
                /* A wipe. The outgoing frame is clipped to the part of the
                   width it still owns, so the arriving shot is revealed from
                   the left rather than faded into. */
                const from = now.held.keepFrom * cut.width;
                context.beginPath();
                context.rect(from, 0, cut.width - from, cut.height);
                context.clip();
              }
              context.drawImage(heldFrame, -now.held.slid * cut.width, 0);
              context.restore();
            }
            if (now.wash) {
              context.save();
              context.globalAlpha = Math.max(0, Math.min(1, now.wash.solid));
              context.fillStyle = now.wash.colour;
              context.fillRect(0, 0, cut.width, cut.height);
              context.restore();
            }
          };
          joining();

          /* ── The fade, over everything ────────────────────────────────

             Last, and that is the point: a fade under the caption would
             leave the words at full brightness over a darkening picture,
             which looks like a fault rather than a fade. Everything goes
             together — picture, bars, words and the logo.

             `at` is the moment on the FILM's clock, not this scene's, so a
             fade longer than the opening shot carries across the cut into
             the next one. */
          if (fade.up > 0 || fade.down > 0) {
            const at = laid + Math.max(0, video.currentTime - window.from);
            const upAlpha = fade.up > 0 ? 1 - Math.min(1, at / fade.up) : 0;
            const left = filmRuns - at;
            const downAlpha = fade.down > 0 ? 1 - Math.min(1, left / fade.down) : 0;
            const dark = Math.max(upAlpha, downAlpha);
            if (dark > 0) {
              context.save();
              context.globalAlpha = Math.min(1, dark);
              context.fillStyle = '#000';
              context.fillRect(0, 0, cut.width, cut.height);
              context.restore();
            }
            /* And the sound with it, from the same number. Set every frame
               rather than scheduled once, because a scheduled ramp assumes
               the film plays at exactly the speed it was planned at — and
               this renders in real time on whatever device somebody has,
               where a scene can stall. Following the picture means the two
               can never disagree. */
            if (songGain) {
              songGain.gain.value = Math.max(0, Math.min(2, cut.audioLoud ?? 1)) * (1 - Math.min(1, dark));
            }
          }
          requestAnimationFrame(draw);
        };
        draw();
      });
      /* This scene is behind us. Counted from the WINDOW rather than from
         the clip, because a trimmed piece contributes what it showed and not
         what it holds — and the fade at the end is measured back from the
         film's real length, so an error here moves the fade rather than
         shortening it, which is the kind of wrong nobody can point at. */
      laid += Math.max(0, window.to - window.from);

      /* And its last frame is kept, for whatever arrives next.
 
         Copied here rather than inside the draw loop: the canvas already holds
         the frame this scene ended on, and copying it every frame would be a
         full-size `drawImage` per frame for the one frame in a thousand that
         gets used. Only when something downstream actually asked. */
      if (holder && heldFrame) {
        holder.clearRect(0, 0, heldFrame.width, heldFrame.height);
        holder.drawImage(canvas, 0, 0, heldFrame.width, heldFrame.height);
        heldReady = true;
      }
    }

    recorder.stop();
    song?.stop();
    /* Every scheduled stretch too. A source started with `start(when, …)` is
       still pending when the render ends if its turn never came, and a pending
       node holds the context open. */
    for (const one of songRuns) { try { one.stop(); } catch { /* already done */ } }
    await finished;
  } catch {
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch {
      // Already stopped.
    }
    return { ok: false, why: 'failed' };
  } finally {
    urls.forEach((one) => URL.revokeObjectURL(one));
    void audioContext?.close();
  }

  if (!parts.length) return { ok: false, why: 'failed' };
  const blob = new Blob(parts, { type: mimeType });
  return {
    ok: true,
    blob,
    seconds: await lengthOf(blob),
    ext: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm',
  };
}
