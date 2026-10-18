/**
 * Nothing in app/lib is exported for nobody.
 *
 *   npm run check:deadexports
 *
 * ── The evening this is for ──────────────────────────────────────────────
 *
 * The room audit of 11 October 2026 asked for "dead exports nothing calls",
 * by the grep-for-its-own-name method that had found four real faults in a
 * day. The sweep found two whole modules — an audio watermark for unbought
 * previews and the arrangement maths for a timeline — that nothing had ever
 * imported in the repository's history, and twenty-eight more functions and
 * constants referenced nowhere but their own definition: a browser-side
 * refusal check nothing ran, a second copy of the free-preview count beside
 * the one the server enforces, four "forget" resets written for tests that
 * were never written, and a function "exported only so the checks can
 * assert on it" that no check asserted on.
 *
 * None of it was a bug. All of it was a claim: a file that reads as a
 * capability the app has, and does not. The watermark header described a
 * mark laid over every unbought preview. There was no mark. Somebody
 * reading the code to answer "are previews marked?" would have said yes.
 *
 * ── What is held ─────────────────────────────────────────────────────────
 *
 * Every exported function, class, const and let in app/lib has at least one
 * reference somewhere else in app/, scripts/ or audit/ — one more mention
 * than its own definition. Types and interfaces are not counted: an
 * exported type nobody imports is documentation, not a claim. A name that
 * is deliberately kept without a caller goes in ALLOWED with the reason,
 * and the reason is printed, so the list is read rather than skipped.
 *
 * Counted by identifier, not by import, so an export used only inside its
 * own file is not reported — it is over-exported, which is untidy, and not
 * dead, which is what this is for.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** Kept on purpose, and why. Empty today; a reason goes in with any name. */
/* Antigravity's console and DAW came back on 13 October 2026 (1653903) at
   The owner's word, with the files beside them, and that commit says plainly
   that the console's buttons do not yet call the work behind them. These are
   what they will call. Deleting them now would undo what she asked for; they
   leave this list as the screens are wired. */
const ANTIGRAVITY = 'restored with Antigravity\u2019s console on 13 October 2026; its buttons are not wired yet (1653903)';
const ALLOWED: Record<string, string> = {
  'app/lib/arrangement.ts:SECTION_COLOURS': ANTIGRAVITY,
  'app/lib/arrangement.ts:lanesFor': ANTIGRAVITY,
  'app/lib/arrangement.ts:arrangementFor': ANTIGRAVITY,
  'app/lib/arrangement.ts:totalBars': ANTIGRAVITY,
  'app/lib/arrangement.ts:secondsToBar': ANTIGRAVITY,
  'app/lib/arrangement.ts:formatBarPosition': ANTIGRAVITY,
  'app/lib/arrangement.ts:EDIT_SUGGESTIONS': ANTIGRAVITY,
  'app/lib/arrangement.ts:buildEditPrompt': ANTIGRAVITY,
  'app/lib/avatartemplates.ts:avatarById': ANTIGRAVITY,
  'app/lib/elementsdata.ts:elementOf': ANTIGRAVITY,
  'app/lib/eratemplates.ts:eraById': ANTIGRAVITY,
  'app/lib/fontcombinations.ts:comboOf': ANTIGRAVITY,
  'app/lib/futureinsights.ts:getInsightById': ANTIGRAVITY,
  'app/lib/watermark.ts:markBlob': ANTIGRAVITY,
};

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next') walk(full, out);
    } else if (/\.(ts|tsx|mts|mjs)$/.test(entry)) out.push(full);
  }
  return out;
};

const files = [...walk('app'), ...walk('scripts'), ...walk('audit')];
const counts = new Map<string, number>();
const sources = new Map<string, string>();
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  sources.set(file, text);
  /* Not this file: naming an export in ALLOWED is not using it, and counting
     it made every allowance read as "in use now" and so as stale. */
  if (file.endsWith('check-deadexports.mts')) continue;
  for (const word of text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
}

const dead: string[] = [];
const kept: string[] = [];
let exported = 0;
for (const [file, text] of sources) {
  if (!file.startsWith('app/lib/')) continue;
  for (const hit of text.matchAll(/^export (?:async )?(?:function|class|const|let) ([A-Za-z_][A-Za-z0-9_]*)/gm)) {
    exported += 1;
    const name = hit[1];
    if ((counts.get(name) ?? 0) > 1) continue;
    const key = `${file}:${name}`;
    if (ALLOWED[key]) kept.push(`${key} — ${ALLOWED[key]}`);
    else dead.push(key);
  }
}

ok(`every exported function and constant in app/lib is referenced somewhere (${exported} checked)`,
  dead.length === 0,
  `${dead.join(', ')} — a capability the code reads as having and does not; delete it, or say in ALLOWED why it stays`);
for (const line of kept) console.log(`  --   kept on purpose: ${line}`);

const stale = Object.keys(ALLOWED).filter((key) => {
  const [file, name] = key.split(':');
  return !sources.has(file) || (counts.get(name) ?? 0) > 1 || !new RegExp(`^export (?:async )?(?:function|class|const|let) ${name}\\b`, 'm').test(sources.get(file) ?? '');
});
ok('  and nothing in ALLOWED is stale', stale.length === 0,
  `${stale.join(', ')} — either gone or in use now; an allowance for nothing is how the list stops being read`);

if (failures) {
  console.error(`\ncheck:deadexports — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:deadexports — nothing in app/lib claims a capability by existing alone.');
