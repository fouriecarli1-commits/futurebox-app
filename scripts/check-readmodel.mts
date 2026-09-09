/**
 * Afrikaans was pinned in the writing and left alone in the speaking. (#115)
 *
 * ── The gap ──────────────────────────────────────────────────────────────
 *
 * Fifteen routes pin Afrikaans when they *write*, and `check:afrikaansrule`
 * holds every one of them down to warning the model off Dutch. Nothing pinned
 * it when the app *speaks*.
 *
 * `/api/voice/speak` carries two models. Its own comment has said since the
 * day it was written that v3 "covers far more languages — Afrikaans among them
 * — so a script in one of those is better served by it, and the caller says
 * which it wants". Both callers in this app — `Presenter` and `VoiceLab` —
 * never said. So every Afrikaans read went to the model chosen for English,
 * and the instruction sat in a comment being followed by nobody.
 *
 * An instruction to a caller that no caller follows is a default in the wrong
 * place.
 *
 * ── Measured, and the three answers kept apart ───────────────────────────
 *
 * The tempting fix is a rule — "Afrikaans goes to v3" — which would be this
 * repository asserting something about somebody else's models from memory.
 * They publish it: `GET /v1/models` carries `languages` per model.
 *
 * So `modelForLanguage` asks, and its three answers are three different
 * things. The one that matters is `unasked`: the list could not be read at
 * all, which is **not** "no model has this language". Two of these look
 * identical from outside and mean opposite things, and collapsing them is the
 * fault `check:couldnotask` exists for.
 */
import { readFileSync } from 'node:fs';
import { elevenModelsFrom, forgetElevenModels, modelForLanguage } from '../app/lib/server/eleven';

let failures = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/* ── Their list, read rather than assumed ───────────────────────────────── */
const WIRE = [
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Multilingual v2',
    languages: [{ language_id: 'en' }, { language_id: 'nl' }],
    can_do_text_to_speech: true,
  },
  {
    model_id: 'eleven_v3',
    name: 'v3',
    languages: [{ language_id: 'en' }, { language_id: 'af' }, { language_id: 'nl' }],
    can_do_text_to_speech: true,
  },
];

const read = elevenModelsFrom(WIRE);
check('their model list is read', read !== null && read.length === 2, JSON.stringify(read?.length));
check('and the languages come with it',
  read?.find((one) => one.id === 'eleven_v3')?.languages.includes('af') === true,
  JSON.stringify(read?.map((one) => one.languages)));

/* ── The choice, against a stub of their endpoint ───────────────────────── */
const BASE = 'https://api.elevenlabs.io/v1';
const real = globalThis.fetch;
let answer: { status: number; body: unknown } = { status: 200, body: WIRE };
let asked = 0;
globalThis.fetch = (async (url: RequestInfo | URL) => {
  if (String(url).startsWith(`${BASE}/models`)) {
    asked += 1;
    return new Response(JSON.stringify(answer.body), {
      status: answer.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response('no', { status: 404 });
}) as typeof fetch;
process.env.ELEVENLABS_API_KEY ??= 'stub-key-for-the-check';

const ORDER = ['eleven_v3', 'eleven_multilingual_v2'] as const;

forgetElevenModels();
const af = await modelForLanguage('af', ORDER);
check('Afrikaans is read by the model their list says knows it',
  af.id === 'eleven_v3' && af.why === 'measured', JSON.stringify(af));

forgetElevenModels();
const nl = await modelForLanguage('nl', ORDER);
check('a language both know goes to the first choice', nl.id === 'eleven_v3' && nl.why === 'measured',
  JSON.stringify(nl));

forgetElevenModels();
const tag = await modelForLanguage('af-ZA', ORDER);
check('a region on the tag is not a different language', tag.id === 'eleven_v3' && tag.why === 'measured',
  JSON.stringify(tag));

/* Not in anybody's list. Read anyway — their coverage is wider than their
   table, and refusing to read a script would be worse than reading it — but
   said as `unlisted` rather than as `measured`. */
forgetElevenModels();
const zu = await modelForLanguage('zu', ORDER);
check('a language nobody lists is still read, and says so',
  zu.id === ORDER[0] && zu.why === 'unlisted', JSON.stringify(zu));

/* ── The refusal that is not a refusal ──────────────────────────────────── */
forgetElevenModels();
answer = { status: 429, body: { detail: 'slow down' } };
const rate = await modelForLanguage('af', ORDER);
check('a rate limit changes nothing and says `unasked`, not `unlisted`',
  rate.why === 'unasked', JSON.stringify(rate));
check('and it does not quietly move somebody onto another model',
  rate.id === ORDER[0], rate.id);

forgetElevenModels();
answer = { status: 200, body: { models: WIRE } };
const wrongShape = await modelForLanguage('af', ORDER);
check('a shape their list has never had is `unasked` too, not a wrong answer',
  wrongShape.why === 'unasked', JSON.stringify(wrongShape));

forgetElevenModels();
answer = { status: 200, body: WIRE };
asked = 0;
await modelForLanguage('af', ORDER);
await modelForLanguage('en', ORDER);
check('their list is asked for once and kept, not once per read', asked === 1, `${asked} calls`);

const none = await modelForLanguage('', ORDER);
check('no language named is `unasked` and the ordinary default', none.why === 'unasked',
  JSON.stringify(none));

globalThis.fetch = real;

/* ── The wiring ─────────────────────────────────────────────────────────── */
const route = readFileSync('app/api/voice/speak/route.ts', 'utf8');
check('the route takes a language', /language\?: string/.test(route));
check('and resolves the model through the measured list',
  /modelForLanguage\(readIn, BY_LANGUAGE\)/.test(route));
check('a caller that names a model still gets the one it named',
  /named\s*\?\s*\{ id: named, why: 'asked' as const \}/.test(route),
  'naming a model must beat guessing from a language');
check('and a caller that names neither gets exactly what it always got',
  /\{ id: MODELS\.steady, why: 'default' as const \}/.test(route));
check('both reads use the chosen model, and neither re-derives it',
  (route.match(/\n\s*chosen\.id,/g) ?? []).length === 2 &&
    !/MODELS\[String\(body\.model \?\? 'steady'\)\]/.test(route),
  'a second copy of the choice is a second thing to forget');
check('the streamed answer says which model read it, on a header',
  /'X-Read-Model': chosen\.id/.test(route) && /'X-Read-Model-Why': chosen\.why/.test(route));
check('and the timed answer says it in the body',
  /model: chosen\.id/.test(route) && /modelWhy: chosen\.why/.test(route));

for (const [file, path] of [
  ['Presenter', 'app/components/Presenter.tsx'],
  ['VoiceLab', 'app/components/VoiceLab.tsx'],
] as const) {
  const source = readFileSync(path, 'utf8');
  check(`${file} sends the language it is written in`,
    /language: lang,/.test(source) && /const \{ lang, t \} = useLang\(\);/.test(source),
    'the caller the route was waiting for still does not say');
}

if (failures) {
  console.error(`\ncheck:readmodel — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:readmodel — the model that reads a script is the one their own list says knows it.');
