// Four jobs that are billed by the minute upstream, and were charged flat.
//
//   node --experimental-strip-types .probe/perminute.mjs
//
// Transcribing, taking the room out, saying it again in another voice and
// splitting into stems all send a whole file to ElevenLabs and are billed by
// the minute of it. Each charged a flat two or four credits however long the
// file was.
//
// Against ElevenLabs' published rates that broke even at under a minute for
// the voice isolator, so every take longer than about fifty seconds lost
// money — and an hour-long recording cleaned for two credits cost more
// upstream than the member's whole monthly plan.
//
// The rates below are theirs, off their pricing page, Creator tier:
//
//   voice isolator   $0.18 / min
//   voice changer    $0.18 / min
//   speech to text   $3.60 / hr   = $0.06 / min
//   music            $0.16 / min
//   text to speech   $0.18 / min
//
// A credit is about R1.50 on the largest pack (400 for R599).

import { CREDITS, perMinute, readCost, songCost, dubCost } from '../app/lib/credits.ts';
import { wavSeconds } from '../app/lib/pcmwav.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── Rounding up, and a floor ───────────────────────────────────────────
say(perMinute(0, 4) === 4, 'a file of no length costs nothing');
say(perMinute(1, 4) === 4, 'a one-second clip does not reach the floor');
say(perMinute(60, 4) === 4, 'a minute costs more than a minute');
say(perMinute(61, 4) === 8, 'a minute and a second is not rounded up to two');
say(perMinute(600, 4) === 40, 'ten minutes is mispriced');
say(perMinute(-30, 4) === 4, 'a negative length produced something other than the floor');

// ── The hour that used to cost two credits ─────────────────────────────
{
  const hour = 3600;
  const RAND_PER_CREDIT = 1.50;
  const USD_TO_RAND = 18;

  const cleaning = perMinute(hour, CREDITS.clean) * RAND_PER_CREDIT;
  const theirs = 60 * 0.18 * USD_TO_RAND;
  say(cleaning > theirs, `an hour cleaned charges R${cleaning.toFixed(0)} against a cost of R${theirs.toFixed(0)}`);

  const reading = perMinute(hour, CREDITS.transcribe) * RAND_PER_CREDIT;
  const theirSpeech = 60 * 0.06 * USD_TO_RAND;
  say(reading > theirSpeech, `an hour transcribed charges R${reading.toFixed(0)} against R${theirSpeech.toFixed(0)}`);

  const changing = perMinute(hour, CREDITS.voiceChange) * RAND_PER_CREDIT;
  say(changing > theirs, `an hour restaged charges R${changing.toFixed(0)} against R${theirs.toFixed(0)}`);

  // And the old flat charge did not.
  say(2 * RAND_PER_CREDIT < theirs, 'the flat charge this replaces was not actually a loss, so check the sums again');
}

// ── The ones that were already by the minute stay right ────────────────
{
  const USD_TO_RAND = 18;
  const RAND_PER_CREDIT = 1.50;
  // A minute of speech is about 900 characters.
  const readMinute = readCost(900) * RAND_PER_CREDIT;
  say(readMinute > 0.18 * USD_TO_RAND, `a minute read aloud charges R${readMinute.toFixed(2)} against R${(0.18 * USD_TO_RAND).toFixed(2)}`);

  const songMinute = songCost(60) * RAND_PER_CREDIT;
  say(songMinute > 0.16 * USD_TO_RAND, `a minute of music charges R${songMinute.toFixed(2)} against R${(0.16 * USD_TO_RAND).toFixed(2)}`);

  // Dubbing: their automatic dubbing v1 without a watermark is $0.55 a minute,
  // which this covers. Their v2 is $2.46 and this does not — flagged rather
  // than silently assumed, because which one `/v1/dubbing` runs is not
  // knowable from the SDK and only an invoice settles it.
  const dubMinute = dubCost(60) * RAND_PER_CREDIT;
  say(dubMinute > 0.55 * USD_TO_RAND, `a minute dubbed charges R${dubMinute.toFixed(2)} against v1 at R${(0.55 * USD_TO_RAND).toFixed(2)}`);
}

// ── A WAV states its own length ────────────────────────────────────────
// So for the files this app makes itself, nobody's word is taken for it.
{
  const wav = (seconds, rate = 44100, channels = 1) => {
    const bytes = seconds * rate * channels * 2;
    const out = new Uint8Array(44 + Math.min(bytes, 8));
    const view = new DataView(out.buffer);
    const put = (at, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
    put(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); put(8, 'WAVE');
    put(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, rate, true);
    view.setUint32(28, rate * channels * 2, true);
    view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true);
    put(36, 'data'); view.setUint32(40, bytes, true);
    return out;
  };

  say(Math.abs(wavSeconds(wav(180)) - 180) < 0.001, 'three minutes of WAV does not measure three minutes');
  say(Math.abs(wavSeconds(wav(7, 24000)) - 7) < 0.001, 'a 24kHz WAV is misread');
  say(Math.abs(wavSeconds(wav(30, 44100, 2)) - 30) < 0.001, 'a stereo WAV is misread');
  say(wavSeconds(new Uint8Array(20)) === null, 'something too short to be a WAV was read as one');
  say(wavSeconds(new Uint8Array(200)) === null, 'a file with no RIFF header was read as a WAV');

  // A chunk in front of the samples must not be mistaken for them.
  {
    const base = wav(60);
    const withList = new Uint8Array(base.length + 20);
    withList.set(base.slice(0, 36), 0);
    const view = new DataView(withList.buffer);
    const put = (at, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
    put(36, 'LIST'); view.setUint32(40, 12, true);
    put(56, 'data'); view.setUint32(60, 60 * 44100 * 2, true);
    say(Math.abs(wavSeconds(withList) - 60) < 0.001, 'a LIST chunk before the samples throws the length off');
  }
}

if (problems.length) {
  console.error(`perminute: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('perminute: the four by-the-minute jobs cover their upstream cost at an hour, and a WAV is measured from its own header');
