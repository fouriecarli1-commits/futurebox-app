/**
 * The effect rack is in the file, not only in the ear — and its pictures are
 * the real curves.
 *
 * ── The promise this check exists to keep ───────────────────────────────
 *
 * `ProBooth` has said since it was written that what is in that room is
 * real: *"every fader, every mute, every offset is in the file that comes
 * out the other end, and `app/lib/session.ts` decides that once so the mixer
 * and the mixdown can never disagree about what you are listening to."*
 *
 * An effect rack is the easiest place in an app to break that, because a
 * knob that only moves the preview is indistinguishable from one that works
 * until somebody exports — and by then they have spent an evening on a mix
 * that is not in their file. So the rule is structural: the rack is built in
 * `wireLane` and nowhere else, out of ordinary Web Audio nodes, and both the
 * live context and the `OfflineAudioContext` of the mixdown go through that
 * one function. There is no second code path to drift.
 *
 * What this refuses, therefore: an `AudioWorklet`, a `ScriptProcessor`, or a
 * hand-written sample loop in the rack. Each of those is a fine way to build
 * an effect and each of them needs its own offline path, which is the one
 * thing that would let the two disagree.
 *
 * ── The pictures ────────────────────────────────────────────────────────
 *
 * Carli: *"As hierdie funksies kleurvolle visualizers kon hê om te wys hoe
 * buig die klankbaan sou dit baie help."* For the three waveshapers the
 * honest picture is the function itself — the panel draws the exact array
 * handed to the `WaveShaperNode` — and for the EQ it is what the biquads say
 * they do. A second, hand-drawn approximation would be a picture of
 * something the app is not doing, which is worse than no picture.
 *
 * ── And what is NOT built ───────────────────────────────────────────────
 *
 * The gate, the voice tuner and the vocoder. All three were on her list and
 * none can be made from these nodes. Naming them in the panel is the
 * difference between "not yet" and "we quietly dropped it", so the naming is
 * checked too.
 *
 *   npm run check:boothfx
 */

import { readFileSync } from 'node:fs';
import { before } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const fx = readFileSync('app/lib/fx.ts', 'utf8');
const session = readFileSync('app/lib/session.ts', 'utf8');
const panel = readFileSync('app/components/BoothFx.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');

/* ── In the file as well as the ear ───────────────────────────────────── */
ok(
  'the rack is built in wireLane, where the mixdown gets it too',
  /const rack = anyFx\(lane\.fx\) \? wireFx\(ctx, lane\.fx\) : null;/.test(session),
  'an effect built anywhere else is an effect the exported file does not have',
);
ok(
  '  and it is in the chain, not merely constructed',
  /if \(rack\) rack\.output\.connect\(level\);/.test(session),
);
ok(
  '  before the fader, so turning a lane up does not change its character',
  before(session, 'const rack = anyFx(lane.fx)', 'level.gain.value = lane.gain'),
);
ok(
  '  and its oscillators are started, or a tremolo silently does nothing',
  /for \(const source of rack\?\.running \?\? \[\]\) source\.start\(0\);/.test(session),
  'in an offline render there is no sound to notice a stopped oscillator by',
);
ok(
  'a lane carries its rack, so a saved session keeps it',
  /readonly fx\?: Fx;/.test(session),
);
ok(
  'nothing in the rack needs a code path the offline render does not have',
  !/AudioWorklet|createScriptProcessor|ScriptProcessorNode/.test(fx),
  'a worklet needs its own offline path, which is exactly how the two come to disagree',
);

/* ── The pictures are the real thing ──────────────────────────────────── */
ok(
  'the shaper curves the panel draws are the arrays the nodes are given',
  /shaper\.curve = curveOf\(kind, settings\.amount\)/.test(fx) &&
    /points=\{curveOf\(id, \(settings \?\? FX_DEFAULTS\[id\]\)\.amount\)\}/.test(panel),
  'a second, hand-drawn approximation is a picture of something the app is not doing',
);
ok(
  '  and the EQ line is asked of the biquads, not drawn from the dials',
  /filter\.getFrequencyResponse\(hz, one, phase\)/.test(fx) && /responseOf\(asking, fx\.eq, hz\)/.test(panel),
  'three filters in series interact, and only they know by how much',
);
ok(
  '  with a straight line behind them to read the bend against',
  /diagonal/.test(panel),
);

/* ── The ones that are real, and the ones that are named ──────────────── */
for (const unit of ['eq', 'compressor', 'limiter', 'utility', 'saturator', 'folder', 'crusher', 'tremolo', 'chorus', 'delay', 'reverb']) {
  ok(`the rack really has a ${unit}`, new RegExp(`if \\(fx\\.${unit}\\)|'${unit}',`).test(fx));
}
ok(
  'the gate, the voice tuner and the vocoder are named as not built',
  /gate, the voice tuner and the vocoder are not built yet/.test(panel),
  'she asked for them; "not yet" and "quietly dropped" have to look different',
);
ok(
  '  and the limiter does not claim to be a brickwall',
  /not a look-ahead brickwall/.test(panel),
);
ok(
  '  and the crusher says it only touches bit depth',
  /Bit depth only/.test(panel),
);

/* ── Per lane, and said so ────────────────────────────────────────────── */
ok(
  'the rack belongs to a lane rather than to the room',
  /change\(fxLane\.id, \{ fx: next \}\)/.test(booth),
  'a compressor the session shared would squash the guitar because the voice needed it',
);
ok(
  '  and says so when no lane is picked, rather than showing an empty rack',
  /fx\.pickFirst/.test(booth),
);

/* ── The reverb has to render the same twice ──────────────────────────── */
ok(
  'the reverb room is generated deterministically',
  !/=\s*Math\.random\(\)|\bMath\.random\(\)\s*[*+\-]/.test(fx),
  'fresh noise per render would make two exports of one unchanged session measurably different',
);

if (failures) {
  console.error(
    '\ncheck:boothfx — the rack is built once, in wireLane, out of ordinary Web Audio nodes,\n' +
      'so the preview and the mixdown cannot disagree. A knob that only moves the preview is\n' +
      'indistinguishable from one that works until somebody exports.\n',
  );
  process.exit(1);
}
console.log('\ncheck:boothfx — one chain, in the file as well as the ear, drawn as it really bends.');
