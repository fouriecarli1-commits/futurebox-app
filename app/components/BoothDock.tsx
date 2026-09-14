'use client';

/**
 * The booth's two bars, and the panels that come out from behind them.
 *
 * ── What she drew ────────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Bo op die 4 buttons heel onder is 'n tweede
 * button bar, wat in die middel 'n play/pause button het, back en forward, en
 * links en regs van dit is Track control icon en mix/master icon, en daaruit
 * pop al die netjiese funksies op. … Vier icon buttons heel onder wat netjies
 * die funksies uit pop, en as jy weer op buttons druk pop dit terug. (daai
 * buttons vervang die harde buttons van die hele app, dan val daai hele bar
 * van die app in die booth weg, let wel, links heel bo moet dan darem 'n back
 * icon wees om uit die booth te kom)"*
 *
 * So: two rows. The upper one is the transport with the two desks either side
 * of it. The lower one is four rooms of its own. Six buttons, six panels, and
 * pressing the one that is open closes it.
 *
 * ── Why this is a re-housing and not new features ───────────────────────
 *
 * Nearly everything she listed already exists in the booth and has for weeks
 * — the tempo, the key, the count-in, the snap, the metronome, the
 * subdivision, the mute and solo and pan, the mix reading, the loudness
 * match, taking the rumble and the room off, the drive and the speaker, the
 * stem split, generating a part, changing the voice on a lane. What it did
 * not have was a shape: it was one long page of strips, and a musician
 * looking for the count-in scrolled for it.
 *
 * The panels here are the same panels. What changed is that the room is a
 * timeline with a desk under it instead of a list of every control at once.
 *
 * ── The app's own tab bar ────────────────────────────────────────────────
 *
 * It goes. Two rows of buttons under a third row of buttons is three rows of
 * buttons, and the bottom one belongs to a different application. `ownScreen`
 * in `app/lib/fullroom.ts` is how the page above is told; the back icon at
 * the top left of the room is the replacement, and it was already there.
 *
 * ── The look ─────────────────────────────────────────────────────────────
 *
 * Literal colours, like the timeline: *"die booth se swart met die blou
 * musieklyn sal 'n unieke take wees vir die booth, dat dit heeltemal anders
 * lyk as die res van die app."* The booth does not follow the theme, on
 * purpose, and `check:boothline` holds that.
 */

import React, { useEffect } from 'react';
import {
  Bot, Layers, Mic2, Pause, Play, SkipBack, SkipForward, Sliders, Waves, Wand2,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useSideways } from '../lib/sideways';

/** Which panel is out. `null` is all of them shut. */
export type Desk = 'tracks' | 'mix' | 'effects' | 'stems' | 'voice' | 'ai' | null;

const PANEL = '#0b0d14';
const EDGE = 'rgba(255,255,255,0.08)';
const INK = '#eef2ff';
const INK_DIM = 'rgba(238,242,255,0.5)';
const LIT = '#38bdf8';

/**
 * What each desk is, and whether anything behind it spends credits.
 *
 * ── Why the sentence is here and not in a tooltip ───────────────────────
 *
 * Carli, 14 September 2026: *"Maak ook seker dat knoppies pop-ups het wat sê
 * wat 'n funksie is, en maak seker betaalde funksies word uitgewys."*
 *
 * Six icons in two rows is six pictures, and a picture of a wand does not
 * say what a wand does. A `title` attribute would be the cheap answer and it
 * is the wrong one: nothing hovers on a phone, which is the device this room
 * was rebuilt for. So the sentence is drawn — on the button while its panel
 * is open, and under the mark beside it before that — and `title` is kept as
 * well, for the pointer that does hover.
 *
 * ── And what it costs, before it is pressed ─────────────────────────────
 *
 * `paid` marks a desk where something behind it spends credits. It is drawn
 * as a chip on the button itself rather than only inside the panel, because
 * "find out it costs money once you are already in there" is the shape of
 * complaint this app has had before. It says *some* of it costs, not all:
 * the stems panel also holds free controls, and promising otherwise on the
 * button would be its own small lie. The exact price is on the control that
 * charges it — `Cost` does that, and those are already there.
 */
interface DeskSpec {
  readonly id: Exclude<Desk, null>;
  readonly icon: React.ReactNode;
  /** The i18n key and the English, as `t` takes them. */
  readonly label: readonly [string, string];
  readonly what: readonly [string, string];
  /** Something behind this desk spends credits. */
  readonly paid?: boolean;
}

function DeskButton({
  spec,
  open,
  onOpen,
  t,
  tall = false,
}: {
  readonly spec: DeskSpec;
  readonly open: Desk;
  readonly onOpen: (which: Desk) => void;
  readonly t: (key: string, fallback: string) => string;
  /** In the side rail rather than the bottom bars: full width, stacked. */
  readonly tall?: boolean;
}): React.ReactElement {
  const on = open === spec.id;
  const label = t(spec.label[0], spec.label[1]);
  const what = t(spec.what[0], spec.what[1]);
  return (
    <button
      type="button"
      /* The second press closes it. "as jy weer op buttons druk pop dit
         terug" — a panel with no way back out of it but another panel is a
         panel that has taken the room. */
      onClick={() => onOpen(on ? null : spec.id)}
      aria-pressed={on}
      /* The name AND the sentence, because a screen reader gets one string
         and "Stems" on its own is no more use to it than the icon is to an
         eye. The price warning is part of it for the same reason. */
      aria-label={spec.paid ? `${label}. ${what} ${t('dock.paidSays', 'Some of this costs credits.')}` : `${label}. ${what}`}
      title={what}
      className={`relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 ${
        tall ? 'w-full' : 'flex-1'
      }`}
      style={{
        background: on ? 'rgba(56,189,248,0.16)' : 'transparent',
        color: on ? LIT : INK_DIM,
      }}
    >
      {spec.icon}
      <span className="w-full truncate text-center text-[10px] font-bold leading-none">{label}</span>
      {/* The coin. Small, and on every theme the same, because this room
          does not follow the theme — see the note at the top. */}
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

const UPPER: readonly DeskSpec[] = [
  {
    id: 'tracks',
    icon: <Sliders className="h-5 w-5" />,
    label: ['dock.tracks', 'Track controls'],
    what: [
      'dock.tracksWhat',
      'The tempo, the key, the time signature, the click and the grid — and, for the lane you have picked, its level, where it sits left to right, its mute and its solo.',
    ],
  },
  {
    id: 'mix',
    icon: <Waves className="h-5 w-5" />,
    label: ['dock.mix', 'Mix & master'],
    what: [
      'dock.mixWhat',
      'Measure the mix and match its loudness, so what comes out of here is as loud as anything else somebody plays after it.',
    ],
  },
];

const LOWER: readonly DeskSpec[] = [
  {
    id: 'effects',
    icon: <Wand2 className="h-5 w-5" />,
    label: ['dock.effects', 'Audio effects'],
    what: [
      'dock.effectsWhat',
      'Record a take, shape a lane’s tone, run it through an amp, and mix everything down into one song.',
    ],
    /* Taking the room off a lane is a paid one, and it lives in here. */
    paid: true,
  },
  {
    id: 'stems',
    icon: <Layers className="h-5 w-5" />,
    label: ['dock.stems', 'Stems'],
    what: [
      'dock.stemsWhat',
      'Split a lane into its parts — drums, bass, voice — or have a new part played for you: eight bars of something, in this song’s key and tempo.',
    ],
    paid: true,
  },
  {
    id: 'voice',
    icon: <Mic2 className="h-5 w-5" />,
    label: ['dock.voice', 'Voice'],
    what: ['dock.voiceWhat', 'Sing a lane again in somebody else’s voice, keeping your own timing and phrasing.'],
    paid: true,
  },
  {
    id: 'ai',
    icon: <Bot className="h-5 w-5" />,
    label: ['dock.ai', 'Copilot'],
    what: ['dock.aiWhat', 'Ask what to change about the mix, and have it changed for you.'],
  },
];

export default function BoothDock({
  open,
  onOpen,
  playing,
  onPlay,
  onSkip,
  children,
}: {
  readonly open: Desk;
  readonly onOpen: (which: Desk) => void;
  readonly playing: boolean;
  readonly onPlay: () => void;
  /** Seconds to move by. Negative is back. */
  readonly onSkip: (by: number) => void;
  /** The open panel's contents. Nothing when nothing is open. */
  readonly children?: React.ReactNode;
}): React.ReactElement {
  const { t } = useLang();
  /** The open desk's own row, for the sentence above its controls. */
  const here = [...UPPER, ...LOWER].find((spec) => spec.id === open);

  /* Held sideways, the two bars become a rail on the edge. See the note by
     the rail below, and `app/lib/sideways.ts` for why the test is how the
     device is held rather than how wide it is. */
  const sideways = useSideways();

  /**
   * What this desk is, and what it costs — drawn above whatever it holds.
   *
   * Carli: *"Maak ook seker dat knoppies pop-ups het wat sê wat 'n funksie
   * is, en maak seker betaalde funksies word uitgewys."*
   *
   * Drawn rather than hovered: nothing hovers on a phone, and this room was
   * rebuilt for a phone. One copy rather than one per layout, because two
   * copies is how the rail and the bars come to say different things.
   */
  const sheetHead = here ? (
    <div className="px-4 pb-1 pt-3">
      <p className="text-xs font-black uppercase tracking-wide" style={{ color: LIT }}>
        {t(here.label[0], here.label[1])}
      </p>
      <p className="pt-0.5 text-xs leading-snug" style={{ color: INK_DIM }}>
        {t(here.what[0], here.what[1])}
      </p>
      {here.paid && (
        <p className="pt-1 text-xs font-bold leading-snug" style={{ color: '#fde047' }}>
          {t(
            'dock.paidHere',
            'Some of what is in here spends credits. Every control that does says what it costs before it runs.',
          )}
        </p>
      )}
    </div>
  ) : null;

  /* Escape shuts the open panel before it shuts the room. Somebody with a
     keyboard reaching for the way out of a sheet should not lose the take. */
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onOpen(null);
      }
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, onOpen]);

  /* ── Sideways, the controls go to the edge ─────────────────────────

     Carli, 14 September 2026: *"Die booth moet asb op die dwars draai
     funksie van 'n foon en tablet getoets word. Want baie mense gaan die
     dwarsdraai wil gebruik, en dan gaan die buttons weer beter werk aan die
     kant van die skerm en nie onder nie."*

     A phone turned sideways is about 390 pixels tall. These two rows are
     130 of them and the header and readout another 110, which would leave
     the timeline — the thing the room is for — about 150 pixels for every
     lane it has. Sideways there is width to spare and no height at all, so
     the controls belong on the edge, where there is room and where the
     thumbs already are.

     Same buttons, same panels, same rules. Only the direction changes, and
     `useSideways` decides it by how the device is held rather than by a
     width somebody picked. */
  const rail = (
    <div
      className="flex h-full flex-shrink-0 flex-row"
      style={{ background: PANEL, borderLeft: `1px solid ${EDGE}` }}
    >
      {/* The panel, to the LEFT of the rail — between the timeline and the
          buttons rather than over either. A sheet that covered the lanes
          would hide the thing every one of these controls is about. */}
      {open && (
        <div
          className="w-[min(60vw,380px)] overflow-y-auto overscroll-contain"
          style={{ borderRight: `1px solid ${EDGE}` }}
        >
          {sheetHead}
          {children}
        </div>
      )}

      {/* Two columns of icons, not one.

          A phone held sideways is about 290 CSS pixels tall. One column
          costs 52 of them per icon, so six icons and a transport need 450 —
          and the first version of this rail put three on the screen and the
          other three below the fold of an 84-pixel-wide column nothing says
          scrolls. Stems, Voice and Copilot were simply gone. Two columns of
          three fit the six in 164 pixels, and the transport laid out across
          instead of down costs 48 rather than 110.

          The tablet has the height to spare and gets the same shape anyway:
          the rail is a grid of six either way, and a layout that rearranges
          itself between two devices somebody owns both of is a layout they
          have to learn twice. */}
      <div
        /* Named for `audit/probooth.mjs`, which has to answer "are the
           controls down the side or across the bottom" and was climbing
           from the play button to the nearest `flex-shrink-0` — which the
           transport row below is one of, so it measured a 144×48 strip and
           called the rail a bar. Both shapes carry the attribute, so the
           probe measures the same thing in each. */
        data-dock=""
        className="flex w-[156px] flex-shrink-0 flex-col items-center gap-1 overflow-y-auto px-1.5 py-2"
        style={{ paddingRight: 'max(6px, env(safe-area-inset-right))' }}
      >
        {/* The transport at the top of the rail, where a thumb reaching
            round the corner of a held phone lands first. */}
        <div className="flex w-full flex-shrink-0 items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onSkip(-5)}
            aria-label={t('dock.back', 'Back five seconds')}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ color: INK }}
          >
            <SkipBack className="h-5 w-5" fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={onPlay}
            aria-label={playing ? t('dock.pause', 'Pause') : t('dock.play', 'Play')}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: INK, color: '#05060a' }}
          >
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onSkip(5)}
            aria-label={t('dock.forward', 'Forward five seconds')}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
            style={{ color: INK }}
          >
            <SkipForward className="h-5 w-5" fill="currentColor" />
          </button>
        </div>

        <span className="my-1 h-px w-full flex-shrink-0" style={{ background: EDGE }} />

        <div className="grid w-full grid-cols-2 gap-1">
          {[...UPPER, ...LOWER].map((spec) => (
            <DeskButton key={spec.id} spec={spec} open={open} onOpen={onOpen} t={t} tall />
          ))}
        </div>
      </div>
    </div>
  );

  if (sideways) return rail;

  return (
    <div data-dock="" className="flex-shrink-0" style={{ background: PANEL, borderTop: `1px solid ${EDGE}` }}>
      {/* ── The panel ─────────────────────────────────────────────────

          Above the bars rather than over the room, so the timeline stays
          visible while a control is being set: every one of these changes
          what the next take sounds like or where it lands, and a panel that
          hides the thing it is about makes you close it to see the effect.

          Capped and scrollable — the tone drawer alone is taller than a
          phone. */}
      {open && (
        <div
          className="max-h-[52vh] overflow-y-auto overscroll-contain"
          style={{ borderBottom: `1px solid ${EDGE}` }}
        >
          {sheetHead}
          {children}
        </div>
      )}

      {/* ── The transport, with a desk either side ────────────────────── */}
      <div className="flex items-center justify-center gap-1 px-2 pt-2">
        <DeskButton spec={UPPER[0]} open={open} onOpen={onOpen} t={t} />

        <button
          type="button"
          onClick={() => onSkip(-5)}
          aria-label={t('dock.back', 'Back five seconds')}
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: INK }}
        >
          <SkipBack className="h-5 w-5" fill="currentColor" />
        </button>
        <button
          type="button"
          onClick={onPlay}
          aria-label={playing ? t('dock.pause', 'Pause') : t('dock.play', 'Play')}
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: INK, color: '#05060a' }}
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
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ color: INK }}
        >
          <SkipForward className="h-5 w-5" fill="currentColor" />
        </button>

        <DeskButton spec={UPPER[1]} open={open} onOpen={onOpen} t={t} />
      </div>

      {/* ── The four, which replace the app's own bar ─────────────────── */}
      <div
        className="flex items-stretch gap-1 px-2 pb-2 pt-1"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {LOWER.map((spec) => (
          <DeskButton key={spec.id} spec={spec} open={open} onOpen={onOpen} t={t} />
        ))}
      </div>
    </div>
  );
}
