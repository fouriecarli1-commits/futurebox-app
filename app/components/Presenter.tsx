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
import { AlertTriangle, Check, Loader2, Mic, Play, UserRound, Video as VideoIcon } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { loadCast, pictureOf, type Member } from '../lib/cast';
import { presenterCost } from '../lib/credits';
import { useLang } from '../lib/i18n';
import type { VoiceState } from './VoiceLab';
import Cost from './Cost';

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
  const { t } = useLang();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [cast, setCast] = useState<Member[]>([]);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [who, setWho] = useState<string>('');
  const [voices, setVoices] = useState<VoiceState | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [script, setScript] = useState('');
  const [reading, setReading] = useState<{ blob: Blob; seconds: number } | null>(null);
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
  }, [script, voiceId]);

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
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ voiceId, text: script }),
      });
      if (!response.ok) {
        const said = (await response.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
        setProblem(said.message ?? t('pres.readFailed', 'That could not be read just now.'));
        if (said.needsPlan) onUpgrade?.();
        return;
      }
      const blob = await response.blob();
      const seconds = await lengthOf(blob);
      setReading({ blob, seconds });
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
  }, [busy, script, voiceId, onUpgrade, t]);

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

      /* Waiting on the video desk's own poll, which is where every clip this
         app makes is carried from "started" to a file we keep. */
      for (let tries = 0; tries < 120; tries += 1) {
        await new Promise((wait) => setTimeout(wait, 4000));
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

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <UserRound className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-black text-white tracking-tight">
            {t('pres.title', 'A presenter who says your script')}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t(
              'pres.what',
              'Somebody from your cast, reading words in a voice you choose, with their mouth moving to it. It speaks whatever language you write in — Afrikaans included — because it is handed the reading rather than the words.',
            )}
          </p>
        </div>
      </div>

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

          {/* Cheap first, dear second — and the cheap one is a real answer to
              "is this the right voice", which is most of what goes wrong. */}
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'pres.whyRead',
              'Reading it costs a fraction of the video. Hearing the words in that voice before the picture is made is the difference between one clip and three.',
            )}
          </p>

          {reading && (
            <>
              <label className="flex items-start gap-2.5 text-sm text-zinc-300 leading-relaxed cursor-pointer">
                <input
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
    </section>
  );
}
