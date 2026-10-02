/**
 * A control on a desk, and the desk it sits on.
 *
 * ── The fault this repairs ───────────────────────────────────────────────
 *
 * Carli, 15 September 2026: *"die uitspring van funksies moet meer prakties
 * wees, dit moenie in so dun bar uitspring waarin met afscroll nie, dit kan
 * alles weer met icons vervat word wat weer in die skerm in oop maak ... dit
 * moet prakties wees, mooi wees, netjies lyk en dit moet werk."*
 *
 * Measured on a Pixel 5 before this file existed: a desk sheet was capped at
 * `52vh` and pinned above two bars, so it drew between 192 and 378 pixels of
 * a 727-pixel screen — while the timeline above it, with one lane in it, held
 * 350 and showed nothing. The Audio-effects desk had 164 pixels of its own
 * content below its fold. A control somebody has to scroll a 378-pixel window
 * to find is a control they will not find.
 *
 * And each desk opened by printing its name, its whole sentence and, if it
 * had a paid control anywhere in it, two lines of yellow warning. On Audio
 * effects that was nine lines of prose before the first button. The app has
 * had a rule against that since the room-by-room strip-down — explanations go
 * behind a mark — and the desks were written after it and broke it.
 *
 * ── The shape ────────────────────────────────────────────────────────────
 *
 * `DeskSheet` takes the screen above the dock, so a desk has five hundred
 * pixels instead of three hundred, and carries the desk's own header: the
 * icon it was opened by, its name, its sentence behind a mark, its coin if
 * anything in it costs, and a way out.
 *
 * `Card` is one function: an icon, a name, its own mark and coin, and the
 * control itself inside it. A desk is then a grid of them rather than a run
 * of controls, which is what makes it readable at a glance — the thing a
 * mixing desk does that a list does not.
 *
 * Both are here rather than in `BoothDock.tsx` because ProBooth builds the
 * contents and the dock draws the frame, and a card that only one of them can
 * import would end up written twice.
 */
'use client';

import React from 'react';
import { X } from 'lucide-react';
import Hint from './Hint';
import { EDGE, INK, INK_DIM, LIT, PANEL, RAISED, COIN } from '../lib/boothlook';
import type { Look } from '../lib/cutlook';

/** The yellow coin, the same one the dock's icons carry. */
export function Coin({ label }: { readonly label: string }): React.ReactElement {
  return (
    <span
      title={label}
      aria-label={label}
      className="rounded-full px-1 text-[9px] font-black leading-[14px]"
      style={{ background: COIN, color: '#1c1917' }}
    >
      c
    </span>
  );
}

/**
 * One function on a desk.
 *
 * `wide` is for the few that genuinely cannot be half a phone wide — a
 * frequency curve, a list of forty voices, a row of twenty-three instruments.
 * Everything else is half, because two columns is what turns a list into a
 * desk.
 */
export function Card({
  icon,
  title,
  what,
  paid,
  paidSays,
  wide = false,
  children,
}: {
  readonly icon?: React.ReactNode;
  readonly title: string;
  /** The explanation, behind the mark. Not printed. */
  readonly what?: React.ReactNode;
  readonly paid?: boolean;
  /** What the coin says to a screen reader and on hover. */
  readonly paidSays?: string;
  readonly wide?: boolean;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <section
      data-card
      className={`flex min-w-0 flex-col gap-2 rounded-2xl border p-2.5 ${wide ? 'col-span-2' : ''}`}
      style={{ borderColor: EDGE, background: PANEL }}
    >
      {/* ── The name wraps; it does not vanish ─────────────────────

          Carli, 15 September, with a photograph: *"Kyk hoe die woorde nie
          volledig van 'n opsie gesien kan word nie. Dit verdwyn agv plek en
          lengte."*

          "Generate a part" read "Generat…", "Measure the mix" read
          "Measure th…", "Take the rumble off" read "Take the ru…". Two
          columns on a 393-pixel phone is 170 per card, and an icon, a coin
          and a question mark take sixty of them — so `truncate` had about
          a hundred pixels to say anything in.

          A card is a box and a box can be two lines tall. Truncating is for
          a name that must sit on one line beside something else; this one
          has a whole row to itself and no reason to be cut. `items-start`
          so the marks stay level with the first line rather than drifting
          to the middle of a two-line name. */}
      <header className="flex min-w-0 items-start gap-1.5">
        {icon && (
          <span className="mt-px flex-shrink-0" style={{ color: LIT }} aria-hidden>
            {icon}
          </span>
        )}
        <h3 className="min-w-0 flex-1 text-[13px] font-bold leading-tight" style={{ color: INK }}>
          {title}
        </h3>
        {paid && <Coin label={paidSays ?? 'Costs credits'} />}
        {what && <Hint>{what}</Hint>}
      </header>
      {children}
    </section>
  );
}

/**
 * A row inside a card: a label on the left, its control on the right.
 *
 * Wraps rather than squeezes. A phone is 360 pixels wide for a great many
 * people and half of that is 170; a label and a number box that insist on one
 * line at 170 are a label and a number box printed on top of each other,
 * which is a fault this room has had twice.
 */
export function Row({
  label,
  children,
}: {
  readonly label?: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {label && (
        <span className="text-xs" style={{ color: INK_DIM }}>
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * The desk itself: a header and a grid of cards, taking the screen above the
 * dock.
 *
 * The scroll is on the grid and not on the sheet, so the header — which
 * carries the name of the desk you are in and the way out of it — never
 * scrolls away. Somebody three cards down a desk should not have to scroll up
 * to find out how to leave.
 */
export default function DeskSheet({
  icon,
  title,
  what,
  paid,
  paidSays,
  paidLine,
  closeSays,
  place,
  plain,
  look,
  onClose,
  children,
}: {
  readonly icon?: React.ReactNode;
  readonly title: string;
  readonly what?: React.ReactNode;
  readonly paid?: boolean;
  readonly paidSays?: string;
  /**
   * The paid warning, in words, printed under the desk's name.
   *
   * Not behind the mark. The coin beside the title is the mark and a coin is
   * not a sentence: on a phone there is no hover to read its title with, and
   * a screen reader gets it only if it lands on that one span. A desk where
   * something costs money has to say so where the eye already is — which is
   * what `check:boothdock` holds, and rightly.
   *
   * One line, though. It used to be two lines of yellow above two more lines
   * of explanation, on a panel 378 pixels tall.
   */
  readonly paidLine?: string;
  /**
   * One thing filling the sheet, rather than a grid of little control cards.
   *
   * Every desk in the Pro Booth and every bench in the cutting room is the
   * same shape — six or eight cards, each a name and one control — so the
   * body of this sheet is a two-column grid, and that is right for all of
   * them.
   *
   * It is wrong for exactly one thing: the copilot, which the cutting room
   * opens in this frame since 4 October. A conversation is not a control
   * card. Dropped into the grid it became one cell of two, 190 pixels wide
   * on a 390-pixel phone, with its own messages wrapping four words to a
   * line and half the sheet beside it empty.
   *
   * The frame is still worth sharing — the header, the name, the close
   * button and the way it opens are the things somebody learns once and
   * expects everywhere. It is only the body that differs.
   */
  readonly plain?: boolean;
  readonly closeSays: string;
  /**
   * Where the playhead is, in bars and beats.
   *
   * In the header of every desk, because a desk covers the timeline while it
   * is open and the transport under it still plays. Somebody nudging a fader
   * with the song running needs to know which bar they are hearing, and the
   * first version of this made them close the desk to find out.
   */
  readonly place?: string;
  /**
   * The room's colours, for a room that is not the Pro Booth.
   *
   * This frame was written for the booth and imported the booth's palette
   * directly: `RAISED` is `#141826` and `LIT` is `#38bdf8`. The cutting room
   * then started using the frame, which is right — one way to open a panel,
   * one way to close it — and inherited a blue-black body and a sky-blue
   * heading icon inside a room painted green.
   *
   * Carli, 4 October 2026, with photographs: *"die hele kamer moet dieselfde
   * lyk, tot bo."* Measured in a browser the bench body was rgb(20, 24, 38)
   * sitting inside a room painted rgb(5, 24, 15).
   *
   * Passed in rather than imported, and defaulting to the booth's, so the
   * booth needs no change and neither room can quietly take the other's.
   */
  readonly look?: Look;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const paint: Look = look ?? {
    PANEL, RAISED, EDGE, INK, INK_DIM, LIT, COIN,
  };
  return (
    <div data-desk className="flex min-h-0 flex-1 flex-col" style={{ background: paint.RAISED }}>
      <header
        className="flex-shrink-0 border-b px-4 py-3"
        style={{ borderColor: paint.EDGE, background: paint.PANEL }}
      >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="flex-shrink-0" style={{ color: paint.LIT }} aria-hidden>
            {icon}
          </span>
        )}
        <h2 className="min-w-0 flex-1 text-base font-black leading-tight" style={{ color: paint.INK }}>
          {title}
        </h2>
        {place && (
          <span className="flex-shrink-0 text-sm font-bold tabular-nums" style={{ color: paint.LIT }}>
            {place}
          </span>
        )}
        {paid && <Coin label={paidSays ?? 'Costs credits'} />}
        {what && <Hint>{what}</Hint>}
        <button
          type="button"
          onClick={onClose}
          aria-label={closeSays}
          title={closeSays}
          className="-mr-2 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ color: paint.INK_DIM }}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {paid && paidLine && (
        <p className="pt-1 text-[11px] font-bold leading-snug" style={{ color: '#fde047' }}>
          {paidLine}
        </p>
      )}
      </header>

      <div className={`min-h-0 flex-1 overscroll-contain p-3 ${plain ? 'flex flex-col' : 'overflow-y-auto'}`}>
        {plain ? (
          /* One thing, filling the sheet, scrolling itself.
 
             See `plain`. No grid and no `overflow-y-auto` on the wrapper: a
             panel that scrolls its own body inside a box that also scrolls is
             two scrollbars for one list, and the outer one wins the gesture. */
          children
        ) : (
          /* Two columns even on a phone.
 
              One column put four cards on a 727-pixel screen and pushed the
              other three below the fold; two puts eight there. A card is a
              name and one control, and one control does not need 360 pixels
              — the few that genuinely do are marked `wide` and take the row.
              At 360 pixels a column is 166, which is why every `Row` wraps
              rather than squeezes. */
          <div className="grid grid-cols-2 gap-2.5">{children}</div>
        )}
      </div>
    </div>
  );
}
