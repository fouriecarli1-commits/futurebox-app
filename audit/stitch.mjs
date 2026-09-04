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
  /** A clip of a given length and shape, recorded off a canvas.

     `stripe` paints a hard white band across the top eighth. It is there for
     the blur check: a band with a sharp edge is the one thing a blur cannot
     reproduce, so measuring how bright it still is in the background is how a
     blurred copy is told apart from an enlarged sharp one. */
  async function clip(seconds, colour, width, height, stripe = false) {
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
        if (stripe) { c.fillStyle = '#fff'; c.fillRect(0, height * 0.08, width, height * 0.06); }
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

  /* ── The background behind a shot that does not fill the frame ────────

     A wide clip cut into a tall film leaves a band above and below it. Black
     is the honest default; a blurred, enlarged copy of the same frame is the
     option, and it is measured here rather than asserted.

     Two cuts of the same striped clip into the same tall frame, one each way,
     and three questions asked of the top band:

       · black really is black, so the default did not change;
       · blurred is not black, and its colour comes from the clip — a blue
         clip must give a blue-dominant band, which a grey fill would not;
       · the hard white stripe near the top of the clip survives in the sharp
         picture and is *smeared away* in the background. That last one is the
         difference between a blur and an enlarged sharp copy, and nothing
         else distinguishes them. */
  const striped = await clip(2, '#1b4965', 320, 180, true);
  const TALL_W = 180, TALL_H = 320;

  async function bandOf(background) {
    const film = await window.ST.stitch({
      scenes: [{ clip: striped }],
      width: TALL_W,
      height: TALL_H,
      background,
    });
    if (!film.ok) return null;
    const v = document.createElement('video');
    v.src = URL.createObjectURL(film.blob);
    v.muted = true;
    await new Promise((r) => { v.onloadedmetadata = r; v.onerror = r; });
    v.currentTime = 1.0;
    await new Promise((r) => { v.onseeked = r; setTimeout(r, 1500); });
    const shot = document.createElement('canvas');
    shot.width = TALL_W; shot.height = TALL_H;
    const g = shot.getContext('2d');
    g.drawImage(v, 0, 0, TALL_W, TALL_H);
    const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data).slice(0, 3);
    const sum = (x, y) => px(x, y).reduce((a, one) => a + one, 0);

    /* The clip is 16:9 in a 9:16 frame, so it is drawn about 180 × 101 in the
       middle and the bands are the rest. Sampled a little inside each so a
       rounding pixel at the seam cannot decide the answer. */
    const bandRow = 60;
    const clipRow = Math.round(TALL_H / 2);
    // Where the white stripe lands: in the enlarged background near the top,
    // and in the sharp picture an eighth of the way down its own 101 rows.
    let bandPeak = 0;
    for (let y = 12; y < 70; y += 1) bandPeak = Math.max(bandPeak, sum(90, y));
    let sharpPeak = 0;
    const top = Math.round((TALL_H - 101) / 2);
    for (let y = top; y < top + 30; y += 1) sharpPeak = Math.max(sharpPeak, sum(90, y));
    return { band: px(90, bandRow), bandSum: sum(90, bandRow), bandPeak, sharpPeak, middle: sum(90, clipRow) };
  }

  const black = await bandOf('black');
  const blurred = await bandOf('blur');

  /* The mechanism the blurred background rests on, asked of the browser
     rather than assumed: a canvas that ignores `filter` would draw an
     enormous sharp copy, which is worse than the bars it replaced — the code
     falls back to black when this is false, and this says which branch the
     numbers above came from. */
  const honoursFilter = (() => {
    const c = document.createElement('canvas').getContext('2d');
    c.filter = 'blur(2px)';
    return c.filter.includes('blur');
  })();

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
    black,
    blurred,
    honoursFilter,
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

  // ── The background behind a shot that does not fill the frame ──────────
  check('this browser honours canvas filter, which is what blur is built on', out.honoursFilter);
  check('black bars are still black — the default did not move',
    Boolean(out.black) && out.black.bandSum < 60, `band ${out.black?.bandSum}`);
  check('blurring fills the band with picture instead of black',
    Boolean(out.blurred) && out.blurred.bandSum > 60, `band ${out.blurred?.bandSum}`);
  check('the band is a copy of this clip — a blue shot gives a blue band',
    Boolean(out.blurred) && out.blurred.band[2] > out.blurred.band[0] + 10,
    out.blurred ? `rgb(${out.blurred.band.join(',')})` : 'none');
  check('the band is darkened, so the shot in front of it still leads',
    Boolean(out.blurred) && out.blurred.bandSum < out.blurred.middle,
    `band ${out.blurred?.bandSum} against picture ${out.blurred?.middle}`);
  /* The one that separates a blur from an enlarged sharp copy: the clip has a
     hard white stripe near its top, which stays white in the picture and must
     be smeared down to something much dimmer in the background behind it. */
  check('the hard stripe survives in the picture itself',
    Boolean(out.blurred) && out.blurred.sharpPeak > 600, `peak ${out.blurred?.sharpPeak}`);
  console.log(
    `  — the band: black ${out.black?.bandSum}, blurred ${out.blurred?.bandSum} rgb(${out.blurred?.band.join(',')}); ` +
    `the stripe peaks at ${out.blurred?.sharpPeak} in the picture and ${out.blurred?.bandPeak} behind it`,
  );
  check('and is smeared away in the background — it is blurred, not enlarged',
    Boolean(out.blurred) && out.blurred.bandPeak < out.blurred.sharpPeak * 0.8,
    `band peak ${out.blurred?.bandPeak} against ${out.blurred?.sharpPeak} in the picture`);
  check('a start past the end falls back to the whole clip rather than nothing',
    out.clamps[2].got.from === 0 && out.clamps[2].got.to === 10,
    `${out.clamps[2].got.from}–${out.clamps[2].got.to}`);
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
