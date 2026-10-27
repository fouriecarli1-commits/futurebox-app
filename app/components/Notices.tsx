'use client';

/**
 * A short line at the top of the screen: "Working on it…" while a press is
 * waiting on the server, and what went wrong, in words, when it fails.
 *
 * The owner, 27 October 2026: *"Maak net seker dat alles wat gedoen word reg
 * deur die app altyd 'n button het wat reageer, en dat wanneer iets fout gaan
 * daar 'n verstaanbare vinnige kort notification op kom, of wanneer dinge
 * besig is om te gebeur ook 'n vinnige notification."*
 *
 * One for the whole app rather than one per room, the way `WorkingBar` is,
 * so no press can be forgotten: it watches the app's own requests that do
 * work (`/api/…`, anything but a plain read). A room that already says
 * something in its own place still does; this is the line nobody can miss.
 *
 * Only what somebody just did is spoken for. Saves and reports the app makes
 * by itself are not a person waiting, so a notice comes only within a few
 * seconds of a tap or a key, and the reports `WorkingBar` keeps quiet stay
 * quiet here too.
 *
 * And a button that cannot be pressed yet still answers: a tap on it says
 * why, from its own title, or that something is still busy.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

type Say = (key: string, fallback: string) => string;

/** How long after a tap a request still counts as that tap's. */
const TOUCHED_MS = 8000;
/** A wait shorter than this is not a wait. */
const BUSY_AFTER_MS = 700;
const SHOWN_MS = 4500;
const QUIET = /\/api\/(events|listens|watch|oops|log)\b/;

type Notice = { readonly kind: 'busy' | 'wrong' | 'why'; readonly words: string };

/** What a refusal means, in words, when the server gave none of its own. */
function wrongWords(status: number, t: Say): string {
  if (status === 0) return t('notice.offline', 'No connection. Check your internet and try again.');
  if (status === 401) return t('notice.signIn', 'Sign in first.');
  if (status === 402) return t('notice.credits', 'Not enough credits for this. Top up and try again.');
  if (status === 403) return t('notice.notAllowed', 'This is not allowed here.');
  if (status === 413) return t('notice.tooBig', 'That is too big to send. Try a smaller one.');
  if (status === 429) return t('notice.tooMany', 'Too many at once. Wait a moment and try again.');
  if (status >= 500) return t('notice.server', 'Something went wrong on our side. Try again in a moment.');
  return t('notice.failed', 'That did not work. Try again.');
}

/** The server's own sentence, if it sent one that reads as a sentence. */
function serverWords(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  for (const key of ['message', 'error'] as const) {
    const said = (body as Record<string, unknown>)[key];
    if (typeof said === 'string' && said.trim().length > 3 && /\s/.test(said.trim())) {
      const one = said.trim();
      return one.length > 160 ? `${one.slice(0, 157)}…` : one;
    }
  }
  return null;
}

let touchedAt = 0;
let waiting = 0;
const listeners = new Set<(kind: 'start' | 'end' | 'wrong', words?: string, status?: number) => void>();
const tell = (kind: 'start' | 'end' | 'wrong', words?: string, status?: number): void => {
  for (const one of listeners) one(kind, words, status);
};

function patchFetch(): void {
  const w = window as Window & { __fbNoticePatched?: boolean };
  if (w.__fbNoticePatched) return;
  w.__fbNoticePatched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    let path = '';
    try { path = new URL(url, window.location.href).pathname; } catch { /* not ours */ }
    const counts = path.startsWith('/api/') && method !== 'GET' && method !== 'HEAD' && !QUIET.test(path)
      && Date.now() - touchedAt < TOUCHED_MS;
    if (!counts) return original(input, init);
    waiting += 1;
    tell('start');
    try {
      const answer = await original(input, init);
      if (!answer.ok) {
        const body = await answer.clone().json().catch(() => null);
        tell('wrong', serverWords(body) ?? undefined, answer.status);
      }
      return answer;
    } catch (problem) {
      /* A request the room itself called off is not a failure. */
      if (!(problem instanceof DOMException && problem.name === 'AbortError')) tell('wrong', undefined, 0);
      throw problem;
    } finally {
      waiting -= 1;
      tell('end');
    }
  };
}

export default function Notices(): React.ReactElement | null {
  const { t } = useLang();
  const [notice, setNotice] = useState<Notice | null>(null);
  const say = useRef(t);
  useEffect(() => { say.current = t; }, [t]);

  useEffect(() => {
    patchFetch();
    let busyTimer: number | null = null;
    let goneTimer: number | null = null;
    const show = (next: Notice | null, forMs?: number): void => {
      if (goneTimer !== null) { window.clearTimeout(goneTimer); goneTimer = null; }
      setNotice(next);
      if (next && forMs) goneTimer = window.setTimeout(() => setNotice(null), forMs);
    };

    const heard = (kind: 'start' | 'end' | 'wrong', words?: string, status?: number): void => {
      if (kind === 'start') {
        if (busyTimer === null) {
          busyTimer = window.setTimeout(() => {
            busyTimer = null;
            if (waiting > 0) {
              setNotice((was) => (was?.kind === 'wrong' ? was : { kind: 'busy', words: say.current('notice.busy', 'Working on it…') }));
            }
          }, BUSY_AFTER_MS);
        }
      } else if (kind === 'end') {
        if (waiting === 0) {
          if (busyTimer !== null) { window.clearTimeout(busyTimer); busyTimer = null; }
          setNotice((was) => (was?.kind === 'busy' ? null : was));
        }
      } else {
        show({ kind: 'wrong', words: words ?? wrongWords(status ?? 0, say.current) }, SHOWN_MS + 1500);
      }
    };
    listeners.add(heard);

    const touched = (event: Event): void => {
      touchedAt = Date.now();
      /* A button that cannot be pressed yet still answers. */
      const target = event.target instanceof Element ? event.target : null;
      const dead = target?.closest('button:disabled, [role="button"][aria-disabled="true"]');
      if (!dead || dead.closest('[data-nonotice]')) return;
      const why = dead.getAttribute('data-why') || dead.getAttribute('title');
      const busy = waiting > 0 || Boolean(document.querySelector('.animate-spin, [aria-busy="true"]'));
      show({
        kind: 'why',
        words: why && why.length < 160
          ? why
          : busy
            ? say.current('notice.stillBusy', 'Still busy. Wait a moment for it to finish.')
            : say.current('notice.notYet', 'Not yet: finish the step before this one first.'),
      }, 2600);
    };
    document.addEventListener('pointerdown', touched, { capture: true, passive: true });
    document.addEventListener('keydown', touched, { capture: true, passive: true });

    /* A press whose own code failed without saying so. */
    const broke = (): void => {
      if (Date.now() - touchedAt > 3000) return;
      show({ kind: 'wrong', words: say.current('notice.failed', 'That did not work. Try again.') }, SHOWN_MS);
    };
    window.addEventListener('unhandledrejection', broke);

    return () => {
      listeners.delete(heard);
      document.removeEventListener('pointerdown', touched, { capture: true });
      document.removeEventListener('keydown', touched, { capture: true });
      window.removeEventListener('unhandledrejection', broke);
      if (busyTimer !== null) window.clearTimeout(busyTimer);
      if (goneTimer !== null) window.clearTimeout(goneTimer);
    };
  }, []);

  if (!notice) return null;
  const wrong = notice.kind === 'wrong';
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[200] flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }}
      data-notice={notice.kind}
    >
      <p
        role={wrong ? 'alert' : 'status'}
        className={`fb-notice pointer-events-auto inline-flex max-w-md items-center gap-2 rounded-2xl border px-3.5 py-2 text-[13px] font-semibold shadow-lg backdrop-blur ${
          wrong ? 'border-rose-400/60 bg-rose-950/90 text-rose-50' : 'border-emerald-400/50 bg-zinc-950/90 text-emerald-50'
        }`}
      >
        {notice.kind === 'busy' && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
        {wrong && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
        <span>{notice.words}</span>
        {notice.kind !== 'busy' && (
          <span
            role="button"
            tabIndex={0}
            aria-label={t('notice.shut', 'Close')}
            onClick={() => setNotice(null)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setNotice(null); }}
            className="ml-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-current opacity-70"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </p>
    </div>
  );
}
