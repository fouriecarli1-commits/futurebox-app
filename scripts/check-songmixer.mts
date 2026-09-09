/**
 * The desk is in both rooms, and a finished song is not cleaned like a phone.
 *
 * ── Two things, and the second is a bug that was shipping ────────────────
 *
 * Carli asked for the voice desk in general terms — "'n mixer setting … vir
 * die stemme wat gebruik word". It went into the Pro Booth and not into Make a
 * song, which is the room most people are actually in: a song came out of the
 * machine and the voice on it is not theirs.
 *
 * Wiring it there surfaced the second thing. `/api/voice/sing` applies
 * `PHONE_CLEANUP` — a noise gate and a high-pass — to anything that does not
 * say otherwise. That is right for the booth, where somebody sang into a
 * handset. Make a song sends a finished, mastered mix, and a noise gate over
 * one of those chews the reverb tails and the quiet ends of phrases while the
 * high-pass takes the bottom off the bass. Nobody asked for it and nothing on
 * the screen said it was happening.
 *
 * So `SONG_SETTINGS` starts `chosen`, with an empty `pre` — which is a real
 * instruction meaning "clean nothing", and different from not having asked.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const mixer = readFileSync('app/components/VoiceMixer.tsx', 'utf8');
const song = readFileSync('app/components/SingItMine.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const route = readFileSync('app/api/voice/sing/route.ts', 'utf8');

/* ── The desk is in both rooms ─────────────────────────────────────────── */
ok('the Pro Booth has the desk', /<VoiceMixer/.test(booth));
ok('and so does Make a song', /<VoiceMixer/.test(song));
ok('both send it on the request', /settingsToForm\(/.test(booth) && /settingsToForm\(/.test(song));

/* ── A finished song is not a phone take ───────────────────────────────── */
const songDefaults = /export const SONG_SETTINGS: VoiceSettings = \{([\s\S]*?)\};/.exec(mixer)?.[1] ?? '';
const phoneDefaults = /export const DEFAULT_SETTINGS: VoiceSettings = \{([\s\S]*?)\};/.exec(mixer)?.[1] ?? '';

ok('there are two starting points, not one', Boolean(songDefaults) && Boolean(phoneDefaults));
ok('the phone one cleans, because a handset in a room needs it',
  /noiseGate/.test(phoneDefaults), phoneDefaults.trim().slice(0, 60));
ok('the song one cleans nothing', /pre: \[\]/.test(songDefaults), songDefaults.trim().slice(0, 60));
/* The whole point. Untouched, `settingsToForm` sends nothing at all unless
   `chosen` — so a song room that started unchosen would silently get the
   phone cleanup from the route, which is the bug. */
ok('and it is chosen from the start, or the route cleans it anyway',
  /chosen: true/.test(songDefaults), songDefaults.trim().slice(0, 80));
ok('Make a song starts from the song one, not the phone one',
  /useState<VoiceSettings>\(SONG_SETTINGS\)/.test(song));
ok('and the Pro Booth still starts from the phone one',
  /useState<VoiceSettings>\(DEFAULT_SETTINGS\)/.test(booth));

/* ── The rule the fix depends on ───────────────────────────────────────── */
ok('an untouched desk still sends nothing', /if \(!settings\.chosen\) return;/.test(mixer));
ok('an empty pre is sent rather than omitted, so it means "clean nothing"',
  /form\.set\('pre', settings\.pre\.join\(','\)\)/.test(mixer));
ok('the route only falls back to the phone cleanup when nothing was said',
  /form\.has\('pre'\) \? cleanupFrom/.test(route));

console.log(
  failures
    ? `\ncheck:songmixer — ${failures} wrong.`
    : '\ncheck:songmixer — the desk is in both rooms, and a finished mix is not gated like a phone take.',
);
process.exit(failures ? 1 : 0);
