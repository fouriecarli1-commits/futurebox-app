'use client';

/**
 * The video desk.
 *
 * Deliberately empty when it opens: a heading, a row of kinds of video, and a
 * box. Nothing is chosen for you and nothing is generated until you press the
 * button, which is the whole feeling somebody wants from a page they are about
 * to make something on.
 *
 * ── Why the tiles fill the box rather than open a form ───────────────────
 *
 * A blank box is a wall for anybody who has not learnt how a video model wants
 * to be spoken to, and a form is a cage for anybody who has. A scaffold is
 * neither: the box fills with a half-written shot in the right shape, obviously
 * about somebody else's song, so the first instinct is to rewrite it. What you
 * send is always your own sentence.
 *
 * ── The quotation marks ──────────────────────────────────────────────────
 *
 * Anything in quotation marks is spoken aloud by the model. That is the single
 * least obvious thing about writing one of these prompts and it is worth the
 * space it takes here: the two scaffolds with a voice in them show it, the
 * lines that will be spoken are read back before anything is spent, and a
 * prompt that says "she says" without quoting anything gets one sentence of
 * warning rather than a refusal. Being wrong about this is silent — the clip
 * comes back with somebody mouthing nothing — which is exactly the kind of
 * mistake worth catching before the credits go.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Video as VideoIcon, Loader2, Download, Quote, AlertTriangle, Volume2, VolumeX, Plug, PlugZap } from 'lucide-react';
import { SCENES, spokenLines, looksUnquoted, type Scene } from '../lib/videoscenes';
import { engines, probeVideoEngine, type VideoEngine } from '../lib/engines';
import { CREDITS, videoCost, type VideoGrade } from '../lib/credits';
import { downloadBlob, safeFilename } from '../lib/library';
import { signal } from '../lib/signal';
import { useLang } from '../lib/i18n';

type Aspect = '9:16' | '16:9' | '1:1';

interface Made {
  readonly blob: Blob;
  readonly url: string;
  readonly prompt: string;
  readonly aspect: Aspect;
}

const GRADES: { id: VideoGrade; label: string; note: string }[] = [
  { id: 'standard', label: 'Standard', note: 'Most shots. Silent.' },
  { id: 'better', label: 'Better', note: 'Sharper, and it can speak.' },
  { id: 'premium', label: 'Premium', note: 'The best picture there is.' },
];

const SHAPES: { id: Aspect; label: string; note: string }[] = [
  { id: '9:16', label: 'Tall', note: 'TikTok, Reels, Shorts' },
  { id: '16:9', label: 'Wide', note: 'YouTube, a website' },
  { id: '1:1', label: 'Square', note: 'A feed post' },
];

export default function VideoCanvas({ onUpgrade }: { onUpgrade?: () => void }) {
  const { t } = useLang();

  const [engine, setEngine] = useState<VideoEngine | null>(null);
  const ready = engine === null ? null : engine.available;
  const [scene, setScene] = useState<Scene | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<Aspect>('16:9');
  const [seconds, setSeconds] = useState<5 | 10>(5);
  /**
   * What the member is buying — never which engine serves it.
   *
   * Standard is the default and it is the one that pays: the cheap engine
   * costs a thirteenth of the dear one, and most shots do not need the
   * difference. The dearer rungs are chosen deliberately, with the price on
   * them, by somebody who has decided this particular shot is worth it.
   */
  const [grade, setGrade] = useState<VideoGrade>('standard');
  /**
   * Whether the engine itself should speak the quoted line.
   *
   * Off by default, and that default is the whole language strategy. The
   * picture costs about a hundred times what the voice costs, and the video
   * models are English-first — so silent footage with an ElevenLabs voice laid
   * over it is cheaper, keeps one voice across every clip, and is the only way
   * this app speaks Afrikaans at all.
   */
  const [speak, setSpeak] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<Made[]>([]);

  useEffect(() => {
    let alive = true;
    void probeVideoEngine().then((found) => {
      if (alive) setEngine(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Object URLs are the one thing the browser will not tidy up on its own.
  useEffect(() => () => made.forEach((one) => URL.revokeObjectURL(one.url)), [made]);

  const spoken = useMemo(() => spokenLines(prompt), [prompt]);
  const unquoted = useMemo(() => looksUnquoted(prompt), [prompt]);

  const pick = (chosen: Scene) => {
    setScene(chosen);
    setPrompt(chosen.scaffold);
    setAspect(chosen.aspect);
    setSeconds(chosen.seconds);
    setError(null);
  };

  const clear = () => {
    setScene(null);
    setPrompt('');
    setError(null);
  };

  const make = async () => {
    const said = prompt.trim();
    if (said.length < 12) {
      setError(t('canvas.tooShort', 'Say a bit more — what is in the shot, and what the camera does.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await engines.generateVideo({
        title: scene?.label ?? 'Video',
        treatment: said,
        aspect,
        seconds,
        grade,
        speak,
      });
      const url = URL.createObjectURL(result.blob);
      setMade((held) => [{ blob: result.blob, url, prompt: said, aspect }, ...held]);
      signal('video', { category: scene?.id ?? 'canvas' });
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : t('make.failed');
      setError(message);
      // A plan gate is the one failure with somewhere to go.
      if (/plan|Maker/i.test(message)) onUpgrade?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <VideoIcon className="w-6 h-6 text-amber-400" />
          {t('canvas.title', 'Video desk')}
        </h2>
        <p className="text-sm text-zinc-400 pt-1.5 max-w-2xl leading-relaxed">
          {t(
            'canvas.what',
            'Describe a shot and the engine makes it. Pick a kind of video to start from — everything it writes is yours to rewrite.',
          )}
        </p>
      </div>

      {/* ── Is this thing plugged in ───────────────────────────────────
          Written for the person who set the keys up, in the place they
          already are. Finding out whether your own app is connected should
          not require opening an API route and reading JSON, and until this
          strip existed it did. */}
      {engine && (
        <div
          className={`rounded-2xl border p-4 space-y-2 ${
            engine.available ? 'border-zinc-800 bg-zinc-950/60' : 'border-amber-500/40 bg-amber-500/5'
          }`}
        >
          {engine.available ? (
            <>
              <p className="text-sm text-zinc-300 flex items-center gap-2">
                <PlugZap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  {t('canvas.on', 'The engine is connected')} —{' '}
                  {engine.grades
                    .map((one) => t(`canvas.grade.${one}`, one))
                    .join(', ')}
                </span>
              </p>
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                {engine.sound ? (
                  <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span>
                  {engine.sound
                    ? t('canvas.soundOn', 'Quoted lines can be spoken aloud on the higher grades.')
                    : t('canvas.soundOff', 'No connected engine can speak, so quoted lines will come back silent.')}
                </span>
              </p>

              {/* Only the operator ever sees this. It is the size of a bill. */}
              {engine.engines?.map((one) => (
                <div key={one.id} className="pt-1 space-y-1.5">
                  <p className="text-sm text-zinc-400">
                    {one.name}{' '}
                    <span className="text-zinc-200 font-semibold">
                      {one.used} / {one.ceiling}
                    </span>{' '}
                    <span className="text-zinc-600">· {one.model}</span>
                  </p>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        one.used / Math.max(1, one.ceiling) > 0.85 ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((one.used / Math.max(1, one.ceiling)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-amber-300 flex items-start gap-2">
              <Plug className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {engine.auth === 'none'
                  ? t('canvas.noKey', 'No key for the video engine reached this app. Music videos drawn in your browser still work, on any song.')
                  : t('canvas.off', 'The video engine is not switched on for this app yet. Music videos drawn in your browser still work, on any song.')}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── The desk ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {SCENES.map((one) => {
          const active = scene?.id === one.id;
          return (
            <button
              key={one.id}
              type="button"
              onClick={() => pick(one)}
              className={`text-left rounded-2xl border p-3.5 transition-all ${
                active
                  ? 'bg-amber-500/10 border-amber-500'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <span className={`block text-sm font-bold ${active ? 'text-amber-300' : 'text-zinc-200'}`}>
                {t(`canvas.scene.${one.id}`, one.label)}
              </span>
              <span className="block text-xs text-zinc-500 leading-snug pt-0.5">
                {t(`canvas.note.${one.id}`, one.note)}
              </span>
              {one.speaks && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 pt-1.5">
                  <Quote className="w-3 h-3" />
                  {t('canvas.hasVoice', 'has a spoken line')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── The box ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="canvas-prompt" className="text-sm font-semibold text-zinc-300">
            {t('canvas.shot', 'The shot')}
          </label>
          {prompt && (
            <button type="button" onClick={clear} className="text-xs text-zinc-500 hover:text-zinc-300">
              {t('canvas.clear', 'Clear')}
            </button>
          )}
        </div>

        <textarea
          id="canvas-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={6}
          placeholder={t(
            'canvas.hint',
            'What is in the shot, what it is doing, what the camera does, what the light does, how it feels.',
          )}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none leading-relaxed resize-y"
        />

        {/* The one rule that is not obvious, said once and shown always. */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <p className="text-xs text-zinc-400 leading-relaxed flex gap-2">
            <Quote className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              {t(
                'canvas.quotes',
                'Anything in quotation marks is spoken aloud, in the language you write it in. Everything else is what the camera sees.',
              )}
            </span>
          </p>
          {spoken.length > 0 && (
            <div className="pl-5.5 space-y-1">
              <p className="text-xs text-emerald-400">
                {t('canvas.willSay', 'Will be spoken:')}
              </p>
              {spoken.map((line, index) => (
                <p key={index} className="text-xs text-zinc-300 italic">
                  &ldquo;{line}&rdquo;
                </p>
              ))}
            </div>
          )}
          {unquoted && (
            <p className="text-xs text-amber-300 leading-relaxed flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {t(
                  'canvas.unquoted',
                  'This reads like somebody is meant to speak, but nothing is in quotation marks — so the words will be drawn at, not said. Put the line in quotes.',
                )}
              </span>
            </p>
          )}
        </div>

        {/* ── What you are buying ─────────────────────────────────────
            Three rungs, priced, in words about the result. The engine behind
            each is ours to choose and ours to change; naming it here would
            move a decision worth thirteen times the money onto somebody with
            less information than we have. */}
        <div>
          <span className="text-sm text-zinc-400">{t('canvas.quality', 'Quality')}</span>
          <div className="grid sm:grid-cols-3 gap-1.5 mt-1.5">
            {GRADES.map((one) => {
              const there = engine?.grades.includes(one.id) ?? false;
              const active = grade === one.id;
              return (
                <button
                  key={one.id}
                  type="button"
                  disabled={!there}
                  onClick={() => setGrade(one.id)}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm border transition-all disabled:opacity-40 ${
                    active
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className="block font-semibold">{t(`canvas.grade.${one.id}`, one.label)}</span>
                  <span className="block text-xs text-zinc-500 leading-snug">
                    {t(`canvas.gradeNote.${one.id}`, one.note)}
                  </span>
                  <span className="block text-xs pt-0.5">
                    {videoCost(one.id)} {t('video.credits', 'credits')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* The engine speaking is a deliberate, dearer choice — see `speak`. */}
        {spoken.length > 0 && (
          <label className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={speak}
              disabled={!engine?.sound}
              onChange={(event) => {
                setSpeak(event.target.checked);
                if (event.target.checked && grade === 'standard') setGrade('better');
              }}
              className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-200">
                {t('canvas.letItSpeak', 'Let the engine say the line')}
              </span>
              <span className="block text-xs text-zinc-500 leading-snug">
                {engine?.sound
                  ? t(
                      'canvas.letItSpeakNote',
                      'Costs more, and only in English. Leave this off and record the line in your own voice under Script my voice — it is cheaper, it is the same voice every time, and it is the only way to get Afrikaans.',
                    )
                  : t('canvas.cannotSpeak', 'No connected engine can speak a line. Record it under Script my voice instead.')}
              </span>
            </span>
          </label>
        )}

        {/* ── Shape and length ────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <span className="text-sm text-zinc-400">{t('canvas.shape', 'Shape')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {SHAPES.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => setAspect(one.id)}
                  title={one.note}
                  className={`flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                    aspect === one.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {t(`canvas.shape.${one.id}`, one.label)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm text-zinc-400">{t('canvas.length', 'Length')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {([5, 10] as const).map((one) => (
                <button
                  key={one}
                  type="button"
                  onClick={() => setSeconds(one)}
                  className={`flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                    seconds === one
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {one}s
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={make}
          disabled={busy || ready === false}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4" />}
          {busy
            ? t('canvas.making', 'Making it')
            : `${t('canvas.go', 'Make it')} — ${videoCost(grade)} ${t('video.credits', 'credits')}`}
        </button>

        {busy && (
          <p className="text-sm text-zinc-400 text-center">
            {t(
              'canvas.waiting',
              'Two to four minutes. There is no progress bar because the engine does not report one — it says nothing, and then it says here is your video.',
            )}
          </p>
        )}

        {error && <p className="text-sm text-rose-400 leading-relaxed">{error}</p>}
      </div>

      {/* ── What has been made, newest first ──────────────────────────── */}
      {made.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-300">{t('canvas.made', 'Made on this desk')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {made.map((one) => (
              <div key={one.url} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2.5">
                <video
                  src={one.url}
                  controls
                  className={`rounded-xl border border-zinc-800 bg-black w-full ${
                    one.aspect === '9:16' ? 'max-h-80 object-contain' : ''
                  }`}
                />
                <p className="text-xs text-zinc-500 leading-snug line-clamp-2">{one.prompt}</p>
                <button
                  type="button"
                  onClick={() => downloadBlob(one.blob, safeFilename(one.prompt.slice(0, 40), 'mp4'))}
                  className="px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('video.save')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
