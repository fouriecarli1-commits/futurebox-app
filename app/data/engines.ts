/**
 * What the other music engines charge, so the choice can be made with numbers.
 *
 * These are **published rates read off the web in August 2026**, not quotes,
 * not measured, and not verified against any of these providers' own APIs.
 * They are here to be compared against what this account actually spends —
 * which is the number that matters and the only one this app can be sure of.
 *
 * Two things decide this more than the price does, and both are recorded
 * against every entry because forgetting either is expensive:
 *
 *   · `licence` — these songs are sold. An engine whose commercial terms are
 *     unclear is not cheaper, it is a liability with a low headline price.
 *   · `perMinute` — some bill by the minute and some by the generation. A
 *     fifteen-second preview costs a quarter as much at the first kind and
 *     exactly the same at the second, which reverses the ranking between
 *     previews and full songs.
 */

export interface EngineRate {
  readonly name: string;
  /** US dollars for one full song, as published. */
  readonly usdPerSong: number;
  /** True when the price scales with length rather than being flat per song. */
  readonly perMinute: boolean;
  readonly licence: 'commercial on paid plans' | 'commercial, stated' | 'unclear — check' | 'not stated';
  readonly note: string;
  readonly source: string;
}

/** A three-minute song, which is what these are costed against. */
export const SONG_MINUTES_FOR_COMPARISON = 3;

export const ENGINE_RATES: readonly EngineRate[] = [
  {
    name: 'ElevenLabs Music',
    usdPerSong: 0.45,
    perMinute: true,
    licence: 'commercial on paid plans',
    note: 'What this app uses. $0.15 a minute, so a preview is cheap and a full song is not.',
    source: 'https://apiframe.ai/blog/ai-music-api-pricing-2026',
  },
  {
    name: 'Stable Audio',
    usdPerSong: 0.2,
    perMinute: false,
    licence: 'unclear — check',
    note: 'Flat per generation.',
    source: 'https://apiframe.ai/blog/ai-music-api-pricing-2026',
  },
  {
    name: 'Mureka (per song)',
    usdPerSong: 0.06,
    perMinute: false,
    licence: 'commercial, stated',
    note: 'Commercial rights stated on paid credits.',
    source: 'https://apiframe.ai/models/mureka',
  },
  {
    name: 'Sonauto / Treblo',
    usdPerSong: 0.05,
    perMinute: false,
    licence: 'unclear — check',
    note: 'Sources disagree on commercial use. Requires crediting them in the app.',
    source: 'https://sonauto.ai/developers/pricing',
  },
  {
    name: 'Mureka (Pro plan)',
    usdPerSong: 7.17 / 500,
    perMinute: false,
    licence: 'commercial, stated',
    note: '$7.17 a month for 500 songs.',
    source: 'https://murekav9.com/pricing',
  },
  {
    name: 'MiniMax Music 2.0',
    usdPerSong: 0.03,
    perMinute: false,
    licence: 'not stated',
    note: 'Cheapest, and its API documents publish no commercial terms.',
    source: 'https://apiframe.ai/blog/ai-music-api-pricing-2026',
  },
];
