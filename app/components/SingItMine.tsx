'use client';

/**
 * A finished song, sung in your own voice.
 *
 * ── Why this is in Make a song and not only in the booth ─────────────────
 *
 * The Pro Booth's version works on a lane, which means it is for somebody who
 * has already recorded something. This is for the other case, which is most
 * people: a song came out of the machine, it is good, and the voice on it is
 * not theirs. Carli asked for the singing engine "in Pro Booth en in Make a
 * song", and this is the second half of that.
 *
 * It runs over `/api/voice/sing` — Kits.AI, a model trained on one singer —
 * and never over the speech model. On a sung line the speech model is a
 * gamble; that is the whole reason the singing one was bought.
 *
 * ── A new song, never a replacement ──────────────────────────────────────
 *
 * The same rule the booth keeps. Conversion is paid for and whether it is
 * better is a matter of taste, so overwriting the original would make a
 * judgement call irreversible on somebody else's behalf. The new one is
 * marked with the model that sang it, because a release whose credits do not
 * say what is on the recording is the one thing this app must not produce.
 *
 * ── Asked once, not once per song ────────────────────────────────────────
 *
 * Whether the engine is switched on is a property of the deployment, not of a
 * song, and there are twenty songs on that screen. The question is asked once
 * per page load and the answer is shared by every button on it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mic2, X } from 'lucide-react';
import { CREDITS, perMinute } from '../lib/credits';
import { accessToken } from '../lib/cloud';
import { durationOf, readAudio } from '../lib/trackaudio';
import { putAudio, type Track } from '../lib/library';
import { attach, dropWork, TOO_BIG_TO_SEND } from '../lib/workfile';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import Cost from './Cost';
import WatchTutorial from './WatchTutorial';
import SingVoices, { type SingVoice } from './SingVoices';
import Note from './Note';

interface Singing {
  readonly configured: boolean;
  /** Voices trained on this account. */
  readonly models: readonly SingVoice[];
  /** Kits' own catalogue — the answer for anybody who has trained none. */
  readonly stock: readonly SingVoice[];
}

/** One request for the whole page, whatever it is asked by. */
let asked: Promise<Singing> | null = null;
function singingState(): Promise<Singing> {
  if (!asked) {
    asked = accessToken()
      .then((token) =>
        fetch('/api/voice', { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
      )
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => (said as { singing?: Singing } | null)?.singing ?? { configured: false, models: [], stock: [] })
      .catch(() => ({ configured: false, models: [], stock: [] }));
  }
  return asked;
}

/** Shared with the Pro Booth on purpose: one number, remembered once. */
const REMEMBERED = 'futurebox.singingModel';

export default function SingItMine({
  track,
  onMade,
}: {
  readonly track: Track;
  /** Hands back the new song so the room it lives in can keep it. */
  readonly onMade: (made: Track, audio: Blob) => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [state, setState] = useState<Singing | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [modelId, setModelId] = useState('');

  useEffect(() => {
    let alive = true;
    void singingState().then((said) => {
      if (alive) setState(said);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (modelId || !state) return;
    let kept: string | null = null;
    try {
      kept = window.localStorage.getItem(REMEMBERED);
    } catch {
      // A browser with storage off still gets to type a number.
    }
    const first = kept ?? state.models[0]?.id ?? '';
    if (first) setModelId(first);
  }, [modelId, state]);

  useBackLayer(open, () => setOpen(false));

  const chooseModel = useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 20);
    setModelId(digits);
    try {
      window.localStorage.setItem(REMEMBERED, digits);
    } catch {
      // Not worth telling anybody about; it just will not be remembered.
    }
  }, []);

  const sing = useCallback(async () => {
    setProblem('');
    setBusy(true);
    let key: string | null = null;
    try {
      const music = await readAudio(track.id);
      if (!music) {
        setProblem(t('mine.missing', 'That song is not on this device.'));
        return;
      }

      const form = new FormData();
      /* A whole song is well past the platform's body limit, so it goes to
         her own folder in storage and the route is handed the key. */
      const put = await attach(form, music, 'audio', 'song.wav');
      if (!put.ok) {
        setProblem(TOO_BIG_TO_SEND);
        return;
      }
      key = put.key;
      form.append('voiceModelId', modelId);
      /* The music comes back with the voice. This is a finished song, and
         somebody pressing "sing this in my voice" is asking to hear their
         song — not a dry acapella of it. */
      form.append('want', 'mix');
      form.append('seconds', String(Math.round(track.seconds || 0)));

      const token = await accessToken();
      const response = await fetch('/api/voice/sing', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!response.ok) {
        const said = (await response.json().catch(() => ({}))) as { message?: string };
        setProblem(said.message ?? t('mine.failed', 'That song could not be sung in your voice.'));
        return;
      }

      const sung = await response.blob();
      const id = `t-${Date.now()}`;
      await putAudio(id, sung);
      const length = (await durationOf(sung)) ?? track.seconds;
      const made: Track = {
        ...track,
        id,
        title: `${track.title} — ${t('mine.suffix', 'in my voice')}`,
        /* Said out loud. The voice on this recording is a model of somebody,
           and a release whose credits do not say so is the one thing this
           must not be. */
        models: [...track.models, 'Kits.AI singing model'],
        seconds: Math.round(length),
        createdAt: new Date().toISOString(),
        /* Whatever was separated belongs to the song it came from. */
        stems: undefined,
        mixOf: { source: track.id },
      };
      onMade(made, sung);
      setOpen(false);
    } catch {
      setProblem(t('mine.failed', 'That song could not be sung in your voice.'));
    } finally {
      /* The scratch file has done its job whichever way this went. */
      if (key) void dropWork(key);
      setBusy(false);
    }
  }, [modelId, onMade, t, track]);

  /* Nothing at all until the engine is switched on. A button that opens a
     panel to say "not available" is a button that wasted a press. */
  if (!state?.configured) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
      >
        <Mic2 className="w-3.5 h-3.5" />
        {t('mine.sing', 'Sing it in my voice')}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          /* Over everything, and through a portal: the room this sits in is a
             list inside a transformed layer, and a `fixed` box inside one of
             those is fixed to the layer rather than to the window. */
          <div className="fixed inset-0 z-[97] flex flex-col justify-end bg-black/70">
            <button
              type="button"
              aria-label={t('mine.close', 'Close')}
              onClick={() => setOpen(false)}
              className="flex-1"
            />
            <div className="max-h-[85vh] space-y-3 overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-bold text-white">
                    {t('mine.title', 'Sing this in your own voice')}
                  </p>
                  <p className="text-sm text-zinc-500 leading-snug truncate">{track.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('mine.close', 'Close')}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* What it does, before the money. The same sentence the booth
                  uses, for the same reason: somebody expecting it to fix their
                  singing has to know that before they buy it. */}
              <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                  'pro.singReal',
                  'This one is built for singing: it is a voice trained on one singer, and it follows a melody rather than fighting it. It needs a trained voice to sing in — yours, once you have made one at kits.ai — and it is the wrong tool for a spoken lane.',
                )}</Note>
              <Cost credits={perMinute(track.seconds || 0, CREDITS.sing)} />

              <div className="space-y-2">
                <SingVoices
                  mine={state.models}
                  stock={state.stock ?? []}
                  value={modelId}
                  onChange={chooseModel}
                  idPrefix={`mine-${track.id}`}
                />
                <Note className="text-sm text-zinc-500 leading-relaxed">{t(
                    'pro.singModelHelp',
                    'The voices above are the ones trained on your kits.ai account. If one is missing, type its number — it is in the address bar when you open that voice there. Your choice is remembered on this device.',
                  )}</Note>
                {/* The way to get one, for anybody who has not. */}
                <WatchTutorial />
              </div>

              {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

              <button
                type="button"
                onClick={() => void sing()}
                disabled={busy || !modelId}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('mine.go', 'Sing it')}
              </button>
              {busy && (
                <p className="text-sm text-zinc-500 leading-snug">
                  {t('mine.waiting', 'A conversion takes about as long as the song does. Leave this open.')}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
