'use client';

/**
 * A presenter who says your script.
 *
 * ── What it puts together ────────────────────────────────────────────────
 *
 * A picture of a person and a recording of a voice, handed to a lipsync model
 * that animates the mouth to the sound. Both halves already existed and were
 * built for other reasons: the picture is a cast member, kept on the account
 * so the same presenter is on every device, and the voice is the voice studio,
 * which already reads a script in a cloned or a stock voice.
 *
 * That is why this panel is short. It is not a new tool, it is the third use
 * of two that were already here.
 *
 * ── The order it asks in ─────────────────────────────────────────────────
 *
 * Who, then what they say, then hear it, then make it. The reading is a
 * separate press on purpose: it is cheap, the video is not, and hearing the
 * words in the voice before spending on the picture is the difference between
 * one clip and three. Nothing is charged for the video until the reading has
 * been made and listened to.
 *
 * ── Afrikaans ────────────────────────────────────────────────────────────
 *
 * Works, and not by accident. The model is handed audio and never asked what
 * language it is in — whatever the voice studio read is what the presenter
 * says. Every other route to a talking presenter takes a script and a language
 * code, and those lists do not have Afrikaans on them.
 *
 * ── The confirmation ─────────────────────────────────────────────────────
 *
 * Asked, and not as a formality. Nothing in this app can tell whether the
 * person in a photograph agreed to be animated saying these words, and nothing
 * anywhere can. What the box does is make it a claim somebody made rather than
 * a thing that quietly happened — the same posture as the voice-cloning
 * confirmation, and what makes a takedown a matter of fact rather than of
 * argument.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SpokenWord } from '../lib/spokenwords';
import { AlertTriangle, Check, Loader2, Mic, Play, UserRound, Video as VideoIcon } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { loadCast, pictureOf, type Member } from '../lib/cast';
import { presenterCost } from '../lib/credits';
import { useLang } from '../lib/i18n';
import type { VoiceState } from './VoiceLab';
import Cost from './Cost';
import Card from './Card';
import Note from './Note';

/** How long the reading is, read off the file rather than guessed from words. */
async function lengthOf(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const probe = new Audio();
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    probe.addEventListener('loadedmetadata', () =>
      done(Number.isFinite(probe.duration) ? probe.duration : 0),
    );
    probe.addEventListener('error', () => done(0));
    probe.src = url;
  });
}

function asDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export default function Presenter({
  onUpgrade,
}: {
  onUpgrade?: () => void;
}): React.ReactElement | null {
  const { lang, t } = useLang();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [cast, setCast] = useState<Member[]>([]);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [who, setWho] = useState<string>('');
  const [voices, setVoices] = useState<VoiceState | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [script, setScript] = useState('');
  const [reading, setReading] = useState<{ blob: Blob; seconds: number } | null>(null);
  /**
   * The lines of the read and when each is spoken — from ElevenLabs' own
   * alignment, which arrives with the audio at no extra cost. Null means the
   * timings could not be read, which is NOT the same as a read with no words
   * in it, and the screen says so rather than showing nothing.
   */
  const [lines, setLines] = useState<SpokenWord[] | null>(null);
  /** Which line is being said right now, as the preview plays. */
  const [atLine, setAtLine] = useState(-1);
  /**
   * Why there are no lines under the player, where that is worth saying.
   *
   * Two ways to have none, and they are not the same thing:
   *
   *   `tooLong`    — the script is past what the timed read can do, so the
   *                  timings were never asked for. Nothing went wrong.
   *   `unreadable` — they were asked for and came back in a shape this app
   *                  could not read. The audio is still fine.
   *
   * Collapsing those two into one blank space is exactly the fault
   * `check:couldnotask` was written for, one screen further out.
   */
  const [noLines, setNoLines] = useState<'tooLong' | 'unreadable' | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<'read' | 'make' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const heard = useRef<string | null>(null);

  useEffect(() => {
    void fetch('/api/presenter')
      .then((r) => (r.ok ? r.json() : null))
      .then((said: { available?: boolean } | null) => setAvailable(Boolean(said?.available)))
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    if (available !== true) return;
    void loadCast().then(setCast);
    void accessToken().then((token) =>
      fetch('/api/voice', { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        .then((r) => (r.ok ? r.json() : null))
        .then((said) => setVoices(said as VoiceState))
        .catch(() => undefined),
    );
  }, [available]);

  useEffect(() => {
    if (!cast.length) return;
    let alive = true;
    void Promise.all(cast.map(async (one) => [one.path, await pictureOf(one.path)] as const)).then(
      (pairs) => {
        if (!alive) return;
        const found: Record<string, string> = {};
        for (const [path, url] of pairs) if (url) found[path] = url;
        setFaces((was) => ({ ...was, ...found }));
      },
    );
    return () => {
      alive = false;
    };
  }, [cast]);

  // Their own voices first: somebody who cloned one did it to use it.
  const pickable = useMemo(
    () => [...(voices?.mine ?? []), ...(voices?.stock ?? [])],
    [voices],
  );
  useEffect(() => {
    if (!voiceId && pickable.length) setVoiceId(pickable[0].id);
  }, [pickable, voiceId]);

  // Changing who says it, or what they say, makes the reading stale.
  useEffect(() => {
    setReading(null);
    setMade(null);
    /* And the words under it with it. Leaving them behind would light up a
       line of the old script while the new one plays, which is worse than
       showing nothing: it looks like the timings are wrong rather than like
       they belong to a read that no longer exists. */
    setLines(null);
    setAtLine(-1);
    setNoLines(null);
  }, [script, voiceId]);

  /* ── Following the read ─────────────────────────────────────────────────

     `timeupdate` rather than a timer: the audio element is the clock, and a
     timer started beside it drifts from it the moment anybody pauses, seeks,
     or the tab goes to the background.

     Ended is handled separately because `timeupdate` does not fire again
     after the last one, so the final line would stay lit over silence. */
  useEffect(() => {
    const element = player.current;
    if (!element || !lines?.length) return undefined;
    const follow = (): void => {
      const at = element.currentTime;
      let found = -1;
      for (let i = 0; i < lines.length; i += 1) {
        if (at >= lines[i].start && at <= lines[i].end) { found = i; break; }
        /* Between two lines — a pause for breath — the one just finished
           stays lit rather than the screen going blank and back. */
        if (at > lines[i].end) found = i;
      }
      setAtLine(found);
    };
    const stop = (): void => setAtLine(-1);
    element.addEventListener('timeupdate', follow);
    element.addEventListener('ended', stop);
    return () => {
      element.removeEventListener('timeupdate', follow);
      element.removeEventListener('ended', stop);
    };
  }, [lines]);

  useEffect(
    () => () => {
      if (heard.current) URL.revokeObjectURL(heard.current);
    },
    [],
  );

  const member = cast.find((one) => one.id === who) ?? cast[0] ?? null;
  const face = member ? faces[member.path] : '';

  const read = useCallback(async () => {
    if (busy || script.trim().length < 2 || !voiceId) return;
    setBusy('read');
    setProblem(null);
    try {
      const token = await accessToken();
      /* ── Asked for with its timings ────────────────────────────────

         `timings: true` gets the same audio from the same model at the same
         price, with ElevenLabs' own character alignment on the answer. That
         is what puts the words under the player and lights the one being
         said — without it, showing that would mean paying `/api/transcribe`
         to work out where the words fell in speech this app had just made
         out of words it already had.

         The trade is that the timed read does not stream, so the route
         refuses it above 3,000 characters. That refusal is answered by
         asking again plainly rather than by failing: a long script still
         gets read, it simply gets no words under it. */
      const ask = (timings: boolean) =>
        fetch('/api/voice/speak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          /* The language the script is being written in, so the route can
             pick the model ElevenLabs' own list says covers it. This is what
             was missing: the route has always said "the caller says which it
             wants" and this caller never said, so an Afrikaans script was
             read by the model chosen for English. The app's own language is
             the signal — not a guess at the text, which would be a detector
             this app does not have and would get wrong on a short script. */
          body: JSON.stringify({
            voiceId,
            text: script,
            language: lang,
            ...(timings ? { timings: true } : {}),
          }),
        });

      let response = await ask(true);
      let timed = true;
      if (response.status === 413) {
        /* Too long for the buffered read, and nothing has been charged: the
           route refuses on length before it asks for anything. */
        response = await ask(false);
        timed = false;
      }
      if (!response.ok) {
        const said = (await response.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
        setProblem(said.message ?? t('pres.readFailed', 'That could not be read just now.'));
        if (said.needsPlan) onUpgrade?.();
        return;
      }

      let blob: Blob;
      let said: SpokenWord[] | null = null;
      /* By what came back, not by what was asked for.

         Asking for timings does not guarantee JSON: a route that has not been
         deployed yet, or anything in front of it that answers plainly, sends
         audio — and `response.json()` on audio throws, which would turn a
         perfectly good read into "that could not be read just now". Reading
         the content type costs nothing and cannot be wrong about what is
         actually in the body. */
      const isJson = (response.headers.get('Content-Type') ?? '').includes('application/json');
      if (timed && isJson) {
        const answer = (await response.json()) as {
          audio: string;
          type?: string;
          lines?: SpokenWord[] | null;
        };
        /* Their base64 back into bytes. `atob` gives one character per byte,
           which is what `Uint8Array.from` is reading here — anything cleverer
           mangles a byte above 127 and the file will not play. */
        const raw = atob(answer.audio);
        const bytes = Uint8Array.from(raw, (one) => one.charCodeAt(0));
        blob = new Blob([bytes], { type: answer.type ?? 'audio/mpeg' });
        said = answer.lines ?? null;
      } else {
        blob = await response.blob();
      }

      const seconds = await lengthOf(blob);
      setReading({ blob, seconds });
      setLines(said);
      setAtLine(-1);
      /* `timed` is false only where the route answered 413 — the script is
         past what the timed read takes — so it is the one case that means
         "too long". Everything else that leaves us without lines, including a
         route that sent audio when JSON was asked for, is "they did not come
         back", which is what the other sentence says. */
      setNoLines(said?.length ? null : timed ? 'unreadable' : 'tooLong');
      const element = player.current;
      if (element) {
        if (heard.current) URL.revokeObjectURL(heard.current);
        heard.current = URL.createObjectURL(blob);
        element.src = heard.current;
        void element.play();
      }
    } catch {
      setProblem(t('pres.readFailed', 'That could not be read just now.'));
    } finally {
      setBusy(null);
    }
  }, [busy, script, voiceId, lang, onUpgrade, t]);

  const make = useCallback(async () => {
    if (busy || !reading || !face || !consent) return;
    setBusy('make');
    setProblem(null);
    setMade(null);
    try {
      const audio = await asDataUrl(reading.blob);
      if (!audio) {
        setProblem(t('pres.readFailed', 'That could not be read just now.'));
        return;
      }
      const token = await accessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const response = await fetch('/api/presenter', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image: face,
          audio,
          script,
          seconds: Math.round(reading.seconds),
          consent: true,
        }),
      });
      const said = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        needsPlan?: boolean;
      };
      if (!response.ok || !said.id) {
        setProblem(said.message ?? t('pres.failed', 'That could not be made just now.'));
        if (said.needsPlan) onUpgrade?.();
        return;
      }

      /* ── Waiting, at the pace ElevenLabs asks for ──────────────────

         This asked every four seconds. Their own guidance, on the Image &
         Video quickstart Carli sent on 10 September 2026, is **no more than
         once every ten seconds** for video, and that sustained aggressive
         polling earns 429s. Four seconds is two and a half times too fast,
         and every one of those asks is a Vercel invocation *and* a call to
         ElevenLabs — so the cost of being impatient was paid twice and bought
         nothing: a generation's status does not change sooner because it was
         asked twice.

         Ten to start, doubling to a minute, which is the back-off they ask
         for by name. A clip takes minutes rather than seconds, so the early
         asks are the wasteful ones; `engines.ts` has polled at ten from the
         beginning and this is now in step with it.

         The ceiling is the same eight minutes, kept as a deadline rather than
         a count of tries: the interval grows, so a fixed number of tries
         would quietly become a different amount of time. */
      const deadline = Date.now() + 8 * 60_000;
      let wait = 10_000;
      while (Date.now() < deadline) {
        await new Promise((wake) => setTimeout(wake, wait));
        wait = Math.min(wait * 2, 60_000);
        const asked = await fetch(`/api/video?id=${encodeURIComponent(said.id)}`, { headers }).catch(
          () => null,
        );
        const progress = (await asked?.json().catch(() => ({}))) as {
          state?: string;
          url?: string;
          message?: string;
        };
        if (progress.state === 'done' && progress.url) {
          setMade(progress.url);
          return;
        }
        if (progress.state === 'failed') {
          setProblem(progress.message ?? t('pres.failed', 'That could not be made just now.'));
          return;
        }
      }
      setProblem(t('pres.slow', 'It is taking longer than usual. It is still being made — look in your videos shortly.'));
    } catch {
      setProblem(t('pres.failed', 'That could not be made just now.'));
    } finally {
      setBusy(null);
    }
  }, [busy, reading, face, consent, script, onUpgrade, t]);

  // Nothing to offer until the server says the model is switched on.
  if (available !== true) return null;

  const price = reading ? presenterCost(Math.round(reading.seconds)) : 0;

  /* A fold, like every other panel. The sixth one written as a plain
     section with an always-open heading, and the one `check:folded`
     found rather than me: the five in her message were the ones she had
     looked at, not the ones there were. */
  return (
    <Card title={t('pres.title', 'A presenter who says your script')} icon={<UserRound className="w-4 h-4" />}>
          <Note className="text-sm text-zinc-500 leading-relaxed">{t(
              'pres.what',
              'Somebody from your cast, reading words in a voice you choose, with their mouth moving to it. It speaks whatever language you write in — Afrikaans included — because it is handed the reading rather than the words.',
            )}</Note>
          {/* And what it is not, because this panel sits in the video desk
              beside the storyboard and the obvious question from there is
              whether it will lipsync a singer.

              It is a lipsync model given a photograph and a *spoken* reading.
              Nobody here has put a sung take through it, and there is no way
              to find out from where this was built — so it is offered as what
              it is known to do rather than as what it might do. */}
          <Note className="text-sm text-amber-300/90 leading-relaxed">{t(
              'pres.notSinging',
              'It is built for a spoken script. Whether it holds up on singing has never been tested \u2014 one clip would answer it, and until somebody makes that clip this is a presenter and not a music video.',
            )}</Note>

      {cast.length === 0 ? (
        <p className="text-sm text-amber-400 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {t(
            'pres.noCast',
            'Put somebody in your cast first — the picture above is who the presenter will be.',
          )}
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <span className="text-sm text-zinc-400">{t('pres.who', 'Who says it')}</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cast.map((one) => {
                const picture = faces[one.path];
                const active = (member?.id ?? '') === one.id;
                return (
                  <button
                    key={one.id}
                    type="button"
                    onClick={() => setWho(one.id)}
                    aria-pressed={active}
                    className={`flex-shrink-0 w-20 rounded-xl overflow-hidden border-2 transition-all ${
                      active ? 'border-emerald-500' : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={picture} alt={one.name} className="w-20 h-20 object-cover" />
                    ) : (
                      <span className="flex items-center justify-center w-20 h-20 bg-zinc-900">
                        <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                      </span>
                    )}
                    <span className="block truncate px-1 py-1 text-xs text-zinc-400">{one.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="presenter-script" className="block text-sm text-zinc-400">
              {t('pres.script', 'What they say')}
            </label>
            <textarea
              id="presenter-script"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={3}
              placeholder={t('pres.scriptHint', 'Hallo, ek is Sarel, en vandag wys ek jou iets nuuts.')}
              className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="presenter-voice" className="sr-only">
              {t('pres.voice', 'The voice')}
            </label>
            <select
              id="presenter-voice"
              value={voiceId}
              onChange={(event) => setVoiceId(event.target.value)}
              className="min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              {pickable.map((one) => (
                <option key={one.id} value={one.id}>{one.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void read()}
              disabled={busy !== null || script.trim().length < 2 || !voiceId}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-50"
            >
              {busy === 'read' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {reading ? t('pres.readAgain', 'Read it again') : t('pres.read', 'Hear it first')}
            </button>
            {reading && (
              <button
                type="button"
                onClick={() => void player.current?.play()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-zinc-400 hover:text-white"
              >
                <Play className="w-4 h-4" />
                {Math.round(reading.seconds)}s
              </button>
            )}
          </div>
          <audio ref={player} className="hidden" />

          {/* ── The words, as they are said ──────────────────────────────

              From ElevenLabs' own alignment, which came back with the audio
              at no extra cost. Press play and the line being spoken lights
              up — which is the cheap answer to "is this read right", because
              a voice that is right and paced wrong is still a clip nobody
              wants, and hearing it while watching where it is tells you
              which of the two is wrong.

              `lines === null` is a different state from an empty list and is
              drawn differently. Null means the timings could not be read;
              empty means the read genuinely had no words in it. A screen
              that shows the same nothing for both is the fault
              `check:couldnotask` exists for. */}
          {reading && lines !== null && lines.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1">
              {lines.map((line, i) => (
                <button
                  key={`${line.start}-${i}`}
                  type="button"
                  onClick={() => {
                    const element = player.current;
                    if (!element) return;
                    element.currentTime = line.start;
                    void element.play();
                  }}
                  className={`block w-full text-left rounded-lg px-2 py-1.5 text-sm leading-snug transition-colors ${
                    i === atLine
                      ? 'bg-emerald-500/15 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {line.text}
                </button>
              ))}
              <Note className="text-xs text-zinc-600 leading-relaxed">{t(
                  'pres.followWhy',
                  'These times come from the reading itself, not from a guess — press a line to hear it from there.',
                )}</Note>
            </div>
          )}

          {reading && noLines === 'unreadable' && (
            /* Said out loud rather than left blank. The read is fine and was
               paid for; what is missing is the alignment, and somebody who is
               not told that will read the empty space as the app being
               broken. */
            <p className="text-xs text-zinc-500 leading-relaxed">
              {t(
                'pres.noTimings',
                'The reading is here, but the times of each line did not come back with it — so the words are not shown following along. Nothing is wrong with the audio.',
              )}
            </p>
          )}

          {reading && noLines === 'tooLong' && (
            /* A different sentence, because it is a different thing. Nothing
               failed: the script is longer than the timed read can take, so
               the words were never asked for. Telling somebody their timings
               "did not come back" when they were never sent for is how a
               working app gets reported as broken. */
            <p className="text-xs text-zinc-500 leading-relaxed">
              {t(
                'pres.tooLongForTimings',
                'This script is long enough that it has to be read in one go rather than followed word by word. The reading itself is exactly the same — shorten it if you want the words to follow along.',
              )}
            </p>
          )}

          {/* Cheap first, dear second — and the cheap one is a real answer to
              "is this the right voice", which is most of what goes wrong. */}
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'pres.whyRead',
              'Reading it costs a fraction of the video. Hearing the words in that voice before the picture is made is the difference between one clip and three.',
            )}</Note>

          {reading && (
            <>
              <label className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed cursor-pointer">
                <input
                  id="pres-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-emerald-500"
                />
                <span>
                  {t(
                    'pres.consent',
                    'The person in this picture is me, or they have agreed to be shown saying this.',
                  )}
                </span>
              </label>

              <Cost credits={price} waitMinutes={2} />

              <button
                type="button"
                onClick={() => void make()}
                disabled={busy !== null || !consent || !face}
                className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {busy === 'make' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <VideoIcon className="w-4 h-4" />
                )}
                {busy === 'make'
                  ? t('pres.making', 'Making it')
                  : `${t('pres.go', 'Make the video')} — ${price} ${t('video.credits', 'credits')}`}
              </button>
            </>
          )}

          {made && (
            <div className="space-y-2">
              <p className="text-sm text-emerald-300 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                {t('pres.done', 'Done. It is saved with your videos.')}
              </p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={made} controls className="w-full rounded-xl border border-zinc-800 bg-black" />
            </div>
          )}

          {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
        </>
      )}
    </Card>
  );
}
