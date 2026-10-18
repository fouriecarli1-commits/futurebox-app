/**
 * The picture moving in a shot, without a browser.
 *
 *   npm run check:videomotion
 *
 * The owner, 17 October 2026: motion effects in the video editor. What has to
 * hold is that a still shot is untouched, that each ready-made movement does
 * what its name says and lands where it should, that keyframes arrive at the
 * pose they were given and ease between them, that a shake is the same shake
 * every time (the preview and the file), and that the renderer and the
 * preview read the same function.
 */
import { readFileSync } from 'node:fs';
import { EASES, MOVES, STILL, cleanMotion, eased, keyPose, moves, poseAt, poseCss, type Key } from '../app/lib/videomotion.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const near = (a: number, b: number, e = 1e-6): boolean => Math.abs(a - b) <= e;

ok('a shot with no motion is still', JSON.stringify(poseAt(undefined, 1, 4)) === JSON.stringify(STILL) && !moves(undefined) && !moves({ move: 'none' }));
ok('Push in starts at full frame and ends closer', near(poseAt({ move: 'zoomIn' }, 0, 4).scale, 1) && poseAt({ move: 'zoomIn' }, 4, 4).scale > 1.15);
ok('  Pull out does the opposite', poseAt({ move: 'zoomOut' }, 0, 4).scale > 1.15 && near(poseAt({ move: 'zoomOut' }, 4, 4).scale, 1));
ok('Pan left moves the picture left across the shot', poseAt({ move: 'panLeft' }, 0, 4).x > 0 && poseAt({ move: 'panLeft' }, 4, 4).x < 0);
ok('  and is pushed in enough that no edge shows', poseAt({ move: 'panLeft' }, 2, 4).scale >= 1 + Math.abs(poseAt({ move: 'panLeft' }, 0, 4).x) * 2);
ok('How strong scales the movement', poseAt({ move: 'zoomIn', strength: 2 }, 4, 4).scale - 1 > (poseAt({ move: 'zoomIn' }, 4, 4).scale - 1) * 1.9);
ok('a shake is the same shake every time it is played', JSON.stringify(poseAt({ move: 'shake' }, 1.234, 4)) === JSON.stringify(poseAt({ move: 'shake' }, 1.234, 4)) && poseAt({ move: 'shake' }, 1.234, 4).x !== 0);
ok('Spin in arrives upright and whole', near(poseAt({ move: 'spinIn' }, 2, 4).rotate, 0, 1e-3) && near(poseAt({ move: 'spinIn' }, 2, 4).scale, 1, 1e-3) && poseAt({ move: 'spinIn' }, 0, 4).rotate < -100);
ok('Drop in lands in place and Fade up ends solid', near(poseAt({ move: 'dropIn' }, 3, 4).y, 0, 1e-3) && near(poseAt({ move: 'fadeIn' }, 3, 4).opacity, 1) && poseAt({ move: 'fadeIn' }, 0, 4).opacity === 0);
ok('Whip out stays still until the end, then is thrown out', near(poseAt({ move: 'whipOut' }, 1, 4).x, 0) && poseAt({ move: 'whipOut' }, 4, 4).x < -1);
ok(`every movement is named in both languages (${MOVES.length})`, MOVES.length >= 18 && MOVES.every((one) => one.en && one.af));

/* ── Keyframes ── */
const keys: Key[] = [
  { at: 0, x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, ease: 'linear' },
  { at: 1, x: 0.5, y: -0.2, scale: 2, rotate: 90, opacity: 0.5, ease: 'linear' },
];
const mid = keyPose(keys, 0.5);
ok('halfway between two keyframes is halfway between their poses', near(mid.x, 0.25) && near(mid.scale, 1.5) && near(mid.rotate, 45) && near(mid.opacity, 0.75));
ok('  and each keyframe is arrived at exactly', near(keyPose(keys, 1).x, 0.5) && near(keyPose(keys, 0).scale, 1));
ok('  out of order, they are put in order', near(keyPose([keys[1], keys[0]], 0.5).x, 0.25));
ok('easing changes the way between, not where it ends', eased(0.5, 'in') < 0.5 && eased(0.5, 'out') > 0.5 && near(eased(1, 'inOut'), 1) && near(eased(1, 'bounce'), 1, 1e-9) && EASES.length === 5);
ok('a movement and keyframes together', near(poseAt({ move: 'zoomIn', keys }, 4, 4).scale, poseAt({ move: 'zoomIn' }, 4, 4).scale * 2, 1e-9));

/* ── Saved films ── */
ok('a saved motion with nonsense in it is cleaned', JSON.stringify(cleanMotion({ move: 'teleport', keys: [{ at: 5, scale: -3, rotate: 'x', ease: 'warp' }] })) === JSON.stringify({ keys: [{ at: 1, x: 0, y: 0, scale: 0.05, rotate: 0, opacity: 1, ease: 'inOut' }] }));
ok('  and one that does nothing is no motion', cleanMotion({ move: 'none' }) === undefined && cleanMotion('x') === undefined);
ok('the preview\'s transform is the renderer\'s pose', poseCss({ x: 0.1, y: -0.05, scale: 1.2, rotate: 15, opacity: 1 }) === 'translate(10.000%, -5.000%) rotate(15.000deg) scale(1.2000)');

/* ── One function for both ── */
const stitch = readFileSync('app/lib/stitch.ts', 'utf8');
const editor = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the renderer moves the picture with poseAt', /poseAt\(motion, \(video\.currentTime - view\.from\)/.test(stitch) && /applyPose\(context, pose,/.test(stitch));
ok('  and the editor\'s preview with the same poseAt', /poseAt\(motion, \(el\.currentTime - from\)/.test(editor));
ok('  and the cut carries the motion from the edit', /cleanMotion\(one\.motion\)/.test(readFileSync('app/lib/videoedit.ts', 'utf8')));

if (bad) {
  console.error(`\ncheck:videomotion — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:videomotion — still is still, each movement does what it says, keyframes arrive and ease, and the preview and the film move the same.');
