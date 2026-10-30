'use client';

/**
 * The cutting room's bar, and the panels that come out from behind it.
 *
 * ── What she drew ────────────────────────────────────────────────────────
 *
 * The owner, 4 October 2026: *"Dit is funksioneel nes soos die probooth. Dit moet
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

import React, { useEffect, useState } from 'react';
import {
  ChevronDown, ChevronUp, Film, FolderOpen, Image as ImageIcon, Move, Music, Pause, PersonStanding, Play, Scissors,
  SkipBack, SkipForward, Sparkles, Type, Wand2,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useSideways } from '../lib/sideways';
import { useAtDesk } from '../lib/atdesk';
import DeskSheet from './BoothCard';
import { CUT_LOOK, EDGE, INK, INK_DIM, LIT, PANEL, RAISE, PRESS } from '../lib/cutlook';

/** Which panel is out. `null` is all of them shut. */
export type Bench =
  /* The cutting room's. */
  | 'clip' | 'film' | 'folder' | 'looks' | 'motion' | 'words' | 'sound' | 'mark'
  | 'characters' | 'restyle'
  /* The photo editor's. One union rather than a generic parameter: the ids
     are a closed set either way, and a type that has to be threaded through
     `DeskSheet` and every handler to say the same thing is a cost paid on
     every line for nothing. */
  | 'pic' | 'frame' | 'tone' | 'filters' | 'read' | 'text' | 'save' | 'starts' | 'shapes' | 'magic' | 'layers' | 'grid' | 'cell' | 'charts' | 'alive' | 'pages'
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
  /**
   * A bench whose whole point is the picture changing: on a phone it takes a
   * third of the screen rather than half, so the film and the ruler stay in
   * sight while it is used. The owner, 20 October 2026, of the filters:
   * *"Hierdie filter bar maak dit moeilik om die filters op die video te
   * kyk. Selfs die ruler kan nie links en regs geskuif word nie."*
   */
  readonly low?: boolean;
  /**
   * The opposite of `low`: a bench whose result IS a picture, drawn inside
   * the bench, so on a phone it takes most of the screen rather than a
   * third, and at a desk a wider column. The characters and restyle benches
   * show a character sheet and a before-and-after, and a third of a phone
   * is a picture the size of a stamp.
   */
  readonly tall?: boolean;
  /**
   * What the sheet says above this bench about money, where the room's own
   * line is not true of it. The room's line says the cutting costs nothing,
   * which is right everywhere but the two benches that draw.
   */
  readonly paidLine?: readonly [string, string];
}

function BenchButton({
  spec,
  open,
  onOpen,
  t,
  tall = false,
  slim = false,
  dim = false,
  waiting = false,
}: {
  readonly spec: BenchSpec;
  readonly open: Bench;
  readonly onOpen: (which: Bench) => void;
  readonly t: (key: string, fallback: string) => string;
  readonly tall?: boolean;
  /** A fixed width, for the strip that slides sideways on a phone. */
  readonly slim?: boolean;
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
        tall ? 'w-full' : slim ? 'w-[64px] shrink-0 snap-start' : 'flex-1'
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

/**
 * The benches that work on the picked shot, and open empty without one.
 *
 * "This shot" was dimmed with nothing on the clock and Looks and Words were
 * not, so on an empty room those two opened to a blank panel — a press that
 * looked like it did nothing. All three are about one shot, so all three
 * wait for one.
 */
const NEEDS_A_SHOT: ReadonlySet<Bench> = new Set<Bench>(['clip', 'looks', 'motion', 'words', 'restyle']);

/** Either side of the transport: the shot you picked, and the whole film. */
/** The benches whose controls point at the clock, so the clock must stay in reach. */
const ON_CLOCK: ReadonlySet<Bench> = new Set<Bench>(['clip', 'words', 'motion']);

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
  /* The owner, 22 October 2026 (translated): *"Can we put a studio like that in
     the video editor, so animated characters can be made in the video studio
     and eventually used in the video? … it must be visible everywhere that
     we are the pioneers and forward thinkers."* Next to the way in, so they
     are on the first screen of the bar on a phone rather than at the end of
     a strip nobody slides. */
  {
    id: 'characters',
    icon: <PersonStanding className="h-5 w-5" />,
    /* "Characters", not "3D characters": the phone strip's buttons are 64
       pixels wide and the longer name was cut to "3D chara…" on a 7-inch
       tablet (the owner's store screenshots, 25 October 2026). The bench
       itself still opens under its full name. */
    label: ['cut.characters', 'Characters'],
    what: [
      'cut.charactersWhat',
      'Characters in a 3D look, drawn by AI from your words — animated film, game hero, claymation, android, hologram — kept in your cast and made to move in a shot.',
    ],
    paid: true,
    tall: true,
    paidLine: ['cut.paidFuture', 'Drawing costs credits, and every button that draws or makes a shot says its price on it.'],
  },
  {
    id: 'restyle',
    icon: <Sparkles className="h-5 w-5" />,
    label: ['cut.restyle', 'AI restyle'],
    what: [
      'cut.restyleWhat',
      'The frame you are on, redrawn in a world of the future, and a new shot made from it that lands next to the original.',
    ],
    paid: true,
    tall: true,
    paidLine: ['cut.paidFuture', 'Drawing costs credits, and every button that draws or makes a shot says its price on it.'],
  },
  {
    id: 'looks',
    icon: <Wand2 className="h-5 w-5" />,
    /* "Filters", not "Looks": the owner, 20 October 2026, "Looks moet
       eintlik filters wees." The id stays `looks` — the probes and the
       bench are keyed on it. */
    label: ['cut.looks', 'Filters'],
    low: true,
    what: ['cut.looksWhat', 'Colour filters and effect filters, applied in your own browser, on the shot you have picked.'],
  },
  /* The owner, 17 October 2026, about another program's motion effects: *"Die
     effects … kan ook cool wees."* `lib/videomotion.ts`. */
  {
    id: 'motion',
    icon: <Move className="h-5 w-5" />,
    label: ['cut.motion', 'Motion'],
    what: ['cut.motionWhat', 'The picture itself moving — a push in, a pan, a shake, a spin in — or keyframes of your own.'],
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

/** The cutting room's benches, for a rail of their own beside the picture. */
export function cutBenches(): readonly BenchSpec[] {
  return [...UPPER, ...LOWER];
}

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
   * The owner, 7 October 2026: *"Die editing tools moet ook onder in 'n bar wees
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
  /* What a bench is, said for a moment when it is opened. The owner, 27
     October 2026: *"alles baie baie klein buttons en wanneer mens op die
     kliek kan daar descriptions wys"*. The descriptions live here, for a
     moment, instead of under every control. */
  const [benchSay, setBenchSay] = useState<{ readonly label: string; readonly what: string; readonly n: number } | null>(null);
  useEffect(() => {
    if (!benchSay) return undefined;
    const gone = window.setTimeout(() => setBenchSay(null), 2000);
    return () => window.clearTimeout(gone);
  }, [benchSay]);
  /* A bench tucked down to one button: the tool stays on, the film gets
     the screen. The owner, 27 October 2026: *"The photo editor fix has to
     be a video editor fix as well."* Opening another bench opens it. */
  const [tucked, setTucked] = useState(false);
  useEffect(() => { setTucked(false); }, [open]);
  const openSaying = (which: Bench): void => {
    const spec = [...upper, ...lower].find((one) => one.id === which);
    setBenchSay(spec && which !== open
      ? (was) => ({ label: t(spec.label[0], spec.label[1]), what: t(spec.what[0], spec.what[1]), n: (was?.n ?? 0) + 1 })
      : null);
    onOpen(which);
  };
  const { t } = useLang();
  const here = [...upper, ...lower].find((spec) => spec.id === open);
  const sideways = useSideways();
  /* ── Two ways to be wider than you are tall ─────────────────────────────

     The owner, 9 October 2026: *"Die website moet nie lyk soos 'n foon app
     nie."*

     She is looking at this bar. A desktop browser was getting the layout
     drawn for a thumb — a row of icons across the foot and a panel over the
     film — because the only question this room asked was whether a PHONE had
     been turned on its side, and `lib/sideways.ts` excludes a mouse on
     purpose.

     The rail it switches to is already the right answer for a desk; it was
     simply never offered one. So the branch below is reached by either
     question, and `atDesk` is kept separately from `edge` for the two places
     where a desk has room a turned phone does not: the rail can afford a
     column instead of two cramped ones, and the panel can be a panel rather
     than a capped sheet. `lib/atdesk.ts` carries why the two queries cannot
     both be true. */
  const atDesk = useAtDesk();
  const edge = sideways || atDesk;

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
    <div
      /* Capped only where the cap buys something. On a phone the panel is
         OVER the film and half the screen is the compromise — her complaint
         on 8 October was that the panels *"belemmer die view van die
         video"*. On an edge it is BESIDE the film, so there is nothing to
         trade and a cap would throw away a screen for a reason that does
         not apply. `check:lessenaar` holds that there is one cap and not
         two. */
      /* 400 at a laptop, 520 past 1536. On her 1563-wide screen the picture
         bench is a 2,365-pixel column in a 700-pixel window with an empty
         canvas half the screen wide beside it — "kyk hoe sny alles af op die
         rekenaar se skerm". A wider column is the cheapest honest fix: the
         same controls, a third less scrolling, and nothing moved. */
      className={`flex min-h-0 flex-col ${edge ? 'h-full' : 'max-h-[50dvh]'} ${
        atDesk ? (here.tall ? 'w-[440px] shrink-0 2xl:w-[560px]' : 'w-[400px] shrink-0 2xl:w-[520px]') : ''
      }`}
      style={atDesk
        ? { borderLeft: `1px solid ${EDGE}` }
        : here.low && !edge ? { maxHeight: '30dvh' }
          : here.tall && !edge ? { maxHeight: '64dvh' } : undefined}
    >
    <DeskSheet
      icon={here.icon}
      title={t(here.label[0], here.label[1])}
      what={t(here.what[0], here.what[1])}
      paid={here.paid}
      paidSays={t('dock.paidSays', 'Some of this costs credits.')}
      paidLine={here.paidLine ? t(here.paidLine[0], here.paidLine[1]) : paidLine ?? t(
        'cut.paidHere',
        'All of the cutting uses no credits. Putting the finished film together is the one press that spends, and it shows the bill before it does.',
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ color: INK }}
      >
        <SkipBack className="h-5 w-5" fill="currentColor" />
      </button>
      <button
        type="button"
        onClick={onPlay}
        aria-label={playing ? t('dock.pause', 'Pause') : t('dock.play', 'Play')}
        data-cutplay
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ color: INK }}
      >
        <SkipForward className="h-5 w-5" fill="currentColor" />
      </button>
    </>
  );

  /* ── Held sideways, the bar becomes a rail on the edge ───────────────────

     The owner said it of the booth in September — *"baie mense gaan die dwarsdraai
     wil gebruik, en dan gaan die buttons weer beter werk aan die kant van die
     skerm en nie onder nie"* — and a cutting room is MORE likely to be held
     sideways than a booth, because a wide film is the shape of the screen. */
  /* The handle: above a floating bench, as a small pill over the film's
     foot; above a bench under the clock, as a slim row. Tucked, it is the
     one button left, just above the tools. */
  const tuck = (where: 'float' | 'inline'): React.ReactElement => (
    <button
      type="button"
      data-cuttuck={tucked ? 'down' : 'up'}
      aria-expanded={!tucked}
      onClick={() => setTucked((was) => !was)}
      className={`z-30 inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-4 text-[12px] font-bold ${where === 'float' ? 'absolute left-1/2 -translate-x-1/2' : 'mx-auto my-1 shrink-0'}`}
      style={{
        background: 'rgba(10,12,16,0.82)',
        color: INK,
        boxShadow: `0 0 0 1px ${EDGE}`,
        ...(where === 'float' ? { bottom: tucked ? 8 : 'calc(50dvh + 6px)' } : {}),
      }}
    >
      {tucked ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      {tucked ? t('cut.tuckShow', 'Show the tool') : t('cut.tuckHide', 'Hide, to see the film')}
    </button>
  );

  if (edge) {
    return (
      <>
        {sheet}
        <div
          data-cutdock=""
          className="shrink-0 flex flex-col items-center gap-1 overflow-y-auto px-1 py-2"
          /* Wider at a desk, because there is width to spend and the labels
             under the icons are the only thing naming what a bench does. 96
             is the turned phone's, where height is what is scarce and the
             two columns below are what keeps seven buttons on the screen. */
          style={{ background: PANEL, borderLeft: `1px solid ${EDGE}`, width: atDesk ? 120 : 96 }}
        >
          {hasTransport ? (
            <>
              <div className="flex w-full flex-col items-center gap-1">{transport}</div>
              <span className="my-1 h-px w-full shrink-0" style={{ background: EDGE }} />
            </>
          ) : null}
          <div
            data-cutbenchrow=""
            /* One column at a desk: seven buttons down 120 pixels is a
               toolbar, and two columns of 60 is where a label truncates to
               nothing. Two sideways, where the screen is 390 tall and seven
               in a line would not fit. */
            className={`grid w-full gap-1 ${atDesk ? 'grid-cols-1' : 'grid-cols-2'}`}
            style={{ background: PANEL }}
          >
            {[...upper, ...lower].map((spec) => (
              <BenchButton
                key={spec.id}
                spec={spec}
                open={open}
                onOpen={openSaying}
                t={t}
                tall
                dim={noClip && NEEDS_A_SHOT.has(spec.id)}
                waiting={spec.id === waiting}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  /* ── On a phone: one slim bar that slides sideways ─────────────────────

     The owner, 20 October 2026: *"Kan alles nie baie easier lyk as nou al
     die heavy balke nie. Dit kon maklik in 'n links en regs sliding bar
     wees … Ons moet die app funksioneel, modern, eenvoudig en maklik laat
     lyk."*

     It was two rows — the transport with a bench either side, then the five
     — and the two rows together were the heaviest thing on the screen
     after the picture. Now it is the photo editor's foot, which she already
     approved there: play first, then every bench in one strip that scrolls
     sideways. One row, so the picture and the clock get the height back. */
  return (
    <>
      {/* ── The bench floats over the film on a phone ─────────────────────
          The owner, 23 October 2026, after the photo editor's panel was
          docked solid: *"Die video editor se funksies moet dalk meer in die
          skerm in kom, die agtergrond moet weg, en die buttons moet bietjie
          deurskynend wees."* So here, and only here, the bench is not a
          panel in the column: it stands over the film from the bar up to
          just past the middle of the screen, with no floor behind it, and
          each control is a slightly see-through tile (`[data-cutfloat]` in
          globals.css). A zero-height anchor above the bar is what it hangs
          from, so the film and the clock keep the whole column. */}
      {/* Not the benches that work ON the clock. Words are dragged to their
          place on the lane, a clip is split where the playhead stands, and
          motion's keyframes sit on the ruler — a bench floating over the
          lane would cover the very thing the finger has to reach. Those
          three keep the capped sheet under the clock; the rest float. */}
      {sheet && open && ON_CLOCK.has(open) ? (
        <>
          {tuck('inline')}
          <div className={tucked ? 'hidden' : 'contents'}>{sheet}</div>
        </>
      ) : sheet ? (
        <div className="relative shrink-0">
          {/* A third of the screen, not half: the film above it is what
              is being worked on (27 October 2026). */}
          <div data-cutfloat="" className={`absolute inset-x-0 bottom-0 z-20 h-[50dvh] flex-col ${tucked ? 'hidden' : 'flex'}`}>
            {sheet}
          </div>
          {tuck('float')}
        </div>
      ) : null}
      <div
        data-cutdock=""
        className="relative flex shrink-0 items-center gap-1 px-3"
        style={{ background: PANEL, borderTop: `1px solid ${EDGE}` }}
      >
        {benchSay && (
          <div key={benchSay.n} className="pointer-events-none absolute inset-x-0 bottom-full z-40 mb-2 flex justify-center px-4" data-cutbenchsay>
            <p role="status" className="fb-nudge max-w-sm rounded-2xl border border-emerald-400/50 bg-zinc-950/90 px-4 py-2 text-center shadow-lg backdrop-blur">
              <span className="block text-[13px] font-bold text-emerald-100">{benchSay.label}</span>
              <span className="mt-0.5 line-clamp-1 block text-[12px] leading-snug text-zinc-300">{benchSay.what}</span>
            </p>
          </div>
        )}
        {hasTransport ? (
          <div className="flex shrink-0 items-center" data-cuttransport>
            {transport}
          </div>
        ) : null}
        {hasTransport ? <span aria-hidden className="h-8 w-px shrink-0" style={{ background: EDGE }} /> : null}
        {/* sideways on purpose: the owner asked for exactly this bar. */}
        <div
          data-cutbenchrow=""
          data-sideways
          className="flex min-w-0 flex-1 snap-x flex-nowrap items-stretch gap-1 overflow-x-auto py-1.5"
          style={{ background: PANEL }}
        >
          {[...upper, ...lower].map((spec) => (
            <BenchButton
              key={spec.id}
              spec={spec}
              open={open}
              onOpen={openSaying}
              t={t}
              slim
              dim={noClip && NEEDS_A_SHOT.has(spec.id)}
              waiting={spec.id === waiting}
            />
          ))}
        </div>
      </div>
    </>
  );
}
