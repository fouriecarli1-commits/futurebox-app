/**
 * Every button that does something says it did it.
 *
 * Carli, 16 September 2026: *"Met elke relevante button waar dit sal sin
 * maak, moet dit darem 'n vinnige status update gee. Soos in live room. As
 * mens dit post, dan moet die button sê posted."*
 *
 * ── Why the list is named rather than inferred ───────────────────────────
 *
 * A check that tried to find "every button that does something" would have
 * to decide what "something" is, and it would be wrong in both directions
 * every week: a play button does something and must NOT say "played", a
 * button that opens a panel answers by the panel opening. A list that
 * cries wolf is a list somebody switches off.
 *
 * So this names the buttons that were reported, or found beside one, and
 * refuses to let them go quiet again. The list grows when a new one is
 * found, which is the honest way round: each entry is a thing somebody
 * pressed and got no answer from.
 *
 * ── And the contract of the component itself ─────────────────────────────
 *
 * `SaysDone` is the pattern. Three things about it are load-bearing and
 * none is obvious from reading it:
 *
 *   · the label carries the state, because a notice elsewhere on the screen
 *     is a notice under a thumb;
 *   · `false` from `onDo` goes back to ready and says nothing, because the
 *     caller is showing the reason and two copies of one failure is two
 *     places to read it;
 *   · without `again` the done state is permanent AND the button stays
 *     disabled, which is how posting the same song twice is prevented — the
 *     state and the guard are one thing, so removing the state removes the
 *     guard silently.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const says = readFileSync('app/components/SaysDone.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── The component's contract ─────────────────────────────────────────── */

ok(
  'the state is on the label and not somewhere else on the screen',
  /state === 'busy' \? busyLabel : state === 'done' \? doneLabel : label/.test(says),
  'a notice elsewhere on the screen is a notice under a thumb',
);
ok(
  'a refusal goes back to ready and says nothing itself',
  /if \(went === false\) \{\s*setState\('ready'\);/.test(says),
  'the caller is showing the reason; a button that said "failed" and cleared leaves none',
);
ok(
  'without `again` the done state is permanent',
  /if \(again !== undefined\) \{/.test(says),
  'posting the same song twice makes two rows and the room offers it twice',
);
ok(
  '  and it is the guard as well as the state',
  /disabled=\{disabled \|\| state !== 'ready'\}/.test(says),
  'one fact in one place: removing the state must not quietly remove the guard',
);
ok(
  'a request that outlives the panel does not set state on a dead component',
  /here\.current = false;/.test(says) && /if \(!here\.current\) return;/.test(says),
);
ok(
  '  and its timer is cleared with it',
  /window\.clearTimeout\(timer\.current\)/.test(says),
);
ok(
  'the state is readable from outside, for the probe',
  /data-saysdone=\{state\}/.test(says),
);
ok(
  'and a screen reader is told when the label changes',
  /aria-live="polite"/.test(says),
  'the label changing under a finger is the whole answer, and it has to be announced',
);

/* ── The buttons that were reported, and the ones found beside them ───── */

const reported: readonly { readonly file: string; readonly what: string; readonly label: string }[] = [
  /* Her own example, twice over: the live room posts a song and posts a
     video, and both went grey and came back saying "Post it". */
  { file: 'app/components/LiveChannel.tsx', what: 'posting a song to the live room', label: "live.posted" },
  { file: 'app/components/LiveChannel.tsx', what: 'posting a video to the live room', label: "live.posting" },
  /* A download says nothing on a phone: the file lands somewhere and the
     shelf that answers for it on a desk is not there. */
  { file: 'app/components/Channel.tsx', what: 'downloading a song from the channel', label: 'chan.kept' },
  { file: 'app/components/MarketPlan.tsx', what: 'the week as a calendar file', label: 'plan.calendarDone' },
  { file: 'app/components/MarketPlan.tsx', what: 'the whole marketing plan as a page', label: 'plan.paper.done' },
  /* Both of the booth's exports render the whole mix offline first, which is
     the slow part and the part that had no label at all. */
  { file: 'app/components/ProBooth.tsx', what: 'the booth saving a mix to the phone', label: 'pro.toPhoneDone' },
  { file: 'app/components/ProBooth.tsx', what: 'the booth sending a mix to the Library', label: 'pro.toLibraryBusy' },
];

for (const one of reported) {
  const text = readFileSync(one.file, 'utf8');
  ok(
    `${one.what} says what it did`,
    /<SaysDone/.test(text) && text.includes(one.label),
    `${one.file} no longer carries ${one.label}`,
  );
}

/* Four that already did it their own way before there was a component, and
   are left alone deliberately: each is a copy-to-clipboard that flips a
   `copied` flag for a second and a half. Converting them would be churn
   with no behaviour change, and the property worth holding is that they
   still answer at all. */
for (const file of [
  'app/components/Campaign.tsx',
  'app/components/Transcript.tsx',
  'app/components/ShareRow.tsx',
  'app/components/MakeMusic.tsx',
]) {
  const text = readFileSync(file, 'utf8');
  ok(
    `${file.split('/').pop()} still answers a copy with a word`,
    /clipboard\.writeText/.test(text) && /setCopied|setShared/.test(text),
    'a copy that says nothing is a copy somebody makes twice',
  );
}

/* ── And every new label exists in both languages ─────────────────────── */

for (const key of [
  'live.posting',
  'live.posted',
  'chan.kept',
  'pro.toPhoneBusy',
  'pro.toPhoneDone',
  'pro.toLibraryBusy',
  'pro.toLibraryDone',
  'plan.calendarBusy',
  'plan.calendarDone',
  'plan.paper.busy',
  'plan.paper.done',
]) {
  ok(
    `"${key}" is in the dictionary with an Afrikaans of its own`,
    new RegExp(`"${key.replace('.', '\\.')}": \\{ en: "[^"]+", af: "[^"]+" \\}`).test(words),
    'an English fallback is silent: nobody can tell it from a deliberate choice',
  );
}

if (failures) {
  console.error(
    '\ncheck:saysdone — a press with no answer is a press somebody makes twice. The state\n' +
      'goes on the button, because the button is where the eye already is. And the done\n' +
      'state is the guard as well: take it off a post button and the same song goes into\n' +
      'the room twice under one name.\n',
  );
  process.exit(1);
}
console.log('\ncheck:saysdone — every button on the list says what it did, in both languages.');
