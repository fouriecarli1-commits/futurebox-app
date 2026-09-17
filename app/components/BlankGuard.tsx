'use client';

/**
 * A page that came back empty says so, instead of being white.
 *
 * ── Three reports, and what is actually happening ────────────────────────
 *
 * Carli, 14, 16 and 17 September 2026: *"Die add a photo in Shot gee steeds
 * net 'n wit blad. Die foto is baie klein 854kb."* And again, on its own
 * line: *"Bladsy is steeds wit."*
 *
 * Four explanations have been offered for this and every one of them was
 * beaten by the same thing: a white page keeps its reason to itself. The
 * memory theory was ruled out by an 854KB file; the in-app-browser theory by
 * real Chrome; the image-decode theory by three code paths rewritten with no
 * change; and this session ruled out a full `localStorage` as well.
 *
 * The one left standing is `Watchdog`'s: the phone **threw the tab away**
 * while the picture picker was in front of it, and put an empty shell back
 * when she came out. Android and iOS both do this, a file picker or a camera
 * is the commonest reason, and the app has no say in it.
 *
 * ── So this does not fix it, and is worth more than a fix that is a guess ─
 *
 * Whatever emptied the page — a discarded tab, a script that never arrived,
 * a throw with no boundary — the result is the same and so is the remedy: a
 * page with nothing on it must not be the last word. So a plain panel is
 * drawn straight into the document, with the step it was on if it was
 * recorded, and one button.
 *
 * ── Why it is written in bare DOM ────────────────────────────────────────
 *
 * Every other panel in this app is a component, and a component cannot help
 * here: by the time this is needed, React has either not run or is gone, and
 * a render is exactly the thing that is not happening. So the panel is
 * `document.createElement`, inline styles, and no imports that could
 * themselves fail to load.
 *
 * The same reason there is no translation lookup in it. `useLang` reads a
 * context, a context needs a tree, and the tree is what is missing — so the
 * two sentences are written in both languages, one under the other, which is
 * four lines of markup and no dependency at all.
 */

import { useEffect } from 'react';
import { doing, noteProblem } from '../lib/lasterror';

/** How long to wait before a page with nothing on it counts as broken. */
const PATIENCE = 4000;
/** Below this many characters, nothing has drawn. Every screen has a header. */
const EMPTY = 20;

export default function BlankGuard(): null {
  useEffect(() => {
    let timer: number | null = null;
    /* Once. A second panel on top of the first is the app arguing with
       itself on the one screen somebody is already stuck on. */
    const MARK = 'fb-blank-guard';

    const look = (): void => {
      if (document.getElementById(MARK)) return;
      const words = (document.body?.innerText ?? '').trim();
      if (words.length >= EMPTY) return;

      /* Recorded as well as drawn, so `/oops` carries it too and the two
         cannot disagree about what happened. */
      noteProblem('discarded', 'The page came back with nothing on it.');

      const step = (() => {
        try {
          return doing();
        } catch {
          return '';
        }
      })();

      const panel = document.createElement('div');
      panel.id = MARK;
      panel.setAttribute('role', 'alert');
      panel.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:2147483647',
        'background:#0b0d14', 'color:#eef2ff',
        'font:16px/1.5 system-ui,-apple-system,sans-serif',
        'padding:24px', 'display:flex', 'flex-direction:column',
        'gap:14px', 'justify-content:center', 'overflow:auto',
      ].join(';');

      const line = (text: string, size: string, dim = false): HTMLElement => {
        const one = document.createElement('p');
        one.textContent = text;
        one.style.cssText = `margin:0;font-size:${size};${dim ? 'color:rgba(238,242,255,0.6);' : 'font-weight:700;'}`;
        return one;
      };

      panel.appendChild(line('Hierdie bladsy het leeg teruggekom.', '20px'));
      panel.appendChild(line(
        'Jou foon het die oortjie weggegooi terwyl die fotokieser oop was, en '
        + 'leeg teruggesit. Niks wat jy gemaak het, is weg — druk hieronder.',
        '15px', true,
      ));
      panel.appendChild(line('This page came back empty.', '15px'));
      panel.appendChild(line(
        'Your phone took the tab away while the picture picker was open and put '
        + 'an empty one back. Nothing you made is lost — press below.',
        '14px', true,
      ));
      if (step) panel.appendChild(line(`Besig met · Doing: ${step}`, '13px', true));

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Laai die bladsy weer · Reload';
      button.style.cssText = [
        'min-height:48px', 'border-radius:12px', 'border:0',
        'background:#10b981', 'color:#03130d', 'font-weight:800',
        'font-size:16px', 'padding:0 18px', 'cursor:pointer',
      ].join(';');
      button.addEventListener('click', () => window.location.reload());
      panel.appendChild(button);

      const link = document.createElement('a');
      link.href = '/oops';
      link.textContent = 'Wat het gebeur · What happened';
      link.style.cssText = 'color:#7dd3fc;font-size:14px;text-decoration:underline;';
      panel.appendChild(link);

      document.body.appendChild(panel);
    };

    /* Twice, and for two different failures.

       The timer catches a page that never drew at all. The visibility
       listener catches the one she actually hits: the tab is taken WHILE the
       picker is in front of it, so nothing is wrong until the moment she
       comes back — and coming back is a visibility change and not a load. */
    timer = window.setTimeout(look, PATIENCE);
    const back = (): void => {
      if (document.visibilityState !== 'visible') return;
      /* A beat, because a tab that was merely backgrounded repaints on the
         way in and asking before it has is asking too early. */
      window.setTimeout(look, 600);
    };
    document.addEventListener('visibilitychange', back);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', back);
    };
  }, []);

  return null;
}
