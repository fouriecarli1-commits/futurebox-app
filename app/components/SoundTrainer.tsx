'use client';

/**
 * Train a sound of your own, from your own songs.
 *
 * ElevenLabs will train a music model on a handful of finished tracks and then
 * generate in that sound. This is where it belongs: the channel is where
 * somebody's music already is, so the training set is a few ticks rather than
 * a file dialogue, and the songs it offers are ones this app made — which is
 * the honest answer to the question every music model has to answer about
 * where its training data came from.
 *
 * Bringing your own recordings in is here too, because plenty of people arrive
 * with a catalogue already. That path asks for the ownership in words, and the
 * server stores the answer with the finetune. It is a heavier claim, so it
 * reads as one.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Music4, Sparkles, Trash2, Upload } from 'lucide-react';
import { loadTracks, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { forgetSound, loadSounds, NO_SOUNDS, training, train, type Sounds } from '../lib/sounds';
import { CREDITS } from '../lib/credits';
import { loadWallet, NO_WALLET, type Wallet } from '../lib/wallet';
import { useLang } from '../lib/i18n';
import Cost from './Cost';

/** How often to ask again while something is still training. */
const ASK_EVERY_MS = 20_000;
/** Fewer than this teaches it one song rather than a sound. The server agrees. */
const FEWEST = 3;

export default function SoundTrainer({
  reloadKey,
  onUpgrade,
  standalone = false,
}: {
  reloadKey: number;
  onUpgrade: () => void;
  /**
   * True when this is the whole room rather than a panel inside another one.
   *
   * The difference is what happens when there is nothing to show: a panel that
   * cannot be used should disappear, and a room that cannot be used must say
   * why, because somebody walked in on purpose and a blank page is not an
   * answer to that.
   */
  standalone?: boolean;
}): React.ReactElement | null {
  const { t } = useLang();

  const [sounds, setSounds] = useState<Sounds>(NO_SOUNDS);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [brought, setBrought] = useState<File[]>([]);
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  /** So the cost can be shown against what they actually have. */
  const [wallet, setWallet] = useState<Wallet>(NO_WALLET);

  const load = useCallback(() => {
    loadSounds().then(setSounds);
  }, []);

  useEffect(() => {
    setTracks(loadTracks());
    load();
    loadWallet().then(setWallet);
  }, [load, reloadKey]);

  // Ask again only while something is actually training, and stop when it is
  // not: a screen that polls a finished list forever is a bill with no reader.
  const anyTraining = sounds.mine.some(training);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!anyTraining) return;
    const tick = window.setInterval(() => loadRef.current(), ASK_EVERY_MS);
    return () => window.clearInterval(tick);
  }, [anyTraining]);

  const toggle = useCallback((id: string) => {
    setPicked((was) => {
      const next = new Set(was);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const start = useCallback(async () => {
    setProblem(null);
    setBusy('train');
    try {
      const origin = brought.length > 0 ? 'brought' : 'channel';
      const files =
        origin === 'brought'
          ? brought.map((file) => ({ blob: file as Blob, filename: file.name }))
          : (
              await Promise.all(
                tracks
                  .filter((track) => picked.has(track.id))
                  .map(async (track) => {
                    const blob = await readAudio(track.id);
                    // A song whose audio has been cleared out of the device is
                    // skipped rather than sent as nothing.
                    return blob ? { blob, filename: `${track.title || track.id}.mp3` } : null;
                  }),
              )
            ).filter((one): one is { blob: Blob; filename: string } => one !== null);

      if (files.length < FEWEST) {
        setProblem(
          t('sound.tooFew', 'Pick at least three songs. Fewer than that teaches it one song, not a sound.'),
        );
        return;
      }

      const done = await train(name.trim(), genre.trim(), origin, files);
      if (!done.ok) {
        setProblem(done.message);
        if (done.needsPlan) onUpgrade();
        return;
      }
      setOpen(false);
      setPicked(new Set());
      setBrought([]);
      setName('');
      setGenre('');
      setConfirmed(false);
      load();
    } finally {
      setBusy(null);
    }
  }, [brought, genre, load, name, onUpgrade, picked, t, tracks]);

  const remove = useCallback(
    async (id: string) => {
      setBusy(id);
      await forgetSound(id);
      setBusy(null);
      load();
    },
    [load],
  );

  // Nothing to say when the app has no music service or nobody is signed in.
  if (!sounds.configured || !sounds.signedIn) {
    if (!standalone) return null;
    return (
      <p className="text-sm text-zinc-500 py-10 text-center border border-dashed border-zinc-800 rounded-2xl leading-relaxed">
        {sounds.signedIn
          ? t('sound.noEngine', 'Training a sound needs the music engine, which is not switched on for this app.')
          : t('sound.signIn', 'Sign in to train a sound of your own.')}
      </p>
    );
  }

  const chosen = brought.length > 0 ? brought.length : picked.size;
  const ready = chosen >= FEWEST && name.trim().length >= 5 && genre.trim().length > 0 && confirmed;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {t('sound.title', 'A sound of your own')}
          </p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t(
              'sound.note',
              'Train on a handful of your own songs and new ones come out sounding like them. It takes five or ten minutes, and you can close this while it runs.',
            )}
          </p>
          {/* The most expensive thing this app does, said before anybody
              starts rather than at the moment they are refused. */}
          <p className="text-sm font-semibold text-amber-300 leading-snug pt-1.5">
            {CREDITS.finetune} {t('sound.creditsEach', 'credits each time')}
            {wallet.signedIn && (
              <span className="text-zinc-500 font-normal">
                {' · '}
                {t('sound.youHave', 'you have')} {wallet.balance}
              </span>
            )}
          </p>
        </div>
      </div>

      {sounds.mine.length > 0 && (
        <div className="space-y-1.5">
          {sounds.mine.map((sound) => (
            <div
              key={sound.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-200 truncate">{sound.name}</span>
                <span className="block text-xs text-zinc-500 truncate">
                  {sound.genre} · {sound.tracks} {t('sound.songs', 'songs')}
                  {sound.status === 'completed'
                    ? ` · ${t('sound.ready', 'ready to use')}`
                    : sound.status === 'blocked'
                      ? ` · ${t('sound.blocked', 'refused — the music service did not accept the songs')}`
                      : sound.status === 'failed'
                        ? ` · ${t('sound.failed', 'training failed')}`
                        : ` · ${t('sound.training', 'training…')}`}
                </span>
              </span>
              {training(sound) && <Loader2 className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0" />}
              <button
                type="button"
                onClick={() => void remove(sound.id)}
                disabled={busy === sound.id}
                title={t('sound.forget', 'Delete this sound')}
                className="text-zinc-500 hover:text-red-400 flex-shrink-0"
              >
                {busy === sound.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {sounds.keep < 1 ? (
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-300 text-sm font-semibold"
        >
          {t('sound.needsPlan', 'Training a sound of your own starts on Studio')}
        </button>
      ) : sounds.mine.length >= sounds.keep ? (
        <p className="text-sm text-zinc-500">
          {t('sound.atLimit', 'Your plan keeps')} {sounds.keep}.{' '}
          {t('sound.removeFirst', 'Delete one to train another.')}
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2"
        >
          <Music4 className="w-4 h-4" />
          {t('sound.start', 'Train a sound')}
        </button>
      ) : (
        <div className="space-y-3 pt-1">
          {brought.length === 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-zinc-300">
                {t('sound.pick', 'Pick the songs it should learn from')}
              </p>
              {tracks.length === 0 ? (
                <p className="text-sm text-zinc-500 leading-snug">
                  {t('sound.noTracks', 'There is nothing in your channel yet. Make a few songs first, or bring your own in below.')}
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {tracks.map((track) => (
                    <label
                      key={track.id}
                      className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        checked={picked.has(track.id)}
                        onChange={() => toggle(track.id)}
                        className="w-4 h-4 accent-emerald-500 flex-shrink-0"
                      />
                      <span className="min-w-0 flex-1 text-sm text-zinc-300 truncate">{track.title}</span>
                      <span className="text-xs text-zinc-600 flex-shrink-0">{track.genre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center justify-center gap-1.5 cursor-pointer px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-300 hover:border-zinc-700">
            <Upload className="w-4 h-4" />
            {brought.length > 0
              ? `${brought.length} ${t('sound.broughtIn', 'brought in')}`
              : t('sound.bringOwn', 'Or bring your own recordings in')}
            <input
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(event) => {
                setBrought(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
          </label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('sound.name', 'What to call this sound')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <input
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            placeholder={t('sound.genre', 'What kind of music is it — afro house, gospel, rock…')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />

          {/* Not buried, and not pre-ticked. The wording changes with the claim. */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <span className="text-sm text-zinc-400 leading-snug">
              {brought.length > 0
                ? t(
                    'sound.confirmBrought',
                    'This music is mine. I made these recordings or hold the rights to them, I am not training on anybody else’s records, and I understand this confirmation is kept.',
                  )
                : t(
                    'sound.confirmChannel',
                    'These are my songs, made here, and I am happy for a model to be trained on them.',
                  )}
            </span>
          </label>

          {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

          {/* Training runs on somebody else's GPUs for five or ten minutes.
              Nothing moves on screen while it does, so an unwarned person
              presses again — and is charged again. */}
          <Cost waitMinutes={8} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void start()}
              disabled={!ready || busy === 'train'}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'train' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy === 'train'
                ? t('sound.sending', 'Sending the songs up…')
                : `${t('sound.trainOn', 'Train on')} ${chosen} — ${CREDITS.finetune} ${t('sound.credits', 'credits')}`}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-400"
            >
              {t('sound.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
