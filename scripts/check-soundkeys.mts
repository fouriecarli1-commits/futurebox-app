/**
 * Solo, mute, the duck, and the fold to mono.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Mens moet op 'n music track kan kliek en dit mute,
 * net soos in probooth die s, m. Ook stereo, mono surround. Dit moet ook die
 * funksie en button in hê wanneer 'n video praat, dan moet die musiek sagter
 * gaan elke keer wanneer die praat stem in kom."*
 *
 * ── Why these rules are mostly about the CUT ─────────────────────────────
 *
 * Because this is the one corner of the room where a wrong answer is silent.
 * A caption in the wrong place is visible in the preview; a lane that is
 * muted in the room and loud in the film, or loud in the room and muted in
 * the film, looks identical either way — and the only way to find out is to
 * pay for the render and listen.
 *
 * So `heard` is one function and both ends ask it, and the rules below put
 * every combination of the two switches through it and then check what
 * `cutFrom` hands the renderer.
 *
 * ── And why there is no surround ─────────────────────────────────────────
 *
 * `MediaRecorder` writes a stereo webm. There is no six-channel file at the
 * end of this, so a surround button would be a button that cannot do what it
 * says. The room says so on the panel rather than leaving it to be found
 * after a render, and the last rule here holds that sentence in place.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { cutFrom, heard, type Edit, type Piece } from '../app/lib/videoedit';
import { DUCK_IN } from '../app/lib/stitch';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const render = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));

const talker = (id: string): Piece => ({
  id, clip: new Blob(), name: id, from: 0, to: 10, sound: true,
});
const film: Edit = { pieces: [talker('a')], under: new Blob(), underLoud: 1 };

/* ── Mute and solo, resolved once ──────────────────────────────────────── */

ok('with nothing switched, both lanes are heard',
  heard(film).music && heard(film).shots,
  'the state every film already made is in');

ok('muting the music silences it and leaves the shots',
  !heard({ ...film, underMute: true }).music
  && heard({ ...film, underMute: true }).shots,
  'her request: "mens moet op ’n music track kan kliek en dit mute"');

ok('  and the same the other way round',
  heard({ ...film, shotsMute: true }).music && !heard({ ...film, shotsMute: true }).shots,
  'two lanes, one rule');

ok('solo means only that one',
  heard({ ...film, solo: 'music' }).music && !heard({ ...film, solo: 'music' }).shots,
  'the pair every desk has, and the Pro Booth’s own S and M');

ok('  and it beats a mute left on from ten minutes ago',
  heard({ ...film, solo: 'music', underMute: true }).music,
  'somebody who has soloed the music is listening to the music; a mute that'
  + ' silenced it anyway would be a button that does nothing with no way to'
  + ' see why');

/* ── And the FILM is what the room says it is ──────────────────────────── */

ok('a muted music lane reaches the renderer as no song at all',
  cutFrom({ ...film, underMute: true }).audio === null,
  'this is the assertion that matters: muted here and loud in the film is a'
  + ' mistake nobody can see, only pay for');

ok('  and a muted shots lane as a scene that does not speak',
  cutFrom({ ...film, shotsMute: true }).scenes[0]?.sound === undefined,
  'the switch on the lane and the switch on the shot are one answer');

ok('  and a soloed music lane silences the shots in the film too',
  cutFrom({ ...film, solo: 'music' }).scenes[0]?.sound === undefined
  && cutFrom({ ...film, solo: 'music' }).audio !== null,
  'solo in the room has to be solo in the file, or it is a monitoring toy');

/* ── The duck ──────────────────────────────────────────────────────────── */

ok('the duck is carried to the renderer when it can be used',
  cutFrom({ ...film, duck: 0.3 }).duck === 0.3,
  'Carli: "wanneer ’n video praat, dan moet die musiek sagter gaan"');

ok('  and not when there is no song to duck',
  cutFrom({ pieces: [talker('a')], duck: 0.3 }).duck === undefined,
  'a number on a cut that cannot use it is a number the renderer has to'
  + ' decide to ignore, and a renderer making decisions about the edit is'
  + ' what `cutFrom` exists to prevent');

ok('  and not when no shot speaks',
  cutFrom({ pieces: [{ ...talker('a'), sound: false }], under: new Blob(), duck: 0.3 })
    .duck === undefined,
  'nothing would ever bring it in');

ok('  and not when the lane it would duck for is muted',
  cutFrom({ ...film, duck: 0.3, shotsMute: true }).duck === undefined,
  'ducking under a shot nobody can hear is the music going quiet for no'
  + ' reason, which is the fault version of this feature');

ok('  and it is held between nothing and all of it',
  cutFrom({ ...film, duck: 9 }).duck === 1 && cutFrom({ ...film, duck: -9 }).duck === 0,
  `${cutFrom({ ...film, duck: 9 }).duck} — above one is a music bed that gets`
  + ' LOUDER when somebody talks');

ok('the renderer ramps the duck rather than switching it',
  /setTargetAtTime\(want, audioContext\.currentTime, DUCK_IN\)/.test(render)
  && DUCK_IN > 0.02 && DUCK_IN < 0.5,
  `${DUCK_IN}s — a song that drops between one frame and the next is a fault`
  + ' somebody can hear; the thing being imitated is a hand on a fader');

ok('  and against the loudness she set, not against one',
  /const base = Math\.max\(0, Math\.min\(2, cut\.audioLoud \?\? 1\)\)/.test(render),
  'ducking to a third OF FULL on a bed already at a quarter would make the'
  + ' music louder every time somebody speaks');

/* ── Mono, and the honesty about surround ──────────────────────────────── */

ok('mono reaches the renderer as a fold, not as a second mix',
  cutFrom({ ...film, mix: 'mono' }).mix === 'mono'
  && cutFrom(film).mix === undefined,
  'absent is stereo, so nothing already made changes');

ok('  and the fold is one node everything passes through',
  /out\.channelCount = 1/.test(render)
  && /out\.channelCountMode = 'explicit'/.test(render)
  && /songGain\.connect\(out\)/.test(render)
  && /const into = mixer \?\? destination;/.test(render)
  && /from\.connect\(into\)/.test(render) && /high\.connect\(into\)/.test(render),
  'the song and the talking shots both end in one place, which is what lets'
  + ' mono be one node rather than a rule each of them has to remember —'
  + ' including the shot that went through the noise filters first');

ok('nothing anywhere offers surround',
  !/surround/i.test(room.split('data-editormixpick')[1]?.split('</div>')[0] ?? 'surround'),
  'there is no six-channel webm at the end of this, and a button that cannot'
  + ' do what it says is worse than a missing one');

ok('  and the room says why, before a render rather than after',
  /data-editornosurround/.test(room) && /edit\.noSurround/.test(room),
  'she asked for it by name, so "it is not there" has to be an answer she'
  + ' can read rather than a gap she has to notice');

/* ── The room asks the same questions ──────────────────────────────────── */

ok('the lanes carry the two keys',
  /data-editorkey=\{mark\}/.test(room) && /`solo-\$\{which\}`/.test(room)
  && /`mute-\$\{which\}`/.test(room),
  'the same pair the Pro Booth’s desk has');

ok('  and pressing one does not also scrub the lane under it',
  /onClick=\{\(event\) => \{ event\.stopPropagation\(\); commit\(press\); \}\}/.test(room)
  && /onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/.test(room),
  'these sit ON the music lane, and the music lane is a press target of its'
  + ' own — muting would otherwise also drag the bed to wherever the button'
  + ' happens to be');

ok('the preview is silenced by the same answer the film is',
  /a\.muted = !on\.music/.test(room) && /!piece\.sound \|\| !heard\(edit\)\.shots/.test(room),
  'a lane muted in the room and loud in the film is the one mistake in this'
  + ' room that cannot be seen');

ok('  and ducks by the same multiplication',
  /const duck = speaking && edit\.duck !== undefined/.test(room),
  'a preview that ducked on something else would be a mix balanced against a'
  + ' film that does not exist');

if (bad) {
  console.error(`\ncheck:soundkeys — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:soundkeys — both lanes have solo and mute, the film is silenced by'
  + ' the same answer the room is, the music steps back under a speaking shot'
  + ' on a ramp, and mono is a fold while surround is said not to exist.',
);
