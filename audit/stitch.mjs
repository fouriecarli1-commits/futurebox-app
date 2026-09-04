/**
 * Many clips into one film, measured on real files in a real browser.
 *
 * ── Why this run exists ──────────────────────────────────────────────────
 *
 * Every engine caps a generation at somewhere between four and thirty seconds,
 * so a three-minute music video has to be cut together from a dozen of them.
 * Whether a browser can actually do that is the assumption the whole idea
 * rests on, and it is not the kind of assumption to take on faith.
 *
 * The clips are made in the page — canvas, recorded — so they are genuine
 * video files with genuine durations rather than fixtures. The module under
 * test is the shipped one, bundled and injected.
 *
 * What is asserted is what would make the feature worthless if it were wrong:
 * that the film is as long as its scenes added together, that a song laid
 * under it comes out on the file, and that a clip of a different shape is
 * letterboxed rather than stretched or cropped.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BUNDLE = process.argv[2] || '/tmp/stitch.bundle.js';

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage();
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

await p.goto('about:blank');
await p.addScriptTag({ content: readFileSync(BUNDLE, 'utf8') });

const out = await p.evaluate(async () => {
  /** A clip of a given length and shape, recorded off a canvas. */
  async function clip(seconds, colour, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = colour; c.fillRect(0, 0, width, height);
        c.fillStyle = '#fff'; c.fillRect((t / seconds) * (width - 40), height / 2 - 20, 40, 40);
        if (t >= seconds) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    return new Blob(parts, { type });
  }

  /** A short tone as a wav, standing in for the song. */
  function song(seconds) {
    const rate = 22050;
    const samples = Math.round(rate * seconds);
    const bytes = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(bytes);
    const ascii = (at, s) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
    ascii(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); ascii(8, 'WAVE');
    ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    ascii(36, 'data'); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i += 1) {
      view.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 20000), true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }

  const wide = await clip(2, '#1b4965', 320, 180);
  const tall = await clip(2, '#5fa8d3', 180, 320);
  const third = await clip(1, '#8ac926', 320, 180);
  const lengths = [
    await window.ST.lengthOf(wide),
    await window.ST.lengthOf(tall),
    await window.ST.lengthOf(third),
  ];

  /* The trim, measured rather than described.

     The same three clips are cut twice: once whole, once with the first one
     asked for between one second and two. If trimming did nothing the two
     films would be the same length, and this is the assertion that catches a
     seek that silently failed — which is what a trim looks like when the
     browser plays from zero while it catches up. */
  const trimmed = await window.ST.stitch({
    scenes: [
      { clip: wide, from: 1, to: 2 },
      { clip: tall },
      { clip: third },
    ],
    width: 320,
    height: 180,
  });

  const seen = [];
  const began = performance.now();
  const made = await window.ST.stitch({
    scenes: [{ clip: wide, name: 'one' }, { clip: tall, name: 'two' }, { clip: third, name: 'three' }],
    audio: song(10),
    width: 320,
    height: 180,
    onScene: (index, total) => seen.push(`${index + 1}/${total}`),
  });
  const took = (performance.now() - began) / 1000;
  if (!made.ok) return { ok: false, why: made.why };

  /* Did the sound survive?

     Decoded, not asked. `mozHasAudio`, `webkitAudioDecodedByteCount` and
     `audioTracks` are each non-standard and none of them answers in Chromium,
     so the first version of this reported a silent film for a file that had
     sound on it. Decoding the output and looking for a sample that is not zero
     is the only answer that cannot be wrong: silence decodes to silence.

     `decodeAudioData` on a webm gives the audio track alone, so a peak above
     the noise floor means the song is on the file. */
  let loudest = 0;
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    const decoded = await new Ctx().decodeAudioData(await made.blob.arrayBuffer());
    const samples = decoded.getChannelData(0);
    for (let at = 0; at < samples.length; at += 64) {
      const value = Math.abs(samples[at]);
      if (value > loudest) loudest = value;
    }
  } catch {
    // No audio track at all is a decode that throws, which is loudest = 0.
  }
  const hasAudio = loudest > 0.01;

  const probe = document.createElement('video');
  probe.src = URL.createObjectURL(made.blob);
  await new Promise((r) => { probe.onloadedmetadata = r; probe.onerror = r; });

  /* The tall clip in a wide frame must be letterboxed, so the middle column of
     that scene is the picture and the edges are black. Sampled from the film
     itself rather than trusted to the arithmetic. */
  probe.currentTime = lengths[0] + 0.6;
  await new Promise((r) => { probe.onseeked = r; setTimeout(r, 1500); });
  const shot = document.createElement('canvas');
  shot.width = 320; shot.height = 180;
  const sc = shot.getContext('2d');
  sc.drawImage(probe, 0, 0, 320, 180);
  const at = (x) => {
    const [r, g, bl] = sc.getImageData(x, 90, 1, 1).data;
    return r + g + bl;
  };
  const edge = at(4);
  const middle = at(160);

  /* And what the clamp does with nonsense a slider can produce. */
  const clamps = [
    { what: 'no trim at all', got: window.ST.windowOf({ clip: wide }, 10) },
    { what: 'an end past the clip', got: window.ST.windowOf({ clip: wide, from: 1, to: 99 }, 10) },
    { what: 'a start past the end', got: window.ST.windowOf({ clip: wide, from: 8, to: 2 }, 10) },
    { what: 'a negative start', got: window.ST.windowOf({ clip: wide, from: -5, to: 4 }, 10) },
  ];

  return {
    ok: true,
    trimmed: trimmed.ok ? trimmed.seconds : null,
    clamps,
    scenes: lengths,
    wanted: lengths.reduce((a, one) => a + one, 0),
    got: made.seconds,
    took,
    bytes: made.blob.size,
    ext: made.ext,
    seen,
    hasAudio,
    loudest,
    edge,
    middle,
    unsupported: !window.ST.canStitch(),
  };
});

if (!out.ok) {
  check('the film was made', false, out.why);
} else {
  check('this browser can stitch at all', !out.unsupported);
  check('every scene was reported as it was laid down', out.seen.join(',') === '1/3,2/3,3/3', out.seen.join(','));
  check(
    `the film is as long as its scenes (${out.wanted.toFixed(2)}s wanted, ${out.got.toFixed(2)}s got)`,
    Math.abs(out.got - out.wanted) < 0.6,
    `${out.wanted} vs ${out.got}`,
  );
  check('it is a real file, not an empty one', out.bytes > 5000, String(out.bytes));
  check('the song under it survived onto the file', out.hasAudio, `loudest sample ${out.loudest?.toFixed(3)}`);
  check(
    'a tall clip in a wide frame is letterboxed, not stretched',
    out.edge < 40 && out.middle > out.edge,
    `edge ${out.edge}, middle ${out.middle}`,
  );
  /* The cost of doing this in a browser, measured rather than described. It is
     real time by construction, and saying so is the point: a three-minute film
     takes three minutes, and anybody planning this feature should know it. */
  console.log(`  — ${out.wanted.toFixed(1)}s of film took ${out.took.toFixed(1)}s to cut: ${(out.took / out.wanted).toFixed(2)}× real time`);
  check('it runs at about real time, as designed', out.took / out.wanted < 2.0, `${(out.took / out.wanted).toFixed(2)}×`);

  /* Trimming a second off the first scene must take about a second off the
     film. Anything else means the seek did not land. */
  const wantedTrimmed = out.wanted - (out.scenes[0] - 1);
  check(
    `trimming a scene shortens the film (${wantedTrimmed.toFixed(2)}s wanted, ${out.trimmed?.toFixed(2)}s got)`,
    typeof out.trimmed === 'number' && Math.abs(out.trimmed - wantedTrimmed) < 0.6,
    `${out.trimmed} against ${out.wanted} untrimmed`,
  );
  for (const one of out.clamps) {
    const sane = one.got.from >= 0 && one.got.to <= 10 && one.got.to > one.got.from;
    check(`${one.what} still gives a window that can be played`, sane,
      `${one.got.from}–${one.got.to}`);
  }
  check('no trim means the whole clip', out.clamps[0].got.from === 0 && out.clamps[0].got.to === 10);
  check('a start past the end falls back to the whole clip rather than nothing',
    out.clamps[2].got.from === 0 && out.clamps[2].got.to === 10,
    `${out.clamps[2].got.from}–${out.clamps[2].got.to}`);
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
