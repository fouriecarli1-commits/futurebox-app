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
/* ── Across the seam, in two halves ────────────────────────────────────

   The route used to call Kits' `convert` with eight positional arguments and
   this matched that line. Since 8 October 2026 it calls whoever is singing
   (`lib/server/singer.ts`, for Kits' §1.3), so "hands all of it over" is now
   two claims and both are checked.

   The split is the point of the seam rather than an accident of it. `pitch`
   and `strength` are true of singing voice conversion whoever does it, so
   they ride on the ask itself. A noise gate's attack time in milliseconds is
   one supplier's effects chain, so it travels as an opaque tuning tagged with
   who issued it — and anyone else drops it rather than half-reading it. */
const adapter = readFileSync('app/lib/server/singerkits.ts', 'utf8');
ok('the route puts the two universal dials on the ask itself',
  /\{ pitch: shift \}/.test(route) && /\{ strength \}/.test(route));
ok('and Kits\u2019 own effects in a tuning tagged as Kits\u2019',
  /const tuning: KitsTuning = \{\s*cleanup: asked,\s*polish: after,/.test(route)
  && /modelVolumeMix: modelVolume/.test(route)
  && /tuning: \{ by: who\.id, it: tuning \}/.test(route));
ok('and the adapter hands every part of it to the conversion',
  /convert\(\s*id,\s*ask\.audio,\s*ask\.filename,\s*ask\.deadline,\s*ask\.want,\s*dials,/.test(adapter)
  && /mine\.cleanup === undefined \? PHONE_CLEANUP : mine\.cleanup/.test(adapter)
  && /mine\.polish \?\? null/.test(adapter),
  'the desk was reachable by nothing for weeks; the seam must not put it back'
  + ' in that state');

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
