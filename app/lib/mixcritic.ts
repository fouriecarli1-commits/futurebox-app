/**
 * The mix critic: listens to every lane and to the mix, on the device, and
 * says what an engineer would say first, each with the one press that fixes
 * it.
 *
 * The owner asked for ProBooth to be the most AI-forward studio there is
 * (29 October 2026). Every studio has meters; none of them tells a first-time
 * singer that their voice is buried under the song, or that the phone picked up
 * the table being knocked. This does, from numbers it measures rather than a
 * guess: how loud each lane is while it is playing, how much of it is below
 * what a voice makes, where the lanes sit left to right, whether the voice
 * has any room around it, and how loud the whole mix is against what the
 * streaming services play it at.
 *
 * Every finding carries its fix as data, so the room applies it as one
 * undoable step and the critic never touches the session itself. What it
 * cannot hear it does not claim: it reads the lanes before their effects, so
 * it says "level" and not "tone".
 */

export type LaneKind = 'song' | 'beat' | 'keys' | 'take';

export interface LaneHeard {
  readonly id: string;
  readonly name: string;
  readonly kind: LaneKind;
  /** The lane as it plays, mono, at its fader. */
  readonly samples: Float32Array;
  readonly rate: number;
  readonly gain: number;
  readonly pan: number;
  /** Its room send, 0–1. */
  readonly space: number;
  /** A reverb in its own rack. */
  readonly reverb: boolean;
  /** Its rumble filter is on. */
  readonly rumbleOff: boolean;
}

export interface MixHeard {
  /** The mix's loudness, LUFS, before finishing. */
  readonly lufs: number;
  /** What the chosen platform plays at. */
  readonly target: number;
  /** "Match the loudness" is on. */
  readonly matching: boolean;
}

export type Fix =
  | { readonly kind: 'gain'; readonly id: string; readonly gain: number }
  | { readonly kind: 'rumble'; readonly ids: readonly string[] }
  | { readonly kind: 'pan'; readonly moves: readonly { readonly id: string; readonly pan: number }[] }
  | { readonly kind: 'space'; readonly id: string; readonly space: number }
  | { readonly kind: 'match' };

export interface Finding {
  /** Stable for the same problem on the same lane, so the list can drop one that was fixed. */
  readonly id: string;
  readonly what: Fix['kind'] | 'loud';
  /** i18n key and English, with `{name}`, `{db}` and the like filled from `values`. */
  readonly say: readonly [string, string];
  readonly press: readonly [string, string];
  readonly values: Readonly<Record<string, string>>;
  readonly fix: Fix;
  /** Higher is said first. */
  readonly weight: number;
}

/** The most a fix may push a fader, which is the fader's own top. */
export const MOST_GAIN = 1.5;
/** Quieter than the song by more than this is buried; louder by more than `ON_TOP_DB` sits on top. */
export const BURIED_DB = 9;
export const ON_TOP_DB = 6;
/** Where a fix puts a lane against the song. */
export const UNDER_SONG_DB = 4;
export const OVER_SONG_DB = 2;
/** Of a take's sound, more than this share below 80 Hz is rumble, not voice. */
export const RUMBLE_SHARE = 0.1;
export const ROOM_SEND = 0.18;

/**
 * How loud a lane is while it is playing, in dBFS RMS: 50 ms readings, the
 * silent ones (under -50 dB) left out, so a voice that sings for ten seconds
 * of a three-minute lane is not called quiet for the rests between.
 */
export function activeDb(samples: Float32Array, rate: number): number {
  const size = Math.max(1, Math.round(rate * 0.05));
  const floor = 10 ** (-50 / 10);
  let sum = 0;
  let count = 0;
  for (let start = 0; start + size <= samples.length; start += size) {
    let power = 0;
    for (let i = start; i < start + size; i += 1) power += samples[i] * samples[i];
    power /= size;
    if (power > floor) { sum += power; count += 1; }
  }
  return count ? 10 * Math.log10(sum / count) : -Infinity;
}

/** The share of a sound's energy below `hz`, through four one-pole filters so a voice's own low notes do not leak in. */
export function lowShare(samples: Float32Array, rate: number, hz: number): number {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  let s1 = 0; let s2 = 0; let s3 = 0; let s4 = 0;
  let low = 0;
  let all = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i];
    s1 += a * (x - s1); s2 += a * (s1 - s2); s3 += a * (s2 - s3); s4 += a * (s3 - s4);
    low += s4 * s4;
    all += x * x;
  }
  return all > 0 ? low / all : 0;
}

const round = (value: number, places = 2): number => Math.round(value * 10 ** places) / 10 ** places;

/** The fader that moves a lane from `nowDb` to `wantDb`, held inside the fader's travel. */
export const gainFor = (gain: number, nowDb: number, wantDb: number): number =>
  round(Math.max(0.05, Math.min(MOST_GAIN, gain * 10 ** ((wantDb - nowDb) / 20))));

/** What the critic hears, most important first. Empty is a mix with nothing to say about it. */
export function critique(lanes: readonly LaneHeard[], mix: MixHeard | null): Finding[] {
  const out: Finding[] = [];
  const levels = new Map(lanes.map((one) => [one.id, activeDb(one.samples, one.rate)]));
  const sounding = lanes.filter((one) => Number.isFinite(levels.get(one.id)));
  const song = sounding.find((one) => one.kind === 'song');
  const others = sounding.filter((one) => one.kind !== 'song');

  /* Against the song when there is one; against the middle of the others when there is not. */
  const sorted = sounding.map((one) => levels.get(one.id) as number).sort((x, y) => x - y);
  const reference = song ? (levels.get(song.id) as number) : sorted[Math.floor(sorted.length / 2)];
  const against = song ? 'song' : 'rest';

  if (sounding.length > 1) {
    for (const lane of others) {
      const db = levels.get(lane.id) as number;
      if (db < reference - BURIED_DB) {
        const gain = gainFor(lane.gain, db, reference - UNDER_SONG_DB);
        if (gain > lane.gain) {
          out.push({
            id: `gain:${lane.id}`,
            what: 'gain',
            say: against === 'song'
              ? ['critic.buried', '{name} is buried: {db} dB under the song.']
              : ['critic.buriedRest', '{name} is buried: {db} dB under the rest of the mix.'],
            press: ['critic.bringUp', 'Bring it up'],
            values: { name: lane.name, db: String(Math.round(reference - db)) },
            fix: { kind: 'gain', id: lane.id, gain },
            weight: 3 + (reference - db) / 10,
          });
        }
      } else if (db > reference + ON_TOP_DB) {
        out.push({
          id: `gain:${lane.id}`,
          what: 'loud',
          say: against === 'song'
            ? ['critic.onTop', '{name} sits on top: {db} dB over the song.']
            : ['critic.onTopRest', '{name} sits on top: {db} dB over the rest of the mix.'],
          press: ['critic.bringDown', 'Bring it down'],
          values: { name: lane.name, db: String(Math.round(db - reference)) },
          fix: { kind: 'gain', id: lane.id, gain: gainFor(lane.gain, db, reference + OVER_SONG_DB) },
          weight: 3 + (db - reference) / 10,
        });
      }
    }
  }

  /* One finding for every take with rumble under it: the passes of one loop
     take are one recording, and five copies of the same sentence would push
     everything else off the list. */
  const rumbly = sounding
    .filter((one) => one.kind === 'take' && !one.rumbleOff)
    .map((one) => ({ lane: one, share: lowShare(one.samples, one.rate, 80) }))
    .filter((one) => one.share > RUMBLE_SHARE);
  if (rumbly.length) {
    const worst = Math.max(...rumbly.map((one) => one.share));
    out.push({
      id: 'rumble',
      what: 'rumble',
      say: rumbly.length === 1
        ? ['critic.rumble', '{name} has rumble under it: {share}% of it is below anything a voice makes. A table, traffic, the phone being handled.']
        : ['critic.rumbleMany', '{count} takes have rumble under them, up to {share}% below anything a voice makes. A table, traffic, the phone being handled.'],
      press: ['critic.takeRumble', 'Take the rumble off'],
      values: { name: rumbly[0].lane.name, count: String(rumbly.length), share: String(Math.round(worst * 100)) },
      fix: { kind: 'rumble', ids: rumbly.map((one) => one.lane.id) },
      weight: 2 + worst,
    });
  }

  if (mix && !mix.matching && Number.isFinite(mix.lufs) && mix.lufs < mix.target - 4) {
    out.push({
      id: 'match',
      what: 'match',
      say: ['critic.quiet', 'The mix is quiet: {lufs} LUFS, where streaming plays songs at {target}. Next to other songs it will sound weak.'],
      press: ['critic.match', 'Match the loudness'],
      values: { lufs: mix.lufs.toFixed(1), target: String(mix.target) },
      fix: { kind: 'match' },
      weight: 2.5,
    });
  }

  const lead = others
    .filter((one) => one.kind === 'take')
    .sort((x, y) => (levels.get(y.id) as number) - (levels.get(x.id) as number))[0];
  if (song && lead && lead.space < 0.05 && !lead.reverb) {
    out.push({
      id: `space:${lead.id}`,
      what: 'space',
      say: ['critic.dry', '{name} is completely dry: a little room puts it in the same space as the music.'],
      press: ['critic.addRoom', 'Add a little room'],
      values: { name: lead.name },
      fix: { kind: 'space', id: lead.id, space: ROOM_SEND },
      weight: 1.5,
    });
  }

  if (others.length >= 3 && others.every((one) => Math.abs(one.pan) < 0.05)) {
    const byLevel = [...others].sort((x, y) => (levels.get(y.id) as number) - (levels.get(x.id) as number));
    /* The loudest stays in the middle; the rest step out, alternating sides, a little further each pair. */
    const moves = byLevel.slice(1).map((one, i) => ({ id: one.id, pan: round((i % 2 ? 1 : -1) * Math.min(0.6, 0.3 + 0.15 * Math.floor(i / 2))) }));
    out.push({
      id: 'pan',
      what: 'pan',
      say: ['critic.middle', 'All {count} lanes are in the middle, on top of each other. Spread out, each one is easier to hear.'],
      press: ['critic.spread', 'Spread them out'],
      values: { count: String(others.length) },
      fix: { kind: 'pan', moves },
      weight: 1,
    });
  }

  return out.sort((x, y) => y.weight - x.weight).slice(0, 6);
}

/** A finding's sentence with its values filled in. */
export const fill = (text: string, values: Readonly<Record<string, string>>): string =>
  text.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
