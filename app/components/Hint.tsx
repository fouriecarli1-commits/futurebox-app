'use client';

/**
 * The explanation, out of the way until it is asked for.
 *
 * A phone is a third the width of a laptop, so the same paragraph on it is
 * three times as tall. Five of them stacked before the first button is a wall,
 * and a wall gets skipped — which means the words stop being read at all. That
 * is worse than never having written them.
 *
 * So the sentence goes behind a mark beside the thing it explains.
 *
 * On a desktop a pointer over the mark opens it, the way a tooltip has always
 * worked. On a phone there is no pointer and no hover at all: a hover-only
 * explanation on a touch screen is an explanation nobody can ever read. So a
 * tap opens it, a tap anywhere else closes it, and Escape closes it for a
 * keyboard. The hover is added only where the browser says there is something
 * to hover with, and only after mount — asking the question during render
 * gives one answer on the server and another in the browser, and React tears
 * the page down over it.
 *
 * It opens to whichever side has room. A 240-pixel panel centred on a mark
 * near the right edge of a 390-pixel screen hangs off it, and a phone that
 * scrolls sideways is the fault this component exists to avoid causing.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function Hint({
  children,
  className = '',
}: {
  /** The explanation. Kept as a node so a link inside one still works. */
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  /**
   * How far the panel is pushed sideways to keep it on the screen, in pixels.
   *
   * ── Why a measured shift and not a side ─────────────────────────────
   *
   * It used to be `side`: open to the left of the mark, or to the right of
   * it if the mark sat past the middle of the window. That is a rule about
   * the MARK's position and the thing that hangs off the screen is the
   * PANEL.
   *
   * Carli, 18 September 2026, the Stems desk in the Pro Booth, with the
   * panel running off the right-hand edge: *"Hierdie een description is van
   * die bladsy af."* The mark she pressed is about four tenths of the way
   * across a 390-pixel phone — the left half, so the old rule opened
   * leftwards — and the panel is 240 wide. 164 plus 240 is 404, and the
   * screen ends at 390.
   *
   * So the panel's own edges are worked out and pushed back inside the
   * window. That covers the mark near the right edge, the mark near the
   * left edge, and this one in the middle that fits under neither rule.
   */
  const [shift, setShift] = useState(0);
  /**
   * Which way it opens vertically.
   *
   * It always opened downwards. Near the foot of a phone that puts it behind
   * the transport buttons and then behind the tab bar, which is `fixed
   * bottom-0 z-[95]` — and this panel is `z-50`, so it loses.
   *
   * Carli: "hierdie onderste pop out window moet boontoe beweeg. ondertoe
   * beweeg hy agter die buttons in."
   *
   * The horizontal half of this was already here, and for the same reason: a
   * panel that hangs off the edge is a panel nobody can read. The vertical
   * half was simply missing.
   */
  const [up, setUp] = useState(false);
  const [pointer, setPointer] = useState(false);
  const box = useRef<HTMLSpanElement | null>(null);
  const id = useId();

  useEffect(() => {
    setPointer(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const away = (event: Event) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  /** Roughly how tall the panel gets. Enough to decide which way to open. */
  const TALL = 140;
  /** `w-60`, and `max-w-[70vw]` above it. Both are on the panel below. */
  const WIDE = 240;
  /** What it keeps between itself and the edge of the window. */
  const EDGE = 8;

  const show = () => {
    const at = box.current?.getBoundingClientRect();
    if (at) {
      /* The panel's real width, which is the smaller of the two rules on
         it. Measuring the rendered panel is not possible here — it does
         not exist until `setOpen` below — and guessing high would push a
         panel that fits. */
      const wide = Math.min(WIDE, window.innerWidth * 0.7);
      /* Where its left edge wants to be, and where it is allowed to be. */
      const want = at.left;
      const allowed = Math.max(EDGE, Math.min(want, window.innerWidth - wide - EDGE));
      setShift(Math.round(allowed - want));
      /* Measured against the space that is actually usable, not against the
         viewport. The tab bar owns the bottom strip of every screen in this
         app, so the floor for this decision is above it — otherwise a mark
         with "enough room" by the viewport's reckoning opens into the bar.
         `--tabs` is the same 57 pixels `globals.css` reserves. */
      const bar = document.querySelector('nav.fixed.bottom-0');
      const floor = bar ? bar.getBoundingClientRect().top : window.innerHeight;
      setUp(at.bottom + TALL > floor && at.top - TALL > 0);
    }
    setOpen(true);
  };

  return (
    <span ref={box} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={t('hint.open', 'What this does')}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onMouseEnter={pointer ? show : undefined}
        onMouseLeave={pointer ? () => setOpen(false) : undefined}
        /* Forty-four across, thirty-two to look at.
           The mark was 32x32, which is under the minimum a thumb hits
           reliably and was the smallest pressable thing left in the app.
           Growing the circle would have pushed every row it sits in
           twelve pixels taller — it is beside a line of text in a
           hundred places — so the hit area grows and the negative margin
           gives the layout back exactly what the size took. The same
           trick globals.css uses on standalone links, for the same
           reason. */
        className="inline-flex items-center justify-center w-11 h-11 -m-1.5 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute left-0 z-[96] w-60 max-w-[70vw] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-normal leading-relaxed text-zinc-300 shadow-2xl ${
            up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
          /* Always anchored to the mark and then pushed back onto the
             screen, rather than flipped to one side or the other. See the
             note on `shift`. */
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
        >
          {children}
        </span>
      )}
    </span>
  );
}
