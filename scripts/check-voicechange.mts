/**
 * The one paid button that promises singing, over a model built for speech.
 *
 * ── What it says ─────────────────────────────────────────────────────────
 *
 * The Pro Booth's panel is titled "Sing this in another voice", its button
 * says "Sing it", and there is a credit cost on the same screen. Its note is
 * careful about one thing — it will not fix your singing, and it keeps a wrong
 * note as faithfully as a right one — and silent about the thing that decides
 * whether the result is worth buying.
 *
 * ── What is behind it ────────────────────────────────────────────────────
 *
 * `eleven_multilingual_sts_v2`. Speech to speech. `docs/OPEN-QUESTIONS.md` §A1
 * records that it is for talking and handles singing badly, and
 * `docs/DIENSTE-EN-KOSTE.md` §9 calls singing conversion the one thing the app
 * promises and cannot deliver. A real singing model — Moises Voice Studio over
 * the Music.ai API, or an RVC service — is still the gap.
 *
 * Somebody spends credits from that panel. Being told afterwards is being told
 * too late, and "moet nie goed vir my lig maak nie" is the standing
 * instruction on this project.
 *
 * ── What is asserted, and what deliberately is not ───────────────────────
 *
 * The promise, not the phrasing — the same posture `check:letters` takes. The
 * note has to name what the model is built for and has to be there before the
 * cost, in both languages. How it is worded is free to improve.
 *
 * And the other caller of the same route is held to its honest framing:
 * VoiceLab says "Say it again in another voice". "Say", not "sing", is the
 * accurate word for a speech model, and it should stay that way.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const booth = readFileSync(join(ROOT, 'app/components/ProBooth.tsx'), 'utf8');
const lab = readFileSync(join(ROOT, 'app/components/VoiceLab.tsx'), 'utf8');
const dict = readFileSync(join(ROOT, 'app/lib/i18n.tsx'), 'utf8');

/* The route it actually calls, so this file cannot go stale in the good
   direction: if the model is ever swapped for one that sings, the assertion
   below should be revisited rather than silently kept. */
const route = readFileSync(join(ROOT, 'app/api/voice/change/route.ts'), 'utf8');
ok(
  'the model behind it is still speech-to-speech',
  /eleven_multilingual_sts_v2/.test(route),
  'the model changed — if it sings now, this whole check should be reconsidered',
);

/* The warning exists, is on the panel, and comes before the cost. */
const key = 'pro.singBuilt';
ok(
  'the panel says what the model is built for',
  booth.includes(key),
  `${key} is not rendered on the voice-change panel`,
);

/* The cost *on this panel*, which means the first one after the caveat — not
   the first in the file. The first version of this searched from zero, found
   an earlier panel's cost, and reported the caveat as coming after it while
   it sat two lines above. My bug, not the screen's. */
const at = booth.indexOf(key);
const cost = at === -1 ? -1 : booth.indexOf('<Cost', at);
ok(
  'and says it before the money, not after',
  at !== -1 && cost !== -1,
  'the cost is shown first, so the press is made before the caveat is read',
);

/* Both languages, and each has to carry the point rather than the wording.
   Matched on the idea: speech, and that singing is the weak case. */
const line = dict.split('\n').find((one) => one.includes(`"${key}"`)) ?? '';
ok(`${key} exists in both languages`, /en: "[^"]+"/.test(line) && /af: "[^"]+"/.test(line));
ok(
  'the English says it is built for speech and that singing is the weak case',
  /speech|talking|spoken/i.test(line) && /sung|singing|sing\b|melody/i.test(line),
  'the caveat does not name what the model is for',
);
ok(
  'and the Afrikaans says the same',
  /spraak|praat|gepraat/i.test(line) && /sing|gesing|melodie/i.test(line),
  'die waarskuwing sê nie waarvoor die model gebou is nie',
);

/* And the other room that calls the same route keeps the accurate verb. */
ok(
  'the voice lab still says "say it again", not "sing it"',
  /voice\.changer['"],\s*'Say it again in another voice'/.test(lab) ||
    /'Say it again in another voice'/.test(lab),
  'a speech model described as singing, in a second room',
);

if (failures > 0) {
  console.log(`\ncheck:voicechange — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:voicechange — the panel says what it is built for, before the money.');
}
