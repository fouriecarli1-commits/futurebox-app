'use client';

/**
 * What was said in an episode, and who said it.
 *
 * ── Why here and not in a room of its own ────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` asks for a transcripts room. A room would be a
 * fourteenth entry on a rail the whole app has been trying to keep legible,
 * for a thing that is never the reason anybody opens the app — nobody sets out
 * to make a transcript. They set out to publish an episode, and then want show
 * notes, a searchable page, and something to quote.
 *
 * So it lives on the episode, beside the dub, which is the other thing you do
 * to an episode after it exists.
 *
 * ── Why speakers matter more than the words ──────────────────────────────
 *
 * Speech-to-text answers with words. A wall of words is not a transcript —
 * a transcript of a conversation that does not say who is talking is unusable
 * for the two things people actually do with one: pulling a quote and writing
 * show notes. ElevenLabs will tell us, and this asks.
 *
 * The speakers come back as `speaker_0` and `speaker_1`. Those are names for a
 * machine, so they can be renamed here — and once named, the name is kept
 * against the show rather than the episode, since it is the same two people
 * next week.
 *
 * ── What it costs, and why it is said before the button ──────────────────
 *
 * Transcription is charged by the minute, and an hour-long episode is not a
 * rounding error. The price is on the button before it is pressed, the same
 * as everywhere else here.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Copy, Check, Users } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { CREDITS, perMinute } from '../lib/credits';
import Cost from './Cost';
import Note from './Note';
import Card from './Card';
import { useLang } from '../lib/i18n';

interface Turn {
  readonly speaker: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** Where the names for `speaker_0` and friends are kept, per show. */
const namesKey = (showId: string) => `futurebox.speakers.${showId}`;

function loadNames(showId: string): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(namesKey(showId)) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function saveNames(showId: string, names: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(namesKey(showId), JSON.stringify(names));
  } catch {
    // Storage refused. The names are lost next visit; the transcript is not.
  }
}

/** mm:ss, which is what somebody scrubbing to a quote actually wants. */
function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function Transcript({
  showId,
  episodeId,
  title,
  seconds,
  audioUrl,
  onClose,
}: {
  showId: string;
  episodeId: string;
  title: string;
  seconds: number;
  audioUrl: string;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [turns, setTurns] = useState<Turn[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setNames(loadNames(showId)), [showId]);

  const cost = perMinute(seconds, CREDITS.transcribe);

  const named = useCallback(
    (speaker: string) => names[speaker] ?? speaker.replace(/^speaker_/, 'Speaker '),
    [names],
  );

  const run = async () => {
    setBusy(true);
    setProblem(null);
    try {
      // Fetched here rather than on the server: the episode is already public
      // at that address, and passing the URL to a route would be asking it to
      // fetch whatever it is handed.
      const audio = await fetch(audioUrl);
      if (!audio.ok) throw new Error('audio');
      const blob = await audio.blob();

      const body = new FormData();
      body.append('file', blob, 'episode.mp3');
      body.append('seconds', String(seconds));
      body.append('speakers', 'yes');

      const token = await accessToken();
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        body,
      });
      const data = (await response.json().catch(() => ({}))) as {
        turns?: Turn[];
        message?: string;
      };
      if (!response.ok || !data.turns?.length) {
        setProblem(data.message ?? t('script.failed', 'That episode could not be read.'));
        return;
      }
      setTurns(data.turns);
    } catch {
      setProblem(t('script.unreachable', 'Could not fetch the episode to read it.'));
    } finally {
      setBusy(false);
    }
  };

  const asText = () =>
    (turns ?? [])
      .map((turn) => `[${clock(turn.start)}] ${named(turn.speaker)}: ${turn.text}`)
      .join('\n\n');

  const speakers = Array.from(new Set((turns ?? []).map((one) => one.speaker)));

  return (
    <Card
      title={t('script.title', 'What was said')}
      icon={<FileText className="w-4 h-4" />}
      aside={
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-zinc-500 hover:text-white flex-shrink-0"
        >
          {t('script.close', 'Close')}
        </button>
      }
    >

      {!turns && (
        <>
          <Note>{t(
              'script.what',
              'Reads the episode back with a timestamp on every line and a note of who is speaking. Show notes, a searchable page, and something to quote — without listening to it again with a pen.',
            )}</Note>
          <Cost waitMinutes={2} />
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {t('script.read', 'Read it back')} — {cost} {t('credits.credits', 'credits')}
          </button>
        </>
      )}

      {turns && (
        <>
          {speakers.length > 1 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 space-y-2">
              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                {t('script.whoIsWho', 'Who is who? Named once, and remembered for this show.')}
              </p>
              <div className="flex flex-wrap gap-2">
                {speakers.map((speaker) => (
                  <input
                    key={speaker}
                    value={names[speaker] ?? ''}
                    onChange={(event) => {
                      const next = { ...names, [speaker]: event.target.value.slice(0, 40) };
                      setNames(next);
                      saveNames(showId, next);
                    }}
                    placeholder={speaker.replace(/^speaker_/, 'Speaker ')}
                    aria-label={`${t('script.nameFor', 'Name for')} ${speaker}`}
                    className="w-36 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                ))}
              </div>
            </div>
          )}

          <ul className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {turns.map((turn, index) => (
              <li key={index} className="text-sm leading-relaxed">
                <span className="text-xs text-zinc-600 mr-2">{clock(turn.start)}</span>
                <span className="font-semibold text-emerald-300">{named(turn.speaker)}</span>
                <span className="text-zinc-300"> — {turn.text}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(`${title}\n\n${asText()}`).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('script.copied', 'Copied') : t('script.copy', 'Copy the whole thing')}
          </button>
        </>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </Card>
  );
}
