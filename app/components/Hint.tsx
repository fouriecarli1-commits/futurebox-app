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
  const [side, setSide] = useState<'left' | 'right'>('left');
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

  const show = () => {
    const at = box.current?.getBoundingClientRect();
    if (at) setSide(at.left > window.innerWidth / 2 ? 'right' : 'left');
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
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-50 top-full mt-1 w-60 max-w-[70vw] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs font-normal leading-relaxed text-zinc-300 shadow-2xl ${
            side === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
