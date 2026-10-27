'use client';

/**
 * Taking the background out of a shot, or an item out of it, through fal.ai.
 *
 * The two presses the Video Editor could only describe until 27 October
 * 2026. Everything the route checks is asked here first, in words, so a
 * refusal is never the first time somebody hears a rule:
 *
 *  - which shot (the one picked on the clock), and how long it is, because
 *    the price is per five seconds and is shown on the button;
 *  - for an item, what to take out, screened on the server as `footage`;
 *  - the two boxes: the clip goes to fal.ai outside South Africa, and the
 *    person pressing is 18 or older (docs/FAL-TERME.md).
 *
 * The clip goes straight from the phone into our own private storage, the
 * engine reads it from there for fifteen minutes, and the finished clip
 * comes back onto the clock beside the shot it was made from.
 */
import React, { useEffect, useState } from 'react';
import { Eraser, Loader2, UserRoundX } from 'lucide-react';
import { accessToken, getStorageClient } from '../lib/cloud';
import { CREDITS, creditsSaid, filterCost } from '../lib/credits';
import { measure } from '../lib/stitch';

type Job = 'cutout' | 'erase';
const MOST_SECONDS = 20;
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export default function FootageEngine({
  clip,
  name,
  t,
  onBack,
}: {
  /** The picked shot's material, or null when nothing is picked. */
  readonly clip: Blob | null;
  readonly name: string;
  readonly t: (key: string, fallback: string) => string;
  /** The finished clip, to put on the clock beside the shot. */
  readonly onBack: (file: File) => void;
}): React.ReactElement {
  const [seconds, setSeconds] = useState<number | null>(null);
  const [job, setJob] = useState<Job>('cutout');
  const [words, setWords] = useState('');
  const [abroad, setAbroad] = useState(false);
  const [adult, setAdult] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'working'>('idle');
  const [said, setSaid] = useState('');

  useEffect(() => {
    let live = true;
    setSeconds(null);
    if (!clip) return () => { live = false; };
    void measure(clip).then((seen) => { if (live) setSeconds(Number.isFinite(seen.seconds) ? seen.seconds : null); }).catch(() => undefined);
    return () => { live = false; };
  }, [clip]);

  const price = seconds ? filterCost(seconds, CREDITS[job]) : null;
  const tooLong = seconds !== null && seconds > MOST_SECONDS;
  const ready = Boolean(clip) && seconds !== null && !tooLong && abroad && adult
    && (job === 'cutout' || words.trim().length > 0) && state === 'idle';

  const go = async (): Promise<void> => {
    if (!clip || !seconds) return;
    setSaid('');
    setState('sending');
    try {
      const token = await accessToken();
      if (!token) { setSaid(t('foot.signIn', 'Sign in first — this uses credits.')); setState('idle'); return; }
      const type = TYPES.includes(clip.type) ? clip.type : 'video/mp4';
      const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const opened = await fetch('/api/footage', { method: 'POST', headers: auth, body: JSON.stringify({ step: 'upload', type }) });
      const slot = await opened.json().catch(() => ({})) as { path?: string; token?: string; message?: string };
      const storage = getStorageClient();
      if (!opened.ok || !slot.path || !slot.token || !storage) { setSaid(slot.message ?? t('foot.noSend', 'The clip could not be sent just now. Try again.')); setState('idle'); return; }
      const put = await storage.from('videos').uploadToSignedUrl(slot.path, slot.token, clip, { contentType: type });
      if (put.error) { setSaid(t('foot.noSend', 'The clip could not be sent just now. Try again.')); setState('idle'); return; }

      const started = await fetch('/api/footage', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ step: 'start', job, path: slot.path, seconds, words: words.trim(), abroad, adult }),
      });
      const job0 = await started.json().catch(() => ({})) as { ticket?: string; message?: string };
      if (!started.ok || !job0.ticket) { setSaid(job0.message ?? t('foot.noStart', 'That did not start. Nothing was charged.')); setState('idle'); return; }

      setState('working');
      for (let tries = 0; tries < 120; tries += 1) {
        await new Promise((done) => { setTimeout(done, 5000); });
        const now = await fetch(`/api/footage?ticket=${encodeURIComponent(job0.ticket)}`, { headers: { Authorization: `Bearer ${token}` } });
        const at = await now.json().catch(() => ({})) as { state?: string; url?: string; message?: string };
        if (at.state === 'waiting') continue;
        if (at.state === 'done' && at.url) {
          const got = await fetch(at.url);
          const blob = await got.blob();
          const kind = blob.type || 'video/webm';
          onBack(new File([blob], `${name} · ${job === 'cutout' ? t('foot.cutoutName', 'no background') : t('foot.eraseName', 'taken out')}.${kind.includes('mp4') ? 'mp4' : 'webm'}`, { type: kind }));
          setSaid(t('foot.done', 'Done. The new clip is on the clock, beside the shot it came from.'));
          setState('idle');
          return;
        }
        setSaid(at.message ?? t('foot.failed', 'That did not work this time. Your credits are back.'));
        setState('idle');
        return;
      }
      setSaid(t('foot.slow', 'This is taking longer than ten minutes. Come back to it later; if it does not arrive, your credits come back.'));
      setState('idle');
    } catch {
      setSaid(t('foot.failed', 'That did not work this time. Your credits are back.'));
      setState('idle');
    }
  };

  const tick = 'flex min-h-[44px] items-start gap-3 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm text-zinc-200 cursor-pointer';

  return (
    <div className="space-y-2.5" data-footage>
      <p className="text-sm font-bold text-zinc-100">{t('foot.title', 'Take something out of a shot')}</p>
      {!clip ? (
        <p className="text-sm text-zinc-400" data-footagenone>{t('foot.pick', 'Pick a shot on the clock first.')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2" role="group">
            {([
              ['cutout', UserRoundX, t('foot.cutout', 'The background')],
              ['erase', Eraser, t('foot.erase', 'An item')],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                data-footagejob={id}
                aria-pressed={job === id}
                onClick={() => setJob(id)}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold ${job === id ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100' : 'border-zinc-700 text-zinc-200'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          {job === 'erase' && (
            <input
              type="text"
              value={words}
              maxLength={200}
              onChange={(event) => setWords(event.target.value)}
              placeholder={t('foot.whatOut', 'What to take out — e.g. the red car')}
              aria-label={t('foot.whatOut', 'What to take out — e.g. the red car')}
              className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
              data-footagewords
            />
          )}
          {tooLong && (
            <p className="text-sm text-amber-300">{t('foot.tooLong', 'Clips of up to 20 seconds can go. Trim it on your phone first, or split it into pieces.')}</p>
          )}
          <label className={tick}>
            <input type="checkbox" checked={abroad} onChange={(event) => setAbroad(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-footageabroad />
            <span>{t('foot.abroad', 'My clip may go to fal.ai, outside South Africa, to be worked on. It is deleted there within the hour, and here when the job is done.')}</span>
          </label>
          <label className={tick}>
            <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-footageadult />
            <span>{t('foot.adult', 'I am 18 or older.')}</span>
          </label>
          <button
            type="button"
            data-footagego
            disabled={!ready}
            onClick={() => { void go(); }}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-40"
          >
            {state !== 'idle' && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === 'sending'
              ? t('foot.sending', 'Sending the clip…')
              : state === 'working'
                ? t('foot.working', 'Working on it…')
                : `${job === 'cutout' ? t('foot.goCutout', 'Take the background out') : t('foot.goErase', 'Take it out')}${price ? ` · ${creditsSaid(price, t)}` : ''}`}
          </button>
        </>
      )}
      {said && <p role="status" className="text-sm text-zinc-300" data-footagesaid>{said}</p>}
    </div>
  );
}
