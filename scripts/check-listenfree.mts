/**
 * Listening to the words again costs nothing.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"By channel moet daar ook nie 'n listen to words
 * wees wat iets kos nie. Partykeer allign die woorde nie met die lied nie, dan
 * help dit om te kliek op listen to words."*
 *
 * ── Two things were wrong, and the second one is the real one ────────────
 *
 * The only listening on the words screen was the paid transcriber, and it was
 * offered on exactly the song that cannot use it: the button appears when
 * there are NO words. Her case is the opposite — the words are there and they
 * drift — and for that there was nothing to press.
 *
 * Underneath that, the app has always been able to do what she wants, and did
 * it once, silently. `timeFor` finds where the singing actually is with an
 * AudioContext in the browser, free, and then REMEMBERS the answer under the
 * song's id. A measurement taken before the file finished syncing, or off a
 * decode that came back short, is therefore the answer she keeps getting
 * forever. The feature is not the listening; it is being able to ask again.
 *
 * So the rule that matters most here is the one about `forget`: without it the
 * button is a spinner that hands back the same drift, which is worse than no
 * button because it looks like the app has tried.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const screen = withoutComments(readFileSync('app/components/FollowWords.tsx', 'utf8'));
const channel = withoutComments(readFileSync('app/components/Channel.tsx', 'utf8'));
const timing = withoutComments(readFileSync('app/lib/lyrictime.ts', 'utf8'));
const dict = readFileSync('app/lib/i18n.tsx', 'utf8');

ok('the words screen offers a listen that is not the paid one',
  /listenFree\?: \(\) => Promise<string \| null>/.test(screen)
  && /data-followlisten/.test(screen),
  'the only one there was appears when a song has NO words, which is the one'
  + ' case her problem is not');

ok('  and it is offered where her problem is: words that drift',
  /listenFree && lines\.length > 0/.test(screen),
  'with no words the paid button is the one that applies, and two buttons'
  + ' both saying "listen" would be two prices for one word');

ok('  and it says on the button that it costs nothing',
  /play\.listenFree/.test(screen) && /play\.free/.test(screen),
  'everything else on this screen that listens costs credits, so one that'
  + ' does not has to say so or nobody presses it twice');

ok('  and it is never shown with a price beside it',
  !/listenFree[\s\S]{0,900}wordCost/.test(screen),
  'the one thing this button must not inherit');

/* ── The rule the whole feature rests on ───────────────────────────────── */

ok('asking again really listens again',
  /forget\(lyricsFor\.track\.id\)/.test(channel)
  && before(channel, 'forget(lyricsFor.track.id)', 'await timeFor(lyricsFor.track, blob)'),
  '`timeFor` hands back a remembered answer under the song’s id, so'
  + ' without forgetting it first the button is a spinner that returns the'
  + ' same drift — worse than no button, because it looks like it tried');

ok('  and what it found is said out loud',
  /play\.listenedOk/.test(channel) && /play\.listenedFlat/.test(channel),
  '"it listened and moved them" and "it could not hear the singing, so they'
  + ' are spread evenly" look identical on the first line and come apart by'
  + ' the third');

ok('  and the screen draws that sentence',
  /data-followlistened/.test(screen),
  'a sentence returned and never rendered is the shape half the faults in'
  + ' this repository have had');

ok('  with both halves in Afrikaans too',
  /"play\.listenedOk"[\s\S]{0,400}af:/.test(dict)
  && /"play\.listenFree"[\s\S]{0,200}af:/.test(dict),
  'the room this lives in is the one most likely to be used in Afrikaans');

/* ── And it is genuinely free ──────────────────────────────────────────── */

ok('the free listen runs in this browser and calls no route',
  !/fetch\(/.test(timing.split('export async function timeFor')[1]?.split('\nexport ')[0] ?? 'fetch('),
  'an AudioContext and a decode — if this ever reached a route it would be'
  + ' billable and the button would be lying');

ok('  and it is not the transcriber wearing a different label',
  /exactFor/.test(channel) && !/exactFor/.test(
    channel.split('listenFree={async () => {')[1]?.split('askWords={')[0] ?? '',
  ),
  'the paid rung stays exactly where it was, on the song with no words');

if (bad) {
  console.error(`\ncheck:listenfree — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:listenfree — the words can be listened to again for nothing, on the'
  + ' song whose words drift, and asking again really asks again rather than'
  + ' handing back what was remembered.',
);
