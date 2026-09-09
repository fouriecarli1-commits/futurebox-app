/**
 * The five-hundred-voice wall, and the four ways it stays standing.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * `stockVoices()` asked `GET /v1/voices` with no bounds. That endpoint returns
 * **every voice on the account**, everything in this app is made on one
 * ElevenLabs account, and every member who clones a voice adds one — so the
 * response grew with the membership. ElevenLabs' guidance is that the v1
 * listing stops being usable past roughly five hundred voices, and their
 * answer is the paginated `GET /v2/voices`.
 *
 * Carli is planning for five to ten thousand users in the first month.
 *
 * ── The four ways ────────────────────────────────────────────────────────
 *
 * 1. **Asking for everything.** A request whose size is the membership is the
 *    wall itself. It has to be a bounded page, and premade only.
 * 2. **Turning "could not ask" into "there are none".** `return []` on a
 *    failed fetch empties the picker for everybody and explains nothing.
 * 3. **Asking on every generation.** Eight callers, three of them per take.
 *    The stock list changes a few times a year and was fetched a few times a
 *    minute.
 * 4. **Deleting the old call.** The v2 shape is documented, not observed —
 *    api.elevenlabs.io is unreachable from here. A rewrite that removed the
 *    working call and shipped an unverified one is a guess with no floor.
 *
 *   npm run check:voicewall
 */
import { readFileSync } from 'node:fs';
import { forgetStockVoices, whichVoiceList } from '../app/lib/server/eleven';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const source = readFileSync('app/lib/server/eleven.ts', 'utf8');

/* ── 1. The request is bounded, and does not grow with the membership ──── */
ok('the paginated listing is asked first',
  /https:\/\/api\.elevenlabs\.io\/v2\/voices\?/.test(source));
ok('and it asks for a page rather than everything',
  /page_size=\$\{ASK_FOR\}/.test(source));
ok('for premade voices only, which is the only kind this list shows',
  /category=premade/.test(source));
ok('the page asked for is a constant, not the member count',
  /const ASK_FOR = \d+;/.test(source));
/* A hundred asked, forty shown. Asking for exactly forty would make the
   fortieth voice change whenever they reorder theirs. */
const askFor = Number(/const ASK_FOR = (\d+);/.exec(source)?.[1] ?? 0);
const show = Number(/const SHOW = (\d+);/.exec(source)?.[1] ?? 0);
ok('and it asks for more than it shows', askFor > show, `${askFor} asked, ${show} shown`);
ok('the page is small enough to stay small', askFor <= 200, String(askFor));

/* ── 2. A failure is never an empty list ───────────────────────────────── */
ok('a refused request answers null, not an empty list',
  /if \(!response\.ok\) return null;/.test(source));
ok('and so does a network failure',
  /catch \{[\s\S]{0,400}?return null;/.test(source));
/* The rule elevenceiling.ts and kitsminutes.ts already follow. */
ok('both listings failing keeps the last good list',
  /if \(stock\) return stock\.voices;/.test(source));
ok('the old empty-array-on-failure is gone',
  !/if \(!response\.ok\) return \[\];/.test(source));
/* Kept, not re-stamped: the next caller should try again rather than sit on a
   stale answer for the whole hour. */
ok('a kept list is not re-stamped as fresh',
  !/if \(stock\) \{\s*stock\.at = /.test(source));

/* ── 3. It is remembered ───────────────────────────────────────────────── */
ok('the list is cached', /const STOCK_FOR_MS/.test(source) && /let stock: StockCache \| null/.test(source));
ok('and the cache is checked before anything is fetched',
  source.indexOf('if (stock && Date.now() - stock.at < STOCK_FOR_MS)')
    < source.indexOf('const v2 = await askVoices('));
const forMs = Number(/const STOCK_FOR_MS = ([^;]+);/.exec(source)?.[1]?.replace(/[^0-9*]/g, '').split('*').reduce((a, b) => String(Number(a) * Number(b))) ?? 0);
ok('for long enough to matter on a hot path', forMs >= 10 * 60 * 1000, `${forMs}ms`);

/* ── 4. The old call is still there, as a floor ────────────────────────── */
ok('the unbounded v1 listing is kept as a fallback',
  /await askVoices\(`\$\{BASE\}\/voices`\)/.test(source));
ok('and it is second, so it only runs when the paginated one fails',
  source.indexOf("askVoices(\n    `https://api.elevenlabs.io/v2/voices")
    < source.indexOf('await askVoices(`${BASE}/voices`)'));
ok('the file says the v2 shape was never observed from here',
  /documented rather than observed|from their documentation and not from a response/.test(source));

/* ── And it can be found out which one answers ─────────────────────────── */
forgetStockVoices();
const cold = whichVoiceList();
ok('before anything is asked, the report says so rather than guessing',
  cold.way === 'none' && cold.count === 0 && cold.agoSeconds === null,
  JSON.stringify(cold));

const page = readFileSync('app/api/allowance/route.ts', 'utf8');
ok('the page she opens reports which listing answered', /whichVoiceList\(\)/.test(page));
ok('and says plainly what it means if it is still the old one',
  /stops working at around five hundred/.test(page));

/* ── The hot path is the reason any of this matters ────────────────────── */
const hot = ['app/api/voice/speak/route.ts', 'app/api/voice/change/route.ts', 'app/api/voice/preview/route.ts'];
for (const path of hot) {
  ok(`${path.replace('app/api/', '')} still calls it, and now pays a cache`,
    /stockVoices\(\)/.test(readFileSync(path, 'utf8')));
}

/* ── 5. The wall itself, not only the listing ──────────────────────────────

   Everything above is about *reading* a list that grows with the membership.
   This is what happens when the workspace runs out of room for the next one.

   Every member's cloned voice lands on one ElevenLabs workspace and holds a
   slot until it is deleted. When the slots run out, the member records a
   minute of audio and is refused at the end of it — and the per-member cap in
   the clone route cannot see that, because it is counting a different thing.

   The direction of the unknown answer is the whole design. `voice_limit` and
   `voice_slots_used` are documented rather than observed, so one wrong field
   name has to degrade into "let the clone through", never into "the workspace
   is full" — which would switch voice cloning off for the entire site while
   reporting a reason that is not true. */
const room = readFileSync('app/lib/server/eleven.ts', 'utf8');
const clone = readFileSync('app/api/voice/clone/route.ts', 'utf8');

ok('the workspace slots are read at all', /export async function voiceRoom\(/.test(room));
ok('and the clone route asks before it charges',
  clone.indexOf('await voiceRoom()') > -1 &&
    clone.indexOf('await voiceRoom()') < clone.indexOf('await charge('),
  'a member should not pay and be refunded to learn the workspace is full');
ok('the refusal carries a code, so it can be read in Afrikaans',
  /error: 'voice_slots_full'/.test(clone) &&
    /voice_slots_full: \{/.test(readFileSync('app/lib/apierror.ts', 'utf8')));
ok('and does not tell the member to delete one of theirs',
  !/voice_slots_full[\s\S]{0,400}?[Rr]emove one/.test(clone),
  'that is the per-plan cap’s advice, and it is wrong for this failure');
ok('a landed clone takes a slot without asking again', /noteVoiceTaken\(\)/.test(clone));
ok('she is warned before it is full, not after',
  /watchVoiceSlots\(/.test(clone) && /export function voicesLetter\(/.test(
    readFileSync('app/lib/server/spendwatch.ts', 'utf8')));

/* The property, proved rather than described. Nine shapes that are not an
   answer, and one that is. */
const { voiceRoomFrom } = await import('../app/lib/server/eleven');
const notAnAnswer: [string, Record<string, unknown>][] = [
  ['an empty body', {}],
  ['no limit', { voice_slots_used: 400 }],
  ['no used count', { voice_limit: 500 }],
  ['a limit of zero', { voice_limit: 0, voice_slots_used: 0 }],
  ['a negative limit', { voice_limit: -1, voice_slots_used: 0 }],
  ['a negative used count', { voice_limit: 500, voice_slots_used: -3 }],
  ['strings where numbers belong', { voice_limit: '500', voice_slots_used: '400' }],
  ['nulls', { voice_limit: null, voice_slots_used: null }],
  ['the field names misspelt', { voiceLimit: 500, voiceSlotsUsed: 400 }],
];
for (const [what, body] of notAnAnswer) {
  ok(`${what} reads as could-not-ask, never as no room`,
    voiceRoomFrom(body) === null,
    JSON.stringify(voiceRoomFrom(body)));
}
const real = voiceRoomFrom({ voice_limit: 500, voice_slots_used: 498 });
ok('and a real answer is read as one',
  real?.used === 498 && real?.limit === 500 && real?.left === 2, JSON.stringify(real));
const over = voiceRoomFrom({ voice_limit: 500, voice_slots_used: 512 });
ok('with what is left floored at nought rather than going negative',
  over?.left === 0, JSON.stringify(over));

console.log(
  failures
    ? `\ncheck:voicewall — ${failures} assertion(s) failed.`
    : '\ncheck:voicewall — a bounded page, remembered, with the old call kept underneath.',
);
process.exit(failures ? 1 : 0);
