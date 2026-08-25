/**
 * The theme engine.
 *
 * The trick that makes this cover the whole app rather than a corner of it:
 * Tailwind's colour, radius and font scales are pointed at CSS variables in
 * `tailwind.config.js`, so an existing `bg-zinc-900` or `text-emerald-400`
 * already written into two thousand lines of markup follows the theme without
 * a single class being edited. Changing a variable re-skins everything.
 *
 * Colour families map onto roles rather than names:
 *   zinc          → surface      (the room the app is in)
 *   emerald, teal → primary      (the thing you press)
 *   cyan, sky     → secondary    (information, links, matches)
 *   amber, orange → highlight    (prizes, Pro, things worth money)
 *   violet, fuchsia → tertiary   (voice, hooks, the odd accent)
 *   rose          → danger
 *
 * Light surface families invert the lightness ramp, so `bg-zinc-950` becomes
 * near-white and `text-zinc-100` becomes near-black. Existing markup flips to a
 * light theme correctly without knowing a light theme exists.
 */

export type ThemeMode = 'dark' | 'light';

export interface SurfaceFamily {
  readonly id: string;
  readonly name: string;
  readonly mode: ThemeMode;
  readonly hue: number;
  readonly sat: number;
  readonly blurb: string;
}

export interface AccentFamily {
  readonly id: string;
  readonly name: string;
  readonly hue: number;
  readonly sat: number;
}

export interface FontChoice {
  readonly id: string;
  readonly name: string;
  readonly stack: string;
  readonly blurb: string;
}

export interface Theme {
  surface: string;
  primary: string;
  secondary: string;
  highlight: string;
  tertiary: string;
  radius: string;
  density: string;
  font: string;
  layout: string;
  motion: string;
}

// -----------------------------------------------------------------------------
// The axes
// -----------------------------------------------------------------------------

export const SURFACES: readonly SurfaceFamily[] = [
  { id: 'midnight', name: 'Midnight', mode: 'dark', hue: 240, sat: 6, blurb: 'Near-black, faint blue. The default.' },
  { id: 'carbon', name: 'Carbon', mode: 'dark', hue: 0, sat: 0, blurb: 'True neutral grey, no colour cast at all.' },
  { id: 'ink', name: 'Deep Ink', mode: 'dark', hue: 220, sat: 22, blurb: 'Navy-leaning, like a studio at night.' },
  { id: 'ember', name: 'Ember', mode: 'dark', hue: 20, sat: 12, blurb: 'Warm dark. Easier on the eyes late.' },
  { id: 'forest', name: 'Forest', mode: 'dark', hue: 150, sat: 14, blurb: 'Green-tinted dark, quiet and organic.' },
  { id: 'plum', name: 'Plum', mode: 'dark', hue: 290, sat: 16, blurb: 'Purple-tinted dark, a bit more theatrical.' },
  { id: 'paper', name: 'Paper', mode: 'light', hue: 40, sat: 8, blurb: 'Warm off-white. Reads like a page.' },
  { id: 'daylight', name: 'Daylight', mode: 'light', hue: 220, sat: 10, blurb: 'Cool white with a blue cast.' },
];

export const ACCENTS: readonly AccentFamily[] = [
  { id: 'emerald', name: 'Emerald', hue: 152, sat: 62 },
  { id: 'cyan', name: 'Cyan', hue: 189, sat: 80 },
  { id: 'sky', name: 'Sky', hue: 205, sat: 82 },
  { id: 'indigo', name: 'Indigo', hue: 245, sat: 65 },
  { id: 'violet', name: 'Violet', hue: 265, sat: 65 },
  { id: 'fuchsia', name: 'Fuchsia', hue: 292, sat: 70 },
  { id: 'rose', name: 'Rose', hue: 345, sat: 72 },
  { id: 'crimson', name: 'Crimson', hue: 5, sat: 72 },
  { id: 'orange', name: 'Orange', hue: 25, sat: 88 },
  { id: 'amber', name: 'Amber', hue: 42, sat: 92 },
  { id: 'lime', name: 'Lime', hue: 88, sat: 65 },
  { id: 'teal', name: 'Teal', hue: 172, sat: 62 },
  { id: 'slate', name: 'Slate', hue: 215, sat: 16 },
];

export const RADII = [
  { id: 'sharp', name: 'Sharp', blurb: 'No rounding. Technical, dense.', scale: 0 },
  { id: 'soft', name: 'Soft', blurb: 'A little rounding. Restrained.', scale: 0.5 },
  { id: 'round', name: 'Round', blurb: 'The current look.', scale: 1 },
  { id: 'pill', name: 'Pill', blurb: 'Everything as round as it will go.', scale: 1.8 },
] as const;

export const DENSITIES = [
  { id: 'compact', name: 'Compact', blurb: 'More on screen, tighter to read.', size: 14.5 },
  { id: 'comfortable', name: 'Comfortable', blurb: 'The default balance.', size: 16 },
  { id: 'spacious', name: 'Spacious', blurb: 'Bigger text, more air. Good on a TV.', size: 17.5 },
] as const;

export const FONTS: readonly FontChoice[] = [
  {
    id: 'system',
    name: 'System',
    stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    blurb: 'Whatever your device uses. Fastest, most familiar.',
  },
  {
    id: 'geometric',
    name: 'Geometric',
    stack: '"Avenir Next", "Century Gothic", "Futura", "Trebuchet MS", sans-serif',
    blurb: 'Round, even letterforms. Brand-forward.',
  },
  {
    id: 'grotesk',
    name: 'Grotesk',
    stack: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    blurb: 'Neutral and tight. Gets out of the way.',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    stack: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
    blurb: 'A serif. Long text reads slower and better.',
  },
  {
    id: 'rounded',
    name: 'Rounded',
    stack: '"SF Pro Rounded", "Varela Round", "Nunito", "Segoe UI", sans-serif',
    blurb: 'Softer and friendlier. Less studio, more app.',
  },
  {
    id: 'mono',
    name: 'Monospace',
    stack: '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace',
    blurb: 'Everything on a grid. The most technical option.',
  },
];

export const LAYOUTS = [
  { id: 'rail', name: 'Side rail', blurb: 'Navigation down the left, like a desktop tool.' },
  { id: 'top', name: 'Top bar', blurb: 'Navigation across the top. More room below.' },
  { id: 'focus', name: 'Focus', blurb: 'Icons only. Maximum working surface.' },
] as const;

export const MOTIONS = [
  { id: 'full', name: 'Full', blurb: 'Transitions and hover animation.' },
  { id: 'reduced', name: 'Reduced', blurb: 'Instant. Kinder if motion bothers you.' },
] as const;

// -----------------------------------------------------------------------------
// Presets — a starting point, so nobody has to touch seven controls to begin
// -----------------------------------------------------------------------------

export interface Preset extends Theme {
  readonly id: string;
  readonly name: string;
  readonly blurb: string;
}

export const PRESETS: readonly Preset[] = [
  { id: 'futurebox', name: 'FutureBox', blurb: 'The house style.', surface: 'midnight', primary: 'emerald', secondary: 'cyan', highlight: 'amber', tertiary: 'violet', radius: 'round', density: 'comfortable', font: 'system', layout: 'rail', motion: 'full' },
  { id: 'studio', name: 'Studio Dark', blurb: 'Neutral grey, one accent. Nothing shouts.', surface: 'carbon', primary: 'slate', secondary: 'sky', highlight: 'amber', tertiary: 'slate', radius: 'soft', density: 'compact', font: 'grotesk', layout: 'rail', motion: 'full' },
  { id: 'neon', name: 'Neon Club', blurb: 'Loud. For a dance channel.', surface: 'plum', primary: 'fuchsia', secondary: 'cyan', highlight: 'lime', tertiary: 'violet', radius: 'pill', density: 'comfortable', font: 'geometric', layout: 'top', motion: 'full' },
  { id: 'terminal', name: 'Terminal', blurb: 'Sharp corners, mono type, green on black.', surface: 'carbon', primary: 'lime', secondary: 'teal', highlight: 'amber', tertiary: 'lime', radius: 'sharp', density: 'compact', font: 'mono', layout: 'focus', motion: 'reduced' },
  { id: 'sunset', name: 'Sunset', blurb: 'Warm dark, orange and rose.', surface: 'ember', primary: 'orange', secondary: 'rose', highlight: 'amber', tertiary: 'crimson', radius: 'round', density: 'comfortable', font: 'rounded', layout: 'rail', motion: 'full' },
  { id: 'broadsheet', name: 'Broadsheet', blurb: 'Light, serif, generous. For reading.', surface: 'paper', primary: 'crimson', secondary: 'indigo', highlight: 'amber', tertiary: 'slate', radius: 'soft', density: 'spacious', font: 'editorial', layout: 'top', motion: 'reduced' },
  { id: 'clinic', name: 'Daylight', blurb: 'Light and cool. Bright rooms.', surface: 'daylight', primary: 'sky', secondary: 'indigo', highlight: 'orange', tertiary: 'violet', radius: 'round', density: 'comfortable', font: 'system', layout: 'rail', motion: 'full' },
  { id: 'forest', name: 'Forest Floor', blurb: 'Green dark, quiet and slow.', surface: 'forest', primary: 'teal', secondary: 'lime', highlight: 'amber', tertiary: 'emerald', radius: 'round', density: 'spacious', font: 'rounded', layout: 'rail', motion: 'reduced' },
];

export const DEFAULT_THEME: Theme = { ...PRESETS[0] };

// -----------------------------------------------------------------------------
// Scale generation
// -----------------------------------------------------------------------------

const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Dark surfaces: 50 is lightest text, 950 is the deepest background. */
const DARK_L = [96, 91, 83, 71, 58, 46, 36, 28, 20, 13, 7];
/** Light surfaces: the same ramp inverted, so existing markup flips correctly. */
const LIGHT_L = [14, 20, 30, 42, 52, 58, 66, 76, 88, 95, 99];
/** Accents keep a conventional ramp in both modes. */
const ACCENT_L = [95, 89, 80, 70, 60, 51, 43, 35, 28, 22, 15];

function hslToRgbChannels(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255)).join(' ');
}

function scale(prefix: string, hue: number, sat: number, ramp: readonly number[]): Record<string, string> {
  const out: Record<string, string> = {};
  STOPS.forEach((stop, i) => {
    out[`--fb-${prefix}-${stop}`] = hslToRgbChannels(hue, sat, ramp[i]);
  });
  return out;
}

const RADIUS_BASE: Record<string, number> = {
  '--fb-radius-sm': 2, '--fb-radius': 4, '--fb-radius-md': 6, '--fb-radius-lg': 8,
  '--fb-radius-xl': 12, '--fb-radius-2xl': 16, '--fb-radius-3xl': 24,
};

/** The full variable set for a theme. Pure, so it can be tested and previewed. */
export function themeVariables(theme: Theme): Record<string, string> {
  const surface = SURFACES.find((s) => s.id === theme.surface) ?? SURFACES[0];
  const accent = (id: string) => ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
  const radius = RADII.find((r) => r.id === theme.radius) ?? RADII[2];
  const density = DENSITIES.find((d) => d.id === theme.density) ?? DENSITIES[1];
  const font = FONTS.find((f) => f.id === theme.font) ?? FONTS[0];

  const surfaceRamp = surface.mode === 'light' ? LIGHT_L : DARK_L;
  const p = accent(theme.primary);
  const s2 = accent(theme.secondary);
  const h = accent(theme.highlight);
  const t = accent(theme.tertiary);

  const vars: Record<string, string> = {
    ...scale('surface', surface.hue, surface.sat, surfaceRamp),
    ...scale('primary', p.hue, p.sat, ACCENT_L),
    ...scale('secondary', s2.hue, s2.sat, ACCENT_L),
    ...scale('highlight', h.hue, h.sat, ACCENT_L),
    ...scale('tertiary', t.hue, t.sat, ACCENT_L),
    ...scale('danger', 352, 72, ACCENT_L),
    '--fb-font-sans': font.stack,
    '--fb-root-size': `${density.size}px`,
    '--fb-page': hslToRgbChannels(surface.hue, surface.sat, surfaceRamp[10]),
    '--fb-ink': hslToRgbChannels(surface.hue, Math.min(surface.sat, 8), surfaceRamp[1]),
    // `bg-black/40` means "an inset, darker than the page" — which on a light
    // surface has to be a pale grey, not actual black.
    '--fb-void': hslToRgbChannels(surface.hue, surface.sat, surface.mode === 'light' ? 86 : 4),
    // Text on a saturated accent fill stays dark whatever the surface does,
    // because the accent itself stays bright.
    '--fb-on-accent': hslToRgbChannels(surface.hue, Math.min(surface.sat, 20), 8),
    '--fb-motion': theme.motion === 'reduced' ? '0.001ms' : '200ms',
  };
  for (const [key, base] of Object.entries(RADIUS_BASE)) {
    vars[key] = `${(base * radius.scale).toFixed(2)}px`;
  }
  return vars;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeVariables(theme))) {
    root.style.setProperty(key, value);
  }
  const surface = SURFACES.find((s) => s.id === theme.surface) ?? SURFACES[0];
  root.dataset.fbMode = surface.mode;
  root.style.colorScheme = surface.mode;
}

const STORAGE_KEY = 'futurebox.theme.v1';

export function loadTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Partial<Theme>;
    // Merge over the default so a theme saved by an older build, missing an
    // axis added since, still loads instead of rendering half-styled.
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // A browser with storage blocked still gets a working theme for this visit.
  }
}

/** How many distinct looks the axes actually reach. */
export const COMBINATIONS =
  SURFACES.length * ACCENTS.length ** 4 * RADII.length * DENSITIES.length * FONTS.length * LAYOUTS.length * MOTIONS.length;
