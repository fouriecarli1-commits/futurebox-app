/**
 * The device sizes an installed FutureBox opens on, in one place.
 *
 * ── Why this is a file and not a list in two files ───────────────────────
 *
 * iOS takes the startup image whose media query matches the device EXACTLY —
 * width, height and pixel ratio — and ignores every file offered if none
 * matches. So a query and a picture that disagree by one pixel is not a
 * slightly wrong splash: it is no splash at all, and what she sees is the
 * icon on a plain ground, which is the thing she asked to have fixed.
 *
 * `scripts/splash.mts` draws the pictures from this list and `app/layout.tsx`
 * writes the queries from it, so there is nothing for them to disagree about.
 * `check:launchmark` opens each file and reads its real width and height out
 * of the PNG header anyway, because "they came from the same array" is an
 * argument and a measurement is not.
 *
 * Portrait only, and said rather than hidden: this app is portrait
 * everywhere, and a landscape launch falls back to the system's own screen
 * followed a moment later by `LaunchMark`.
 */

/** One device: its own CSS pixels, and how many real ones it draws per CSS one. */
export interface Screen {
  readonly w: number;
  readonly h: number;
  readonly dpr: number;
  /** The phones this covers, for whoever has to add the next one. */
  readonly what: string;
}

export const SCREENS: readonly Screen[] = [
  { w: 375, h: 667, dpr: 2, what: 'iPhone SE, 8' },
  { w: 375, h: 812, dpr: 3, what: 'iPhone X, XS, 11 Pro, 12 mini, 13 mini' },
  { w: 390, h: 844, dpr: 3, what: 'iPhone 12, 13, 14' },
  { w: 393, h: 852, dpr: 3, what: 'iPhone 14 Pro, 15, 16' },
  { w: 402, h: 874, dpr: 3, what: 'iPhone 16 Pro' },
  { w: 414, h: 896, dpr: 2, what: 'iPhone XR, 11' },
  { w: 428, h: 926, dpr: 3, what: 'iPhone 12 Pro Max, 13 Pro Max, 14 Plus' },
  { w: 430, h: 932, dpr: 3, what: 'iPhone 14 Pro Max, 15 Plus, 15 Pro Max' },
  { w: 440, h: 956, dpr: 3, what: 'iPhone 16 Pro Max' },
  { w: 768, h: 1024, dpr: 2, what: 'iPad, iPad mini' },
  { w: 834, h: 1194, dpr: 2, what: 'iPad Pro 11' },
  { w: 1024, h: 1366, dpr: 2, what: 'iPad Pro 12.9' },
];

/** Where one screen's picture is served from. Named in real pixels, as it is drawn. */
export const splashFile = (one: Screen): string =>
  `/splash/${one.w * one.dpr}x${one.h * one.dpr}.png`;

/**
 * What iOS has to read to choose it.
 *
 * `-webkit-device-pixel-ratio` and not `resolution`: Safari has never matched
 * a startup image on the standard form, and a query it does not understand is
 * a query that never matches, which is silent.
 */
export const splashMedia = (one: Screen): string =>
  `(device-width: ${one.w}px) and (device-height: ${one.h}px)`
  + ` and (-webkit-device-pixel-ratio: ${one.dpr}) and (orientation: portrait)`;

/** The whole list, in the shape `app/layout.tsx` hands to Next. */
export const startupImages = (): { url: string; media: string }[] =>
  SCREENS.map((one) => ({ url: splashFile(one), media: splashMedia(one) }));
