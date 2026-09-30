/**
 * "Available" must mean it will work, not that somebody pasted something.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 30 September 2026: *"Copilot doesnt want to work."* She asked the
 * Make tab for an eight-second shot, twice, and got back **"The key this app
 * uses was rejected. Nothing has been charged."** both times.
 *
 * That sentence has exactly one source — `aiFault` catching an
 * `Anthropic.AuthenticationError` — so it means something precise: the key is
 * SET, and the supplier refused it. A missing key produces the other sentence,
 * from the `!process.env.ANTHROPIC_API_KEY` guard each route runs first.
 *
 * Meanwhile ten routes answered their `GET` with:
 *
 *     { available: Boolean(process.env.ANTHROPIC_API_KEY) }
 *
 * `true`. For a key being refused on every call. So every screen asked "is the
 * copilot available", was told yes, drew the button, and sent her into a 502 —
 * and nothing about the first failure changed the answer, which is why she
 * tried again and got the identical wall.
 *
 * `Boolean(process.env.X)` measures whether a value exists in Vercel. It does
 * not measure whether that value works. Between those two is every revoked
 * key, every key pasted with a trailing newline, and every Claude Code OAuth
 * token put where an API key belongs.
 *
 * It is the house fault in its purest form: a signal that is green because it
 * measures the thing NEXT TO the thing.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * A route may not answer `available` with a bare presence test of the copilot
 * key. It must go through `copilotAvailable()`, which also knows whether the
 * supplier has refused.
 *
 * Deliberately narrow. Other suppliers report presence and are right to: no
 * code here observes a Kits.AI or ElevenLabs refusal, so presence is the best
 * answer available for them and a rule pretending otherwise would be noise.
 * This rule exists where there IS a better answer and it was not being used.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { code } from './prose.mts';

const FILES = readdirSync('app', { recursive: true, encoding: 'utf8' })
  .filter((one) => one.endsWith('.ts') || one.endsWith('.tsx'))
  .map((one) => join('app', one));

/** The presence test, in any spacing. */
const BARE = /Boolean\s*\(\s*process\s*\.\s*env\s*\.\s*ANTHROPIC_API_KEY\s*\)/;

/** Where the honest answer lives. */
const HOME = join('app', 'lib', 'server', 'aikey.ts');

let answering = 0;
const bad: string[] = [];

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');
  const text = code(raw);
  if (file === HOME) continue;

  if (/\bcopilotAvailable\s*\(/.test(text)) answering += 1;

  if (!BARE.test(text)) continue;
  bad.push(file);
  const at = text.slice(0, text.search(BARE)).split('\n').length;
  console.log(
    `  ✗   ${file}:${at} — answers with \`Boolean(process.env.ANTHROPIC_API_KEY)\`. ` +
      'That is true for a key the supplier is refusing, so the room offers a ' +
      'button that cannot work. Use `copilotAvailable()` from lib/server/aikey.',
  );
}

console.log(`\n${answering} route(s) answer through copilotAvailable(); ${bad.length} still test presence.`);

/* The canary. If every caller were renamed away, the rule above would pass by
   having no subjects left — which is how a check goes quiet instead of red. */
if (answering === 0) {
  console.log(
    '\ncheck:availablereal — nothing calls copilotAvailable(), so either the rooms ' +
      'stopped reporting availability or the helper was renamed. Either way this ' +
      'rule is no longer guarding anything.',
  );
  process.exitCode = 1;
} else if (bad.length > 0) {
  console.log(`\ncheck:availablereal — ${bad.length} route(s) call a rejected key "available".`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:availablereal — "available" means the supplier has not refused, not that a value exists.');
}
