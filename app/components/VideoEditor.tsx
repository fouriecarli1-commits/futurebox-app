'use client';

/**
 * The video editor — a timeline you cut on, not a storyboard with a render
 * button.
 *
 * ── What this is, and what it is not ─────────────────────────────────────
 *
 * Carli, 24 September 2026, after I pointed at the long-shot board and called
 * it an editor: *"Jy sê ons het een, maar ek vermoed jy meen die long shot
 * funksie. wat ek bedoel is 'n editing program soos 'n video editor lyk amper
 * soos die probooth. Waar jy tydlyne het, asook kan jy filters apply en
 * export."*
 *
 * She was right and I was wrong. A board that lists shots and then calls an
 * engine is a brief. An editor is a clock with your own material on it that
 * you cut, reorder, trim and fade — and the difference is that at no point
 * does an editor need to ask anybody for anything.
 *
 * ── Everything here is free to serve, and that is the design ─────────────
 *
 * Not one thing in this room costs a cent. Trimming, splitting, reordering,
 * fading, the looks, the sound bed, the words on screen and the export all
 * happen in this browser: `stitch.ts` paints frames onto a canvas and records
 * them, which is why this app has no per-minute render bill and why somebody
 * can sit here for three hours without the meter moving.
 *
 * That is also why the room is gated on a plan rather than on credits. It
 * costs nothing to run and it is worth paying for, which is exactly the shape
 * `credits.ts` describes: entering a room is included, generating in it costs
 * credits. There is nothing to generate here yet.
 *
 * ── The three things she asked for that are NOT here ─────────────────────
 *
 * Taking a background out, taking an item out, and generating a missing
 * piece. All three need an engine — fal.ai for the first two — and all three
 * are priced in `credits.ts` and named on every plan card.
 *
 * They are doors that say so rather than buttons that lie. The reason they
 * are not wired tonight is not that the code is hard: it is that the legal
 * audit of the same day found that a supplier receiving video of a person
 * needs a line on the privacy page and an answer about POPIA section 72
 * before a single frame is sent. `check:verwerkers` fails the build the day
 * somebody writes that fetch without one, and fal.ai is already registered
 * in it waiting.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Scissors, Trash2, ChevronLeft, ChevronRight, Loader2, Download,
  Play, Pause, SkipBack, Plus, Volume2, VolumeX, Type, Sparkles, Lock, Image as ImageIcon, Undo2, Redo2,
} from 'lucide-react';
import Card from './Card';
import Note from './Note';
import { useLang } from '../lib/i18n';
import { FILTERS, filterCss, filterName } from '../lib/videofilters';
import { canStitch, lengthOf, stitch } from '../lib/stitch';
import { loadMark, type Corner } from '../lib/logomark';
import { fit } from '../lib/imagefile';
import { downloadBlob, safeFilename } from '../lib/library';
import { check, type Plan } from '../lib/entitlements';
import { KEEP_STEPS } from '../lib/undo';
import {
  NOTHING, SHAPES, LONGEST_FADE, SHORTEST_PIECE,
  add, atSecond, change, cutFrom, drop, fadesFor, lengthOfPiece, move, runs, split, startsAt,
  type Edit, type Piece,
} from '../lib/videoedit';

/** A block on the strip is never thinner than this, however short the piece. */
const THINNEST = 11;

/**
 * How many pixels a second of film is worth on the strip.
 *
 * Forty. A one-second piece is a block wide enough to hit with a thumb, and a
 * thirty-second advert fits in about 1 200 pixels — a couple of screens of
 * scrolling on a phone, which is what scrolling is for.
 *
 * Fixed rather than fitted to the screen, and that is the decision. A strip
 * that squeezes to fit shows a proportion, not a duration: it makes a
 * ten-second film and a ten-minute one look identical, and there is nowhere
 * to point at "eighteen seconds in". A ruler that lies about time is a bar
 * chart wearing a ruler.
 */
const PER_SECOND = 40;

/**
 * How far apart the marks on the ruler are, for a film of a given length.
 *
 * Picked so a strip carries somewhere between four and twenty marks. Every
 * second on a five-minute film is three hundred labels drawn on top of each
 * other; every thirty on a ten-second one is one mark and no ruler at all.
 */
function stepFor(total: number): number {
  for (const step of [1, 2, 5, 10, 15, 30, 60, 120, 300]) {
    if (total / step <= 20) return step;
  }
  return 600;
}

/**
 * The largest file the editor will take in.
 *
 * `OwnFootage` has had a 500MB ceiling since it was written; this room had
 * none at all, which meant a two-gigabyte phone recording was decoded with
 * nothing in the way of it and the tab died — a white screen with nothing in
 * the console, which is the exact failure `check:photopath` exists to stop on
 * the picture side.
 *
 * The same 500MB, in one place, because two ceilings for "a video this app
 * will hold" is two answers to one question.
 */
export const CLIP_MAX_BYTES = 500 * 1024 * 1024;

function seconds(value: number): string {
  const whole = Math.max(0, value);
  const mins = Math.floor(whole / 60);
  const rest = whole - mins * 60;
  return mins > 0 ? `${mins}:${rest.toFixed(1).padStart(4, '0')}` : `${rest.toFixed(1)}s`;
}

export default function VideoEditor({
  plan,
  onUpgrade,
}: {
  readonly plan: Plan;
  readonly onUpgrade?: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [edit, setEdit] = useState<Edit>(NOTHING);

  /* ── Taking it back ─────────────────────────────────────────────────────
 
     The Pro Booth got undo in September and an editor without it is worse:
     a split you did not mean, a piece dropped, and the only way back is to
     bring the file in again and start the trims over.
 
     Not `lib/undo.ts`, and the reason is worth writing down rather than
     leaving as an inconsistency. That module is built around what makes
     audio history dangerous — it weighs each step by DISTINCT AudioBuffer
     bytes and evicts against a 256MB ceiling, because two lanes can hold two
     copies of the same minute of sound.
 
     An `Edit` is a list of small objects holding Blob REFERENCES. Twenty
     steps of it share the same handful of files and weigh nothing. Forcing
     it through a `Holder` contract that wants `audio: Sound` would mean
     describing a video clip as a sound to satisfy a type, which is how a
     module ends up meaning two things.
 
     What IS shared is the depth: `KEEP_STEPS`, so the two rooms in this app
     that can be taken back are taken back the same number of times. */
  const [past, setPast] = useState<readonly Edit[]>([]);
  const [future, setFuture] = useState<readonly Edit[]>([]);

  /** Every change to the film goes through here, so none of them is unrepeatable. */
  const commit = useCallback((how: (was: Edit) => Edit) => {
    setEdit((was) => {
      const next = how(was);
      if (next === was) return was;
      setPast((steps) => [...steps, was].slice(-KEEP_STEPS));
      setFuture([]);
      return next;
    });
  }, []);

  const stepBack = useCallback(() => {
    setPast((steps) => {
      if (!steps.length) return steps;
      const back = steps[steps.length - 1];
      setEdit((now) => {
        setFuture((ahead) => [now, ...ahead].slice(0, KEEP_STEPS));
        return back;
      });
      return steps.slice(0, -1);
    });
  }, []);

  const stepForward = useCallback(() => {
    setFuture((ahead) => {
      if (!ahead.length) return ahead;
      const forward = ahead[0];
      setEdit((now) => {
        setPast((steps) => [...steps, now].slice(-KEEP_STEPS));
        return forward;
      });
      return ahead.slice(1);
    });
  }, []);
  const [picked, setPicked] = useState<string>('');
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState<{ url: string; blob: Blob; ext: string; seconds: number } | null>(null);

  /* The one door. The room costs nothing to serve, so this is not about cost
     — it is that the plan cards say the editor comes with a paid plan, and a
     card that says so while the room opens for everybody is a card that
     lies. `ENTITLEMENTS['video.editor']` is the same row the cards are drawn
     from, so the two cannot disagree. */
  const allowed = check('video.editor', plan).allowed;

  const made_ = useRef<string | null>(null);
  useEffect(() => () => { if (made_.current) URL.revokeObjectURL(made_.current); }, []);

  const piece = useMemo(
    () => edit.pieces.find((one) => one.id === picked) ?? null,
    [edit.pieces, picked],
  );

  /* No `?? pieces[0]`. A picker that cannot name what it picked must pick
     nothing — see the note on `member` in `Presenter.tsx`, and
     `check:whofirst`, which holds it. The effect below moves the selection
     onto a real piece instead. */
  useEffect(() => {
    if (!edit.pieces.length) return;
    if (edit.pieces.some((one) => one.id === picked)) return;
    setPicked(edit.pieces[0].id);
  }, [edit.pieces, picked]);

  /* ── Your own mark on the film ──────────────────────────────────────────
 
     Carli asked for "om 'n item in te sit". The useful version of that, and
     the one that needs no engine, is a logo: `stitch.ts` has painted a mark
     into the corner of every frame since September and `logomark.ts` loads
     it. Nothing new is being built here — it is being reached.
 
     Kept as a loaded `HTMLImageElement` rather than on the `Edit`, because
     `cutFrom` is pure and synchronous and loading an image is neither. The
     edit stays a description of the film; this is the one piece of it that
     has to be decoded before it can be drawn. */
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [markName, setMarkName] = useState('');
  const [corner, setCorner] = useState<Corner>('bottomRight');

  /* ── The playhead ───────────────────────────────────────────────────────
 
     `at` is a second on the EDIT's clock, not on any one file's. Everything
     else — which piece is on screen, where the line is drawn, what the viewer
     is seeked to — is worked out from it by `atSecond`, so there is one
     answer to "where are we" rather than one per control. */
  const [at, setAt] = useState(0);
  const [running, setRunning] = useState(false);
  const strip = useRef<HTMLDivElement | null>(null);

  /* Where in the picked piece's OWN material the viewer should land, once it
     has something to land on.

     A `currentTime` set before the element has decoded a frame is thrown
     away without an error, which is exactly how scrubbing used to put the
     playhead in the right place and the picture in the wrong one. So the
     instruction is written down here and applied by whichever of the two
     effects below gets to a ready element first. */
  const wanted = useRef<number | null>(null);
  const viewer = useRef<HTMLVideoElement | null>(null);

  const total = runs(edit);
  const step = stepFor(total);
  const fades = fadesFor(edit);

  /* The clock cannot point past the end of the film. Dropping the last piece
     while the playhead is inside it used to leave the line hanging off the
     right of the strip. */
  useEffect(() => {
    const end = runs(edit);
    setAt((was) => (was > end ? end : was));
  }, [edit]);

  /**
   * Move the clock, and bring everything else along.
   *
   * This is the only thing that writes `at`, apart from playback itself.
   * `atSecond` says which piece is over that second and how far into its own
   * material that is, so the picked piece, the viewer and the playhead all
   * come from one answer rather than three.
   */
  const scrubTo = useCallback((second: number) => {
    const where = Math.max(0, Math.min(second, runs(edit)));
    setAt(where);
    const found = atSecond(edit, where);
    if (!found) { wanted.current = null; return; }
    wanted.current = found.into;
    setPicked(found.piece.id);
    const v = viewer.current;
    if (v && found.piece.id === picked && v.readyState > 0) {
      v.currentTime = found.into;
      wanted.current = null;
    }
  }, [edit, picked]);

  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (!piece) { setSource(null); return undefined; }
    const url = URL.createObjectURL(piece.clip);
    setSource(url);
    return () => URL.revokeObjectURL(url);
    /* Keyed on the clip rather than the piece: trimming makes a new piece
       object every keystroke and the material behind it has not changed. */
  }, [piece?.clip]);

  /* A waiting seek, landed the moment the element can take one. */
  useEffect(() => {
    const v = viewer.current;
    if (!v) return undefined;
    const land = () => {
      if (wanted.current === null) return;
      v.currentTime = wanted.current;
      wanted.current = null;
      if (running) void v.play();
    };
    v.addEventListener('loadeddata', land);
    return () => v.removeEventListener('loadeddata', land);
  }, [source, running]);

  /* And the same seek for the case `loadeddata` never fires: two pieces cut
     out of ONE file share a Blob, so picking the other half of a split does
     not change `source` and the element is already decoded. Without this,
     scrubbing across a split moved the line and left the picture. */
  useEffect(() => {
    const v = viewer.current;
    if (!v || wanted.current === null) return;
    if (v.readyState === 0) return;
    v.currentTime = wanted.current;
    wanted.current = null;
  }, [picked, source]);

  /* Seek to whichever end just moved, so the frame on screen is the frame
     being decided about.

     Only when the start of the SAME piece moved, and that qualifier is the
     whole fix. The first version watched `piece?.from`, which also changes
     when you pick a DIFFERENT piece — so scrubbing into the second half of a
     split moved the line, moved the picture, and then this effect dragged
     the picture back to the top of that piece. It ran second and won.

     Invisible in a typecheck and invisible on screen unless you happen to
     look at the frame rather than the line. `check:editor` reads both and
     reported the line at 1.5s over a picture at 0.99s. */
  const trimmed = useRef<{ readonly id: string; readonly from: number } | null>(null);
  useEffect(() => {
    const v = viewer.current;
    const was = trimmed.current;
    trimmed.current = piece ? { id: piece.id, from: piece.from } : null;
    if (!v || !piece || !was) return;
    if (was.id !== piece.id || was.from === piece.from) return;
    if (Number.isFinite(piece.from)) v.currentTime = piece.from;
  }, [piece?.id, piece?.from]);

  /* The end of a piece: a stop when you are cutting, the next piece when the
     whole film is running.

     That hop is the one thing that makes this a timeline and not a row of
     files with their own play buttons. The clock is read off the element
     rather than counted on a timer, so it cannot drift away from the picture
     while a slow phone decodes. */
  useEffect(() => {
    const v = viewer.current;
    if (!v || !piece) return undefined;
    const tick = () => {
      if (running) setAt(startsAt(edit, piece.id) + Math.max(0, v.currentTime - piece.from));
      if (v.currentTime < piece.to) return;
      if (!running) { v.pause(); return; }
      const after = edit.pieces[edit.pieces.findIndex((one) => one.id === piece.id) + 1];
      if (!after) { v.pause(); setRunning(false); setAt(runs(edit)); return; }
      wanted.current = after.from;
      setPicked(after.id);
    };
    v.addEventListener('timeupdate', tick);
    return () => v.removeEventListener('timeupdate', tick);
  }, [piece, running, edit]);

  /* Play and pause follow the one flag, so the button and the end of the
     film cannot disagree about whether the film is running. */
  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    if (running) void v.play();
    else v.pause();
  }, [running, source]);

  const bringIn = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setProblem('');
    setBusy('bring');
    try {
      let next = edit;
      for (const file of Array.from(files)) {
        if (file.size > CLIP_MAX_BYTES) {
          setProblem(t(
            'edit.toobig',
            'That file is larger than 500MB. Trim it on your phone first, or bring it in in pieces.',
          ));
          continue;
        }
        const length = await lengthOf(file);
        if (!Number.isFinite(length) || length <= 0) {
          setProblem(t('edit.unreadable', 'That file could not be read as video.'));
          continue;
        }
        next = add(next, {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          clip: file,
          name: file.name.replace(/\.[^.]+$/, ''),
          from: 0,
          to: length,
        });
      }
      commit(() => next);
    } finally {
      setBusy(null);
    }
  }, [edit, commit, t]);

  const tweak = useCallback((how: Partial<Omit<Piece, 'id'>>) => {
    if (!piece) return;
    commit((was) => change(was, piece.id, how));
  }, [piece, commit]);

  const preview = useCallback(async () => {
    if (!edit.pieces.length || busy) return;
    setProblem('');
    setBusy('make');
    try {
      const result = await stitch({ ...cutFrom(edit), mark, markCorner: corner });
      if (!result.ok) {
        setProblem(
          result.why === 'unsupported'
            ? t('edit.noRecord', 'This browser cannot record a film. Chrome or Edge can.')
            : t('edit.failed', 'That could not be put together just now.'),
        );
        return;
      }
      if (made_.current) URL.revokeObjectURL(made_.current);
      made_.current = URL.createObjectURL(result.blob);
      setMade({ url: made_.current, blob: result.blob, ext: result.ext, seconds: result.seconds });
    } catch {
      setProblem(t('edit.failed', 'That could not be put together just now.'));
    } finally {
      setBusy(null);
    }
  }, [edit, busy, mark, corner, t]);

  if (!allowed) {
    return (
      <Card title={t('edit.title', 'Video editor')} icon={<Film className="w-4 h-4" />}>
        <div data-editorlocked className="space-y-3">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t(
              'edit.locked',
              'The editor comes with every paid plan — a timeline you cut on, fades, sound under it, the looks and an export.',
            )}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'edit.lockedFree',
              'Sketching a video in your own browser stays free and always will. This is the version with a clock under it.',
            )}
          </p>
          {onUpgrade && (
            <button
              type="button"
              onClick={onUpgrade}
              data-editorupgrade
              className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 inline-flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {t('edit.seePlans', 'See the plans')}
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-videoeditor>
      <Card title={t('edit.title', 'Video editor')} icon={<Film className="w-4 h-4" />}>
        <div className="space-y-4">
          <Note>
            {t(
              'edit.what',
              'Bring your own clips in, cut them on the clock, and take the film out. Everything on this page happens on your own device — no credits, no queue, no waiting.',
            )}
          </Note>

          {/* ── Bring the material in ──────────────────────────────── */}
          <label
            data-editorbring
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 cursor-pointer hover:border-zinc-600"
          >
            {busy === 'bring' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('edit.bring', 'Bring clips in')}
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(event) => { void bringIn(event.target.files); event.target.value = ''; }}
            />
          </label>

          {/* ── Take it back ────────────────────────────────────────────
 
              Beside the way in rather than beside each thing it undoes: one
              pair of buttons for the whole room is what every editor does,
              and a per-control undo is a room full of arrows.
 
              Disabled rather than hidden when there is nothing to take back.
              A button that appears and disappears moves everything beside it,
              and on a phone that means pressing the wrong thing. */}
          <div className="flex gap-2">
            <button
              type="button"
              data-editorundo
              disabled={past.length === 0}
              onClick={stepBack}
              title={t('edit.undo', 'Take back the last change')}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Undo2 className="w-4 h-4" />
              {t('edit.undoShort', 'Back')}
            </button>
            <button
              type="button"
              data-editorredo
              disabled={future.length === 0}
              onClick={stepForward}
              title={t('edit.redo', 'Put the change back')}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Redo2 className="w-4 h-4" />
              {t('edit.redoShort', 'Forward')}
            </button>
          </div>

          {/* ── The shape, which changes what you are looking at ────── */}
          <div className="space-y-1.5">
            <span className="text-sm text-zinc-400">{t('edit.shape', 'Shape')}</span>
            <div className="flex gap-2">
              {(Object.keys(SHAPES) as (keyof typeof SHAPES)[]).map((one) => {
                const on = (edit.shape ?? 'tall') === one;
                return (
                  <button
                    key={one}
                    type="button"
                    aria-pressed={on}
                    data-editorshape={one}
                    onClick={() => commit((was) => ({ ...was, shape: one }))}
                    className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                      on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {one === 'tall' ? t('edit.tall', 'Tall') : one === 'wide' ? t('edit.wide', 'Wide') : t('edit.square', 'Square')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── The clock ────────────────────────────────────────────────
 
              Carli, 29 September: *"dit moet seker ook op 'n tydlyn wees.
              Die ordentlike editor."*
 
              The first version drew the pieces as blocks in a row, sized by
              how long each ran as a SHARE of the whole. That reads as a
              proportion and not as time: a ten-second piece and a ten-second
              piece next to a two-minute one were both slivers, and there was
              nowhere to point at "eighteen seconds in".
 
              So it is a real clock now. Seconds are pixels — `PER_SECOND` of
              them — the strip is as wide as the film is long and scrolls, a
              ruler above it carries the marks, and a playhead says where you
              are. Tap anywhere on it and the viewer shows that frame.
 
              The width is the honest part: a three-minute film is a
              three-minute strip. A timeline that squeezes to fit is a
              proportion bar wearing a ruler. */}
          {edit.pieces.length === 0 ? (
            <p className="text-sm text-zinc-500 leading-relaxed" data-editorempty>
              {t('edit.nothing', 'Nothing on the clock yet. Bring a clip in and it appears here as a block you can cut.')}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-zinc-400">{t('edit.clock', 'The clock')}</span>
                <span className="text-sm text-zinc-500" data-editorruns>
                  {seconds(at)} / {seconds(total)}
                </span>
              </div>

              <div
                ref={strip}
                className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950"
                data-editorstrip
              >
                <div style={{ width: Math.max(280, total * PER_SECOND) }} className="relative select-none">
                  {/* The ruler. A mark every `stepFor` seconds, so a
                      ten-second film is marked every second and a five-minute
                      one every thirty — the alternative is either three marks
                      or three hundred. */}
                  <div className="relative h-5 border-b border-zinc-800" data-editorruler>
                    {Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step).map((mark) => (
                      <span
                        key={mark}
                        style={{ left: mark * PER_SECOND }}
                        className="absolute top-0 h-full border-l border-zinc-700 pl-1 text-[10px] leading-5 text-zinc-500"
                      >
                        {seconds(mark)}
                      </span>
                    ))}
                  </div>

                  {/* The blocks, at their real place in time. */}
                  <div
                    className="relative h-16"
                    data-editortrack
                    onPointerDown={(event) => {
                      const box = event.currentTarget.getBoundingClientRect();
                      scrubTo((event.clientX - box.left) / PER_SECOND);
                    }}
                  >
                    {edit.pieces.map((one) => {
                      const from = startsAt(edit, one.id);
                      const wide = lengthOfPiece(one) * PER_SECOND;
                      const on = one.id === picked;
                      return (
                        <button
                          key={one.id}
                          type="button"
                          aria-pressed={on}
                          data-editorblock
                          onClick={() => setPicked(one.id)}
                          style={{ left: from * PER_SECOND, width: Math.max(THINNEST, wide) }}
                          className={`absolute top-1 bottom-1 overflow-hidden rounded-lg border-2 px-2 py-1 text-left ${
                            on ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                          }`}
                        >
                          <span className="block truncate text-[11px] font-semibold text-zinc-200">{one.name}</span>
                          <span className="block text-[11px] text-zinc-500">{seconds(lengthOfPiece(one))}</span>
                        </button>
                      );
                    })}

                    {/* The playhead. Drawn over the blocks and ignoring
                        pointers, so tapping "on the line" still reaches the
                        track underneath and moves it. */}
                    <div
                      data-editorplayhead
                      style={{ left: Math.min(at, total) * PER_SECOND }}
                      className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400"
                    >
                      <span className="absolute -top-1 -left-1 block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Playing the whole film in place, rather than only on export.
                  It hops the viewer from piece to piece as the clock runs,
                  which is the one thing that makes a timeline a timeline and
                  not a list of files. */}
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  data-editorplayall
                  onClick={() => setRunning((was) => !was)}
                  className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
                >
                  {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {running ? t('edit.pause', 'Pause') : t('edit.playAll', 'Play the film')}
                </button>
                <button
                  type="button"
                  data-editorrewind
                  onClick={() => { setRunning(false); scrubTo(0); }}
                  className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
                >
                  <SkipBack className="w-4 h-4" />
                  {t('edit.rewind', 'Back to the start')}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── The piece you picked ───────────────────────────────────────
 
          Not a Card, and that is a decision rather than an oversight.
 
          Every card in this app starts folded, which is right for a room
          somebody is reading and wrong for the panel that exists BECAUSE
          they just picked something. `check:editor` caught it the first time
          it ran: a clip went in, a block appeared, and the controls for that
          block were behind a fold nobody asked for.
 
          `openOn` looked like the fix and is not — a Card skips the first
          change on purpose, so a panel that mounts already picked mounts
          shut. Which is the tell that this was never a card. A card folds
          because a room is long; an inspector that folds is a control panel
          hiding itself from the person holding it. */}
      {piece && (
        <section
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4"
          data-editorpiece
        >
          <h3 className="text-sm font-semibold text-zinc-100 inline-flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            {piece.name}
          </h3>

          {/* ── You were cutting blind ─────────────────────────────────────
 
              The first version of this panel had two number boxes and no
              picture. "Starts at 3.4" is not a decision anybody can make
              about a shot they cannot see — it is a guess, checked by
              exporting the whole film and watching it.
 
              So the piece is on screen, the look is on it, and moving either
              end seeks to that end. Watching the frame you are trimming TO is
              the entire job.
 
              `filterCss` is the same function the render uses, so the frame
              here and the frame in the finished film cannot disagree. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={viewer}
            data-editorviewer
            src={source ?? undefined}
            playsInline
            muted={!piece.sound}
            style={{ filter: filterCss(piece.look) || undefined }}
            className="w-full rounded-xl border border-zinc-800 bg-black"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              data-editorplaypiece
              onClick={() => {
                const v = viewer.current;
                if (!v) return;
                v.currentTime = piece.from;
                void v.play();
              }}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
            >
              <Play className="w-4 h-4" />
              {t('edit.playPiece', 'Play this piece')}
            </button>
            <span className="self-center text-sm text-zinc-500" data-editorpiecelen>
              {seconds(lengthOfPiece(piece))}
            </span>
          </div>

          <div className="space-y-4">
            {/* Trim. Two numbers rather than a drag: a drag on a phone is a
                guess, and the thing somebody wants is usually "start half a
                second later", which is a number. */}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="block text-sm text-zinc-400">{t('edit.from', 'Starts at')}</span>
                <input
                  type="number" step="0.1" min={0} max={Math.max(0, piece.to - SHORTEST_PIECE)}
                  value={piece.from.toFixed(1)}
                  data-editorfrom
                  onChange={(e) => tweak({ from: Number(e.target.value) })}
                  className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-sm text-zinc-400">{t('edit.to', 'Ends at')}</span>
                <input
                  type="number" step="0.1" min={piece.from + SHORTEST_PIECE}
                  value={piece.to.toFixed(1)}
                  data-editorto
                  onChange={(e) => tweak({ to: Number(e.target.value) })}
                  className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
                />
              </label>
            </div>

            {/* The looks. Seven, free, and applied in the browser — the same
                `filterCss` the render uses, so the preview swatch and the
                finished film cannot disagree. */}
            <div className="space-y-1.5">
              <span className="text-sm text-zinc-400">{t('edit.look', 'Look')}</span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((one) => {
                  const on = (piece.look ?? 'none') === one.id;
                  return (
                    <button
                      key={one.id}
                      type="button"
                      aria-pressed={on}
                      data-editorlook={one.id}
                      onClick={() => tweak({ look: one.id })}
                      style={{ filter: filterCss(one.id) || undefined }}
                      className={`min-h-[44px] shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                      }`}
                    >
                      {filterName(one.id, 'en')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Words over the piece. */}
            <label className="space-y-1.5 block">
              <span className="text-sm text-zinc-400 inline-flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                {t('edit.words', 'Words on screen')}
              </span>
              <input
                type="text"
                value={piece.words ?? ''}
                data-editorwords
                placeholder={t('edit.wordsAsk', 'Up for as long as this piece is')}
                onChange={(e) => tweak({ words: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
              />
            </label>

            {/* This piece's own sound. Off by default — most material is room
                tone, and a bed of six rooms at once is noise. */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                aria-pressed={piece.sound === true}
                data-editorsound
                onClick={() => tweak({ sound: !piece.sound })}
                className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold inline-flex items-center gap-2 ${
                  piece.sound ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                }`}
              >
                {piece.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {piece.sound ? t('edit.soundOn', 'Its own sound is on') : t('edit.soundOff', 'Its own sound is off')}
              </button>
              {piece.sound && (
                <label className="inline-flex items-center gap-2">
                  <span className="text-sm text-zinc-400">{t('edit.loud', 'How loud')}</span>
                  <input
                    type="range" min={0} max={2} step={0.05}
                    value={piece.loud ?? 1}
                    data-editorloud
                    onChange={(e) => tweak({ loud: Number(e.target.value) })}
                    className="w-32 accent-emerald-500"
                  />
                </label>
              )}
            </div>

            {/* Move, split, remove. */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button" data-editorearlier
                onClick={() => commit((was) => move(was, piece.id, 'earlier'))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('edit.earlier', 'Earlier')}
              </button>
              <button
                type="button" data-editorlater
                onClick={() => commit((was) => move(was, piece.id, 'later'))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                {t('edit.later', 'Later')}
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button" data-editorsplit
                onClick={() => commit((was) => split(was, piece.id, piece.from + lengthOfPiece(piece) / 2))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-1.5"
              >
                <Scissors className="w-4 h-4" />
                {t('edit.split', 'Split in two')}
              </button>
              <button
                type="button" data-editordrop
                onClick={() => commit((was) => drop(was, piece.id))}
                className="min-h-[44px] rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-300 inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {t('edit.drop', 'Take it out')}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Under the whole thing ────────────────────────────────────── */}
      <Card title={t('edit.under', 'Sound and fades')} icon={<Volume2 className="w-4 h-4" />}>
        <div className="space-y-4">
          <label
            data-editorunder
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 cursor-pointer hover:border-zinc-600"
          >
            <Plus className="w-4 h-4" />
            {edit.under ? t('edit.underSwap', 'Change the track under it') : t('edit.underAdd', 'Put a track under it')}
            <input
              type="file" accept="audio/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) commit((was) => ({ ...was, under: file }));
                e.target.value = '';
              }}
            />
          </label>

          {edit.under && (
            <label className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{t('edit.underLoud', 'How loud the track sits')}</span>
              <input
                type="range" min={0} max={2} step={0.05}
                value={edit.underLoud ?? 1}
                data-editorunderloud
                onChange={(e) => commit((was) => ({ ...was, underLoud: Number(e.target.value) }))}
                className="w-32 accent-emerald-500"
              />
            </label>
          )}

          {/* ── A mark in the corner ──────────────────────────────────
 
              Sized and placed by `logomark.ts`, which every other route that
              brands a clip already uses. Same share of the frame, same
              inset, same opacity — a second set of numbers here would mean a
              logo that sits in one place on a video desk clip and another
              place on an edited one. */}
          <div className="space-y-2">
            <span className="text-sm text-zinc-400 inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              {t('edit.mark', 'Your mark in the corner')}
            </span>
            <label
              data-editormark
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2 cursor-pointer hover:border-zinc-600"
            >
              <Plus className="w-4 h-4" />
              {markName || t('edit.markAdd', 'Put a logo on it')}
              <input
                type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  /* Through `fit` rather than straight into a FileReader.
 
                     `check:photopath` caught the first version: a photograph
                     off a modern phone is two hundred megapixels and ten
                     megabytes, a byte ceiling lets it through, and the decode
                     kills the tab — a white screen with nothing in the
                     console. Every other picture input in this app goes
                     through the same function, so a logo behaves here the way
                     it behaves in Cast.
 
                     The mark is painted at 16% of the frame's width
                     (`MARK_SHARE`), so 1024 on the longest edge is more than
                     it can ever use. */
                  void fit(file, 1024).then((made) => {
                    if (!made.ok) {
                      setProblem(t('edit.markBad', 'That picture could not be read.'));
                      return;
                    }
                    void loadMark(made.preview).then((img) => {
                      if (!img) {
                        setProblem(t('edit.markBad', 'That picture could not be read.'));
                        return;
                      }
                      setMark(img);
                      setMarkName(file.name.replace(/\.[^.]+$/, ''));
                    });
                  });
                }}
              />
            </label>
            {mark && (
              <div className="flex gap-2 flex-wrap">
                {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as Corner[]).map((one) => (
                  <button
                    key={one}
                    type="button"
                    aria-pressed={corner === one}
                    data-editorcorner={one}
                    onClick={() => setCorner(one)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                      corner === one ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {one === 'topLeft' ? t('edit.topLeft', 'Top left')
                      : one === 'topRight' ? t('edit.topRight', 'Top right')
                      : one === 'bottomLeft' ? t('edit.bottomLeft', 'Bottom left')
                      : t('edit.bottomRight', 'Bottom right')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fades. Clamped by `fadesFor`, which also stops the two of them
              together being longer than the film — a two-second fade each end
              on a three-second cut is a cut nobody ever sees. */}
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="block text-sm text-zinc-400">{t('edit.fadeIn', 'Fade in')}</span>
              <input
                type="range" min={0} max={LONGEST_FADE} step={0.1}
                value={edit.fadeIn ?? 0}
                data-editorfadein
                onChange={(e) => commit((was) => ({ ...was, fadeIn: Number(e.target.value) }))}
                className="w-full accent-emerald-500"
              />
              <span className="block text-sm text-zinc-500">{seconds(fades.in)}</span>
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm text-zinc-400">{t('edit.fadeOut', 'Fade out')}</span>
              <input
                type="range" min={0} max={LONGEST_FADE} step={0.1}
                value={edit.fadeOut ?? 0}
                data-editorfadeout
                onChange={(e) => commit((was) => ({ ...was, fadeOut: Number(e.target.value) }))}
                className="w-full accent-emerald-500"
              />
              <span className="block text-sm text-zinc-500">{seconds(fades.out)}</span>
            </label>
          </div>
        </div>
      </Card>

      {/* ── Take it out ──────────────────────────────────────────────── */}
      <Card title={t('edit.out', 'Put it together')} icon={<Play className="w-4 h-4" />}>
        <div className="space-y-3">
          <button
            type="button"
            disabled={!edit.pieces.length || busy !== null || !canStitch()}
            data-editormake
            onClick={() => void preview()}
            className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40 inline-flex items-center gap-2"
          >
            {busy === 'make' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {t('edit.make', 'Put it together')}
          </button>

          <Note>
            {t(
              'edit.realTime',
              'It plays the film through once to record it, so it takes about as long as the film is. That is the trade for it costing nothing.',
            )}
          </Note>

          {problem && (
            <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
              {problem}
            </p>
          )}

          {made && (
            <div className="space-y-2" data-editormade>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={made.url} controls className="w-full rounded-xl border border-zinc-800 bg-black" />
              <button
                type="button"
                data-editorsave
                onClick={() => downloadBlob(made.blob, safeFilename(edit.pieces[0]?.name ?? 'film', made.ext))}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('edit.save', 'Save it')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* ── The three that need an engine ────────────────────────────── */}
      <Card title={t('edit.engine', 'The ones that need an engine')} icon={<Sparkles className="w-4 h-4" />}>
        <div className="space-y-2" data-editorcoming>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'edit.engineWhat',
              'Taking a background out, taking an item out of a shot, and generating a piece you do not have. These three cannot happen on your device — they need an engine, and they cost credits.',
            )}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'edit.engineWhen',
              'They are priced and on the plan cards, and they are not switched on yet. Sending video of a person to another company needs an answer about what that company may do with it first, and that answer is being got rather than assumed.',
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
