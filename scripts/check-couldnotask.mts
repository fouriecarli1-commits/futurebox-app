/**
 * "We could not ask" must never be rendered as "the answer is none".
 *
 * ── Why this is a check and not six fixes ────────────────────────────────
 *
 * On 9 September 2026 this exact fault was found and fixed six times in one
 * day, in six unrelated places, none of which looked like the others:
 *
 *   · `/api/live` discarded the error on `live_hearts` and `events`, so a
 *     project without those tables showed every song as nought hearts and
 *     nought plays with nothing anywhere saying the read had failed.
 *   · `stockVoices()` returned `[]` on a failed fetch, which emptied the
 *     voice picker for everybody and explained nothing.
 *   · `check:sing` used `indexOf`, which answers −1 for "not found", and had
 *     silently stopped testing the thing it was written for.
 *   · The new voice-slot reader would have refused every clone on the site if
 *     one field name were mistyped — caught before shipping, by asking what
 *     null should mean.
 *   · The Kits blender hunt read a 429 rate limit as "this body was accepted
 *     further", and told her it had found the answer when it had found a wall.
 *   · `/api/account`'s delete read the cloned-voice list and, on failure, ran
 *     a loop over nothing — leaving a recording of somebody's voice on
 *     ElevenLabs after telling them it was deleted.
 *
 * Six is a class, not a run of bad luck. The tab-bar faults went the same way
 * and were ended by one exported number and one probe; this is that, for this.
 *
 * ── What it actually looks for ───────────────────────────────────────────
 *
 * Not every discarded error. Sixty reads in this app drop theirs and most are
 * right to: a `maybeSingle` looking for ownership genuinely means "not found",
 * and flagging those would make a check nobody reads.
 *
 * The narrow shape is the one that has bitten every time: **a read whose
 * failure turns into an empty list or a nought that somebody is then shown.**
 * That is `const { data } = await …` with no `error`, followed within a few
 * lines by `data ?? []` or `data ?? 0`.
 *
 * ── A ratchet, not a wall ────────────────────────────────────────────────
 *
 * There are more of these than can honestly be fixed in one sitting, and a
 * check that fails on all of them is a check somebody disables. So it works
 * like `check:everycheck`: every one is either fixed, or named here with the
 * reason it is harmless. A new one that is neither fails the run, and the
 * number cannot go up.
 */
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/**
 * Known, and named with why it is not the fault above.
 *
 * A reason is required. "It is fine" is not one — the whole failure mode of
 * this class is that every instance looked fine until somebody read it twice.
 * Fixing an entry means deleting its line, and the count below goes down.
 */
const NAMED: Record<string, string> = {
  "app/api/collab/route.ts :: const { data } = await client":
    'A collaboration list. A failed read shows no requests, which is wrong but costs nobody anything irreversible — and the room has no way to say more yet. Worth fixing when that room is next opened.',
  "app/api/dialogue/route.ts :: const { data } = await client.rpc('speech_today', { p_owner: caller.id });":
    'A day’s speech count, used to refuse past a cap. A failed read reads as nought used, which is generous rather than harmful: the ceiling above it still holds, and the brake in front of it does not depend on this.',
  "app/api/voice/speak/route.ts :: const { data } = await client.rpc('speech_today', { p_owner: caller.id });":
    'The same day-count as dialogue, same reasoning.',
  "app/api/voice/change/route.ts :: const { data } = await client.rpc('speech_today', { p_owner: caller.id });":
    'The same day-count again.',
  "app/api/cast/route.ts :: const { data } = await client":
    'The cast list for an episode. Empty reads as "no speakers named", which is the same as the default state, so it cannot be told apart from it by design.',
  "app/api/dub/route.ts :: const { data } = await client.rpc('claim_dub_refund', { p_dub: id, p_owner: caller.id });":
    'The refund claim’s own answer. Nought means "somebody else already claimed it", which is exactly what the RPC returns and what the code wants.',
  "app/api/dub/route.ts :: const { data } = await client.rpc('claim_dub_refund', { p_dub: id, p_owner: caller.id }); #2":
    'The same refund claim on the webhook-settled path.',
  "app/api/finetunes/route.ts :: const { data } = await client":
    'A list of trained sounds. Empty reads as none trained; a member who has trained one would notice immediately, and nothing is spent or lost on it.',
  "app/api/live/route.ts :: const { data: who } = await client.from('creators').select('owner, handle, name').in('owner', owners);":
    'Names for the room. A failed read shows everybody as "someone", which is the documented fallback for a member with no name set, so it degrades into a real state rather than a false one.',
  "app/api/live/route.ts :: const { data: files } = await client.from('episodes').select('id, audio_path').in('id', episodeIds);":
    'Episode file paths. A failed read draws the post without a player, which the room already handles as "the episode is gone" — wrong, but it says something rather than nothing.',
  "app/api/radar/route.ts :: const { data: mine } = await client":
    'Songs on the collaboration radar. Empty reads as none shared, which is the default and the safe direction: it under-shares rather than over-shares.',
  "app/api/purchases/route.ts :: const { data } = await db.from('purchases').select('track_id, level').eq('owner', caller.id);":
    'What somebody has bought. Empty means nothing unlocked, which fails closed — the wrong way for them and the right way for the money. A member who paid and is told they have not will say so; the reverse would be silent.',
  "app/lib/server/account.ts :: const { data } = await db":
    'purchaseLevel, the same question for one track, with the same direction: a failed read answers "none". Found only when this check learned to see past a type assertion, which is worth noting — it is the case the first two sweeps both walked past.',
  "app/api/charts/route.ts :: const { data: tracks } = await client":
    'Songs on the chart. An empty chart reads as "nobody has listened", which is this fault exactly — but Spotlight has no way to say "could not be read" yet, and inventing one is a screen change rather than a read fix. Named so it is not forgotten.',
  "app/api/charts/route.ts :: const { data: shows } = await client.from('shows').select('id, title, author').in('id', ids);":
    'Shows on the chart, same as above.',
};

/** Every .ts under app/, so a new route cannot be added outside the sweep. */
const files: string[] = [];
const walk = (dir: string): void => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.ts') || path.endsWith('.tsx')) files.push(path);
  }
};
walk('app');

/**
 * How an instance is named, and why it is not a line number.
 *
 * It used to be `file:lineNumber`, and every edit anywhere above one of these
 * reads renamed it. Twice in one day that turned an unrelated change into two
 * red assertions — "this one is not named" and "this reason stands over code
 * that was fixed" — about a line that had not been touched, which is a check
 * crying wolf about its own bookkeeping.
 *
 * The key is the code itself now. Where a file holds the same read twice —
 * `/api/dub` claims its refund on two paths with an identical line — the
 * second gets ` #2`. That is stable as long as their order is, which is a far
 * weaker thing to disturb than an absolute line number.
 */
const found: { at: string; file: string; n: number; line: string }[] = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const seen = new Map<string, number>();
  for (let i = 0; i < lines.length; i += 1) {
    const said = /const \{ data(?::\s*(\w+))?\s*\} = await/.exec(lines[i]);
    if (!said) continue;
    const name = said[1] ?? 'data';
    /* Six lines is enough to catch the `?? []` that follows, and short enough
       not to sweep in an unrelated fallback further down the function. */
    const after = lines.slice(i, i + 7).join('\n');
    /* No trailing \b. `[]` ends in a bracket, and the thing after it is
       almost always `)` — two non-word characters, so a word boundary never
       matches and the sweep found five of sixteen. The check's own stale-reason
       assertion is what caught that: nine named entries pointed at code the
       scan was no longer reaching. */
    /* A cast is allowed to sit between the name and the `??`.
       `((data as Row[] | null) ?? [])` is the same fault wearing a type
       assertion, and the first version of this pattern walked straight past
       it — found by the stale-reason assertion below pointing at a line the
       scan was no longer reaching. */
    const empties = new RegExp(`\\b${name}\\b(?: as [^?]*?)?[\\s)]*\\?\\?\\s*(\\[\\]|0)`);
    if (!empties.test(after)) continue;
    const code = lines[i].trim();
    const nth = (seen.get(code) ?? 0) + 1;
    seen.set(code, nth);
    found.push({
      at: `${file} :: ${code}${nth > 1 ? ` #${nth}` : ''}`,
      file,
      n: i + 1,
      line: code.slice(0, 70),
    });
  }
}

const unnamed = found.filter((one) => !(one.at in NAMED));
ok(
  'every read whose failure becomes an empty list or a nought is fixed or named',
  unnamed.length === 0,
  unnamed.map((one) => `${one.file}:${one.n} — ${one.line}`).join(' ;; '),
);

/* The ratchet. Fifteen once the sweep could see past a type assertion, with
   the two in `/api/account` fixed in the same commit rather than named. It may
   go down and must never go up. */
const MOST = 15;
ok(`and there are no more of them than there were — ${found.length} of ${MOST}`,
  found.length <= MOST,
  `${found.length} now, ${MOST} allowed`);

/* Named entries that no longer match are entries somebody fixed. Their line
   should go, or the next person reads a reason for code that is not there. */
const stale = Object.keys(NAMED).filter((at) => !found.some((one) => one.at === at));
ok('and no reason is left standing over code that was fixed',
  stale.length === 0,
  stale.join(' ;; '));

/* ── And the one that cost the most, held by name ──────────────────────── */
const account = readFileSync('app/api/account/route.ts', 'utf8');
ok('deleting an account refuses if the cloned voices cannot be listed',
  /error: voicesUnread/.test(account) && /if \(voicesUnread\)/.test(account),
  'a failed read here leaves a recording of somebody’s voice on ElevenLabs after telling them it is gone');
ok('and refuses on the trained sounds too', /if \(soundsUnread\)/.test(account));
ok('but reports rather than refuses once files are already being removed',
  /left\.push\(`the files in \$\{bucket\} could not be listed/.test(account),
  'stopping half way through cannot put back what is already deleted');

console.log(
  failures
    ? `\ncheck:couldnotask — ${failures} wrong.`
    : `\ncheck:couldnotask — ${found.length} reads turn a failure into none; every one is named, and the count cannot rise.`,
);
process.exit(failures ? 1 : 0);
