'use client';

/**
 * Appearance — the panel where the app stops being one fixed look.
 *
 * Seven axes, each independently meaningful: what room you are in (surface),
 * the four colour roles, how sharp the corners are, how much air there is, what
 * the type looks like, where the navigation sits, and whether things move.
 * Changes apply live as you touch them, because a theme picker that makes you
 * press Save to see anything is a theme picker nobody finishes.
 */

import React from 'react';
import { X, RotateCcw, Check, Paintbrush } from 'lucide-react';
import {
  SURFACES, ACCENTS, RADII, DENSITIES, FONTS, LAYOUTS, MOTIONS, PRESETS,
  DEFAULT_THEME, COMBINATIONS, themeVariables, type Theme,
} from '../lib/theme';

/** A swatch drawn from the same maths the theme uses, so it cannot drift. */
function AccentSwatch({ accentId, size = 20 }: { accentId: string; size?: number }) {
  const vars = themeVariables({ ...DEFAULT_THEME, primary: accentId });
  return (
    <span
      className="rounded-full border border-white/15 flex-shrink-0"
      style={{ width: size, height: size, background: `rgb(${vars['--fb-primary-400']})` }}
    />
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-sm font-bold text-zinc-100">{label}</h4>
        <p className="text-xs text-zinc-500">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-left transition-all ${
        active
          ? 'border-emerald-500 bg-emerald-500/15 text-white'
          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

export default function ThemeStudio({
  theme,
  setTheme,
  onClose,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Theme>(key: K, value: Theme[K]) => setTheme({ ...theme, [key]: value });

  const roles: Array<{ key: keyof Theme; label: string; hint: string }> = [
    { key: 'primary', label: 'Primary', hint: 'Buttons, the thing you press, anything confirming.' },
    { key: 'secondary', label: 'Secondary', hint: 'Links, matches, information.' },
    { key: 'highlight', label: 'Highlight', hint: 'Pro, prizes, anything worth money.' },
    { key: 'tertiary', label: 'Tertiary', hint: 'Voice, hooks, the occasional extra accent.' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <aside className="relative w-full max-w-md h-full overflow-y-auto bg-zinc-900 border-l border-zinc-800 p-5 space-y-6">
        <header className="flex items-start justify-between gap-3 sticky top-0 bg-zinc-900 pb-3 -mt-1 pt-1 z-10">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-emerald-400" />
              Appearance
            </h3>
            <p className="text-xs text-zinc-500 pt-0.5">
              {COMBINATIONS.toLocaleString()} combinations. Everything applies as you touch it, and is remembered on
              this device.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </header>

        <Row label="Start from a preset" hint="Sets every axis at once. Then change whatever you like.">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const active = (Object.keys(DEFAULT_THEME) as Array<keyof Theme>).every((k) => theme[k] === preset[k]);
              return (
                <Option key={preset.id} active={active} onClick={() => setTheme({ ...preset })}>
                  <span className="flex items-center gap-2">
                    <AccentSwatch accentId={preset.primary} size={14} />
                    <span className="text-sm font-semibold">{preset.name}</span>
                    {active && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                  </span>
                  <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{preset.blurb}</span>
                </Option>
              );
            })}
          </div>
        </Row>

        <Row label="Surface" hint="The room the app sits in. Two of these are light themes.">
          <div className="grid grid-cols-2 gap-2">
            {SURFACES.map((s) => (
              <Option key={s.id} active={theme.surface === s.id} onClick={() => set('surface', s.id)}>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-xs text-zinc-500">{s.mode}</span>
                </span>
                <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{s.blurb}</span>
              </Option>
            ))}
          </div>
        </Row>

        {roles.map((role) => (
          <Row key={role.key} label={`${role.label} colour`} hint={role.hint}>
            <div className="flex flex-wrap gap-1.5">
              {ACCENTS.map((a) => {
                const active = theme[role.key] === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    title={a.name}
                    onClick={() => set(role.key, a.id as Theme[typeof role.key])}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                      active ? 'border-white scale-105' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    <AccentSwatch accentId={a.id} size={18} />
                  </button>
                );
              })}
            </div>
          </Row>
        ))}

        <Row label="Corners" hint="How sharp the app feels.">
          <div className="grid grid-cols-2 gap-2">
            {RADII.map((r) => (
              <Option key={r.id} active={theme.radius === r.id} onClick={() => set('radius', r.id)}>
                <span className="text-sm font-semibold">{r.name}</span>
                <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{r.blurb}</span>
              </Option>
            ))}
          </div>
        </Row>

        <Row label="Density" hint="Scales the whole interface, text and spacing together.">
          <div className="grid grid-cols-3 gap-2">
            {DENSITIES.map((d) => (
              <Option key={d.id} active={theme.density === d.id} onClick={() => set('density', d.id)}>
                <span className="text-sm font-semibold">{d.name}</span>
                <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{d.blurb}</span>
              </Option>
            ))}
          </div>
        </Row>

        <Row label="Type" hint="The whole app, not just headings.">
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => (
              <Option key={f.id} active={theme.font === f.id} onClick={() => set('font', f.id)}>
                <span className="text-sm font-semibold" style={{ fontFamily: f.stack }}>
                  {f.name}
                </span>
                <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{f.blurb}</span>
              </Option>
            ))}
          </div>
        </Row>

        <Row label="Studio navigation" hint="Where the studio puts its own menu.">
          <div className="grid grid-cols-1 gap-2">
            {LAYOUTS.map((l) => (
              <Option key={l.id} active={theme.layout === l.id} onClick={() => set('layout', l.id)}>
                <span className="text-sm font-semibold">{l.name}</span>
                <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{l.blurb}</span>
              </Option>
            ))}
          </div>
        </Row>

        <Row label="Motion" hint="Your operating system's reduced-motion setting overrides this either way.">
          <div className="grid grid-cols-2 gap-2">
            {MOTIONS.map((m) => (
              <Option key={m.id} active={theme.motion === m.id} onClick={() => set('motion', m.id)}>
                <span className="text-sm font-semibold">{m.name}</span>
                <span className="block text-xs text-zinc-500 pt-0.5 leading-snug">{m.blurb}</span>
              </Option>
            ))}
          </div>
        </Row>

        <button
          type="button"
          onClick={() => setTheme({ ...DEFAULT_THEME })}
          className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white text-sm font-semibold flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Back to the house style
        </button>
      </aside>
    </div>
  );
}
