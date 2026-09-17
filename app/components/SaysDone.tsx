'use client';

/**
 * A button that says what it did, on itself.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 16 September 2026: *"Met elke relevante button waar dit sal sin
 * maak, moet dit darem 'n vinnige status update gee. Soos in live room. As
 * mens dit post, dan moet die button sê posted."*
 *
 * Read as a description of the live room that was not true yet. Both of its
 * Post buttons went grey while the request was out and came back saying
 * "Post it" — the same words as before the press, on a row whose only other
 * change was somewhere else on the page. On a phone that is a press with no
 * answer, and the honest thing to do about a press with no answer is press
 * it again.
 *
 * ── Why the label and not a message ──────────────────────────────────────
 *
 * A notice elsewhere on the screen is a notice under a thumb. The button is
 * where the eye already is because it is where the finger just was, so the
 * state goes on the button: post it, posting, posted.
 *
 * A spinner on its own is not enough either. It says something is happening
 * and it cannot say what happened — it disappears, and what it leaves behind
 * is the screen from before the press.
 *
 * ── `again`, and why the default is to stay done ─────────────────────────
 *
 * Some of these are once. Posting the same song twice makes two rows and the
 * room offers it twice, which reads as a fault in the room; keeping the same
 * clip twice makes a second copy in the bucket. So the default is that done
 * stays done and the button stays disabled, which is the state AND the
 * guard in one.
 *
 * Others are naturally repeatable — copying a link, saving a file. Those
 * pass `again`, in milliseconds, and the button goes back to ready after it
 * so a second copy is possible. Long enough to be read: two seconds is
 * about the floor for a word somebody was not expecting.
 *
 * ── What a failure does ──────────────────────────────────────────────────
 *
 * Goes back to ready, and says nothing itself. `onDo` returning false means
 * the caller has taken the refusal and is showing it — the live room has one
 * message line for the whole room, and a second copy of it inside the button
 * would be two places to read the same failure. A button that said "failed"
 * and then cleared would leave somebody with no reason at all.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

export default function SaysDone({
  onDo,
  icon,
  label,
  busyLabel,
  doneLabel,
  className,
  disabled,
  again,
  title,
}: {
  /**
   * The thing to do. `false` means it did not happen and the caller is
   * saying why; `true` or nothing means it did.
   */
  readonly onDo: () => Promise<boolean | void>;
  readonly icon?: React.ReactNode;
  readonly label: string;
  readonly busyLabel: string;
  readonly doneLabel: string;
  readonly className?: string;
  readonly disabled?: boolean;
  /** Milliseconds before it can be pressed again. Absent means never. */
  readonly again?: number;
  readonly title?: string;
}): React.ReactElement {
  const [state, setState] = useState<'ready' | 'busy' | 'done'>('ready');
  /* Whether this button is still on the screen. A press whose request
     outlives the panel it was in would otherwise set state on a component
     React has already thrown away — which is a warning in development and a
     leak of the timer below in every build. */
  const here = useRef(true);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const press = async (): Promise<void> => {
    if (state !== 'ready' || disabled) return;
    setState('busy');
    let went: boolean | void = true;
    try {
      went = await onDo();
    } catch {
      went = false;
    }
    if (!here.current) return;
    if (went === false) {
      setState('ready');
      return;
    }
    setState('done');
    if (again !== undefined) {
      timer.current = window.setTimeout(() => {
        if (here.current) setState('ready');
      }, again);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void press()}
      disabled={disabled || state !== 'ready'}
      aria-live="polite"
      title={title}
      className={className}
      data-saysdone={state}
    >
      {state === 'busy' ? (
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
      ) : state === 'done' ? (
        <Check className="h-4 w-4 flex-shrink-0 text-emerald-400" />
      ) : (
        icon
      )}
      {state === 'busy' ? busyLabel : state === 'done' ? doneLabel : label}
    </button>
  );
}
