'use client';

/**
 * The sleeve for a song — a real generated cover, not a drawn placeholder.
 *
 * Deliberately not `Cover.tsx`, which already exists and does a different job:
 * that one draws a deterministic pattern from a seed so a wall of cards is not
 * a wall of text, and it costs nothing and needs no engine. This is the other
 * thing — an actual image, made once, kept, and worth putting on a store page.
 *
 * A song with no picture is a row in a list. A song with one is a record, and
 * the difference matters most in the two places a track actually goes: a
 * channel page, and wherever somebody posts it.
 *
 * ── What it will not do ──────────────────────────────────────────────────
 *
 * It does not draw the lyrics. A cover made from a lyric sheet becomes an
 * illustration of the words — a literal broken heart — which is what an
 * amateur sleeve looks like and what a real one never does. The prompt is
 * built from mood, genre and light in `app/lib/server/cover.ts`, and asks for
 * no text at all, because every image model writes letters that are almost
 * words and a sleeve with almost-words on it is unusable.
 *
 * ── What it says while it works ──────────────────────────────────────────
 *
 * Seconds rather than minutes, but not instant. Nothing here pretends to know
 * how far along it is: the engine does not report that, and a bar creeping to
 * ninety would be an invention.
 *
 * ── There is no "keep" button, and that was the fault ────────────────────
 *
 * Carli, 14 September 2026: *"daar is nerens 'n keep knoppie nie wat jou help
 * om te sê dat jy die image kies en save as cover art, die anther button gaan
 * lê ook agter daai cover art image… en dalk 'n remove button."*
 *
 * Three things, and the first one is not the one it looks like. A cover IS
 * kept the moment it is drawn — the route writes it to storage under the
 * song, and the next page that opens finds it. Nothing was ever unsaved. What
 * was missing is any sentence saying so, and a screen that saves silently
 * looks exactly like a screen that did nothing. The button she went looking
 * for is really a line of text, and that is what this now has.
 *
 * ── Which was wrong, and she found out the expensive way ─────────────────
 *
 * Carli, 8 October 2026: *"Wanneer 'n liedjie se album art gegenerate word dan
 * moet daar 'n opsie wees 'keep'. Ek sien ek het een gegenerate en nou is dit
 * weg."*
 *
 * The same request, three weeks later, with a lost picture behind it. "A cover
 * IS kept the moment it is drawn" was true of the code and false in the world,
 * because the thing doing the keeping was THIS COMPONENT: the copy into our
 * storage happens in the `?id=` handler, which only runs while the loop in
 * `make` below is still polling. Everything that ends that loop early — the
 * booth unmounting this panel when a song stops playing, a closed tab, a
 * sleeping phone, the two-minute deadline — left a picture the engine had
 * drawn and been paid for, on a link that expires within the hour.
 *
 * Worse, this panel took the route's own `kept: false` — which it has always
 * answered when the copy did not land — dropped it, and printed the green
 * "it is saved" line anyway. A reassurance I added for her, printed over the
 * exact failure it reassures about.
 *
 * So: the server writes the job down before charging (`coverkeep.sql`), this
 * panel asks on open whether a cover is owed and collects it, the state comes
 * from `standingOf` where a check can drive every branch, and **the saved line
 * requires `kept === true`**. The keep button is real now, and it appears in
 * the two states that have something to keep.
 *
 * The second is plain: "Another" was laid on top of the artwork, which is the
 * one part of this screen worth looking at. The controls sit under it now.
 *
 * The third had no answer at all. A cover could be made and replaced, never
 * taken off — and the place that hurts is a song about to be posted. `DELETE
 * /api/cover` is new for it.
 *
 * And "Another" says what it costs and that it replaces what is there. It
 * always did both and said neither: the price was only on the first press,
 * and nothing warned that the picture on screen would be gone.
 *
 * ── The other kind of cover ──────────────────────────────────────────────
 *
 * Carli, 22 September 2026: *"Kyk asb in make a song en channel dat daar by
 * cover art 'n opsie is vir real art."*
 *
 * Everything above this line makes a picture with a machine. The album art
 * room sells the other kind — a one-off painted by a person, sold once — and
 * it existed with no way in from the two places somebody is actually looking
 * at a song and thinking about its cover. A room reachable only from the rail
 * is a room nobody arrives at while the thought is in their head.
 *
 * So the choice is offered here, in both states, because it is a real choice
 * in both: before there is a cover, and after one has been drawn and is not
 * good enough.
 *
 * `onRealArt` is REQUIRED, not optional. An optional door is a door that gets
 * forgotten at the second call site and fails silently there — which is the
 * shape of most of the faults in this repo. Required means the compiler
 * refuses a room that mounts a sleeve with no way through to the artists.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Image as ImageIcon, Loader2, Palette, RefreshCw, Trash2 } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import {
  hasPicture, offersKeep, saysSaved, standingOf, type CoverWord,
} from '../lib/coverstate';
import { useLang } from '../lib/i18n';
import Note from './Note';

export default function Sleeve({
  trackId,
  title,
  genre,
  style,
  onRealArt,
  onWorking,
  onShort,
  startNow = false,
}: {
  trackId: string;
  title: string;
  genre: string;
  style: string;
  /**
   * Draw the cover as soon as this opens, without waiting to be asked.
   *
   * ── What she asked ─────────────────────────────────────────────────
   *
   * Carli, 9 October 2026: *"Plus generate dit dan standaard 'n album
   * cover saam met die liedjie."* As standard, with the song.
   *
   * Until now a cover was a button somebody had to go and find after the
   * fact, which is why most songs in this app are a row in a list rather
   * than a record.
   *
   * ── Why a prop and not a charge in the song route ──────────────────
   *
   * Because everything that makes this reliable is already in this file:
   * the job, the poll, the "stay here" warning, the recovery for a job
   * that was never written down, the refund. A second path that drew
   * covers would be a second copy of all of it, and the half nobody
   * tested would be the half that loses a picture.
   *
   * So the song room ticks a box, the panel opens with the new song in
   * it, and this starts the same `make()` the button does. One press
   * from her side, one code path from this side.
   *
   * Once, and never on a song that already has one — see the effect
   * below, which is the part that could quietly charge twice.
   */
  startNow?: boolean;
  /**
   * Out to the album art room, carrying this song.
   *
   * Required on purpose — see the note at the top of this file.
   */
  onRealArt: () => void;
  /**
   * Said when a draw or a keep starts, and again when it stops.
   *
   * ── Why this is required, and why it is the real fix ─────────────────
   *
   * The booth mounts this panel on `playing === track.id || sleeveFor ===
   * track.id`, and a finished song sets `playing` to null. So: press play,
   * press "Make a cover image", let the song reach its end — and this panel
   * unmounts with the poll loop inside it, a few seconds before the picture
   * it has paid for arrives. That is the fault behind *"ek het een gegenerate
   * en nou is dit weg"*, and the recovery everything else here adds is the
   * safety net under it, not the fix.
   *
   * The fix is that a room showing this panel pins it open while it is
   * working. Required rather than optional for the reason `onRealArt` is: an
   * optional door is forgotten at the second call site and fails silently
   * there, which is the shape of most of the faults in this repo — and in
   * this case the silent failure is a picture somebody paid for.
   */
  onWorking: (working: boolean) => void;
  /**
   * Handed the refusal body so the top-up panel can open where it belongs.
   *
   * Optional, and the studio does not pass it yet — nothing on that screen
   * does, including generating a song itself, which shows the route's message
   * inline. Being inconsistent with the screen around it would be worse than
   * being consistent and plainer, so this waits until the whole screen is
   * wired rather than being the one button that behaves differently.
   */
  onShort?: (payload: unknown) => void;
}): React.ReactElement {
  const { t } = useLang();
  /* The server's whole answer, not just the picture. `kept` is the field this
     panel used to throw away; `pending` is the one that turns "no cover" into
     "a cover nobody collected". `standingOf` turns the three into one word. */
  const [word, setWord] = useState<CoverWord>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /* Both `make` and `keep` go through this rather than `setBusy`, so neither
     can start work without pinning the panel that holds its poll. */
  const working = useCallback((yes: boolean): void => {
    setBusy(yes);
    onWorking(yes);
  }, [onWorking]);
  const standing = standingOf(word);
  /* Empty rather than null, because it is only ever read inside the branch
     `hasPicture` guards and an `img` with no `src` at all is a broken icon.
     The guard is the function, not this value. */
  const url = word.url ?? '';

  /* Whether the question above has been answered yet. `startNow` waits on
     it, because starting a draw before knowing whether one already exists is
     how a song gets charged twice for the same picture. */
  const [asked, setAsked] = useState(false);
  /* Fired once per mount, whatever React does with the effect. */
  const begun = useRef(false);

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    const token = await accessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }, []);

  /* Is there one already — and is one owed?
 
     Asked once, and it generates nothing: the GET is read-only and costs
     nothing whether it finds a picture or not.
 
     The second half is new. When the answer is `pending`, a cover was drawn
     for this song and charged for and never copied into our storage, which is
     the fault this whole panel was rewritten for. It is collected here rather
     than waited on, because a picture already paid for should not need a
     press — and if the collecting itself fails, `standing` becomes
     `uncollected` and the keep button is right there. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
          headers: await headers(),
        });
        const data = (await response.json()) as CoverWord & { state?: string };
        if (!alive) return;
        if (data.state === 'done' && data.url) {
          setWord({ url: data.url, kept: data.kept });
          return;
        }
        if (data.pending !== true) return;
        /* Owed. Mark it so the panel says so even if the collect below falls
           over, rather than reading as a song that never had a cover. */
        setWord({ pending: true });
        const got = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
          method: 'PUT',
          headers: await headers(),
        });
        const back = (await got.json().catch(() => ({}))) as CoverWord & {
          state?: string;
          message?: string;
        };
        if (!alive) return;
        if (back.state === 'done' && back.url) setWord({ url: back.url, kept: back.kept });
      } catch {
        // No cover yet is the ordinary case and needs no announcement.
      } finally {
        if (alive) setAsked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trackId, headers]);

  /**
   * The keep button.
   *
   * Goes back to the engine for a cover that was made and never copied here.
   * It carries no id — the server finds the job from who is asking and which
   * song, which is also what stops it being a way to pull somebody else's
   * picture into your own folder.
   */
  /* ── Drawn as standard, with the song ──────────────────────────────────
 
     Carli, 9 October 2026: *"Plus generate dit dan standaard 'n album cover
     saam met die liedjie."*
 
     Three conditions, and each one is a way this could charge for nothing.
     Only when the song room asked for it (`startNow`); only once a mount
     (`begun`), because an effect that runs twice draws two pictures and
     bills for two; and only after the question above has been ANSWERED, with
     the answer being that there is no cover and none owed — a song that
     already has one must never be charged for a second.
 
     `make()` and not a copy of it: the job, the poll, the "stay here"
     warning and the refund are all in there, and a second path would be a
     second half nobody tested. */
  useEffect(() => {
    if (!startNow || !asked || begun.current) return;
    if (word.url || word.pending) return;
    begun.current = true;
    void make();
    // `make` is stable enough for this: it is called once, behind a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNow, asked, word.url, word.pending]);

  const keep = async (): Promise<void> => {
    working(true);
    setProblem(null);
    try {
      const got = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
        method: 'PUT',
        headers: await headers(),
      });
      const back = (await got.json().catch(() => ({}))) as CoverWord & {
        state?: string;
        message?: string;
      };
      if (back.state === 'done' && back.url) {
        setWord({ url: back.url, kept: back.kept });
        /* Said only when it is true. `kept` false here means the engine still
           has it and we still do not, and the button stays. */
        if (back.kept !== true) {
          setProblem(t('cover.notKept', 'The picture is there but it could not be saved into the app. Try again in a moment.'));
        }
        return;
      }
      if (back.state === 'running') {
        setProblem(t('cover.stillDrawing', 'It is still being drawn. Give it a few seconds and press this again.'));
        return;
      }
      setProblem(back.message ?? t('cover.gone', 'That one could not be fetched any more.'));
    } catch {
      setProblem(t('cover.notKept', 'The picture is there but it could not be saved into the app. Try again in a moment.'));
    } finally {
      working(false);
    }
  };

  const takeOff = async (): Promise<void> => {
    working(true);
    setProblem(null);
    try {
      const gone = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
        headers: await headers(),
      });
      if (!gone.ok) {
        setProblem(t('cover.notOff', 'That could not be taken off. Try again in a moment.'));
        return;
      }
      setWord({});
    } catch {
      setProblem(t('cover.notOff', 'That could not be taken off. Try again in a moment.'));
    } finally {
      working(false);
    }
  };

  const make = async (): Promise<void> => {
    working(true);
    setProblem(null);
    try {
      const started = await fetch('/api/cover', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await headers()) },
        body: JSON.stringify({ trackId, title, genre, style }),
      });
      const opened = (await started.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        needsCredits?: boolean;
        recoverable?: boolean;
      };
      if (!started.ok || !opened.id) {
        if (opened.needsCredits) onShort?.(opened);
        setProblem(opened.message ?? t('cover.failed', 'The cover could not be made.'));
        return;
      }
      /* The job did not get written down, so leaving this screen before the
         picture arrives really would lose it. Said now, while she can choose
         to stay, rather than discovered afterwards — which is how the fault
         this was all written for was discovered. */
      if (opened.recoverable === false) {
        setProblem(t('cover.stayHere', 'Stay on this screen until the picture appears \u2014 it cannot be fetched again if you leave.'));
      }

      // Two seconds between asks, for two minutes. An image is quick, and
      // asking every half second is rude to a service being generous.
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await new Promise((wake) => setTimeout(wake, 2000));
        const asked = await fetch(
          `/api/cover?id=${encodeURIComponent(opened.id)}&track=${encodeURIComponent(trackId)}`,
          { headers: await headers() },
        );
        const progress = (await asked.json().catch(() => ({}))) as CoverWord & {
          state?: string;
          message?: string;
        };
        if (progress.state === 'failed') {
          setProblem(progress.message ?? t('cover.failed', 'The cover could not be made.'));
          return;
        }
        if (progress.state === 'done' && progress.url) {
          setWord({ url: progress.url, kept: progress.kept });
          /* The "stay on this screen" warning is set while the picture is on
             its way, when the job could not be written down. Once the picture
             is here it is no longer true, and a warning left standing over a
             finished thing is the small version of the fault this whole panel
             was rewritten for. */
          setProblem(null);
          return;
        }
      }
      setProblem(t('cover.slow', 'That is taking longer than usual. Try again in a moment.'));
    } catch {
      setProblem(t('cover.failed', 'The cover could not be made.'));
    } finally {
      working(false);
    }
  };

  /* Written once and used in both states of this panel, so the door cannot
     exist on one of them and be missed on the other. */
  const realArt = (
    <>
      <button
        type="button"
        onClick={onRealArt}
        data-realart
        className="min-h-[44px] w-full py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-2"
      >
        <Palette className="w-3.5 h-3.5" />
        {t('cover.real')}
      </button>
      <Note>{t('cover.realWhy')}</Note>
    </>
  );

  /* Written once, used in both states that have something to keep — the
     reason `realArt` is written once a few lines above. */
  const keepButton = (
    <button
      type="button"
      onClick={() => void keep()}
      disabled={busy}
      data-keep
      className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400 flex items-center gap-1.5 disabled:opacity-60"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      {t('cover.keep', 'Keep it')}
    </button>
  );

  return (
    <div className="space-y-2">
      {hasPicture(standing) ? (
        <>
          {/* Nothing over the artwork. It is the one thing on this panel
              worth looking at, and a button parked in the corner of it
              covers whatever the picture put there. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={t('cover.alt', 'Cover art for this song')}
            className="w-full aspect-square object-cover rounded-xl border border-zinc-800 bg-zinc-950"
          />

          {/* ── Said only when the server said so ──────────────────────
 
              This line used to print under every picture, including the ones
              the route had just reported it could not keep. `saysSaved` is
              `standing === 'kept'` and nothing else: not known is not saved,
              and `check:coverkeep` drives every value the server can send
              through `standingOf` to hold that. */}
          {saysSaved(standing) ? (
            <p className="flex items-start gap-1.5 text-sm leading-snug text-emerald-300/90">
              <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {t('cover.kept', 'This is the song\u2019s cover now. It is saved and it goes wherever the song goes.')}
            </p>
          ) : (
            <p className="flex items-start gap-1.5 text-sm leading-snug text-amber-300/90">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {t('cover.adrift', 'This was drawn but it is not saved in the app yet \u2014 the picture above is on a link that stops working within the hour. Press Keep it.')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {offersKeep(standing) && keepButton}
            <button
              type="button"
              onClick={() => void make()}
              disabled={busy}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {`${t('cover.again', 'Another')} \u2014 ${CREDITS.cover} ${t('video.credits', 'credits')}`}
            </button>
            {/* `bg-rose` both says what it does and keeps the green rule in
                globals.css off it — see check:sideborder. */}
            <button
              type="button"
              onClick={() => void takeOff()}
              disabled={busy}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-rose-500/[0.06] border border-rose-500/25 text-zinc-400 hover:border-rose-500/50 hover:text-rose-300 flex items-center gap-1.5 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('cover.takeOff', 'Take it off')}
            </button>
          </div>
          {/* Said before the press, not discovered after it. There is one
              cover per song and a new one overwrites it — there is no way
              back to the picture on screen once another is drawn. */}
          <Note>{t('cover.againWarns', 'Another draws a new one and replaces this. There is no way back to this picture.')}</Note>
          {/* Still a choice once a machine has drawn one. Somebody looking at
              a cover they are not happy with is exactly who this is for. */}
          {realArt}
        </>
      ) : (
        <>
          {/* ── A cover that was paid for and never collected ───────────
 
              The state that did not exist until today: the engine drew one,
              credits went, and nothing copied it here — so this panel showed
              the plain "make one" button, for two credits, over a picture
              already bought. The panel tries to collect it on open; this is
              what shows when that has not happened yet or did not work. */}
          {standing === 'uncollected' && (
            <>
              <p className="flex items-start gap-1.5 text-sm leading-snug text-amber-300/90">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {t('cover.owed', 'A cover was made for this song and never saved. It costs nothing to fetch it.')}
              </p>
              {keepButton}
            </>
          )}
          <button
            type="button"
            onClick={() => void make()}
            disabled={busy}
            className="min-h-[44px] w-full py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
            {busy
              ? t('cover.making', 'Drawing the sleeve')
              : `${t('cover.make')} — ${CREDITS.cover} ${t('video.credits', 'credits')}`}
          </button>
          {realArt}
        </>
      )}
      {problem && <p className="text-xs text-rose-400 leading-snug">{problem}</p>}
    </div>
  );
}
