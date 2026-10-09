'use client';

/**
 * The cutting room's bar, and the panels that come out from behind it.
 *
 * ── What she drew ────────────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Dit is funksioneel nes soos die probooth. Dit moet
 * lyk soos 'n editing kamer. Daar moet nie allerhande buttons wees soos daar nou
 * is nie, alles moet binne een kamer wees en met icons. … Die oorhoofse editing
 * funksies moet heel onder op die hoof bar wees en moet vas wees soos in die
 * probooth en dan van daar af wees funksies op pop waarvan mens kan kies. … Die
 * filters en alles moet pop up fuksies wees van die onderste hoof bar buttons."*
 *
 * So: the same two rows the booth got in September. The upper one is the
 * transport with a desk either side of it; the lower one is the room's own
 * functions as icons. Seven buttons, seven panels, and pressing the one that is
 * open closes it.
 *
 * ── Why this is a re-housing and not new features ────────────────────────
 *
 * Nearly everything in these panels already existed and has since the start of
 * October: the trims, the split, the looks, the words and their face and size
 * and place, the logo, the track under it, the fades, the transitions, the
 * speed. What it did not have was a shape. It was eight cards down one scrolling
 * page, and somebody looking for the looks scrolled past the sound to find them.
 *
 * The same lesson the booth learnt. `BoothDock.tsx` has the longer note.
 *
 * ── Why not simply reuse BoothDock ───────────────────────────────────────
 *
 * Because its desks are hard-coded — six ids about lanes and stems — and making
 * them a parameter would mean one component describing two rooms. The booth does
 * not follow the app's theme and this room does not either, but they are
 * different colours on purpose: the booth is black with a blue line, the cutting
 * room is the FutureBox green. A shared component would have to carry both
 * palettes and both vocabularies to save one grid.
 *
 * `DeskSheet` IS shared — it is the frame around a panel and is the same frame
 * in both rooms.
 */

import React, { useEffect } from 'react';
import {
  Film, FolderOpen, Image as ImageIcon, Music, Pause, Play, Scissors,
  SkipBack, SkipForward, Type, Wand2,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useSideways } from '../lib/sideways';
import DeskSheet from './BoothCard';
import { CUT_LOOK, EDGE, INK, INK_DIM, LIT, PANEL, RAISE, PRESS } from '../lib/cutlook';

/** Which panel is out. `null` is all of them shut. */
export type Bench =
  /* The cutting room's. */
  | 'clip' | 'film' | 'folder' | 'looks' | 'words' | 'sound' | 'mark'
  /* The photo editor's. One union rather than a generic parameter: the ids
     are a closed set either way, and a type that has to be threaded through
     `DeskSheet` and every handler to say the same thing is a cost paid on
     every line for nothing. */
  | 'pic' | 'frame' | 'tone' | 'read' | 'text' | 'save'
  | null;

/* The room's own colours. Green rather than the booth's blue, and literal
   rather than themed, because the cutting room does not follow the theme — the
   same decision, for the same reason, as the booth's black. */
/* The room's colours live in `app/lib/cutlook.ts` now, not here.
 *
 * They were five consts in this file, which was fine while the bar was the
 * only thing painted with them. On 4 October the room became one surface and
 * `DeskSheet` started being handed a palette, so there are two files that need
 * the same green — and two copies of a colour is two colours the first time
 * one of them moves. `cutlook.ts` carries the reasoning for each value,
 * including why INK_DIM went from 0.52 to 0.72. */

export interface BenchSpec {
  readonly id: Exclude<Bench, null>;
  readonly icon: React.ReactNode;
  /** The i18n key and the English, as `t` takes them. */
  readonly label: readonly [string, string];
  readonly what: readonly [string, string];
  /** Something behind this bench spends credits. */
  readonly paid?: boolean;
}

function BenchButton({
  spec,
  open,
  onOpen,
  t,
  tall = false,
  dim = false,
  waiting = false,
}: {
  readonly spec: BenchSpec;
  readonly open: Bench;
  readonly onOpen: (which: Bench) => void;
  readonly t: (key: string, fallback: string) => string;
  readonly tall?: boolean;
  /** Nothing to work on yet, so the panel would open empty. */
  readonly dim?: boolean;
  /**
   * Something is behind this bench that was not there before.
   *
   * For a thing the room has FOUND rather than a thing somebody did: a film
   * that arrived with its lyrics in it, which is an offer on the words bench
   * and otherwise invisible until she happens to open that bench. The same
   * objection as the blur, which was built and then not found.
   */
  readonly waiting?: boolean;
}): React.ReactElement {
  const on = open === spec.id;
  const label = t(spec.label[0], spec.label[1]);
  const what = t(spec.what[0], spec.what[1]);
  return (
    <button
      type="button"
      /* The second press closes it, like the booth's. A panel whose only way
         out is another panel is a panel that has taken the room. */
      onClick={() => onOpen(on ? null : spec.id)}
      aria-pressed={on}
      disabled={dim}
      data-cutbench={spec.id}
      /* The name AND the sentence: a screen reader gets one string, and "Looks"
         on its own is no more use to it than a wand is to an eye. */
      /* The dot below is a dot, and a dot is a colour. Said in the name as
         well, because a mark somebody cannot see is a mark that was not
         made — the same reason the format chips got a fill and not a second
         shade. */
      aria-label={`${label}. ${what}${waiting ? ` ${t('dock.waiting', 'Something new is waiting here.')}` : ''}`}
      title={what}
      /* 46 rather than 52. Her other option, taken as well as the glass:
         *"of dit moet kleiner gesquash word onder"*. Two rows of these plus
         the transport is the whole foot of the room, so six pixels a button
         is twelve pixels of film back on a phone — and 46 is still above
         the 44 this app treats as the floor for a thumb. */
      className={`relative flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 disabled:opacity-35 ${
        tall ? 'w-full' : 'flex-1'
      }`}
      style={{
        background: on ? 'rgba(52,211,153,0.16)' : 'transparent',
        color: on ? LIT : INK_DIM,
      }}
    >
      {spec.icon}
      <span className="w-full truncate text-center text-[10px] font-bold leading-none">{label}</span>
      {waiting && (
        <span
          aria-hidden
          data-cutbenchwaiting={spec.id}
          /* On the left, so it cannot sit on top of the credits mark on a
             bench that is both. */
          className="absolute left-1 top-1 h-2 w-2 rounded-full"
          style={{ background: LIT, boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' }}
        />
      )}
      {spec.paid && (
        <span
          aria-hidden
          className="absolute right-1 top-1 rounded-full px-1 text-[9px] font-black leading-[14px]"
          style={{ background: 'rgba(250,204,21,0.9)', color: '#1c1917' }}
        >
          c
        </span>
      )}
    </button>
  );
}

/** Either side of the transport: the shot you picked, and the whole film. */
const UPPER: readonly BenchSpec[] = [
  {
    id: 'clip',
    icon: <Scissors className="h-5 w-5" />,
    label: ['cut.clip', 'This shot'],
    what: [
      'cut.clipWhat',
      'Where it starts and ends, splitting it in two, a copy of it, how fast it plays, whether it fills the frame, its own sound, and how it comes in after the shot before it.',
    ],
  },
  {
    id: 'film',
    icon: <Film className="h-5 w-5" />,
    label: ['cut.film', 'The film'],
    what: [
      'cut.filmWhat',
      'The shape it comes out in, the fade up at the start and down at the end, and putting the whole thing together.',
    ],
    paid: true,
  },
];

/** The room's own functions, which replace the app's bar while it is open. */
const LOWER: readonly BenchSpec[] = [
  {
    id: 'folder',
    icon: <FolderOpen className="h-5 w-5" />,
    label: ['cut.folder', 'Bring it in'],
    what: [
      'cut.folderWhat',
      'Clips off this device, and everything you have already made in the studio — pick from either and it lands on the clock.',
    ],
  },
  {
    id: 'looks',
    icon: <Wand2 className="h-5 w-5" />,
    label: ['cut.looks', 'Looks'],
    what: ['cut.looksWhat', 'Thirteen looks, applied in your own browser, on the shot you have picked.'],
  },
  {
    id: 'words',
    icon: <Type className="h-5 w-5" />,
    label: ['cut.words', 'Words'],
    what: [
      'cut.wordsWhat',
      'Words over the shot, with a face, a size, a place on the frame, an angle and how solid they are.',
    ],
  },
  {
    id: 'sound',
    icon: <Music className="h-5 w-5" />,
    label: ['cut.sound', 'Sound'],
    what: ['cut.soundWhat', 'A track under the whole film, and whether each shot carries its own sound and how loud.'],
  },
  {
    id: 'mark',
    icon: <ImageIcon className="h-5 w-5" />,
    label: ['cut.mark', 'Your mark'],
    what: ['cut.markWhat', 'Your logo on the film — where it sits, how big, turned, how solid, and whether it goes over the words or under them.'],
  },
];

export default function CutDock({
  open,
  onOpen,
  playing,
  onPlay,
  onSkip,
  place,
  noClip = false,
  waiting = null,
  upper = UPPER,
  lower = LOWER,
  transport: hasTransport = true,
  paidLine,
  children,
}: {
  readonly open: Bench;
  readonly onOpen: (which: Bench) => void;
  readonly playing: boolean;
  readonly onPlay: () => void;
  /** Seconds to move by. Negative is back. */
  readonly onSkip: (by: number) => void;
  /** Where the playhead is, for the open bench's header. */
  readonly place?: string;
  /** Nothing on the clock yet, so "This shot" has nothing to show. */
  readonly noClip?: boolean;
  /**
   * The one bench with something waiting behind it, if any.
   *
   * A prop rather than a field on `BenchSpec`, because the specs are
   * module-level constants shared by two rooms and this changes while
   * somebody is standing in front of it.
   */
  readonly waiting?: Bench;
  /**
   * The benches, so a second room can have this exact bar.
   *
   * Carli, 7 October 2026: *"Die editing tools moet ook onder in 'n bar wees
   * ... Dieselfde met video editor, asook probooth. Pop out bars moet netjies
   * gespasieer wees."* The way to make two rooms space their bars the same is
   * not to space them the same twice; it is for there to be one bar.
   *
   * Both default to the cutting room's own, so its call site did not change
   * and could not drift.
   */
  readonly upper?: readonly BenchSpec[];
  readonly lower?: readonly BenchSpec[];
  /** The play and skip controls. A room with nothing to play has none. */
  readonly transport?: boolean;
  /** What the sheet says above a bench that spends. */
  readonly paidLine?: string;
  readonly children?: React.ReactNode;
}): React.ReactElement {
  const { t } = useLang();
  const here = [...upper, ...lower].find((spec) => spec.id === open);
  const sideways = useSideways();

  /* ── The bench takes half the screen, not all of it ─────────────────────

     `DeskSheet` is `flex-1`, which in the booth is right: a mix desk is about
     sound and the timeline above it can go while you use one.

     A cutting room cannot. Every control in here is about a PICTURE, and a
     panel that hides the picture while you set the words on it is a panel you
     have to close to see what you did. So the sheet is capped and the frame
     stays on the glass above it.

     Capped in `dvh` rather than `vh` because a phone's address bar makes those
     two different numbers, and the one that matters is the screen somebody can
     actually see. */
  const sheet = here ? (
    /* 46dvh rather than 52. The cap exists so the frame stays on the glass
       above the bench, and half the screen of a phone is still most of a
       film — see `GLASS` in `lib/cutlook.ts`, which is the other half of the
       same complaint. */
    <div className="flex min-h-0 max-h-[46dvh] flex-col">
    <DeskSheet
      icon={here.icon}
      title={t(here.label[0], here.label[1])}
      what={t(here.what[0], here.what[1])}
      paid={here.paid}
      paidSays={t('dock.paidSays', 'Some of this costs credits.')}
      paidLine={paidLine ?? t(
        'cut.paidHere',
        'All of the cutting is free. Putting the finished film together is the one press that spends, and it shows the bill before it does.',
      )}
      closeSays={t('cut.shut', 'Close this bench')}
      place={place}
      look={CUT_LOOK}
      /* One column. A bench here is a panel of controls, not the booth's grid
         of little cards — see `single`. */
      single
      onClose={() => onOpen(null)}
    >
      {children}
    </DeskSheet>
    </div>
  ) : null;

  /* Escape shuts the open panel before it shuts the room. Somebody reaching for
     the way out of a sheet should not lose the edit. */
  useEffect(() => {
    if (!open) return undefined;
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onOpen(null);
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, onOpen]);

  const transport = (
    <>
      <button
        type="button"
        onClick={() => onSkip(-5)}
        aria-label={t('dock.back', 'Back five seconds')}
        data-cutback
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
        style={{ color: INK }}
      >
        <SkipBack className="h-5 w-5" fill="currentColor" />
      </button>
      <button
        type="button"
        onClick={onPlay}
        aria-label={playing ? t('dock.pause', 'Pause') : t('dock.play', 'Play')}
        data-cutplay
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: INK, color: '#04120b' }}
      >
        {playing ? (
          <Pause className="h-6 w-6" fill="currentColor" />
        ) : (
          <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
        )}
      </button>
      <button
        type="button"
        onClick={() => onSkip(5)}
        aria-label={t('dock.forward', 'Forward five seconds')}
        data-cutforward
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
        style={{ color: INK }}
      >
        <SkipForward className="h-5 w-5" fill="currentColor" />
      </button>
    </>
  );

  /* ── Held sideways, the bar becomes a rail on the edge ───────────────────

     Carli said it of the booth in September — *"baie mense gaan die dwarsdraai
     wil gebruik, en dan gaan die buttons weer beter werk aan die kant van die
     skerm en nie onder nie"* — and a cutting room is MORE likely to be held
     sideways than a booth, because a wide film is the shape of the screen. */
  if (sideways) {
    return (
      <>
        {sheet}
        <div
          data-cutdock=""
          className="flex-shrink-0 flex flex-col items-center gap-1 overflow-y-auto px-1 py-2"
          style={{ background: PANEL, borderLeft: `1px solid ${EDGE}`, width: 96 }}
        >
          {hasTransport ? (
            <>
              <div className="flex w-full flex-col items-center gap-1">{transport}</div>
              <span className="my-1 h-px w-full flex-shrink-0" style={{ background: EDGE }} />
            </>
          ) : null}
          <div data-cutbenchrow="" className="grid w-full grid-cols-2 gap-1" style={{ background: PANEL }}>
            {[...upper, ...lower].map((spec) => (
              <BenchButton
                key={spec.id}
                spec={spec}
                open={open}
                onOpen={onOpen}
                t={t}
                tall
                dim={spec.id === 'clip' && noClip}
                waiting={spec.id === waiting}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {sheet}
      <div
        data-cutdock=""
        className="flex-shrink-0"
        /* ── Nothing reserved here, and that is deliberate ───────────────
 
           This carried `paddingBottom: barClearance(0)` for an afternoon,
           because the bottom of the icon row was sitting behind the app's tab
           bar and `audit/underbar.mjs` named all five controls that were under
           it. The padding fixed the symptom and the cause was a floor above:
           the room's height was `calc(100dvh - 7.5rem)`, a guess at how much
           sits above it, and the guess was 93 pixels short on a 390x844 phone.
 
           `VideoEditor.tsx` measures that now — its own top, and the bar's own
           height — so the room already ends exactly where the bar begins. The
           padding on top of it was 64 pixels of dead green between this bar and
           that one, which is what the screenshot after the fix showed.
 
           Left as a note rather than deleted silently: a reservation removed
           without a reason tends to come back the next time somebody sees
           something under a bar. */
        style={{ background: PANEL, borderTop: `1px solid ${EDGE}` }}
      >
        {/* ── The transport, with a bench either side ──────────────────── */}
        {/* `px-3`, which is the room's own gutter.
 
            It was `px-2`. Measured at 390 pixels that put the first bench's
            left edge at 8 and the last one's right edge at 382, while the back
            button, the Ask button, the hint and the export all sat at 12 and
            378 — so the bar was four pixels wider than everything above it on
            both sides, which is exactly the kind of thing Carli meant by *"Kyk
            dan mooi dat alles mooi allign en netjies is."* Four pixels is not
            visible as four pixels; it is visible as a bar that does not line
            up with the room. */}
        {/* ── The row is the box ─────────────────────────────────────

            `check:buttonlook` found seven buttons here with no border and no
            fill — these two and the five below. It is right: when the room
            opens no bench is chosen, so nothing is lit, and seven unlit tabs
            with no surface behind them read as captions rather than controls.
            That check exists because exactly that drift happened once before
            to two load-bearing buttons.

            The answer is not a box each — this row replaces the app's own
            bar, and a box per tab would be a second bar, which is why the
            app's five tabs are exempt from that rule too. The answer is what
            the app's bar already does: paint the row. One surface, seven
            tabs on it, the chosen one lit. */}
        <div
          data-cutbenchrow=""
          className={`flex gap-1 px-3 pt-2 ${hasTransport ? 'items-center justify-center' : 'items-stretch'}`}
          style={{ background: PANEL }}
        >
          {/* With a transport, a bench either side of it. Without one — a room
              with nothing to play — the benches share the row evenly, like
              the row below, so the two rows line up instead of one being
              centred around a gap where the play button is not. */}
          {hasTransport ? (
            <>
              <BenchButton spec={upper[0]} open={open} onOpen={onOpen} t={t} dim={noClip} waiting={upper[0].id === waiting} />
              {transport}
              {upper[1] ? <BenchButton spec={upper[1]} open={open} onOpen={onOpen} t={t} waiting={upper[1].id === waiting} /> : null}
            </>
          ) : (
            upper.map((spec) => (
              <BenchButton key={spec.id} spec={spec} open={open} onOpen={onOpen} t={t} waiting={spec.id === waiting} />
            ))
          )}
        </div>

        {/* ── The five, which replace the app's own bar ─────────────────── */}
        <div
          data-cutbenchrow=""
          className="flex items-stretch gap-1 px-3 pb-2 pt-1"
          style={{ background: PANEL }}
        >
          {lower.map((spec) => (
            <BenchButton key={spec.id} spec={spec} open={open} onOpen={onOpen} t={t} waiting={spec.id === waiting} />
          ))}
        </div>
      </div>
    </>
  );
}
