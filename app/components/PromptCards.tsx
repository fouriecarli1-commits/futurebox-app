'use client';

/**
 * A row of cards, each one a sentence and a camera.
 *
 * ── The problem this solves, which is not a design problem ───────────────
 *
 *   "Die liedjies kom baie baie sleg uit."
 *
 * Some of that was what this app sent the engine, and that has been fixed
 * where it lives. The rest of it is the empty box. A generator is only as
 * good as the sentence it is given, and the sentence almost everybody gives
 * it under pressure is "write me a song" — which is how you get the song
 * everybody else got.
 *
 * A card that says *Ouma se kombuis* gets a better song out of the same
 * engine, because it got a better sentence in. `docs/PACKAGING.md` §4 calls
 * this the single best idea in the screenshots and it is right.
 *
 * ── How it works ─────────────────────────────────────────────────────────
 *
 * Press a card, pick a photograph, and `/api/photosong` comes back with a
 * title, a style and the words, which go straight into the room with the make
 * button already lit. The route has taken an `idea` and screened it since it
 * was written; this is the first thing that has ever sent one.
 *
 * ── The picture ──────────────────────────────────────────────────────────
 *
 * Sent once and not kept — the same posture as the voice clone and the
 * presenter. A photograph of somebody's kitchen is not something to store
 * because it was convenient, and the line under the row says so before
 * anybody presses anything rather than in a policy nobody opens.
 *
 * ── And the other row, which you talk to ─────────────────────────────────
 *
 * The same idea with a microphone instead of a camera: press *Vertel my van
 * jou dag*, say a sentence, and it comes back as a song. On a phone that is
 * the shortest way in this app has — nothing is typed at all.
 *
 * It is a different shape underneath and the difference is worth knowing.
 * A photograph is already on the phone; a sentence has to be recorded,
 * transcribed by a paid service, and only then written into a song. So it
 * costs a credit, the card says so **before** it is pressed rather than in a
 * receipt afterwards, and the recording is sent once and not kept — the same
 * posture as the picture.
 *
 * The microphone is asked for at the moment somebody presses a card, never on
 * mount. A page that reaches for the microphone because it loaded is a page
 * people close.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Mic, Square } from 'lucide-react';
import { promptsFor, type PromptCard } from '../data/prompts';
import { CREDITS, perMinute } from '../lib/credits';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import Note from './Note';

/** The route's own ceiling. Said here too, so the refusal arrives before the upload. */
const BIGGEST = 3 * 1024 * 1024;
/**
 * How long a card will listen for.
 *
 * Twenty-five seconds is a long time to talk to a phone and much longer than
 * any of these cards asks for. It stops on its own at the ceiling rather than
 * recording until somebody remembers to press stop — a runaway recording is a
 * bigger file, a longer wait and, since transcription is billed by the
 * minute, a bigger charge for the same one sentence.
 */
const LONGEST_SECONDS = 25;
/** What a clip under a minute costs to read. Printed on the card. */
const TALK_CREDITS = perMinute(LONGEST_SECONDS, CREDITS.transcribe);

export default function PromptCards({
  onSong,
}: {
  readonly onSong: (song: { title: string; style: string; lyrics: string; saw?: string }) => void;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const picker = useRef<HTMLInputElement | null>(null);
  /** Which card was pressed, so the file that arrives knows what it is for. */
  const asked = useRef<PromptCard | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [saw, setSaw] = useState('');
  const [available, setAvailable] = useState(false);
  /** Which talking card is recording, and how long it has been going. */
  const [taping, setTaping] = useState<PromptCard | null>(null);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);

  useEffect(() => {
    let live = true;
    void fetch('/api/photosong')
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => {
        if (live && said && typeof said.available === 'boolean') setAvailable(said.available);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  /* The microphone, let go of on the way out.
 
     A stream left open is a red dot in somebody's browser tab after they have
     moved on, and it is the sort of thing that gets an app distrusted rather
     than reported. */
  useEffect(() => () => {
    recorder.current?.stop();
    mic.current?.getTracks().forEach((one) => one.stop());
  }, []);

  useEffect(() => {
    if (!taping) return undefined;
    const tick = window.setInterval(() => {
      const gone = Math.round((Date.now() - started.current) / 1000);
      setSeconds(gone);
      if (gone >= LONGEST_SECONDS) recorder.current?.stop();
    }, 250);
    return () => window.clearInterval(tick);
  }, [taping]);

  /**
   * Say it, and get a song back.
   *
   * Two calls, in order, and only the first one costs: `/api/transcribe` reads
   * what was said and is billed by the minute, then `/api/songfrom` turns it
   * into a title, a style and the words. The card's own instruction goes with
   * it and the transcript goes as data — see the note at the top of that
   * route, which keeps the two apart on purpose.
   */
  const heard = async (card: PromptCard, clip: Blob, howLong: number) => {
    setBusy(card.id);
    try {
      const form = new FormData();
      form.append('file', clip, 'said.webm');
      form.append('seconds', String(Math.max(1, Math.round(howLong))));
      const read = await fetch('/api/transcribe', { method: 'POST', body: form });
      const words = (await read.json().catch(() => null)) as
        | { text?: string; error?: string; message?: string }
        | null;
      if (!read.ok || !words?.text?.trim()) {
        setProblem(refusalText(words, lang, t('cards.notHeard', 'Nothing could be made out of that. Try again somewhere quieter.')));
        return;
      }
      const said = words.text.trim();
      const made = await fetch('/api/songfrom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ said, idea: card.idea, lang }),
      });
      const song = (await made.json().catch(() => null)) as
        | { title?: string; style?: string; lyrics?: string; heard?: string; error?: string; message?: string }
        | null;
      if (!made.ok || !song?.lyrics) {
        setProblem(refusalText(song, lang, t('cards.failed', 'That did not come back.')));
        return;
      }
      onSong({ title: song.title ?? '', style: song.style ?? '', lyrics: song.lyrics, saw: song.heard });
      /* What it understood, before a generation is spent on the words. The
         same reason the picture cards print what they saw: a transcript that
         heard the wrong thing is obvious in one line and invisible in a
         finished song. */
      if (song.heard) setSaw(song.heard);
    } catch {
      setProblem(t('cards.offline', 'Could not reach the app’s server.'));
    } finally {
      setBusy(null);
    }
  };

  const talk = async (card: PromptCard) => {
    /* Pressing the card that is already recording stops it. One button, two
       states — a separate stop button somewhere else is a button somebody
       hunts for while still talking. */
    if (taping?.id === card.id) {
      recorder.current?.stop();
      return;
    }
    setProblem('');
    setSaw('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.current = stream;
      chunks.current = [];
      started.current = Date.now();
      const tape = new MediaRecorder(stream);
      recorder.current = tape;
      tape.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      tape.onstop = () => {
        const howLong = Math.max(1, (Date.now() - started.current) / 1000);
        stream.getTracks().forEach((one) => one.stop());
        mic.current = null;
        recorder.current = null;
        setTaping(null);
        setSeconds(0);
        const clip = new Blob(chunks.current, { type: tape.mimeType || 'audio/webm' });
        /* Two seconds is a slip of the thumb rather than a sentence, and
           sending it would cost a credit to be told nothing was said. */
        if (howLong < 2 || clip.size === 0) {
          setProblem(t('cards.tooShort', 'That was too short to hear. Hold the card and say a sentence.'));
          return;
        }
        void heard(card, clip, howLong);
      };
      tape.start();
      setTaping(card);
      setSeconds(0);
    } catch {
      /* Refused, or no microphone at all. Both look the same from here and
         both have the same answer. */
      setProblem(t('cards.noMic', 'This browser would not give the microphone. Check its permissions and try again.'));
    }
  };

  const take = async (file: File | undefined) => {
    const card = asked.current;
    if (!file || !card) return;
    setProblem('');
    setSaw('');
    if (file.size > BIGGEST) {
      setProblem(t('cards.tooBig', 'That picture is over 3 MB. A smaller one reads the same.'));
      return;
    }
    setBusy(card.id);
    try {
      const form = new FormData();
      form.append('picture', file);
      form.append('lang', lang);
      form.append('idea', card.idea);
      const response = await fetch('/api/photosong', { method: 'POST', body: form });
      const answer = (await response.json().catch(() => null)) as
        | { title?: string; style?: string; lyrics?: string; saw?: string; error?: string; message?: string }
        | null;
      if (!response.ok || !answer?.lyrics) {
        setProblem(refusalText(answer, lang, t('cards.failed', 'That did not come back.')));
        return;
      }
      onSong({
        title: answer.title ?? '',
        style: answer.style ?? '',
        lyrics: answer.lyrics,
        saw: answer.saw,
      });
      if (answer.saw) setSaw(answer.saw);
    } catch {
      setProblem(t('cards.offline', 'Could not reach the app’s server.'));
    } finally {
      setBusy(null);
      if (picker.current) picker.current.value = '';
    }
  };

  /* Not on the screen where there is no model behind it. A row of twenty-six
     buttons that all fail is worse than no row. */
  if (!available) return null;

  const cards = promptsFor(lang === 'af' ? 'af' : 'en');
  const talking = promptsFor(lang === 'af' ? 'af' : 'en', 'talk');

  return (
    <div className="space-y-2">
      {/* Sideways rather than a grid: a wall of twenty-six is a decision, and
          a row you flick through is a browse. `snap` so a card never comes to
          rest half off the edge of a phone. */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            disabled={busy !== null}
            onClick={() => {
              asked.current = card;
              picker.current?.click();
            }}
            className="flex min-h-[76px] w-[9.5rem] flex-shrink-0 snap-start flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-emerald-500/60 disabled:opacity-50"
          >
            {busy === card.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Camera className="h-4 w-4 text-emerald-400" />
            )}
            <span className="pt-2 text-sm font-semibold leading-snug text-zinc-100">
              {lang === 'af' ? card.af : card.en}
            </span>
          </button>
        ))}
      </div>

      <input
        ref={picker}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      <Note>
        {t(
          'cards.what',
          'Press one, pick a photograph, and it comes back as a title, a style and the words — ready to make. The picture is sent once and is not kept.',
        )}
      </Note>

      {/* ── Or say it ────────────────────────────────────────────────────

          The same row with a microphone. Nothing is typed at all, which on a
          phone is the shortest way in this app has.

          The price is on the card rather than in a receipt afterwards. It is
          the only one of these that costs anything, because a sentence has to
          be read by a paid service before it can be turned into a song, and a
          card that spends a credit without saying so beforehand is how an app
          loses somebody the first time they try it. */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 pt-1">
        {talking.map((card) => {
          const going = taping?.id === card.id;
          return (
            <button
              key={card.id}
              type="button"
              disabled={busy !== null || (taping !== null && !going)}
              onClick={() => void talk(card)}
              aria-pressed={going}
              /* A stable handle. The label changes to "Press to stop" while
                 it is recording, so anything that found this card by its
                 words loses it at the moment it most needs to watch it — the
                 probe did exactly that and reported the recording never
                 started while it was recording. */
              data-card={card.id}
              className={`flex min-h-[76px] w-[9.5rem] flex-shrink-0 snap-start flex-col justify-between rounded-2xl border p-3 text-left disabled:opacity-50 ${
                going
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-emerald-500/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {busy === card.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                ) : going ? (
                  <Square className="h-4 w-4 text-rose-400" />
                ) : (
                  <Mic className="h-4 w-4 text-emerald-400" />
                )}
                {/* Counting up while it listens, so nobody is talking into a
                    card that stopped recording ten seconds ago. */}
                {going && (
                  <span className="text-sm font-bold tabular-nums text-rose-300">
                    {LONGEST_SECONDS - seconds}s
                  </span>
                )}
              </span>
              <span className="pt-2 text-sm font-semibold leading-snug text-zinc-100">
                {going ? t('cards.stopTalking', 'Press to stop') : lang === 'af' ? card.af : card.en}
              </span>
            </button>
          );
        })}
      </div>

      <Note>
        {t('cards.talkWhat', 'Press one and talk. It listens for up to {seconds} seconds, writes down what you said, and turns it into a song. Costs {credits} credits, because reading it is a paid service. The recording is sent once and is not kept.')
          .replace('{seconds}', String(LONGEST_SECONDS))
          .replace('{credits}', String(TALK_CREDITS))}
      </Note>
      {problem && <p className="text-sm text-amber-300 leading-snug">{problem}</p>}
      {saw && (
        <p className="text-sm text-emerald-300 leading-snug">
          {t('cards.saw', 'It saw:')} {saw}
        </p>
      )}
    </div>
  );
}
