'use client';

/**
 * Studio — your song, laid out in its own sections.
 *
 * The old version of this screen worked on demo tracks with invented
 * arrangements, which made it a diagram of a song rather than a view of one.
 * It works on what you actually made now, and that only became possible once
 * songs started carrying the composition plan they were built from: the app
 * told the music service the verse was 72 seconds and the chorus 36, so it
 * knows where every section starts without analysing anything.
 *
 * What it can and cannot do, said plainly because the difference matters. It
 * can show the real audio, put the playhead on it, and let you jump to a
 * section. It cannot patch a section in place — the music service generates a
 * whole song from a whole plan, and there is no endpoint that replaces bar 33
 * to 48. So editing a section here changes the plan and makes a **new take**,
 * which is a different thing from an edit and is labelled as one. Miming an
 * in-place edit and quietly returning a fresh song would be worse than
 * refusing.
 *
 * ## Obsidian, 13 October 2026
 *
 * Carli, with the "Studio" page Google drew — a regeneration banner with
 * one gradient button, section cards with a coloured chip, a preview line,
 * a time range and a row of small controls, a stem deck under them — and
 * the rule for the whole redesign: *"ons transform en totally redesign."*
 * The room is that page now. What the page drew and this room cannot
 * honestly do is left out and said on screen: a "regenerate this section
 * only" button, because the engine makes the whole song from the whole
 * plan; and four stems, because the separation here makes two, the voice
 * and everything else, which is what `Lanes` draws.
 *
 * ## Arranging
 *
 * Renaming a section and rewriting its words was all this could do, and the
 * report was fair: that is proofreading, not editing. Most of what anybody
 * does to a song is *arrangement* — move the bridge before the last chorus,
 * cut the second verse, say the chorus twice, put a bridge in that was never
 * written. All four are here now.
 *
 * They are honest through the round trip, which is why these four and not
 * others. The plan travels back to the make screen as a lyric sheet, so the
 * order of the sections is the order of the tags, deleting one removes a
 * block, and adding one inserts a block. Nothing is inferred and nothing is
 * lost.
 *
 * A section's **length** is deliberately not editable, and the screen says so
 * rather than drawing a slider that does nothing. Lengths are not carried in
 * the sheet: `splitSections` recomputes them from how many lines each section
 * has against the song's total. A number you could drag that was thrown away
 * on the way out is worse than no number, so the screen explains what actually
 * decides a section's length — more lines, and the total you choose when you
 * make it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, Copy, GripVertical, ListMusic, Loader2, Mic, Music4, Pause, Play, Plus,
  RefreshCw, SlidersHorizontal, Sparkles, Trash2, Waves,
} from 'lucide-react';
import { loadTracks } from '../lib/library';
import { splitSections } from '../lib/engines';
import { readAudio } from '../lib/trackaudio';
import { peaksOf, type Peaks } from '../lib/peaks';
import { levelOf, loadOwned, NOTHING, type Owned } from '../lib/purchases';
import { useLang } from '../lib/i18n';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import type { Track } from '../lib/library';
import Lanes from './Lanes';
import Note from './Note';
import Card from './Card';
import SongForm from './SongForm';

interface Part {
  name: string;
  lines: string[];
  seconds: number;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** The chip a section's name sits in, cycled so two next to each other never match. */
const CHIPS = [
  'border-emerald-800 bg-emerald-950 text-emerald-400',
  'border-cyan-800 bg-cyan-950 text-cyan-400',
  'border-amber-800 bg-amber-950 text-amber-400',
  'border-violet-800 bg-violet-950 text-violet-400',
  'border-rose-800 bg-rose-950 text-rose-400',
];

/**
 * The sections of a song, however it came by them.
 *
 * A song made here carries the plan it was built from — the app told the music
 * service the verse was 72 seconds and the chorus 36 — and those are the real
 * boundaries, to the second.
 *
 * A song that has words but no plan is the interesting case, and it used to be
 * turned away. That is every song made before plans were carried, every one
 * from a path that does not build one, and every one somebody wrote the words
 * for by hand. The room answered all of them with "No song to lay out yet",
 * which reads as a room that does nothing rather than as a song that is
 * missing something.
 *
 * The words alone are enough to lay out. `splitSections` reads the [Section]
 * tags and weights each part by how many lines it carries — the same function
 * the make screen uses to build a plan in the first place, so what is shown
 * here is what would be sent. The lengths are then estimates rather than
 * measurements, which is a real difference and is said on screen rather than
 * quietly presented as the same thing.
 */
function sectionsOf(track: Track): Part[] {
  const carried = (track.parts ?? []) as Part[];
  if (carried.length) return carried.map((part) => ({ ...part, lines: [...part.lines] }));
  return splitSections(track.lyrics ?? '', track.seconds).map((part) => ({
    ...part,
    lines: [...part.lines],
  }));
}

/** True where the boundaries were worked out from the words, not carried. */
function estimated(track: Track): boolean {
  return !((track.parts ?? []).length > 0);
}

export default function SongSections({
  reloadKey,
  onRemake,
  open,
  onBooth,
}: {
  /** Bumped when a song is made, so the list here picks it up. */
  reloadKey: number;
  /** Hands an edited plan back to the Make screen and starts a new take. */
  onRemake: (next: { title: string; lyrics: string; style: string }) => void;
  /**
   * A song to open on arrival, sent by whoever opened this room.
   *
   * The channel has an edit button per song now, and it would be a strange
   * button that dropped you at the top of somebody's list. Read once per
   * value, so choosing a different song here is not undone on the next render.
   */
  open?: string | null;
  /**
   * The way to the Booth, for somebody who wants to keep a performance rather
   * than roll for a new one. A prop and not a `goToRoom` call, because
   * navigation belongs to `page.tsx` — the same shape `onRemake` already has.
   */
  /**
   * ── And the song goes with them ────────────────────────────────────
   *
   * Carli, 21 September 2026: *"Al die kamers se AI praat nie met mekaar
   * nie."*
   *
   * This took no argument, and the note in `page.tsx` explained why:
   * *"the Booth keeps its own list and picking there is one press.
   * Passing an id it has no prop for would be a promise the room cannot
   * keep."* That was true when it was written and stopped being true the
   * day the Booth registered `pick_song` — which the collab room has
   * been using ever since. So the reason outlived the fact, and somebody
   * standing over one song, pressing a button that says take it to the
   * Booth, arrived at a list to find it in again.
   */
  onBooth?: (title: string) => void;
}): React.ReactElement {
  const { t } = useLang();

  // Read from the same place the Make screen keeps them rather than threading
  // the list down through the page: one source, and no chance of two lists
  // disagreeing about what exists.
  const [tracks, setTracks] = useState<Track[]>([]);
  useEffect(() => {
    setTracks(loadTracks());
  }, [reloadKey]);

  /* Anything with words. A sketch with no lyrics at all still cannot be laid
     out — there is nothing to lay out — but that is now the only exclusion,
     rather than "was made by the one path that records a plan". */
  const usable = useMemo(
    () => tracks.filter((track) => sectionsOf(track).length > 0),
    [tracks],
  );

  /* Choose which song is on the timeline. Only the ones the timeline can
     actually open are offered to the match, so naming a sketch that has no
     audio behind it leaves the picker where it was rather than selecting a
     song that then fails to load. */
  useCopilotOps('studio', {
    pick_song: (value) => {
      const found = matchByTitle(usable, value);
      if (found) setChosen(found.id);
    },
  });

  const [chosen, setChosen] = useState<string>('');
  /* No `?? usable[0]`. The same fault as the presenter's cast picker — see
     the note on `member` in `Presenter.tsx`. `chosen` starts empty and stops
     matching whenever the usable list is re-read without the song that was
     picked, and falling through to the first row meant working on a song
     nobody selected. The effect below moves `chosen` instead, so the row that
     is highlighted and the row that is worked on are one value. */
  const track = usable.find((one) => one.id === chosen) ?? null;

  useEffect(() => {
    if (!usable.length) return;
    if (usable.some((one) => one.id === chosen)) return;
    setChosen(usable[0].id);
  }, [usable, chosen]);

  // Opened from somewhere else, and only for as long as that request is new.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!open || opened.current === open) return;
    if (!usable.some((one) => one.id === open)) return;
    opened.current = open;
    setChosen(open);
  }, [open, usable]);

  const [parts, setParts] = useState<Part[]>([]);
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  /* The song as it is allowed to be heard, held for the lanes.

     Deliberately the marked copy on a free song rather than the clean one.
     Splitting a song into two tracks and rendering a balance out of it is
     another way to a file, and this one does not pass through
     `downloadLink` — which is where every other download is checked against
     what was paid for. Marking before separating means the mark is in both
     stems and in anything mixed from them, so the lanes cannot become the
     back door to a clean master. */
  const [playable, setPlayable] = useState<Blob | null>(null);
  const [lanesOpen, setLanesOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [owned, setOwned] = useState<Owned>(NOTHING);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    loadOwned().then(setOwned);
  }, []);

  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => setPlaying(false));
    audioRef.current = element;
    return () => {
      element.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  // A fresh track resets everything: its own sections, its own audio, its own
  // waveform. Carrying any of it across would be showing one song's shape over
  // another song's sound.
  useEffect(() => {
    if (!track) return;
    setParts(sectionsOf(track));
    setPeaks(null);
    setPlayable(null);
    setLanesOpen(false);
    setAt(0);
    setPlaying(false);
    audioRef.current?.pause();

    let live = true;
    setLoading(true);
    readAudio(track.id).then(async (blob) => {
      if (!live || !blob) {
        setLoading(false);
        return;
      }
      // As it was made — see the note in `MakeMusic`. Nothing is marked.
      const heard = blob;
      if (!live) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(heard);
      if (audioRef.current) audioRef.current.src = urlRef.current;
      setPlayable(heard);
      setPeaks(await peaksOf(heard));
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [owned, track]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !playing) return;
    let frame = 0;
    const step = () => {
      setAt(element.currentTime);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const duration = peaks?.duration || track?.seconds || 0;

  /** Where each section starts, scaled to how long the file really is. */
  const marks = useMemo(() => {
    const planned = parts.reduce((total, part) => total + Math.max(1, part.seconds), 0);
    if (!planned || !duration) return [];
    const scale = duration / planned;
    let running = 0;
    return parts.map((part) => {
      const start = running;
      running += Math.max(1, part.seconds) * scale;
      return { start, end: running };
    });
  }, [duration, parts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const columns = peaks.values.length;
    const step = width / columns;
    const played = duration > 0 ? (at / duration) * width : 0;
    const middle = height / 2;
    for (let i = 0; i < columns; i += 1) {
      const size = Math.max(1, peaks.values[i] * (height - 2));
      const x = i * step;
      context.fillStyle = x <= played ? 'rgb(16, 185, 129)' : 'rgb(63, 63, 70)';
      context.fillRect(x, middle - size / 2, Math.max(1, step - 0.5), size);
    }
    // Where one section ends and the next begins, over the audio it describes.
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 1;
    marks.forEach((mark) => {
      const x = duration > 0 ? (mark.start / duration) * width : 0;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    });
  }, [at, duration, marks, peaks]);

  const toggle = useCallback(() => {
    const element = audioRef.current;
    if (!element || !element.src) return;
    if (playing) {
      element.pause();
      setPlaying(false);
      return;
    }
    void element.play();
    setPlaying(true);
  }, [playing]);

  const seek = useCallback((seconds: number) => {
    const element = audioRef.current;
    if (!element) return;
    element.currentTime = seconds;
    setAt(seconds);
  }, []);

  /**
   * Arrangement.
   *
   * Each of these is a change to the order or the presence of a section, and
   * every one survives the trip back through the lyric sheet unchanged — which
   * is the reason these four exist and a length slider does not.
   */
  const move = useCallback((from: number, to: number) => {
    setParts((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = current.slice();
      const [taken] = next.splice(from, 1);
      next.splice(to, 0, taken);
      return next;
    });
  }, []);

  const drop = useCallback((at_: number) => {
    setParts((current) => current.filter((_, index) => index !== at_));
  }, []);

  /**
   * Say it again.
   *
   * A chorus that comes round twice is the commonest arrangement change there
   * is, and typing it out a second time is how somebody ends up with two
   * choruses that are almost the same.
   */
  const again = useCallback((at_: number) => {
    setParts((current) => {
      const next = current.slice();
      next.splice(at_ + 1, 0, { ...current[at_], lines: [...current[at_].lines] });
      return next;
    });
  }, []);

  const add = useCallback(() => {
    setParts((current) => [...current, { name: 'Bridge', lines: [''], seconds: 0 }]);
  }, []);

  const remake = useCallback(() => {
    if (!track) return;
    // Back into a lyric sheet, which is the shape the Make screen and the plan
    // both speak. Nothing is lost in the round trip: the section names are the
    // tags, and the lines are the lines.
    const sheet = parts
      .filter((part) => part.lines.some((line) => line.trim()))
      .map((part) => `[${part.name}]\n${part.lines.filter((line) => line.trim()).join('\n')}`)
      .join('\n\n');
    onRemake({ title: track.title, lyrics: sheet, style: track.style });
  }, [onRemake, parts, track]);

  /* Rendered in both the empty room and the full one.

     Somebody arriving at a Studio with nothing in it yet is exactly who this
     is for: the moment to learn that a take cannot be kept here is before
     there is one worth keeping, not after. */
  /* ── What this room cannot do, at the top and not in a footnote ────────

     Carli, 13 September 2026: "As die liedjie nie oor gedoen kan word nie,
     moet die studio dit verklaar en sê dat hierdie 'n regeneration spasie is,
     dat as iemand die produk wil hou die enigste opsie recording is in die
     booth."

     The "Make it again" card already said the technical half — that the
     service builds a whole song from a whole plan and cannot replace one
     section inside a finished file. Two things were wrong with leaving it
     there. It sat near the foot of a long room, after every control, so it
     read as a caveat on one button rather than as what the room IS. And it
     never said the part that costs somebody a take they loved: the style,
     tempo, key and shape carry over exactly and the PERFORMANCE does not —
     `/v1/music` takes no audio in and has no seed, so there is no way to ask
     for the same one twice.

     The way to keep a performance is to record it, and that is a room, not a
     sentence, so the way there is a button.

     Rendered in both the empty room and the full one. Somebody arriving at a
     Studio with nothing in it yet is exactly who this is for: the moment to
     learn that a take cannot be kept here is before there is one worth
     keeping, not after. */
  /* ── The regeneration notice, behind a fold ───────────────────────────

     It was an amber panel printed open, above the song picker: two
     paragraphs and a button, roughly a phone screen of writing before the
     room's first control.

     Carli, 14 September 2026, with a photograph of it: "Can you make this
     yellow explainer a drop down menu in the studio room?" — which is the
     rule the whole app already follows. `Card` exists because she said
     three times that the rooms show too much at once, and this was the one
     panel exempting itself from that on the grounds of being important.
     Important is what the heading is for.

     The heading has to carry the point on its own, because a fold nobody
     opens must still have said the true thing: "A new take, not an edit" is
     the whole warning in five words.

     And the card itself is yellow. "Maak daai a new take boksie lig geel
     sodat mense dit wel oop maak." Folding it cost the one thing the open
     panel had: colour. Shut, in a row of grey headings, it was the second
     of two identical boxes and read as another setting. The tone is what
     a fold cannot otherwise say — that what is inside is a caution and
     not a control — and it says it before anybody presses.

     The inner box is gone with it. Two ambers, one inside the other, is a
     border drawn twice. The Booth button keeps its own, because it is the
     answer to the warning and belongs where the warning is read. */
  const regenerationNotice = (
    <Card title={t('sec.noticeTitle', 'A new take, not an edit')} tone="amber">
      <div className="space-y-2.5">
        <p className="text-sm leading-relaxed text-amber-200/90">
          {t(
            'sec.newEveryTime',
            'Nothing here edits the file you already have. The style, the tempo, the key and the shape carry over exactly \u2014 the performance does not. Even with nothing changed, a new take sings it differently: the engine takes no recording in and works from no seed, so there is no way to ask for the same one twice.',
          )}
        </p>
        <p className="text-sm leading-relaxed text-amber-200/90">
          {t(
            'sec.keepIt',
            'Want to keep exactly what you are hearing? Record it in the Booth. That is the only way a performance stays yours.',
          )}
        </p>
        {onBooth && (
          <button
            type="button"
            onClick={() => onBooth(track?.title ?? '')}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/15 text-sm font-semibold text-amber-100 hover:bg-amber-500/25 flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            {t('sec.toBooth', 'Take it to the Booth')}
          </button>
        )}
      </div>
    </Card>
  );

  /* Which section cards are folded to their header. Open by default, as
     Google drew them: the words are what the room is for. */
  const [folded, setFolded] = useState<Set<number>>(() => new Set());
  const fold = (index: number): void => {
    setFolded((was) => {
      const next = new Set(was);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  /** The chip colour for a section, cycled so neighbours never match. */
  const chipOf = (index: number): string => CHIPS[index % CHIPS.length];

  if (!usable.length) {
    return (
      <div className="space-y-4" data-studioroom>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6 text-center space-y-2 backdrop-blur-md">
          <Music4 className="w-6 h-6 text-emerald-400 mx-auto" />
          <p className="text-base font-bold text-white">{t('sec.none', 'No song to lay out yet')}</p>
          <Note>{t('sec.noneNote', 'Make a song with words in it and it appears here, in its own sections.')}</Note>
          {/* What the room is, said here too. An empty Studio is still a
              Studio, and somebody standing in it deserves the same sentence as
              somebody with eleven songs in it. */}
          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(
              'sec.whatFor',
              'This is a regeneration room. Move a song’s sections, repeat one, take one out — then send the plan back and a new take is made from it, from the start.',
            )}
          </p>
          <div className="pt-2 text-left">{regenerationNotice}</div>
        </div>
      </div>
    );
  }

  const progress = duration > 0 ? Math.min(100, (at / duration) * 100) : 0;

  return (
    <div className="space-y-5" data-studioroom>
      {/* ── The banner: what this room is, and the one button that makes ──
          Google's page opened on a glass bar with a chip reading
          "Regeneration Room", a sentence, and a gradient button to
          regenerate the full take. The sentence is the room's own, and the
          button is `remake`, which is the only regeneration there is. */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-linear-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-emerald-400">
              {t('sec.roomChip', 'Regeneration Room')}
            </span>
            <p className="text-xs font-medium text-zinc-300">
              {t('sec.whatFor', 'This is a regeneration room. Move a song’s sections, repeat one, take one out — then send the plan back and a new take is made from it, from the start.')}
            </p>
          </div>
          {track && (
            <p className="text-[11px] text-zinc-400">
              {t('sec.editing', 'Editing')} “{track.title}” — {t('sec.stemsNote', 'Stems are separated once and kept on this device beside the song.')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={remake}
          data-regenfull
          className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-cyan-500 px-4 text-xs font-extrabold text-onAccent shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-cyan-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('sec.regenFull', 'Regenerate full take')}</span>
        </button>
      </div>

      {regenerationNotice}

      {/* ── Transport: which song, play, where we are ───────────────────── */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-md" data-studiotransport>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            aria-label={playing ? t('common.pause', 'Pause') : t('common.play', 'Play')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-onAccent shadow-lg shadow-emerald-500/20 transition-transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5">
            <Music4 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <select
              value={track?.id ?? ''}
              onChange={(event) => setChosen(event.target.value)}
              aria-label={t('sec.whichSong', 'Which song?')}
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-white focus:outline-hidden"
            >
              {usable.map((one) => (
                <option key={one.id} value={one.id}>{one.title}</option>
              ))}
            </select>
            <span className="hidden shrink-0 rounded border border-emerald-800/60 bg-emerald-950/80 px-2 py-0.5 font-mono text-[9px] text-emerald-400 sm:inline">
              {clock(duration)} • {parts.length} {t('sec.sections', 'sections')}
            </span>
          </div>
          <div className="flex w-full flex-col text-[11px] sm:w-48">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-zinc-400">
              <span>{clock(at)}</span>
              <span>{clock(duration)}</span>
            </div>
            <button
              type="button"
              aria-label={t('sec.jumpTo', 'Jump to this section')}
              onClick={(event) => {
                const box = event.currentTarget.getBoundingClientRect();
                seek(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * duration);
              }}
              className="h-1.5 w-full cursor-pointer overflow-hidden rounded-full bg-zinc-800"
            >
              <span className="block h-full bg-linear-to-r from-emerald-500 to-cyan-400 transition-all" style={{ width: `${progress}%` }} />
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            seek(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * duration);
          }}
          className="h-20 w-full cursor-pointer rounded-xl border border-white/5"
          style={{ background: peaks ? 'rgba(0,0,0,0.4)' : 'rgba(39,39,42,0.4)' }}
        />

        {/* And the same song as a shape, under its own waveform.
            `docs/MUSIEKDENKE.md` §3.1: the waveform says how loud, the strip
            says what. */}
        <SongForm parts={parts} />

        {track && estimated(track) && (
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'sec.estimated',
              'These sections are worked out from the words — this song did not carry a plan, so the times are close rather than exact. Everything you change here still travels through in full.',
            )}</Note>
        )}
      </div>

      {/* ── 1. The structure: section cards, as Google drew them ────────── */}
      <section className="space-y-3" data-studiosections>
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
            <ListMusic className="h-4 w-4 text-emerald-400" />
            {t('sec.structure', 'Song structure & section lyrics')}
          </h2>
          <button
            type="button"
            onClick={add}
            className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900 px-3 text-xs font-semibold text-emerald-400 transition-all hover:bg-zinc-800 hover:text-emerald-300"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('sec.addSection', 'Add section')}</span>
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          {t('sec.noSectionsYet', 'Nothing to regenerate per section: the engine makes the whole song from the whole plan, so every change here goes into one new take.')}
        </p>

        <div className="space-y-3">
          {parts.map((part, index) => {
            const mark = marks[index];
            const here = mark && at >= mark.start && at < mark.end;
            const shut = folded.has(index);
            const preview = part.lines.find((line) => line.trim()) ?? '';
            return (
              <div
                key={index}
                data-studiosection
                className={`overflow-hidden rounded-2xl border backdrop-blur-md transition-all ${
                  here ? 'border-emerald-500/60 bg-zinc-900/90 shadow-[0_0_25px_rgba(15,157,110,0.25)]' : 'border-white/10 bg-zinc-900/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 bg-zinc-800/60 p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <GripVertical className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                    <input
                      value={part.name}
                      onChange={(event) => {
                        const next = parts.slice();
                        next[index] = { ...part, name: event.target.value };
                        setParts(next);
                      }}
                      aria-label={t('sec.structure', 'Song structure & section lyrics')}
                      className={`w-24 shrink-0 rounded border px-2 py-0.5 font-mono text-xs font-bold focus:outline-hidden sm:w-28 ${chipOf(index)}`}
                    />
                    <span className="hidden min-w-0 truncate text-xs font-semibold text-zinc-300 sm:inline">{preview}</span>
                    <button
                      type="button"
                      onClick={() => mark && seek(mark.start)}
                      title={t('sec.jumpTo', 'Jump to this section')}
                      className="shrink-0 font-mono text-[10px] text-zinc-500 hover:text-emerald-300"
                    >
                      ({mark ? clock(mark.start) : '—'} - {mark ? clock(mark.end) : '—'})
                    </button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} title={t('sec.up', 'Move it earlier')} aria-label={t('sec.up', 'Move it earlier')} className="min-h-[32px] min-w-[32px] rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-25">
                      <ChevronUp className="mx-auto h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => move(index, index + 1)} disabled={index === parts.length - 1} title={t('sec.down', 'Move it later')} aria-label={t('sec.down', 'Move it later')} className="min-h-[32px] min-w-[32px] rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-25">
                      <ChevronDown className="mx-auto h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => again(index)} title={t('sec.again', 'Say it again')} aria-label={t('sec.again', 'Say it again')} className="min-h-[32px] min-w-[32px] rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300">
                      <Copy className="mx-auto h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => drop(index)} disabled={parts.length <= 1} title={t('sec.drop', 'Take it out')} aria-label={t('sec.drop', 'Take it out')} className="min-h-[32px] min-w-[32px] rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-25">
                      <Trash2 className="mx-auto h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => fold(index)} aria-expanded={!shut} aria-label={shut ? t('sec.unfold', 'Unfold') : t('sec.fold', 'Fold')} className="min-h-[32px] min-w-[32px] rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white">
                      {shut ? <ChevronRight className="mx-auto h-3.5 w-3.5" /> : <ChevronDown className="mx-auto h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {!shut && (
                  <div className="space-y-2 border-t border-white/5 bg-zinc-950/50 p-4">
                    <label className="block text-[11px] font-semibold text-zinc-400">{t('sec.lyricsLabel', 'Lyrics')}</label>
                    <textarea
                      value={part.lines.join('\n')}
                      onChange={(event) => {
                        const next = parts.slice();
                        next[index] = { ...part, lines: event.target.value.split('\n') };
                        setParts(next);
                      }}
                      rows={Math.min(8, Math.max(2, part.lines.length))}
                      className="w-full resize-y rounded-xl border border-white/10 bg-zinc-900 p-3 text-xs leading-relaxed text-white focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 2. The stem deck: the song in tracks ─────────────────────────
          Under the structure and above the remake, which is the order the
          work goes in: hear it, take it apart, then change what is said.
          Shut by default — it is a second player and a paid separation,
          and neither should start because somebody opened a room. */}
      {track && (
        <section className="space-y-3 border-t border-white/10 pt-4" data-studiostems>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Waves className="h-4 w-4 text-cyan-400" />
                {t('sec.stemDeck', 'Stem extraction deck')}
              </h2>
              <p className="text-xs text-zinc-400">{t('sec.stemDeckSub', 'Split the voice from everything else, solo or mute either, balance them, and keep the mix as a file.')}</p>
            </div>
            {!lanesOpen && (
              <button
                type="button"
                onClick={() => setLanesOpen(true)}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3.5 text-xs font-semibold text-cyan-400 transition-all hover:bg-zinc-800"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t('sec.lanes', 'Lay it out in tracks')}
              </button>
            )}
          </div>
          {lanesOpen && (
            <Lanes
              trackId={track.id}
              title={track.title}
              audio={playable}
              seconds={peaks?.duration || track.seconds || 0}
              onOpen={() => {
                // One transport at a time. Two players on one song is how a
                // screen ends up playing it twice, slightly apart.
                audioRef.current?.pause();
                setPlaying(false);
              }}
            />
          )}
        </section>
      )}

      <Card title={t('sec.remakeTitle', 'Make it again')}>
        {/* Said here rather than as a slider that does nothing: lengths are not
            carried in the lyric sheet, so a draggable number would be thrown
            away on the way out. */}
        <Note>{t('sec.lengthNote')}</Note>
        <p className="text-sm text-zinc-400 leading-snug">{t('sec.remakeNote')}</p>
        <button
          type="button"
          onClick={remake}
          className="w-full py-3 rounded-xl bg-linear-to-r from-emerald-500 to-cyan-500 text-onAccent font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Sparkles className="w-4 h-4" />
          {t('sec.remake', 'Make a new take with these changes')}
        </button>
      </Card>
    </div>
  );
}
