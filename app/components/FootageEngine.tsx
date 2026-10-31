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
import { AudioLines, Eraser, Loader2, Mic2, RectangleVertical, UserRoundX, Wand2 } from 'lucide-react';
import IdeaChips from './IdeaChips';
import { CLIP_CHANGE_IDEAS } from '../lib/promptideas';
import { accessToken, getStorageClient } from '../lib/cloud';
import { CREDITS, creditsSaid, filterCost } from '../lib/credits';
import { measure } from '../lib/stitch';
import { shrinkClip } from '../lib/shrinkclip';

type Job = 'cutout' | 'erase' | 'sound' | 'change' | 'reframe' | 'lipsync';
/** The same limits as the route: the item remover works on about eight
    seconds, sound is made for up to thirty, and a change for up to ten. */
const MOST_SECONDS: Readonly<Record<Job, number>> = { cutout: 20, erase: 8, sound: 30, change: 10, reframe: 20, lipsync: 40 };
/** What each costs per five seconds; sound is one price a clip. */
const RATE: Readonly<Record<Job, number>> = {
  cutout: CREDITS.cutout, erase: CREDITS.erase, sound: CREDITS.clipSound, change: CREDITS.clipChange, reframe: CREDITS.clipReframe,
  lipsync: CREDITS.lipSync,
};
/** The shapes a clip can be filled out to, as the route takes them. */
const SHAPES = [['9:16', 'tall'], ['1:1', 'square'], ['4:5', 'portrait'], ['16:9', 'wide']] as const;
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export default function FootageEngine({
  clip,
  name,
  t,
  onBack,
  song,
}: {
  /**
   * The part of the song under this shot, as a WAV, for a lip-sync. Absent
   * when there is no song under the film. Made only when the press needs it.
   */
  readonly song?: () => Promise<Blob | null>;
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
  const [shape, setShape] = useState<(typeof SHAPES)[number][0]>('9:16');
  const [abroad, setAbroad] = useState(false);
  const [adult, setAdult] = useState(false);
  /* A lip-sync's third yes: the face is the person at the screen, or a
     character made here (the route refuses without it). */
  const [ownFace, setOwnFace] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'working'>('idle');
  const [said, setSaid] = useState('');

  useEffect(() => {
    let live = true;
    setSeconds(null);
    if (!clip) return () => { live = false; };
    void measure(clip).then((seen) => { if (live) setSeconds(Number.isFinite(seen.seconds) ? seen.seconds : null); }).catch(() => undefined);
    return () => { live = false; };
  }, [clip]);

  /* Sound is one price a clip; the other two are per five seconds. */
  const price = seconds ? (job === 'sound' ? CREDITS.clipSound : job === 'lipsync' ? CREDITS.lipSync : filterCost(seconds, RATE[job])) : null;
  const tooLong = seconds !== null && seconds > MOST_SECONDS[job];
  const ready = Boolean(clip) && seconds !== null && !tooLong && abroad && adult
    && ((job !== 'erase' && job !== 'change') || words.trim().length > 0)
    && (job !== 'lipsync' || (ownFace && Boolean(song))) && state === 'idle';

  const go = async (): Promise<void> => {
    if (!clip || !seconds) return;
    setSaid('');
    setState('sending');
    try {
      const token = await accessToken();
      if (!token) { setSaid(t('foot.signIn', 'Sign in first — this uses credits.')); setState('idle'); return; }
      /* The background remover bills by the megapixel: 720p goes, made so
         here (`lib/shrinkclip.ts`). The item remover is one price a clip. */
      const sent = job === 'cutout' || job === 'change' ? await shrinkClip(clip) : clip;
      const size = await measure(sent).catch(() => ({ width: 0, height: 0 }));
      const plain = sent.type.split(';')[0];
      const type = TYPES.includes(plain) ? plain : 'video/mp4';
      const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const opened = await fetch('/api/footage', { method: 'POST', headers: auth, body: JSON.stringify({ step: 'upload', type }) });
      const slot = await opened.json().catch(() => ({})) as { path?: string; token?: string; message?: string };
      const storage = getStorageClient();
      if (!opened.ok || !slot.path || !slot.token || !storage) { setSaid(slot.message ?? t('foot.noSend', 'The clip could not be sent just now. Try again.')); setState('idle'); return; }
      const put = await storage.from('videos').uploadToSignedUrl(slot.path, slot.token, sent, { contentType: type });
      if (put.error) { setSaid(t('foot.noSend', 'The clip could not be sent just now. Try again.')); setState('idle'); return; }

      /* A lip-sync sends the song under the shot as well, the same way. */
      let audioPath = '';
      if (job === 'lipsync') {
        const tune = song ? await song() : null;
        if (!tune) { setSaid(t('foot.noSong', 'Put a song under the film first: the lips move to it.')); setState('idle'); return; }
        const openedSong = await fetch('/api/footage', { method: 'POST', headers: auth, body: JSON.stringify({ step: 'upload', type: 'audio/wav' }) });
        const songSlot = await openedSong.json().catch(() => ({})) as { path?: string; token?: string; message?: string };
        if (!openedSong.ok || !songSlot.path || !songSlot.token) { setSaid(songSlot.message ?? t('foot.noSend', 'The clip could not be sent just now. Try again.')); setState('idle'); return; }
        const putSong = await storage.from('videos').uploadToSignedUrl(songSlot.path, songSlot.token, tune, { contentType: 'audio/wav' });
        if (putSong.error) { setSaid(t('foot.noSend', 'The clip could not be sent just now. Try again.')); setState('idle'); return; }
        audioPath = songSlot.path;
      }
      const started = await fetch('/api/footage', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ step: 'start', job, path: slot.path, seconds, pixels: size.width * size.height, words: words.trim(), shape, abroad, adult, audioPath, ownFace }),
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
          const said = job === 'cutout' ? t('foot.cutoutName', 'no background')
            : job === 'sound' ? t('foot.soundName', 'with sound')
              : job === 'change' ? t('foot.changeName', 'changed')
                : job === 'reframe' ? shape
                  : job === 'lipsync' ? t('foot.lipName', 'singing')
                  : t('foot.eraseName', 'taken out');
          onBack(new File([blob], `${name} · ${said}.${kind.includes('mp4') ? 'mp4' : 'webm'}`, { type: kind }));
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
      <p className="text-sm font-bold text-zinc-100">{t('foot.title2', 'Change a shot with AI')}</p>
      {!clip ? (
        <p className="text-sm text-zinc-400" data-footagenone>{t('foot.pick', 'Pick a shot on the clock first.')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group">
            {([
              ['change', Wand2, t('foot.change', 'Change it')],
              ['erase', Eraser, t('foot.erase', 'An item')],
              ['cutout', UserRoundX, t('foot.cutout', 'The background')],
              ['reframe', RectangleVertical, t('foot.reframe', 'New shape')],
              ['sound', AudioLines, t('foot.sound', 'Sound')],
              ['lipsync', Mic2, t('foot.lipsync', 'Sing it')],
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
          <p className="text-xs leading-snug text-zinc-400" data-footagewhat>
            {job === 'cutout'
              ? t('foot.cutoutWhat', 'Keeps the people and takes away everything behind them, so you can put them anywhere. Up to 20 seconds.')
              : job === 'sound'
                ? t('foot.soundWhat', 'A silent shot gets the sound of what is happening in it: footsteps, rain, traffic, a crowd. Say what you want to hear, or leave it to the picture. Up to 30 seconds.')
                : job === 'change'
                  ? t('foot.changeWhat', 'Say how it should look and every frame changes, moving just as it did. Up to 10 seconds.')
                  : job === 'reframe'
                    ? t('foot.reframeWhat', 'Wide to tall, or tall to wide: the sides are filled in, nothing is cropped off. Up to 20 seconds.')
                  : job === 'lipsync'
                    ? t('foot.lipsyncWhat', 'The face in the shot sings the part of the song under it: lips moved to the words. Your own face or a character made here. Up to 40 seconds.')
                    : t('foot.eraseWhat', 'Say one thing in the shot and it disappears from every frame. Up to 8 seconds.')}
          </p>
          {job === 'change' && (
            <>
              <input
                type="text"
                value={words}
                maxLength={200}
                onChange={(event) => setWords(event.target.value)}
                placeholder={t('foot.howChange', 'How it should change — e.g. make it night, neon rain')}
                aria-label={t('foot.howChange', 'How it should change — e.g. make it night, neon rain')}
                className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
                data-footagechangewords
              />
              <IdeaChips pool={CLIP_CHANGE_IDEAS} onPick={(idea) => setWords(idea)} glow="#22D3EE" t={t} />
            </>
          )}
          {job === 'reframe' && (
            <div className="grid grid-cols-4 gap-2" role="group" data-footageshapes>
              {SHAPES.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  data-footageshape={id}
                  aria-pressed={shape === id}
                  onClick={() => setShape(id)}
                  className={`inline-flex min-h-[44px] w-full flex-col items-center justify-center rounded-xl border px-1 text-xs font-semibold leading-tight ${shape === id ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100' : 'border-zinc-700 text-zinc-200'}`}
                >
                  <span>{id}</span>
                  <span className="text-[10px] font-normal opacity-80">{t(`foot.shape.${name}`, name === 'tall' ? 'Tall' : name === 'square' ? 'Square' : name === 'portrait' ? 'Portrait' : 'Wide')}</span>
                </button>
              ))}
            </div>
          )}
          {job === 'sound' && (
            <input
              type="text"
              value={words}
              maxLength={200}
              onChange={(event) => setWords(event.target.value)}
              placeholder={t('foot.whatSound', 'What it should sound like (if you like) — e.g. rain on a tin roof')}
              aria-label={t('foot.whatSound', 'What it should sound like (if you like) — e.g. rain on a tin roof')}
              className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white"
              data-footagesoundwords
            />
          )}
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
            <p className="text-sm text-amber-300" data-footagetoolong>
              {job === 'change'
                ? t('foot.tooLongChange', 'A clip of up to 10 seconds can be changed. Trim it on your phone first, or split it into pieces.')
                : job === 'erase'
                ? t('foot.tooLongErase', 'An item can be taken out of clips of up to 8 seconds. Trim it on your phone first, or split it into pieces.')
                : job === 'sound'
                  ? t('foot.tooLongSound', 'Sound can be made for clips of up to 30 seconds. Trim it on your phone first, or split it into pieces.')
                : job === 'lipsync'
                  ? t('foot.tooLongLip', 'A shot of up to 40 seconds can sing. Split it into pieces first.')
                  : t('foot.tooLong', 'Clips of up to 20 seconds can go. Trim it on your phone first, or split it into pieces.')}
            </p>
          )}
          <label className={tick}>
            <input type="checkbox" checked={abroad} onChange={(event) => setAbroad(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-footageabroad />
            <span>{t('foot.abroad', 'My clip may go to fal.ai, outside South Africa, to be worked on. It is deleted there within the hour, and here when the job is done.')}</span>
          </label>
          <label className={tick}>
            <input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-footageadult />
            <span>{t('foot.adult', 'I am 18 or older.')}</span>
          </label>
          {job === 'lipsync' && (
            <>
              {!song && (
                <p className="text-sm text-amber-300" data-footagenosong>{t('foot.noSong', 'Put a song under the film first: the lips move to it.')}</p>
              )}
              <label className={tick}>
                <input type="checkbox" checked={ownFace} onChange={(event) => setOwnFace(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500" data-footageownface />
                <span>{t('foot.ownFace', 'The face in this shot is me, or a character made here. Nobody else\u2019s face may be made to sing.')}</span>
              </label>
            </>
          )}
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
                : `${job === 'cutout' ? t('foot.goCutout', 'Take the background out')
                  : job === 'sound' ? t('foot.goSound', 'Give it sound')
                    : job === 'change' ? t('foot.goChange', 'Change every frame')
                      : job === 'reframe' ? t('foot.goReframe', 'Fill it to the new shape')
                        : job === 'lipsync' ? t('foot.goLip', 'Make it sing')
                        : t('foot.goErase', 'Take it out')}${price ? ` · ${creditsSaid(price, t)}` : ''}`}
          </button>
        </>
      )}
      {said && <p role="status" className="text-sm text-zinc-300" data-footagesaid>{said}</p>}
    </div>
  );
}
