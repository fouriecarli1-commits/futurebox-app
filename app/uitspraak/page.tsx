'use client';

/**
 * The pronunciation booth: say a word, see its sounds, hear it back.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Does that mean that I can use the booth to
 * record phonetic sounds?"*
 *
 * Yes. Somebody who speaks the language says the word into the phone, a
 * listening model writes the narrow IPA for the sounds that speaker actually
 * made, and the voice that will sing it reads it back so she can hear
 * whether it is right before anything is kept.
 *
 * ── Why this is its own page and not a card in the Pro Booth ─────────────
 *
 * Because there is ONE dictionary. `lib/server/sayit.ts` applies it to every
 * read in the whole app through two environment variables — one id, one
 * version, shared by everybody. A rule contributed from a member's room would
 * change how the app speaks for every other member, and one bad rule would
 * break every read at once.
 *
 * So this is an owner's tool, guarded by `POST_SECRET` like the reading test
 * beside it, and it lives next to that rather than inside a room. A
 * member-facing version needs a dictionary per member, which is a different
 * and larger piece of work.
 *
 * ── The order of the three steps is the whole design ─────────────────────
 *
 * Record, then READ IT BACK, then keep. The playback is not a nicety: a
 * respelling that is a bit off sounds a bit off, while a phonetic rule that
 * is wrong makes the voice say a different word with total confidence, in a
 * language the person writing the rule may not speak. Her ears are the last
 * gate and the only one that can catch that.
 *
 * ── Three presses, and the gaps between them are the design ──────────────
 *
 * **Write down the sounds** transcribes and saves nothing.
 * **Keep it** puts the rule in FutureBox's own list — `said_words` — and
 * still does not touch her ElevenLabs account.
 * **Put them on ElevenLabs** replaces the dictionary on the account with the
 * whole list, written rules and heard ones together, and writes down which
 * version is live so every read uses it.
 *
 * Three rather than one because a person listens between the first and the
 * second, and because the difference between "kept" and "live" is exactly
 * where somebody would otherwise assume the job was done. The page says
 * which it is, every time.
 *
 * Carli, 10 October 2026: *"Gaan aan met die keep button."* Before it, this
 * page showed her JSON to paste into a source file by hand.
 */

import React, { useRef, useState } from 'react';

/**
 * The languages offered.
 *
 * The six Gemma 4 was trained on, which are the ones she named, plus English
 * — because a loanword in an Afrikaans lyric is said the English way and
 * that is exactly the kind of word a dictionary has to carry.
 *
 * Written out rather than a free text box: the model is told the language and
 * a typo in it is a model guessing, which is the one failure that produces a
 * confident wrong answer rather than a refusal.
 */
const LANGUAGES = [
  'isiXhosa', 'isiZulu', 'Afrikaans', 'Sesotho', 'Setswana', 'Shona', 'English',
] as const;

/** Long enough for a phrase, and a hard stop so nothing records a verse. */
const MOST_SECONDS = 8;

interface Rule {
  readonly string_to_replace: string;
  readonly type: string;
  readonly phoneme?: string;
  readonly alphabet?: string;
  readonly alias?: string;
}

interface Heard {
  readonly ipa: string;
  readonly spelt: string;
  readonly sure: number;
  readonly trouble: string;
  readonly keepable: boolean;
  readonly rules: readonly Rule[];
}

export default function PronunciationBooth(): React.ReactElement {
  const [key, setKey] = useState('');
  const [word, setWord] = useState('');
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(0);
  const [take, setTake] = useState<{ url: string; base64: string; mime: string } | null>(null);
  const [heard, setHeard] = useState<Heard | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [kept, setKept] = useState('');
  const [pushing, setPushing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  /* Every take replaces the last, and the last one's object URL goes with
     it. A booth somebody records thirty words in is thirty held recordings
     otherwise, on a phone. */
  const keepTake = (blob: Blob): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setTake((was) => {
        if (was) URL.revokeObjectURL(was.url);
        return {
          url: URL.createObjectURL(blob),
          base64: url.slice(url.indexOf(',') + 1),
          mime: blob.type || 'audio/webm',
        };
      });
    };
    reader.readAsDataURL(blob);
  };

  const stop = (): void => {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((one) => one.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setRecording(false);
    setLeft(0);
  };

  const record = async (): Promise<void> => {
    if (recording) { stop(); return; }
    setProblem('');
    setHeard(null);
    let stream: MediaStream;
    try {
      /* One channel. A word is a word in mono and two channels is twice the
         bytes for nothing. */
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    } catch {
      setProblem('The microphone was not allowed. Turn it on for this site and try again.');
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size) keepTake(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setLeft(MOST_SECONDS);
    const tick = window.setInterval(() => {
      setLeft((was) => {
        if (was <= 1) {
          window.clearInterval(tick);
          stop();
          return 0;
        }
        return was - 1;
      });
    }, 1000);
  };

  const listen = async (): Promise<void> => {
    if (!take || !word.trim() || busy) return;
    setBusy(true);
    setProblem('');
    setHeard(null);
    try {
      const answer = await fetch(`/api/hearword?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: take.base64,
          mime: take.mime,
          word: word.trim(),
          language,
        }),
      });
      if (!answer.ok) {
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setProblem(why.message ?? `That could not be read. (${answer.status})`);
        return;
      }
      setHeard(await answer.json() as Heard);
    } catch {
      setProblem('That could not be sent. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Keep it.
   *
   * A separate press from the transcription, and the thing that happens
   * between them is her listening. A page that transcribed and saved in one
   * go would make the playback decorative — the rule would already be on the
   * account by the time she heard it was wrong.
   *
   * It goes into the app's table, not onto ElevenLabs. The push is the third
   * press below, and the difference is said out loud rather than implied:
   * the gap between "kept" and "live" is exactly where somebody would
   * otherwise assume the job was done.
   */
  const keep = async (): Promise<void> => {
    if (!heard || !heard.keepable || busy) return;
    setBusy(true);
    setProblem('');
    setKept('');
    try {
      const answer = await fetch(`/api/hearword?key=${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.trim(),
          language,
          ipa: heard.ipa,
          /* Only a respelling the model actually gave. `rulesFor` never
             invents one, and this must not either: an invented respelling of
             a click is the confidently wrong word the whole booth exists to
             prevent. */
          alias: heard.rules.find((one) => one.type === 'alias')?.alias ?? '',
          sure: heard.sure,
          trouble: heard.trouble,
        }),
      });
      const said = (await answer.json().catch(() => ({}))) as
        { kept?: string; words?: number | null; message?: string };
      if (!answer.ok) {
        setProblem(said.message ?? `It could not be kept. (${answer.status})`);
        return;
      }
      setKept(said.words == null
        ? `“${said.kept}” is kept. Put them on ElevenLabs to make it live.`
        : `“${said.kept}” is kept — ${said.words} heard word${said.words === 1 ? '' : 's'} now.`
          + ' Put them on ElevenLabs to make it live.');
    } catch {
      setProblem('That could not be sent. Check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Put them on her account.
   *
   * The same page the written rules have always gone through, which now
   * sends both halves and writes down which dictionary is live — so this is
   * the last press and there is nothing to paste into Vercel afterwards.
   */
  const push = async (): Promise<void> => {
    if (pushing || !key) return;
    setPushing(true);
    setProblem('');
    try {
      const answer = await fetch(`/api/eleven/dictionary?key=${encodeURIComponent(key)}`);
      const said = (await answer.json().catch(() => ({}))) as
        { ok?: boolean; rules?: number; nowLive?: string; why?: string; pointing?: string };
      if (!answer.ok || !said.ok) {
        setProblem(said.why ?? said.pointing ?? `That did not go up. (${answer.status})`);
        return;
      }
      setKept(`${said.rules ?? 0} rules are on the account. ${said.nowLive ?? ''}`);
    } catch {
      setProblem('That could not be sent. Check the connection and try again.');
    } finally {
      setPushing(false);
    }
  };

  const BOX = 'w-full rounded-xl border border-zinc-800 bg-black/30 p-3 text-[14px]'
    + ' text-zinc-200 outline-none focus:border-emerald-500/60';
  const BUTTON = 'min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2'
    + ' text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-200">
      <div className="mx-auto max-w-xl space-y-5">
        <header className="space-y-1">
          <h1 className="text-xl font-bold">Uitspraakhokkie</h1>
          <p className="text-[13px] leading-relaxed text-zinc-500">
            Say one word, and the machine writes down the sounds. A click has no
            respelling in any other language’s letters, so this is the only way
            an isiXhosa word can go into the dictionary correctly.
          </p>
        </header>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Owner key
          </span>
          <input
            type="password"
            data-uitspraakkey
            value={key}
            onChange={(event) => setKey(event.target.value)}
            className={BOX}
            /* Not the name of the environment variable. `check:security`
               scans the built client bundle for every secret NAME, and it
               caught this within the minute — rightly: a page that prints
               what the variable is called tells anybody who finds the page
               half of what they need. She knows which key to paste. */
            placeholder="paste it"
          />
        </label>

        {/* ── 1. What is being said ─────────────────────────────────────
            Both before the recording, because the model is told them and a
            recording made before anybody decided what the word was is a
            recording that has to be done again. */}
        <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            1 · The word
          </p>
          <input
            data-uitspraakword
            value={word}
            onChange={(event) => setWord(event.target.value)}
            maxLength={80}
            className={BOX}
            placeholder="Xhosa"
          />
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((one) => (
              <button
                key={one}
                type="button"
                data-uitspraaklang={one}
                aria-pressed={language === one}
                onClick={() => setLanguage(one)}
                className={`rounded-lg border px-2 py-1 text-[12px] ${
                  language === one
                    ? 'border-emerald-500/70 bg-emerald-500/15'
                    : 'border-zinc-700'
                }`}
              >
                {one}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. The recording ──────────────────────────────────────────── */}
        <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            2 · Say it once
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-uitspraakrec
              onClick={() => { void record(); }}
              className={BUTTON}
            >
              {recording ? `Stop · ${left}s` : take ? 'Say it again' : 'Record'}
            </button>
            {take && !recording && (
              /* eslint-disable-next-line jsx-a11y/media-has-caption -- one
                 spoken word being checked by the person who just said it;
                 there is nothing to caption. */
              <audio data-uitspraaktake src={take.url} controls className="h-9" />
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-zinc-500">
            Say the word on its own, at an ordinary speed. Not slowly — a word
            stretched out is said differently from the same word in a sentence,
            and the stretched version is what would go in the dictionary.
          </p>
        </div>

        {/* ── 3. What it heard ──────────────────────────────────────────── */}
        <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            3 · The sounds
          </p>
          <button
            type="button"
            data-uitspraakgo
            disabled={!take || !word.trim() || !key || busy}
            onClick={() => { void listen(); }}
            className={BUTTON}
          >
            {busy ? 'Listening…' : 'Write down the sounds'}
          </button>

          {heard && (
            <div className="space-y-2">
              <p data-uitspraakipa className="text-2xl">{heard.ipa}</p>
              <p className="text-[12px] text-zinc-500">
                It heard “{heard.spelt || '—'}”, {Math.round(heard.sure * 100)}% sure.
              </p>
              {heard.trouble && (
                <p
                  data-uitspraaktrouble
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300"
                >
                  {heard.trouble}
                </p>
              )}
              {!heard.keepable && (
                <p
                  data-uitspraakunsure
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-300"
                >
                  Not sure enough to keep. Record it again, closer to the
                  microphone and in a quieter room. A phonetic rule that is
                  wrong makes the voice say a different word with total
                  confidence.
                </p>
              )}
              {heard.keepable && (
                <>
                  <p className="text-[12px] leading-relaxed text-zinc-500">
                    Play your own recording above and read the sounds beside
                    it. Keep it only if they agree — a phonetic rule that is
                    wrong makes the voice say a different word with total
                    confidence.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-uitspraakkeep
                      disabled={busy || !key}
                      onClick={() => { void keep(); }}
                      className={BUTTON}
                    >
                      {busy ? 'Keeping…' : 'Keep it'}
                    </button>
                    <button
                      type="button"
                      data-uitspraakpush
                      disabled={pushing || !key}
                      onClick={() => { void push(); }}
                      className={BUTTON}
                    >
                      {pushing ? 'Putting them up…' : 'Put them on ElevenLabs'}
                    </button>
                  </div>
                  <p className="text-[12px] leading-relaxed text-zinc-500">
                    Keeping puts it in FutureBox’s own list. Putting them up
                    replaces the dictionary on your ElevenLabs account with
                    that whole list and makes it the one every read uses —
                    nothing to paste into Vercel afterwards.
                  </p>
                  {/* Wrapped rather than scrolled sideways. `check:onlyboothmoves`
                      asked for it and it is right on a phone: a JSON block that
                      slides under a thumb is one she has to drag to read, and
                      the only thing in here that must not break mid-way is the
                      IPA string — which `break-all` keeps on one visual run
                      short enough to read either way. */}
                  <pre
                    data-uitspraakrules
                    className="whitespace-pre-wrap break-all rounded-xl border border-zinc-800 bg-black/40 p-3 text-[12px] text-zinc-300"
                  >
                    {JSON.stringify(heard.rules, null, 2)}
                  </pre>
                </>
              )}
            </div>
          )}

          {kept && (
            <p
              data-uitspraakkept
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300"
            >
              {kept}
            </p>
          )}

          {problem && (
            <p data-uitspraakproblem className="text-[13px] text-amber-300">{problem}</p>
          )}
        </div>
      </div>
    </main>
  );
}
