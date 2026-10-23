/**
 * The jam room's characters: somebody hides completely behind one.
 *
 *   npm run check:jamcharacters
 *
 * The owner, 22 October 2026: *"Daar moet templates wees van animated
 * characters dat iemand heeltemal agter templates skuil."* What is held here
 * is the part a screenshot cannot show:
 *
 *   1. A look is two words from fixed lists, and anything else that arrives
 *      — from storage or from the room — becomes something drawable rather
 *      than being drawn. A pulse from the room is a small whole number or
 *      nothing.
 *   2. Every character on the list is drawn, every name on the list is said
 *      in both languages, and the Afrikaans uses the typographic apostrophe.
 *   3. Nothing in the jam room asks for the camera, or draws a video or a
 *      photograph of anybody: going on stage is the microphone alone.
 *   4. The name a tile wears is read by the server from the creator's row,
 *      never taken from the request, and the stage is signed-in only.
 *   5. The loudness that moves your character is the room's own bus — the
 *      pads and the looper both play through it — so the looper keeps
 *      working and your character moves to it.
 */
import { readFileSync } from 'node:fs';
import {
  CHARACTERS, CHARACTER_WORDS, COLOURS, COLOUR_IDS, COLOUR_WORDS, DEFAULT_LOOK, PULSE_STEPS,
  cleanBpm, cleanLook, cleanPulse, follow, rmsOf, toLevel, toPulse,
} from '../app/lib/jamcharacters.ts';
import { before } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const read = (path: string): string => readFileSync(path, 'utf8');
const drawing = read('app/components/JamCharacter.tsx');
const stage = read('app/components/JamStage.tsx');
const room = read('app/components/LiveJam.tsx');
const looper = read('app/components/JamLooper.tsx');
const route = read('app/api/live/jammers/route.ts');
const sql = read('supabase/livejammers.sql');
const words = read('app/lib/i18n.tsx');
const css = read('app/globals.css');

/* ── 1. What travels ─────────────────────────────────────────────────── */
ok('there are twelve characters, all different', CHARACTERS.length === 12 && new Set(CHARACTERS).size === 12);
ok('  and eight colours, each a real hex colour', COLOUR_IDS.length === 8 && COLOUR_IDS.every((one) => /^#[0-9a-f]{6}$/i.test(COLOURS[one])));
ok('a look on the lists is kept', JSON.stringify(cleanLook({ character: 'owl', colour: 'pink' })) === '{"character":"owl","colour":"pink"}');
ok('  and one that is not becomes the default, half by half',
  cleanLook({ character: '<img src=x>', colour: 'pink' }).character === DEFAULT_LOOK.character
    && cleanLook({ character: 'fox', colour: 'url(javascript:1)' }).colour === DEFAULT_LOOK.colour
    && cleanLook({ character: 'fox', colour: 'nope' }).character === 'fox');
ok('  and nothing at all, or a prototype name, is the default too',
  JSON.stringify(cleanLook(null)) === JSON.stringify(DEFAULT_LOOK)
    && cleanLook({ character: 'constructor', colour: 'toString' }).colour === DEFAULT_LOOK.colour
    && cleanLook({ character: 'constructor' }).character === DEFAULT_LOOK.character);
ok('a pulse is a tag and a whole number in range',
  cleanPulse({ t: '0123456789abcdef', l: 4 })?.level === 4 / PULSE_STEPS);
ok('  or a drop', cleanPulse({ t: '0123456789abcdef', d: 1 })?.drop === true);
ok('  and text, a bad tag, a fraction or a number out of range is dropped',
  cleanPulse({ t: '0123456789abcdef', l: 'loud' }) === null
    && cleanPulse({ t: 'somebody', l: 3 }) === null
    && cleanPulse({ t: '0123456789abcdef', l: 2.5 }) === null
    && cleanPulse({ t: '0123456789abcdef', l: PULSE_STEPS + 1 }) === null
    && cleanPulse('<b>hi</b>') === null);
ok('a level is sent as a whole number from nought to nine',
  toPulse(0) === 0 && toPulse(1) === PULSE_STEPS && toPulse(7) === PULSE_STEPS && toPulse(Number.NaN) === 0);
ok('a tempo outside what anybody plays is nothing', cleanBpm(100) === 100 && cleanBpm(9000) === null && cleanBpm('x') === null);

/* ── Loudness ────────────────────────────────────────────────────────── */
ok('silence is still', toLevel(rmsOf(new Uint8Array(512).fill(128))) === 0);
const loud = Uint8Array.from({ length: 512 }, (_, i) => (i % 2 ? 228 : 28));
ok('  and a loud block moves the character all the way', toLevel(rmsOf(loud)) === 1, String(toLevel(rmsOf(loud))));
ok('  and a quiet one some of the way', (() => {
  const soft = Uint8Array.from({ length: 512 }, (_, i) => (i % 2 ? 136 : 120));
  const level = toLevel(rmsOf(soft));
  return level > 0.05 && level < 0.6;
})());
ok('the motion rises fast and falls slowly', follow(0, 1) >= 0.5 && follow(1, 0) > 0.8);
ok('  and settles all the way to still', (() => { let v = 1; for (let i = 0; i < 200; i += 1) v = follow(v, 0); return v === 0; })());

/* ── 2. Drawn, named, in both languages ──────────────────────────────── */
for (const one of CHARACTERS) {
  const fn = one[0].toUpperCase() + one.slice(1);
  if (!new RegExp(`function ${fn}\\(\\)`).test(drawing) || !new RegExp(`\\b${one}: ${fn}\\b`).test(drawing)) {
    ok(`the ${one} is drawn`, false);
  }
}
ok('every character on the list is drawn', CHARACTERS.every((one) => new RegExp(`\\b${one}: [A-Z]\\w+`).test(drawing)));
const keys = [
  ...Object.values(CHARACTER_WORDS).map((one) => one.key),
  ...Object.values(COLOUR_WORDS).map((one) => one.key),
  ...[...stage.matchAll(/t\('(jam\.[\w]+)'/g)].map((m) => m[1]),
  'live.stageMicOnly', 'live.micRefused',
];
const missing = [...new Set(keys)].filter((key) => !new RegExp(`"${key.replace('.', '\\.')}": \\{ en: "[^"]+", af: "[^"]+" \\}`).test(words));
ok('every word on the stage is in English and Afrikaans', missing.length === 0, missing.join(', '));
const straight = [...new Set(keys)].filter((key) => {
  const line = words.split('\n').find((one) => one.includes(`"${key}":`)) ?? '';
  return /af: "[^"]*'[^"]*"/.test(line);
});
ok('  and the Afrikaans uses ’ and never a straight apostrophe', straight.length === 0, straight.join(', '));
ok('the motion is all in globals.css, and stops under reduced motion',
  /@property --lvl/.test(css) && /\.jc \.jc-mouth/.test(css) && /\.jc-drop \.jc-bounce/.test(css)
    && /prefers-reduced-motion: reduce\)\s*\{\s*\.jc \.jc-breathe/.test(css));

/* ── 3. No camera, no face ───────────────────────────────────────────── */
const jamFiles = { 'LiveJam.tsx': room, 'JamStage.tsx': stage, 'JamCharacter.tsx': drawing, 'JamLooper.tsx': looper };
for (const [name, source] of Object.entries(jamFiles)) {
  ok(`${name} never asks for the camera, nor draws a video or a photograph`,
    !/video\s*:\s*true/.test(source) && !/<video\b/.test(source) && !/<img\b/.test(source)
      && !/<image\b/.test(source) && !/facingMode|getDisplayMedia|srcObject/.test(source));
}
ok('going on stage opens the microphone alone', /getUserMedia\(\{\s*video:\s*false,\s*audio:\s*true\s*\}\)/.test(room));
ok('the jam room stands you on the stage as your character', /<JamStage\b/.test(room) && /<JamCharacter\b/.test(stage));
ok('  and the drawing is made of shapes alone: no href, no url other than its own glow',
  !/href=/.test(drawing) && [...drawing.matchAll(/url\(/g)].length === 1 && /url\(#jcg/.test(drawing));
ok('the stage reads a look through cleanLook before it draws it', /look: cleanLook\(one\.look\)/.test(stage));
ok('  and a pulse through cleanPulse', /const pulse = cleanPulse\(payload\)/.test(stage));
ok('  and drops members you have blocked', /withoutBlocked\(others/.test(stage));

/* ── 4. The server ───────────────────────────────────────────────────── */
ok('the stage is signed-in only', (route.match(/if \(!caller\) return Response\.json\(\{ message: 'Sign in to be on the stage\.' \}, \{ status: 401 \}\)/g) ?? []).length === 2);
ok('  and the name is the creator row’s, written by the server', /const name = await jamNameOf\(client, caller\.id\)/.test(route) && !/body\.name/.test(route));
ok('  and the look is cleaned before it is kept', before(route, 'const look = cleanLook(body.look)', ".from('live_jammers').upsert("));
ok('  and a heartbeat is braked', before(route.slice(route.indexOf('export async function POST')), "refuseIfTooMany('live-jammers'", 'await callerFrom(request)'));
ok('the table holds no picture and no free text', !/bytea|image|photo|avatar_url|note\s+text/i.test(sql.split('create table')[1] ?? ''));
ok('  and only the server may reach it', /enable row level security/.test(sql) && /grant select, insert, update, delete on public\.live_jammers to service_role;/.test(sql) && !/create policy/i.test(sql));

/* ── 5. The bus, and the looper still working ────────────────────────── */
ok('the pads play through the room’s bus', /hit\(ctx\(\), pad\.id, undefined, out\(\)\)/.test(room));
ok('  and the looper too, and straight to the speakers when there is no bus', /node\.connect\(out \? out\(\) : audio\.destination\)/.test(looper));
ok('  and the looper is handed the bus and tells the stage what it is doing', /<JamLooper [^>]*out=\{out\} onState=\{onLoopState\}/.test(room));
ok('a layer more is a drop', /if \(next\.layers > layersWere\.current\) setDrops/.test(room));

if (bad) {
  console.error(`\ncheck:jamcharacters — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:jamcharacters — twelve characters, a look is two words from fixed lists, nothing asks for a camera, the name is the server’s, and your character moves to the room’s bus.');
