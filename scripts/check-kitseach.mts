/**
 * Five minutes each, and what that does and does not buy.
 *
 * ── Her decision, and the arithmetic under it ────────────────────────────
 *
 * Carli, 9 September 2026: "Ek dink ons gaan baie streng cap op elke user moet
 * sit vir kits se stemkloning. Dus iets soos 5min per persoon. Dan stop ons die
 * funksie wanneer dit opgebruik word deur 'n maand."
 *
 * She is right, and it is worth being plain about what it fixes. Kits' own roof
 * is four hundred download minutes and Kits confirmed the same day that there
 * is **no add-on to buy past it**. Four hundred divided by five is eighty
 * members, and the cap does not make it eighty-one.
 *
 * What it changes is *who* gets the four hundred. Without it, one member
 * converting fifty minutes takes the month from everybody else, and the first
 * anybody hears of it is a refusal in a room that worked yesterday. That is
 * worth stopping on its own — "the person who found the button first took the
 * month" is not a rule anybody would choose.
 *
 * ── The one that must not go the wrong way ───────────────────────────────
 *
 * `mineSeconds` answers null when the read fails, and `enough` treats null as
 * **no room**. That is the opposite of every other "could not ask" in this
 * codebase, and deliberately so: everywhere else a failed read must not be
 * mistaken for an empty answer, and here a failed read that reported "nothing
 * used" would take the cap off at precisely the moment it stopped working.
 * A held take costs one member one refusal with a reason; a cap that fails
 * open costs everybody the month.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const minutes = readFileSync('app/lib/server/kitsminutes.ts', 'utf8');
const sing = readFileSync('app/api/voice/sing/route.ts', 'utf8');
const stems = readFileSync('app/api/stems/route.ts', 'utf8');
const errors = readFileSync('app/lib/apierror.ts', 'utf8');
const sql = readFileSync('supabase/ALMAL.sql', 'utf8');

/* ── The cap exists and is a number somebody can move ──────────────────── */
ok('there is a per-member cap', /export function minutesEach\(\)/.test(minutes));
ok('and it is five', /: 5;/.test(/return[^;]*: 5;/.exec(minutes)?.[0] ?? ''),
  'hers, until real members say otherwise');
ok('and it can be moved without a deploy', /KITS_MINUTES_EACH/.test(minutes));

/* ── It is actually consulted ──────────────────────────────────────────── */
ok('the singing room passes the member', /await enough\(spend, caller\?\.id \?\? null\)/.test(sing),
  'without the owner, enough only checks the workspace roof and the cap does nothing');
ok('and so does the splitter', /await enough\(spend, owner\)/.test(stems));
ok('the member’s own share is checked before the workspace roof',
  minutes.indexOf('const ownLeft') < minutes.indexOf('const left = await leftSeconds()'),
  'their own share is the one they can act on, so it is the one they hear about');

/* ── Fail closed, which is backwards from everywhere else on purpose ───── */
ok('a failed read of the member’s own use answers null',
  /export async function mineSeconds[\s\S]{0,600}?if \(error\) return null;/.test(minutes));
ok('and null is treated as NO room, not as none used',
  /if \(mine === null\) \{[\s\S]{0,400}?code: 'kits_unknown'/.test(minutes),
  'a cap that fails open takes itself off at the moment it stops working');
ok('and that reversal is written down as a decision rather than left to be read',
  /take the cap off|fails open|stands between one member/i.test(minutes));
ok('the member’s own count is not cached',
  !/mineSeconds[\s\S]{0,400}?cached/.test(minutes),
  'a member who has just converted must not be told they still have room');

/* ── The three answers stay three answers ──────────────────────────────── */
for (const code of ['kits_yours_used', 'kits_month_used', 'kits_unknown']) {
  ok(`${code} can be said in Afrikaans`, new RegExp(`${code}: \\{`).test(errors));
  ok(`and ${code} is what the code actually sends`, new RegExp(`code: '${code}'`).test(minutes));
}
ok('the refusal carries its code out of the route',
  /error: room\.code/.test(sing),
  'a sentence without a code is a sentence that arrives in English');
/* Kits confirmed there is nothing to buy, so none of these may imply one. */
for (const code of ['kits_yours_used', 'kits_month_used']) {
  const said = new RegExp(`${code}: \\{[\\s\\S]{0,400}?\\},`).exec(errors)?.[0] ?? '';
  ok(`${code} offers a date rather than a purchase`,
    /first|eerste/.test(said) && !/buy|koop|top.?up|aanvul/i.test(said),
    said.slice(0, 90));
}

/* ── And the counting it rests on ──────────────────────────────────────── */
ok('the per-member SQL function is in the bundle she runs',
  /create or replace function public\.kits_seconds_this_month_for/.test(sql));
ok('it is service_role only, like the one beside it',
  /grant execute on function public\.kits_seconds_this_month_for\(uuid\) to service_role;/.test(sql));
ok('and there is an index for it',
  /kits_minutes_owner_month_idx/.test(sql),
  'without one, every conversion does a full scan of a table that only grows');

console.log(
  failures
    ? `\ncheck:kitseach — ${failures} wrong.`
    : '\ncheck:kitseach — five minutes each, checked before the roof, and a read that fails holds rather than opens.',
);
process.exit(failures ? 1 : 0);
