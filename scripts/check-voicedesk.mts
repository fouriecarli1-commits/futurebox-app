/**
 * The voice desk, and the gap it closed.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * `Dials`, `Cleanup` and `Polish` have been in `lib/server/kits.ts` since they
 * were written down. `startConversion` sends every one of them. And
 * `/api/voice/sing` read a single field — `pitchShift`. Conversion strength,
 * model volume and both sets of effects were supported end to end, correct,
 * and reachable by nothing at all.
 *
 * That is the same fault as a button behind the tab bar, one layer down: built,
 * working, and impossible to get at. Carli asked for the desk without knowing
 * most of it was already there.
 *
 * ── The four ways it goes wrong again ────────────────────────────────────
 *
 * 1. **A route that reads some of the form.** The fault itself. Every field
 *    the panel can send has to be read.
 * 2. **Numbers on the wire.** A gate is four numbers, and a browser that can
 *    send them can send a threshold of +40 dB. The wire carries names.
 * 3. **Defaults this app invented.** An omitted field is Kits' own choice; a
 *    number nobody tuned is worse than no number. Untouched, the panel must
 *    put nothing on the form.
 * 4. **Effects on the engine that has none.** The dials are Kits'. Drawn
 *    beside the speech engine they would be controls that go nowhere.
 *
 *   npm run check:voicedesk
 */
import { readFileSync } from 'node:fs';
import { PRE_EFFECTS, POST_EFFECTS, cleanupFrom, polishFrom } from '../app/lib/server/kits';
import { DEFAULT_SETTINGS, settingsToForm } from '../app/components/VoiceMixer';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── 1. The route reads the whole form ─────────────────────────────────── */
const route = readFileSync('app/api/voice/sing/route.ts', 'utf8');
for (const field of ['pitchShift', 'conversionStrength', 'modelVolumeMix', 'pre', 'post']) {
  ok(`the route reads ${field}`, new RegExp(`['"]${field}['"]`).test(route));
}
ok('and hands all of it to the conversion',
  /convert\(\s*wanted, audio, 'take\.wav', Date\.now\(\) \+ WAIT_MS, want, dials, asked, after,/.test(route));

/* ── 2. Names on the wire, shapes on the server ────────────────────────── */
ok('the effects are named, not described in numbers',
  /cleanupFrom\(named\('pre'\)\)/.test(route) && /polishFrom\(named\('post'\)\)/.test(route));
const panel = readFileSync('app/components/VoiceMixer.tsx', 'utf8');
ok('and the panel sends names too',
  /form\.set\('pre', settings\.pre\.join\(','\)\)/.test(panel));
ok('a name nobody knows is dropped rather than guessed at',
  cleanupFrom(['nonsense']) === null && polishFrom(['nonsense']) === null);
ok('every pre-effect the panel offers has a shape',
  PRE_EFFECTS.every((one) => cleanupFrom([one]) !== null), PRE_EFFECTS.join(', '));
ok('and every post-effect', POST_EFFECTS.every((one) => polishFrom([one]) !== null),
  POST_EFFECTS.join(', '));
/* Two at once is two shapes merged, not the second replacing the first. */
const both = cleanupFrom(['noiseGate', 'highPass']);
ok('asking for two puts both on', !!both?.noiseGate && !!both?.highPassFilter);

/* ── 3. Untouched sends nothing ────────────────────────────────────────── */
{
  const form = new FormData();
  settingsToForm(form, DEFAULT_SETTINGS);
  ok('an untouched desk puts nothing on the request',
    [...form.keys()].length === 0, [...form.keys()].join(', '));
}
{
  /* And a moved one sends only what was moved. `pre` and `post` always go once
     anything is chosen, because an empty `pre` means "clean nothing", which is
     a real choice and different from not having asked. */
  const form = new FormData();
  settingsToForm(form, { ...DEFAULT_SETTINGS, conversionStrength: 0.8, chosen: true });
  ok('a moved slider is sent', form.get('conversionStrength') === '0.8');
  ok('and an untouched one is not', form.get('modelVolumeMix') === null);
  ok('while the effects go as a list', form.get('pre') === 'noiseGate,highPass');
}
ok('the panel starts every ratio at "leave it alone"',
  DEFAULT_SETTINGS.conversionStrength === null && DEFAULT_SETTINGS.modelVolumeMix === null);
ok('and starts cleaned the way a phone take needs',
  DEFAULT_SETTINGS.pre.includes('noiseGate') && DEFAULT_SETTINGS.pre.includes('highPass'));

/* ── 4. Only on the engine whose dials these are ───────────────────────── */
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
ok('the desk is drawn on the singing engine', /<VoiceMixer settings=\{desk\}/.test(booth));
/* Inside the `sings` branch, which is the block that also renders SingVoices. */
const singing = booth.slice(booth.indexOf('SingVoices'), booth.indexOf('<VoicePicker'));
ok('and only there', singing.includes('<VoiceMixer'));
ok('the request carries it only on that engine',
  /if \(sings\) settingsToForm\(form, desk\);/.test(booth));

/* ── The ranges Kits published, held on this side ──────────────────────── */
const kits = readFileSync('app/lib/server/kits.ts', 'utf8');
ok('pitch is clamped to their -24..24', /clamp\(dials\.pitchShift, -24, 24\)/.test(kits));
ok('and both ratios to 0..1',
  /clamp\(dials\.conversionStrength, 0, 1\)/.test(kits)
  && /clamp\(dials\.modelVolumeMix, 0, 1\)/.test(kits));
ok('the route refuses a ratio outside that before it ever reaches them',
  /said >= 0 && said <= 1/.test(route));

console.log(
  failures
    ? `\ncheck:voicedesk — ${failures} assertion(s) failed.`
    : '\ncheck:voicedesk — every dial reaches Kits, by name, and an untouched desk sends nothing.',
);
process.exit(failures ? 1 : 0);
