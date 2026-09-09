'use client';

/**
 * The desk for a voice conversion: how much model, how much you, and what to
 * clean up on the way in and put on afterwards.
 *
 * ── What this exposes, and where it was ──────────────────────────────────
 *
 * Carli, 9 September 2026: "Daar moet ook 'n mixer setting wees vir die stemme
 * wat gebruik word wat 'n conversion slider het, 'n dynamic slider (model
 * volume), pre en post processing effects om te hoor wat klink die beste."
 *
 * Every one of those was already supported end to end. `Dials`, `Cleanup` and
 * `Polish` sit in `lib/server/kits.ts`, `startConversion` has always sent all
 * of them, and `/api/voice/sing` read exactly one field. The rest was built,
 * correct, and reachable by nothing — the same shape of fault as a button
 * behind the tab bar, one layer further down.
 *
 * ── Switches, not numbers ────────────────────────────────────────────────
 *
 * A gate is a threshold in dB, a ratio, an attack and a release. Kits' own
 * screen offers a switch per effect and so does this one; the four numbers
 * behind each switch are chosen on the server and tuned for a phone held
 * close, indoors. Asking a singer for an attack time in milliseconds is asking
 * them to be an engineer to hear whether they like it.
 *
 * ── Nothing is sent that was not touched ─────────────────────────────────
 *
 * Every control starts at "leave it alone". A ratio nobody moved is left out
 * of the request entirely, because an omitted field is Kits' own default and a
 * number this app invented is a number nobody tuned. That is why the sliders
 * read "theirs" until they are moved, rather than showing a made-up 50%.
 */

import React from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import Hint from './Hint';
import { useLang } from '../lib/i18n';

/** What the screen holds, and what `settingsToForm` turns into a request. */
export interface VoiceSettings {
  /** −24 to 24 semitones. 0 means do not shift. */
  readonly pitchShift: number;
  /** 0–1, or null for "leave it to Kits". */
  readonly conversionStrength: number | null;
  readonly modelVolumeMix: number | null;
  /** Named effects. See `PRE_EFFECTS` / `POST_EFFECTS` on the server. */
  readonly pre: readonly string[];
  readonly post: readonly string[];
  /** False while nothing has been touched, so the request stays untouched too. */
  readonly chosen: boolean;
}

/** A take off a phone, cleaned the way `PHONE_CLEANUP` cleans it. */
export const DEFAULT_SETTINGS: VoiceSettings = {
  pitchShift: 0,
  conversionStrength: null,
  modelVolumeMix: null,
  pre: ['noiseGate', 'highPass'],
  post: [],
  chosen: false,
};

const PRE = ['noiseGate', 'highPass', 'lowPass', 'compressor'] as const;
const POST = ['compressor', 'chorus', 'reverb', 'delay'] as const;

/**
 * The settings onto a form, sending only what was actually chosen.
 *
 * Untouched, this puts nothing on the form at all, so the request is byte for
 * byte the one that was made before this screen existed.
 */
export function settingsToForm(form: FormData, settings: VoiceSettings): void {
  if (settings.pitchShift) form.set('pitchShift', String(settings.pitchShift));
  if (!settings.chosen) return;
  if (settings.conversionStrength !== null) {
    form.set('conversionStrength', String(settings.conversionStrength));
  }
  if (settings.modelVolumeMix !== null) {
    form.set('modelVolumeMix', String(settings.modelVolumeMix));
  }
  /* Set even when empty: an empty `pre` means "clean nothing", which is a real
     choice and different from not having asked. */
  form.set('pre', settings.pre.join(','));
  form.set('post', settings.post.join(','));
}

function Ratio({
  label, hint, value, onChange,
}: {
  readonly label: string;
  readonly hint: string;
  readonly value: number | null;
  readonly onChange: (next: number) => void;
}): React.ReactElement {
  const { t } = useLang();
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        {label}
        <Hint>{hint}</Hint>
      </span>
      <span className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          value={value === null ? 50 : Math.round(value * 100)}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
          className="w-32 accent-emerald-500 h-9 sm:h-auto touch-manipulation"
          aria-label={label}
        />
        <span className="w-16 text-right text-xs tabular-nums text-zinc-500">
          {value === null ? t('mix.theirs', 'theirs') : `${Math.round(value * 100)}%`}
        </span>
      </span>
    </label>
  );
}

export default function VoiceMixer({
  settings,
  onChange,
  className = '',
}: {
  readonly settings: VoiceSettings;
  readonly onChange: (next: VoiceSettings) => void;
  readonly className?: string;
}): React.ReactElement {
  const { t } = useLang();
  const set = (patch: Partial<VoiceSettings>) => onChange({ ...settings, ...patch, chosen: true });
  const toggle = (list: readonly string[], name: string): string[] =>
    list.includes(name) ? list.filter((one) => one !== name) : [...list, name];

  const NAMES: Record<string, string> = {
    noiseGate: t('mix.gate', 'Noise gate'),
    highPass: t('mix.high', 'High pass'),
    lowPass: t('mix.low', 'Low pass'),
    compressor: t('mix.comp', 'Compressor'),
    chorus: t('mix.chorus', 'Chorus'),
    reverb: t('mix.reverb', 'Reverb'),
    delay: t('mix.delay', 'Delay'),
  };

  const Row = ({ title, hint, list, all, key_ }: {
    title: string; hint: string; list: readonly string[];
    all: readonly string[]; key_: 'pre' | 'post';
  }) => (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        {title}
        <Hint>{hint}</Hint>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {all.map((name) => {
          const on = list.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => set({ [key_]: toggle(list, name) } as Partial<VoiceSettings>)}
              className={`min-h-[38px] rounded-xl border px-3 py-2 text-xs font-semibold ${
                on
                  ? 'border-emerald-500 bg-emerald-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {NAMES[name] ?? name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {t('mix.title', 'The voice desk')}
      </p>

      <label className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
          {t('mix.pitch', 'Pitch')}
          <Hint>{t('mix.pitchWhat', 'Twelve semitones is an octave. A man singing through a voice trained on a woman is an octave out and sounds like a fault rather than a voice — that is what this is for.')}</Hint>
        </span>
        <input
          type="number"
          min={-24}
          max={24}
          value={settings.pitchShift}
          onChange={(event) => set({ pitchShift: Math.max(-24, Math.min(24, Number(event.target.value) || 0)) })}
          className="w-16 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm tabular-nums text-zinc-200"
          aria-label={t('mix.pitch', 'Pitch')}
        />
        <span className="text-[11px] text-zinc-600">{t('mix.semitones', 'semitones')}</span>
      </label>

      <Ratio
        label={t('mix.strength', 'How much of the model')}
        hint={t('mix.strengthWhat', 'How much of the trained voice’s own accent and articulation comes through. High is more like them and more likely to mispronounce a word — Kits say so themselves.')}
        value={settings.conversionStrength}
        onChange={(next) => set({ conversionStrength: next })}
      />
      <Ratio
        label={t('mix.dynamics', 'Model volume')}
        hint={t('mix.dynamicsWhat', 'Up trades your take’s loud-and-soft for the model’s own level; down keeps your dynamics. High values also bring up whatever noise is in your recording, which on a phone take is the whole problem.')}
        value={settings.modelVolumeMix}
        onChange={(next) => set({ modelVolumeMix: next })}
      />

      <Row
        title={t('mix.pre', 'Clean it up first')}
        hint={t('mix.preWhat', 'Put on your recording before it is converted. The gate takes the room out between phrases; the high pass takes out desk rumble; the low pass takes off the hiss a small microphone adds; the compressor evens out a take that swings.')}
        list={settings.pre}
        all={PRE}
        key_="pre"
      />
      <Row
        title={t('mix.post', 'And afterwards')}
        hint={t('mix.postWhat', 'Put on the converted voice. A dry conversion sounds dry — a little room is often the difference between a demo and something worth posting. Small on purpose: these are meant to stop it sounding bare, not to become the effect.')}
        list={settings.post}
        all={POST}
        key_="post"
      />

      {settings.chosen && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SETTINGS)}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-emerald-500 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('mix.reset', 'Back to the standard settings')}
        </button>
      )}
    </div>
  );
}
