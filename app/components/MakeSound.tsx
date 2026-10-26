'use client';

/**
 * Generate a sound: words, a voice, and audio you can put on a timeline.
 *
 * ── What she asked, and her name for it ──────────────────────────────────
 *
 * The owner, 10 October 2026: *"Ek dink ook video editor, en video desk kan stem
 * generations hê, noem dit eerder, generate a sound, asook 'n podcast text tot
 * speech. Dit is tipies iets wat 'n mens daar ook sou kon gebruik."*
 *
 * Her name, not "voice generation": **Generate a sound**. That is a better
 * name than the one the app would have reached for, because what somebody
 * standing at a video timeline wants is not a *voice* — it is a sound to put
 * on the clip, and whether a voice made it is our business.
 *
 * ── Why one panel serves both halves of what she asked for ───────────────
 *
 * She named two things: a sound, and a podcast text-to-speech. They are the
 * same engine, the same route and the same price per character — the only
 * difference is how much text goes in. So this is one panel that says so,
 * rather than two controls side by side that would have to explain how they
 * differ when they do not. The cost moves with the length and is printed
 * before the press, which is the whole of what a person needs to know to tell
 * an advert line from an episode.
 *
 * Writing it as two would also have meant two places to keep one fact. This
 * app has found that fault in itself more than once.
 *
 * ── Where it came from, and what it does not duplicate ───────────────────
 *
 * `VoiceLab.tsx` already reads a script aloud, and this is not a copy of it.
 * VoiceLab is the room where a voice is CLONED: a live recording, a consent
 * gate, a stored confirmation. None of that belongs beside a video timeline,
 * and putting it there would mean two consent gates to keep right.
 *
 * So this takes the voices that already exist — the stock ones and whatever
 * the person has cloned in the voice room — and does one thing with them. A
 * voice is made in one place and used everywhere, which is the rule the voice
 * room already states about itself.
 *
 * ── It hands the audio up rather than keeping it ─────────────────────────
 *
 * The room decides where a sound goes: under the film in the editor, beside a
 * clip on the desk. This plays it, offers the file, and calls `onAudio`.
 * Nothing here knows what a timeline is.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Play, Square, Volume2, Download } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { downloadBlob, safeFilename } from '../lib/library';
import { CREDITS, readCost, songCost, type SongEngine } from '../lib/credits';
import { useLang } from '../lib/i18n';
import { withSaid } from '../lib/speak';
import SpeakButton from './SpeakButton';
import type { VoiceState } from './VoiceLab';
import VoicePicker from './VoicePicker';
import Card from './Card';
import Note from './Note';
import Cost from './Cost';
import SayItWrong from './SayItWrong';

/**
 * The longest script this panel will send.
 *
 * Not a technical limit — the route streams and reads far more than this. It
 * is a limit on how much money one press can spend beside a video timeline:
 * 6,000 characters is about forty credits and roughly seven minutes of
 * speech, which is a long podcast segment and far past anything anybody lays
 * under a clip. A box with no ceiling next to a Make button is how somebody
 * pastes a chapter and spends a plan.
 */
export const MOST_CHARACTERS = 6000;

/** Nothing shorter than this is a read; it is a typo. */
export const FEWEST_CHARACTERS = 2;

/**
 * What kind of sound. The owner, 14 October 2026: "Generate a sound" must make
 * sound effects and music too, not only speech. Three engines, three prices,
 * one box: what she types is the line to read, the sound to make, or the
 * music to play, and the button says which price applies before the press.
 */
export type SoundKind = 'voice' | 'effect' | 'music';
const KINDS: readonly SoundKind[] = ['voice', 'effect', 'music'];
/** Effect lengths offered; `0` leaves the length to the engine. */
const EFFECT_SECONDS = [0, 3, 5, 10] as const;
/** Music lengths offered, under a clip rather than a whole song. */
const MUSIC_SECONDS = [15, 30, 60] as const;

export default function MakeSound({
  onAudio,
  onUpgrade,
}: {
  /** A finished sound, handed up for the room to put somewhere. */
  onAudio?: (audio: Blob, name: string) => void;
  onUpgrade?: () => void;
}): React.ReactElement {
  const { lang, t } = useLang();

  const [voices, setVoices] = useState<VoiceState | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  /** The last read came from the backup voice, because the usual service was busy. */
  const [backup, setBackup] = useState(false);
  const [made, setMade] = useState<{ blob: Blob; url: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const [kind, setKind] = useState<SoundKind>('voice');
  const [effectSeconds, setEffectSeconds] = useState<number>(0);
  const [musicSeconds, setMusicSeconds] = useState<number>(30);
  const [engine, setEngine] = useState<SongEngine>('eleven');

  /* Which engine makes music here, so the price on the button is the price
     charged. Until it answers, the dearer one is shown — never the lower. */
  useEffect(() => {
    void fetch('/api/music')
      .then((answer) => (answer.ok ? answer.json() : null))
      .then((said: { engine?: string } | null) => { if (said?.engine === 'google') setEngine('google'); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void accessToken().then((token) =>
      fetch('/api/voice', { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
        .then((answer) => (answer.ok ? answer.json() : null))
        .then((said) => setVoices(said as VoiceState))
        .catch(() => undefined),
    );
  }, []);

  /* The url belongs to the blob and has to be let go of, or every press
     leaks one for as long as the tab is open. */
  useEffect(() => () => { if (made) URL.revokeObjectURL(made.url); }, [made]);

  const length = words.trim().length;
  const costs = kind === 'effect'
    ? CREDITS.sfx
    : kind === 'music'
      ? songCost(musicSeconds, engine)
      : readCost(length);

  const make = useCallback(async (): Promise<void> => {
    const script = words.trim();
    if (script.length < FEWEST_CHARACTERS || busy) return;
    setBusy(true);
    setProblem('');
    setBackup(false);
    try {
      const token = await accessToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const answer = kind === 'effect'
        ? await fetch('/api/voice/effect', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text: script, ...(effectSeconds ? { seconds: effectSeconds } : {}) }),
        })
        : kind === 'music'
          /* The same instrumental request the Pro Booth's parts use, so
             the music route's price, guard and refund are the ones that
             apply — not a second money path. */
          ? await fetch('/api/music', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              style: script,
              sections: [{ name: 'Music', lines: [], seconds: musicSeconds }],
              instrumental: true,
              seconds: musicSeconds,
            }),
          })
          : await fetch('/api/voice/speak', {
        method: 'POST',
        headers,
        /* The app's own language, so the route can pick the model
           ElevenLabs' own list says covers it. A caller that does not say
           gets the model chosen for English, which is how an Afrikaans line
           ends up read by something that has never seen one — that was a
           real fault in `Presenter.tsx` and it is not worth making twice. */
        body: JSON.stringify({ voiceId, text: script, language: lang }),
      });
      if (!answer.ok) {
        const said = (await answer.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
        setProblem(said.message ?? t('makesound.failed', 'That could not be read just now.'));
        if (said.needsPlan) onUpgrade?.();
        return;
      }
      const blob = await answer.blob();
      if (blob.size === 0) {
        /* An empty body with a 200 on it. It has happened, and handing an
           empty file to a timeline is a silent clip somebody only finds when
           they play the film back. */
        setProblem(t('makesound.empty', 'The engine answered with nothing. Nothing was charged — try it again.'));
        return;
      }
      if (made) URL.revokeObjectURL(made.url);
      setMade({ blob, url: URL.createObjectURL(blob) });
      setBackup(answer.headers.get('X-Read-Engine') === 'backup');
      onAudio?.(blob, script.slice(0, 40));
    } catch {
      setProblem(t('makesound.failed', 'That could not be read just now.'));
    } finally {
      setBusy(false);
    }
  }, [words, busy, voiceId, lang, t, onUpgrade, onAudio, made, kind, effectSeconds, musicSeconds]);

  const listen = (): void => {
    if (!made) return;
    if (playing) {
      player.current?.pause();
      setPlaying(false);
      return;
    }
    const audio = player.current ?? new Audio();
    player.current = audio;
    audio.src = made.url;
    audio.onended = () => setPlaying(false);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    /* The name is on a wrapper and not on the `Card`.

       `Card` takes a fixed set of props and forwards none of the rest, so a
       `data-` attribute handed to it is dropped on the floor — and TypeScript
       does not say so, because JSX does not type-check attribute names with a
       dash in them. It compiles, it reads correctly in the source, and it is
       not in the page. A probe looking for it would find nothing while a
       check reading the file would say it was there, which is the worst of
       both: a green check over a missing thing. */
    <div data-makesound>
    <Card title={t('makesound.title', 'Generate a sound')}>
      <Note className="text-sm leading-relaxed text-zinc-400">
        {t(
          'makesound.what',
          'A voice reading your words \u2014 a line or a whole podcast script \u2014 a sound effect, or music. It comes back as audio you can lay under the film, and the price is on the button before you press.',
        )}
      </Note>

      {/* Not switched on, said plainly rather than by a button that fails.
          `configured` is the server's own answer about whether a key reached
          this app, and it is the one thing this panel cannot work around. */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('makesound.kind', 'What kind of sound')}>
        {KINDS.map((one) => (
          <button
            key={one}
            type="button"
            data-makesoundkind={one}
            aria-pressed={kind === one}
            onClick={() => { setKind(one); setProblem(''); }}
            className={`min-h-[44px] rounded-xl border px-3.5 text-sm font-bold ${
              kind === one ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-zinc-700 text-zinc-300'
            }`}
          >
            {one === 'voice'
              ? t('makesound.kindVoice', 'A voice')
              : one === 'effect' ? t('makesound.kindEffect', 'A sound effect') : t('makesound.kindMusic', 'Music')}
          </button>
        ))}
      </div>

      {kind !== 'music' && voices !== null && !voices.configured ? (
        <p data-makesoundoff className="text-sm leading-relaxed text-amber-300">
          {t(
            'makesound.off',
            'The voice engine is not switched on for this app yet, so nothing here can be read aloud. Everything else on this timeline still works.',
          )}
        </p>
      ) : (
        <>
          {kind === 'voice' && (
          <div>
            <span className="text-sm text-zinc-400">{t('makesound.voice', 'Whose voice')}</span>
            <div className="mt-1.5">
              <VoicePicker
                mine={voices?.mine ?? []}
                stock={voices?.stock ?? []}
                value={voiceId}
                onChange={setVoiceId}
              />
            </div>
          </div>
          )}

          {kind !== 'voice' && (
            <div className="flex flex-wrap items-center gap-1.5" data-makesoundlength>
              <span className="text-sm text-zinc-400">{t('makesound.length', 'How long')}</span>
              {(kind === 'effect' ? EFFECT_SECONDS : MUSIC_SECONDS).map((many) => {
                const on = (kind === 'effect' ? effectSeconds : musicSeconds) === many;
                return (
                  <button
                    key={many}
                    type="button"
                    aria-pressed={on}
                    onClick={() => (kind === 'effect' ? setEffectSeconds(many) : setMusicSeconds(many))}
                    className={`min-h-[36px] rounded-lg border px-2.5 text-xs font-semibold ${
                      on ? 'border-emerald-400 text-emerald-200' : 'border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {many === 0 ? t('makesound.lengthAuto', 'As long as it needs') : `${many}s`}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            <label htmlFor="make-sound-words" className="text-sm text-zinc-400">
              {kind === 'effect'
                ? t('makesound.wordsEffect', 'What the sound is')
                : kind === 'music'
                  ? t('makesound.wordsMusic', 'What the music is like')
                  : t('makesound.words', 'What it should say')}
            </label>
            <span className="relative block">
              <textarea
                id="make-sound-words"
                data-makesoundwords
                value={words}
                onChange={(event) => setWords(event.target.value.slice(0, MOST_CHARACTERS))}
                rows={5}
                placeholder={kind === 'effect'
                  ? t('makesound.effectHint', 'Rain on a tin roof, then thunder far away.')
                  : kind === 'music'
                    ? t('makesound.musicHint', 'Warm acoustic guitar, slow and hopeful, no singing.')
                    : t('makesound.wordsHint', 'A line for the clip, or a whole script to be read.')}
                className="mt-1.5 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden pr-11"
              />
              <SpeakButton onHeard={(said) => setWords((was) => withSaid(was, said).slice(0, MOST_CHARACTERS))} className="absolute bottom-2 right-2" />
            </span>
            {/* How much is left, and only once it matters. A counter on an
                empty box is a limit somebody has to think about before they
                have typed anything. */}
            {length > MOST_CHARACTERS - 1000 && (
              <p data-makesoundleft className="pt-1 text-xs text-zinc-500">
                {t('makesound.left', '{n} characters left')
                  .replace('{n}', String(MOST_CHARACTERS - length))}
              </p>
            )}
          </div>

          <button
            type="button"
            data-makesoundgo
            onClick={() => void make()}
            disabled={busy || length < FEWEST_CHARACTERS}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-bold text-onAccent disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {busy
              ? (kind === 'voice' ? t('makesound.making', 'Reading it') : t('makesound.makingSound', 'Making it'))
              : `${t('makesound.go', 'Generate a sound')} — ${costs} ${t('video.credits', 'credits')}`}
          </button>
          {!busy && <Cost waitMinutes={1} className="w-full justify-center" />}

          {problem && <p className="text-sm leading-relaxed text-rose-400">{problem}</p>}
          {backup && made && !problem && (
            <p className="text-xs leading-relaxed text-zinc-400">
              {t('voice.backupRead', 'The usual voice service was busy, so a backup voice read this. Try again later for the voice you picked.')}
            </p>
          )}

          {made && (
            <div data-makesoundmade className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-makesoundplay
                onClick={listen}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white"
              >
                {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? t('makesound.stop', 'Stop') : t('makesound.listen', 'Listen')}
              </button>
              <button
                type="button"
                data-makesoundsave
                onClick={() => downloadBlob(made.blob, safeFilename(words.trim().slice(0, 40) || 'sound', 'mp3'))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white"
              >
                <Download className="h-4 w-4" />
                {t('video.save')}
              </button>
              {/* Where it went, said rather than assumed. A sound that
                  silently became the bed under the film is a change somebody
                  did not ask for and cannot see. */}
              {onAudio && (
                <span className="text-xs leading-snug text-zinc-500">
                  {t('makesound.landed', 'It is on the timeline as the sound under the film.')}
                </span>
              )}
            </div>
          )}

          {/* ── A word that came out wrong ────────────────────────

              `check:earsopen` caught this room the first time it was swept:
              five rooms already speak and every one of them carries the
              report, and this one did not. The pronunciation dictionary can
              only be built out of what people tell us — one ear found
              `-tjie`, and every member's ear finds the rest — so a room that
              speaks and has nowhere to say "that is not how you say it" is a
              room where the fault is heard and lost.

              Under the made sound rather than above the box, because the
              moment somebody has a word to report is the moment after they
              have pressed Listen. */}
          {made && kind === 'voice' && <SayItWrong surface="makesound" spoken said={words.trim().slice(0, 200)} />}
        </>
      )}
    </Card>
    </div>
  );
}
