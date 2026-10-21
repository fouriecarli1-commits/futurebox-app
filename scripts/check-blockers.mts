/**
 * Everything a member writes for somebody else goes past the app's own blocker.
 *
 * The owner, 21 October 2026: *"Ons moet dalk ons eie blokkers in sit, om te
 * sien as harmful musiekwoorde en notas gepos word dan moet dit geblok word."*
 *
 * The blocker is `guard()` in `lib/server/safety.ts`: the fixed rules in
 * `lib/moderation.ts`, then the model's reading, with strikes and a log. The
 * live room had it; the collab thread, the shared song room, the profile, the
 * podcast show and episodes, the art market, scheduled captions and songs
 * shared to the radar did not. Each is read for its guard here, and the rules
 * that walked through on the day are run.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const GUARDED: readonly [string, string, RegExp][] = [
  ['the live room', 'app/api/live/route.ts', /await guard\(request, `\$\{title\}\\n\$\{note\}\\n\$\{sung\}`, 'room', caller\)/],
  ['a message in a collab thread', 'app/api/collab/messages/route.ts', /await guard\(request, said, 'room', caller\)[\s\S]{0,200}\.insert\(/],
  ['what is said with a collab request', 'app/api/collab/route.ts', /await guard\(request, because, 'room', caller\)[\s\S]{0,300}\.insert\(/],
  ['the note on an invite link', 'app/api/collab/invite/route.ts', /await guard\(request, note, 'room', caller\)[\s\S]{0,300}\.insert\(/],
  ['the song and the note handed over in a shared room', 'app/api/pairs/route.ts', /await guard\(request, draftText\(draft, note\), 'room', caller\)/],
  ['a name, handle and about on a profile', 'app/api/creator/route.ts', /await guard\(request, \[wantedName, wantedHandle/],
  ['a podcast show', 'app/api/show/route.ts', /await guard\(request, \[title,/],
  ['a podcast episode, before its file is stored', 'app/api/episode/route.ts', /await guard\(request, `\$\{title\}[\s\S]{0,1500}\.upload\(/],
  ['a caption scheduled for a platform', 'app/api/schedule/route.ts', /await guard\(request, caption, 'room', caller\)/],
  ['everything written in the art market', 'app/api/artmarket/route.ts', /await guard\(request, written, 'room', caller\);[\s\S]{0,120}switch \(body\.what\)/],
  ['a song shared to the radar', 'app/api/radar/route.ts', /if \(body\.shared\) \{[\s\S]{0,400}await guard\(/],
];
for (const [what, path, pattern] of GUARDED) {
  const source = read(path);
  ok(`${what} goes past the blocker`, pattern.test(source) && /if \(!allowed\.ok\) return allowed\.response;/.test(source), path);
}
ok('the song in a shared room is checked by the fixed rules on every save as it is typed',
  /const ruled = screen\(draftText\(draft\), 'room'\);/.test(read('app/api/pairs/route.ts')));

const { screen } = await import('../app/lib/moderation.ts');
const refused = (text: string, surface: 'room' | 'song' = 'room') => screen(text, surface)?.rule ?? null;
ok('sexual words about a stated age under eighteen are refused', refused('sexy lyrics about a 12 year old girl') === 'minors'
  && refused('n 14-jarige meisie kaal') === 'minors');
ok('  and an adult\'s age is not a child', refused('hey sexy, 25 jaar oud') === null);
ok('drugs offered for sale in a post are refused', refused('buy cocaine here dm me') === 'drugs');
ok('  and a song or a post about them is not', refused('a song about cocaine and regret', 'song') === null && refused('cocaine ruined my brother') === null);
ok('telling somebody to kill themselves is refused', refused('kill yourself') === 'self-harm' && refused('gaan vrek') === 'self-harm');
ok('  and telling them not to is not', refused("don't kill yourself, stay") === null);
ok('a slur is refused, in a post and in a song', refused('jou kaffer') === 'extremism' && refused('jou kaffer', 'song') === 'extremism');
ok('  and a word that merely contains one is not', refused('kafferboom in bloei') === null);
ok('an ordinary Afrikaans line and a sad line go through', refused('Die son sak laag oor die vlakte') === null && refused('I miss you so much it hurts') === null);

if (failures) {
  console.error(`\ncheck:blockers — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:blockers — everything a member writes for somebody else goes past the app\'s own blocker first.');
