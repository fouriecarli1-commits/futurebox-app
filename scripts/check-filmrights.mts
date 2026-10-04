/**
 * What is in the film, and the one thing this app may honestly say about it.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Copyright check for export."*
 *
 * ── The rule that matters most here is a rule about not lying ────────────
 *
 * This app cannot check copyright. A real check means fingerprinting the
 * audio and the picture against the rights databases the platforms license,
 * and there is no such service here and no plan to pretend to one.
 *
 * So the dangerous version of this feature is not the broken one — it is the
 * one that works. A panel headed "copyright check" with a green tick on it is
 * FutureBox telling somebody, in writing, that their video is safe to post,
 * on no evidence, in a room they paid to be in. The takedown then arrives
 * with this app's assurance behind it.
 *
 * Several rules below therefore check what the room does NOT say, which is an
 * unusual shape for a check and the right one here.
 *
 * ── And the half that is real ────────────────────────────────────────────
 *
 * The app knows which parts of a film came out of itself. That knowledge did
 * not exist until today: `bringIn` made the same piece from a file off a
 * phone and from a video out of her own channel. Every answer in
 * `filmrights.ts` rests on `came` being set at the doors, so the doors are
 * held here too.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { broughtIn, madeHere, mustOwn, ours, cameFromChannel } from '../app/lib/filmrights';
import type { Edit, Piece } from '../app/lib/videoedit';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const dict = readFileSync('app/lib/i18n.tsx', 'utf8');

const shot = (id: string, came?: 'filmed' | 'made' | 'device'): Piece => ({
  id, clip: new Blob(), name: id, from: 0, to: 5, ...(came ? { came } : {}),
});

/* ── What came from where ──────────────────────────────────────────────── */

ok('a shot filmed here and a shot made here are both this app’s',
  ours('filmed') && ours('made') && !ours('device'),
  'one through the camera in the booth, one out of an engine this app paid'
  + ' for; both are hers and the bill is the proof');

ok('a shot with nothing on it counts as carried in',
  !ours(undefined),
  'a film made before provenance was carried has nothing on its pieces, and'
  + ' the safe reading of "I do not know" is "I cannot vouch for it". The'
  + ' other way round, every old film would quietly be declared clean');

const mixed: Edit = {
  pieces: [shot('a', 'made'), shot('b', 'device'), shot('c', 'filmed')],
  under: new Blob(),
  underCame: 'device',
  underName: 'something.mp3',
};

ok('the brought-in things are named, and only those',
  broughtIn(mixed).length === 2
  && broughtIn(mixed).some((one) => one.id === 'b')
  && broughtIn(mixed).some((one) => one.kind === 'song'),
  JSON.stringify(broughtIn(mixed).map((one) => one.id)));

ok('  and what this app made is counted rather than listed',
  madeHere(mixed) === 2,
  'the panel’s job is to put her attention on what it cannot vouch for;'
  + ' twenty shots she already knows are hers is a list she reads past');

ok('a song she made here is not something she has to vouch for',
  broughtIn({ ...mixed, underCame: 'made' }).length === 1,
  'her own record downloaded and brought back would otherwise be flagged,'
  + ' and a panel that asks her to vouch for her own work is a panel she'
  + ' learns to tick without reading');

ok('a film made entirely here asks nothing',
  !mustOwn({ pieces: [shot('a', 'made')] })
  && mustOwn({ pieces: [shot('a', 'device')] }),
  'which is what keeps the tick meaning something on the film where it does'
  + ' appear');

ok('a channel video is marked by what it actually is',
  cameFromChannel(true) === 'filmed' && cameFromChannel(false) === 'made',
  'filmed in the booth or drawn by an engine — both this app’s, and the'
  + ' panel can say which');

/* ── The doors that have to carry it ───────────────────────────────────── */

ok('a file off the device is marked as carried in',
  /came: Came = 'device'/.test(room) && /clip: file,\s*\n\s*came,/.test(room),
  'the default, because an unmarked piece is one nobody can account for');

ok('  and one out of her channel is marked as hers',
  /cameFromChannel\(one\.filmed\)/.test(room),
  'the two arrive here as the same `File`, and by the time the bill is drawn'
  + ' there is nothing left to tell them apart');

ok('  and so is the song, both ways in',
  /underCame: 'device' as const/.test(room) && /underCame: 'made' as const/.test(room),
  'a bed carried in and a bed off her own shelf');

ok('she can put a song she made here under the film at all',
  /data-editorunderminepick/.test(room) && /loadTracks\(\)/.test(room),
  'without a way to choose one, every bed is carried in by definition and the'
  + ' panel fires on every film anybody makes');

/* ── The panel, and what it must not say ───────────────────────────────── */

ok('the bill names what the app cannot vouch for',
  /data-editorrights/.test(room) && /data-editorrightsbrought/.test(room),
  'before the render rather than after the takedown');

ok('  and will not let the film be made until she says it is hers',
  /disabled=\{busy !== null \|\| \(mustOwn\(edit\) && !owns\)\}/.test(room),
  'a warning she can press past is a warning');

ok('  and the tick does not survive the film changing',
  /useEffect\(\(\) => \{ setOwns\(false\); \}, \[brought\.length\]\)/.test(room),
  'a tick made about one film and still set on the next is a tick nobody'
  + ' made');

ok('  and is not kept on the edit, where it would outlive the day',
  !/owns:/.test(withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'))),
  'it is a statement about this film on this day; the project is saved to the'
  + ' device and a saved tick is a signature nobody wrote');

const said = dict.slice(dict.indexOf('"edit.rightsWhy"'), dict.indexOf('"edit.rightsWhy"') + 700);

ok('the room says plainly that this is NOT a copyright check',
  /not a copyright check/i.test(said) && /data-editorrightswhy/.test(room),
  'the dangerous version of this feature is not the broken one. A panel'
  + ' headed "copyright check" with a tick on it is this app telling somebody'
  + ' in writing that their video is safe to post, on no evidence');

ok('  and says a film can pass it and still be taken down',
  /taken down/i.test(said),
  'the sentence that makes the difference between a note and an assurance');

ok('nothing anywhere claims to have checked anything',
  !/no copyright|copyright[- ]free|cleared|rights[- ]cleared|safe to post/i
    .test(room.split('data-editorrights')[1]?.split('data-editorbillgo')[0] ?? ''),
  'the words this panel must never carry');

if (bad) {
  console.error(`\ncheck:filmrights — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmrights — the film says which parts came out of this app and'
  + ' which were carried in, the export stops until she says the carried-in'
  + ' parts are hers, and nothing anywhere claims to have checked copyright.',
);
