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
  /* The default, and the reason it is light.
     A creative tool spends most of its screen on the person's own work — their
     words, their artwork, their waveform. A near-black room makes every one of
     those things glow, which is flattering for one card and exhausting for a
     page of them, and it forces every panel to earn separation with a border,
     a gradient or a shadow. Cumulatively that is what "busy" is made of.
     Near-white separates panels with nothing but space, so the loudest thing on
     screen is whatever the person just made. One accent, and amber kept back
     for the few places where money is involved. */
  { id: 'clean', name: 'Clean', blurb: 'Near-white, one accent, nothing shouting. The default.', surface: 'paper', primary: 'emerald', secondary: 'slate', highlight: 'amber', tertiary: 'slate', radius: 'round', density: 'comfortable', font: 'system', layout: 'rail', motion: 'full' },
  { id: 'futurebox', name: 'Midnight', blurb: 'The old house style. Near-black.', surface: 'midnight', primary: 'emerald', secondary: 'cyan', highlight: 'amber', tertiary: 'violet', radius: 'round', density: 'comfortable', font: 'system', layout: 'rail', motion: 'full' },
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
/**
 * Light surfaces.
 *
 * Not a mirror of DARK_L, because perceived contrast is not symmetric: a mid
 * grey that reads clearly against near-black is far too faint against
 * near-white. Mirroring it put `text-zinc-400` — which most of the app uses for
 * its second line — at 3.5:1, under the 4.5:1 body text needs.
 *
 * Only the last four numbers here are used. Counted across the app, stops 50
 * through 600 are text (`text-zinc-500` alone appears 210 times, `text-zinc-600`
 * 90 more), and 700 upwards are borders and surfaces: `border-zinc-800` 384
 * times, `bg-zinc-900` and `bg-zinc-950` for every panel and page. So the text
 * stops are solved for a contrast ratio against the page instead of being
 * assigned a lightness, and only the border and surface stops keep a fixed one.
 *
 * The targets step down rather than all sitting at the minimum, so that the
 * hierarchy the app is drawing with them — body, secondary, hint — survives.
 */
const LIGHT_TEXT_TARGETS = [15, 13, 11, 8.5, 6.5, 5.3, 4.5];
const LIGHT_L = [12, 17, 24, 32, 40, 45, 54, 68, 84, 93, 98];
/** Accents keep a conventional ramp in both modes. */
const ACCENT_L = [95, 89, 80, 70, 60, 51, 43, 35, 28, 22, 15];

/**
 * Accent stops, and what the app uses each of them for.
 *
 * Counted across the app rather than assumed: 300 and 400 carry almost all the
 * accent *text* (336 uses between them), 500 carries almost all the accent
 * *fill* and every tinted wash (207 uses), and everything else is a handful.
 *
 * That split is why the accent ramp cannot simply be reused on a light surface.
 * On near-black, a bright `text-amber-400` is the readable choice. On
 * near-white it is amber on cream at roughly 2:1 — the "Standard / 30 credits"
 * label on the video desk was legible only if you already knew what it said.
 * Meanwhile 500 has to stay bright, because `text-onAccent` sits on it and is
 * dark in every theme.
 *
 * So on a light surface the text stops are solved for a contrast ratio against
 * the page rather than assigned a lightness, and the fill stops are left alone.
 * Solved per hue, because lightness is not perceptual: amber at 45% lightness
 * is far brighter than indigo at 45%, and a single number cannot serve both.
 */
const ACCENT_TEXT_TARGETS = [12, 9, 7, 5.5, 4.6];

/** sRGB relative luminance, for the contrast solve. */
function relativeLuminance(rgb: readonly number[]): number {
  const channels = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function luminance(h: number, s: number, l: number): number {
  return relativeLuminance(hslToRgb(h, s, l));
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * The lightest this hue can be and still clear `target` against a light ground.
 *
 * Lightest rather than darkest: the accent should stay recognisably itself, and
 * every step darker than it needs to be is a step towards black.
 */
function lightnessForContrast(h: number, s: number, groundLuminance: number, target: number): number {
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrast(luminance(h, s, mid), groundLuminance) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The darkest this hue can be and still clear `target` against dark text on it.
 *
 * The mirror of the above, for the one place the relationship runs the other
 * way: the 500 stop is a filled button, and `text-onAccent` sits on it and is
 * dark in every theme. So the fill has to be light *enough*, and darkest-that-
 * works keeps the button as saturated as the requirement allows.
 */
function lightnessForContrastOnDark(h: number, s: number, inkLuminance: number, target: number): number {
  let lo = 0;
  let hi = 100;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (contrast(luminance(h, s, mid), inkLuminance) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * The accent ramp for one hue: untouched on dark, contrast-solved on light.
 *
 * Solved against the darkest thing accent text commonly sits on, not against
 * the bare page. It very rarely sits on the page: it sits in its own wash — the
 * `bg-amber-500/15` badge, the `bg-emerald-500/10` pill, eighty of those — or
 * on a neutral `bg-zinc-800` chip, which is darker still. Solving against the
 * page and landing on either costs about a point of contrast, which is exactly
 * the difference between passing and failing. Solving against the worst case
 * gives the rarer bare-page case more headroom than it strictly needs, and
 * headroom costs nothing.
 *
 * The solver returns the *lightest* lightness that clears the target, so the
 * accent stays as much itself as the requirement allows.
 */
function accentRamp(
  h: number,
  s: number,
  light: boolean,
  page: readonly number[],
  chip: readonly number[],
  inkLuminance: number,
): number[] {
  /* The 500 stop is the filled button, and it is the same in both themes,
     because `text-onAccent` is dark in both. A low-luminance hue at the ramp's
     fixed 51% — slate, indigo, rose — puts dark text on a mid grey at about
     4:1, which is under the floor and was under it before any of this. Lifted
     only as far as it has to be, and only when it has to be. */
  const fillLightness = Math.max(ACCENT_L[5], lightnessForContrastOnDark(h, s, inkLuminance, 4.5));
  const base = ACCENT_L.map((l, i) => (i === 5 ? fillLightness : l));
  if (!light) return base;

  // The wash: the 500 stop at the heaviest alpha the app uses, over the page.
  const fill = hslToRgb(h, s, fillLightness);
  const tint = [0, 1, 2].map((i) => fill[i] * 0.15 + page[i] * 0.85);
  const against = Math.min(relativeLuminance(tint), relativeLuminance(chip));
  return base.map((l, i) =>
    i < ACCENT_TEXT_TARGETS.length ? lightnessForContrast(h, s, against, ACCENT_TEXT_TARGETS[i]) : l,
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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
  return [r, g, b].map((v) => Math.round((v + m) * 255)) as [number, number, number];
}

function hslToRgbChannels(h: number, s: number, l: number): string {
  return hslToRgb(h, s, l).join(' ');
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

  const light = surface.mode === 'light';
  const pageRgb = hslToRgb(surface.hue, surface.sat, surfaceRamp[10]);
  const pageLuminance = relativeLuminance(pageRgb);
  /* The text stops of a light surface are solved the same way the accents are,
     and against the same worst case: not the page, but the darkest ground the
     app puts text on. Panels are `bg-zinc-900` and selected rows and chips are
     `bg-zinc-800`, so text solved against the page alone lands a few tenths
     short the moment it sits inside a card — which is most of the time.

     The 800 stop keeps its fixed lightness, so there is nothing circular here:
     the reference is a constant of the ramp, and only the stops above it move. */
  const groundLuminance = light
    ? relativeLuminance(hslToRgb(surface.hue, surface.sat, surfaceRamp[8]))
    : pageLuminance;
  const surfaceScale = light
    ? surfaceRamp.map((l, i) =>
        i < LIGHT_TEXT_TARGETS.length
          ? lightnessForContrast(surface.hue, surface.sat, groundLuminance, LIGHT_TEXT_TARGETS[i])
          : l,
      )
    : surfaceRamp;
  // The neutral chip accent text sits on: `bg-zinc-800`, the 800 stop.
  const chipRgb = hslToRgb(surface.hue, surface.sat, surfaceRamp[8]);
  // Text on a saturated accent fill stays dark whatever the surface does,
  // because the accent itself stays bright. The fills are solved against it.
  const onAccent = hslToRgb(surface.hue, Math.min(surface.sat, 20), 8);
  const inkLuminance = relativeLuminance(onAccent);
  const ramp = (hue: number, sat: number) =>
    accentRamp(hue, sat, light, pageRgb, chipRgb, inkLuminance);

  const vars: Record<string, string> = {
    ...scale('surface', surface.hue, surface.sat, surfaceScale),
    ...scale('primary', p.hue, p.sat, ramp(p.hue, p.sat)),
    ...scale('secondary', s2.hue, s2.sat, ramp(s2.hue, s2.sat)),
    ...scale('highlight', h.hue, h.sat, ramp(h.hue, h.sat)),
    ...scale('tertiary', t.hue, t.sat, ramp(t.hue, t.sat)),
    ...scale('danger', 352, 72, ramp(352, 72)),
    '--fb-font-sans': font.stack,
    '--fb-root-size': `${density.size}px`,
    '--fb-page': hslToRgbChannels(surface.hue, surface.sat, surfaceRamp[10]),
    '--fb-ink': hslToRgbChannels(surface.hue, Math.min(surface.sat, 8), surfaceScale[1]),
    // `bg-black/40` means "an inset, darker than the page" — which on a light
    // surface has to be a pale grey, not actual black.
    '--fb-void': hslToRgbChannels(surface.hue, surface.sat, surface.mode === 'light' ? 86 : 4),
    '--fb-on-accent': onAccent.join(' '),
    // The wash behind a modal. It is the one thing that must NOT follow the
    // surface: on a light theme an inverted scrim is a pale sheet over a pale
    // page, and the dialog stops reading as a dialog. It stays dark, and the
    // dark theme is unaffected because it was dark there already.
    '--fb-scrim': hslToRgbChannels(surface.hue, Math.min(surface.sat, 20), 6),
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

/**
 * A stored theme, and whether anybody actually asked for it.
 *
 * The marker exists because of a bug that made the default unchangeable. The
 * studio wrote the theme to storage inside an effect keyed on the theme, which
 * runs on mount as well as on a change — so the *current default* was saved to
 * every visitor's browser the first time they loaded the app, whether or not
 * they had ever opened the appearance panel. From then on `loadTheme` found it
 * and returned it, and moving the default could never reach anybody who had
 * been here before. Changing near-black to near-white showed the whole shape of
 * it: the page painted light from the CSS, hydration read the auto-saved
 * midnight back, and it snapped to dark.
 *
 * So a record without `chosen` is treated as no record. Anybody who genuinely
 * picked a theme keeps it; the much larger group who never touched it follows
 * the default again, now and whenever it moves.
 */
interface Stored extends Partial<Theme> {
  readonly chosen?: true;
}

export function loadTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THEME;
    const parsed = JSON.parse(raw) as Stored;
    // Written by the old effect rather than by a person: not a preference.
    if (parsed.chosen !== true) return DEFAULT_THEME;
    // Merge over the default so a theme saved by an older build, missing an
    // axis added since, still loads instead of rendering half-styled.
    return { ...DEFAULT_THEME, ...parsed };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Only ever called for a theme somebody picked. See `Stored`. */
export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    const stored: Stored = { ...theme, chosen: true };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // A browser with storage blocked still gets a working theme for this visit.
  }
}

/** How many distinct looks the axes actually reach. */
export const COMBINATIONS =
  SURFACES.length * ACCENTS.length ** 4 * RADII.length * DENSITIES.length * FONTS.length * LAYOUTS.length * MOTIONS.length;
