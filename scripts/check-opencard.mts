/**
 * A room that is handed something must show it, not merely hold it.
 *
 * ── The report ───────────────────────────────────────────────────────────
 *
 * Carli, 18 September 2026, on the advert desk — the room she calls the
 * important one:
 *
 *   "As ek druk op open the room dan vat hy my net na die regte kamer toe,
 *    maar die AI vul nie die afdelings vir my in nie. Dit is 'n groot flaw
 *    en uiteindelik dan 'n produk wat ons nie sal kan lewer nie."
 *
 * ── What was actually happening ──────────────────────────────────────────
 *
 * The AI was filling them in. `handoverFor` produced the right operations,
 * `copilotBus` carried them, every destination registered a handler, and the
 * values arrived. `check:adhandover` proved the first, `audit/adcarry.mjs`
 * proved the rest.
 *
 * And a room opens as its own table of contents — every panel folded, which
 * is how she asked for it in September: *"when I open the video desk, can
 * all the drop down menus be closed"*. So the value landed in a box inside a
 * shut card three headings down, and the room looked untouched.
 *
 * One room had solved it. `Storyboard` kept a counter, a ref and a scroll,
 * with the reason written above them — *"on a phone the difference between
 * 'opened' and 'opened below the fold' is the whole of it"* — and it was the
 * only one of thirteen. Its own `write_scenes` did not even call it: only a
 * separate `open_board` operation that nothing was sending.
 *
 * ── Why `audit/adcarry.mjs` could not catch this ─────────────────────────
 *
 * Because the first thing that probe does in the destination room is unfold
 * the card. It was measuring that the value had ARRIVED — which was never
 * the thing in doubt — and reading that as proof of the thing she was
 * reporting. A check that opens the door before asking whether the door is
 * open. That probe now presses without unfolding; this file is the cheap
 * half, so a room added next month cannot quietly rejoin the problem.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { lastBefore } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * Rooms that receive a value and are allowed not to open a card.
 *
 * Every one has a reason and every reason is checked below where checking it
 * is possible from the source. An exemption nobody can fail is a hole.
 */
const LOOSE: Record<string, string> = {
  'VideoPanel.tsx': 'no folded cards in this panel at all',
  'LiveChannel.tsx': 'the message box is below the last card, always open',
};

const dir = 'app/components';
const files = readdirSync(dir).filter((one) => one.endsWith('.tsx'));

/* A value being PUT somewhere, as opposed to a room being asked to open a
   song or a playlist it then shows by itself. `pick_song` and `open_*`
   already move the screen to what they picked; `set_*` and `write_*` change
   a field and say nothing. */
const FILLS = /^\s+(set_|write_)[a-z_]+:/m;

let rooms = 0;
for (const name of files) {
  const source = readFileSync(`${dir}/${name}`, 'utf8');
  if (!source.includes('useCopilotOps(')) continue;
  const block = source.slice(source.indexOf('useCopilotOps('));
  const upTo = block.slice(0, block.indexOf('\n  });') + 6);
  if (!FILLS.test(upTo)) continue;
  rooms += 1;

  if (LOOSE[name]) {
    ok(`${name} is excused — ${LOOSE[name]}`, true);
    continue;
  }
  ok(
    `${name} opens the card it was handed something for`,
    source.includes('useOpenCard()') && /openOn=\{/.test(source),
    'the value arrives into a folded card and the room looks untouched',
  );
}

ok('there are rooms to check at all', rooms >= 6, `${rooms} found`);

/* ── The exemptions, held to what they claim ───────────────────────────── */

const panel = readFileSync(`${dir}/VideoPanel.tsx`, 'utf8');
ok(
  'VideoPanel really has no folded card in it',
  !panel.includes('<Card'),
  'it has one now, so its hand-off can land out of sight',
);

const live = readFileSync(`${dir}/LiveChannel.tsx`, 'utf8');
ok(
  'the live room’s message box really is below every card',
  lastBefore(live, '</Card>', 'value={draft}'),
  'it has moved inside a fold, so a copilot draft can land out of sight',
);

/* ── And the room that started it ──────────────────────────────────────── */

const board = readFileSync(`${dir}/Storyboard.tsx`, 'utf8');
ok(
  'writing the scenes opens the board by itself',
  /write_scenes: \(value\) => \{\s*\n\s*arrived\(\);/.test(board),
  'it used to need a separate open_board that nothing ever sent',
);

const hook = readFileSync('app/lib/opencard.ts', 'utf8');
ok(
  'only the first card of a hand-off moves the page',
  /lastScroll/.test(hook) && /TOGETHER/.test(hook),
  'three cards scrolling in one frame lands somebody at the bottom of what arrived',
);
ok(
  '  and the scroll waits for the fold to paint',
  /requestAnimationFrame/.test(hook),
  'scrolling to a card that is still shut goes to where the shut card was',
);

if (failures) {
  console.error(
    `\ncheck:opencard — ${failures} failure(s). A value delivered into a folded card is a room`
    + ' that looks untouched, which is exactly what was reported.\n',
  );
  process.exit(1);
}
console.log(
  '\ncheck:opencard — every room that is handed a value opens the card it went into and takes'
  + ' the page there.',
);
