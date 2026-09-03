/**
 * Colour, radius and type are pointed at CSS variables so the theme engine in
 * `app/lib/theme.ts` can re-skin markup that was written long before it existed.
 * A `bg-zinc-900` already in the page follows the chosen surface family; a
 * `text-emerald-400` follows the chosen primary. No class names change.
 *
 * Families map to roles, not to their names:
 *   zinc → surface · emerald/teal → primary · cyan/sky → secondary
 *   amber/orange → highlight · violet/fuchsia → tertiary · rose → danger
 *
 * The `<alpha-value>` placeholder is what keeps `bg-emerald-500/10` working, so
 * the variables hold space-separated RGB channels rather than hex.
 */
const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const family = (role) =>
  Object.fromEntries(STOPS.map((stop) => [stop, `rgb(var(--fb-${role}-${stop}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        zinc: family('surface'),
        emerald: family('primary'),
        teal: family('primary'),
        cyan: family('secondary'),
        sky: family('secondary'),
        amber: family('highlight'),
        orange: family('highlight'),
        violet: family('tertiary'),
        fuchsia: family('tertiary'),
        rose: family('danger'),

        // `white` is the foreground and `black` the deepest surface, so both
        // follow the theme: in a light surface family `text-white` resolves to
        // near-black and `bg-black/40` to a pale inset, which is what the
        // existing markup means by them even though it does not say so.
        white: 'rgb(var(--fb-ink) / <alpha-value>)',
        black: 'rgb(var(--fb-void) / <alpha-value>)',
        // Text on a saturated accent fill. Dark in every theme, because the
        // accent stays bright in every theme.
        onAccent: 'rgb(var(--fb-on-accent) / <alpha-value>)',
        // The wash behind a modal. Dark in every theme — see --fb-scrim.
        scrim: 'rgb(var(--fb-scrim) / <alpha-value>)',
      },
      borderRadius: {
        sm: 'var(--fb-radius-sm)',
        DEFAULT: 'var(--fb-radius)',
        md: 'var(--fb-radius-md)',
        lg: 'var(--fb-radius-lg)',
        xl: 'var(--fb-radius-xl)',
        '2xl': 'var(--fb-radius-2xl)',
        '3xl': 'var(--fb-radius-3xl)',
      },
      fontFamily: {
        sans: ['var(--fb-font-sans)'],
      },
      transitionDuration: {
        DEFAULT: 'var(--fb-motion)',
      },
    },
  },
  plugins: [],
}
