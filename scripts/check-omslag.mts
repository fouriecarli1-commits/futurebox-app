/**
 * The album art goes INSIDE the song, and the song still plays.
 *
 * Carli, 9 October 2026: *"Liedjies moet ook kan export saam met hulle Album
 * art."*
 *
 * ── Why this is driven rather than read ──────────────────────────────────
 *
 * Because it writes a binary format by hand, and the way that goes wrong is
 * not an error message. A size field written the wrong way, or a tag put in
 * front of audio that was not an MP3, gives a file that a player opens and
 * reads as a second of noise before the music — or refuses entirely, with
 * nothing anywhere saying why.
 *
 * So every assertion below takes the bytes apart again and checks what is
 * actually in them.
 *
 * ── And the one that is not about bytes ──────────────────────────────────
 *
 * That the three screens which hand somebody a song all go through the one
 * helper. Three call sites each guessing the extension is how this started,
 * and it is how the next screen would quietly ship without the art.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { isMp3, withCover } from '../app/lib/id3.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** A believable MP3: a frame sync and some bytes behind it. */
const AUDIO = new Uint8Array([0xff, 0xfb, 0x90, 0x00, ...new Array(200).fill(0x41)]);
const ART = { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...new Array(500).fill(7)]), mime: 'image/png' };

const bytesOf = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await blob.arrayBuffer());

/* ── 1. Is it even an MP3 ──────────────────────────────────────────────── */

ok('a frame sync reads as an MP3', isMp3(AUDIO));
ok('  and so does a file that already has a tag',
  isMp3(new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 10])));
ok('  and a WAV does not',
  !isMp3(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4])),
  'a tag put in front of a WAV is a second of noise before the music');

ok('a WAV is handed back untouched rather than tagged',
  await (async () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, ...new Array(50).fill(3)]);
    const out = await bytesOf(withCover(wav, ART, { title: 'X' }));
    return out.length === wav.length;
  })(),
  'WAV has no standard place for a picture, so the audio is left alone and'
  + ' `songfile.ts` hands the cover over beside it');

/* ── 2. The tag is where a reader looks for it ─────────────────────────── */

const made = await bytesOf(withCover(AUDIO, ART, { title: 'Môre', artist: 'Carli' }));

ok('the file starts with ID3',
  made[0] === 0x49 && made[1] === 0x44 && made[2] === 0x33);

ok('  and says version 2.3, which is what players actually read',
  made[3] === 3 && made[4] === 0,
  `${made[3]}.${made[4]} — v2.4's synchsafe frame sizes are the thing older`
  + ' readers get wrong, and the failure is art nothing displays');

ok('  and the tag size is synchsafe, so no byte of it can look like audio',
  made[6] < 0x80 && made[7] < 0x80 && made[8] < 0x80 && made[9] < 0x80,
  'a size byte with the top bit set is a byte a decoder can mistake for a'
  + ' frame sync, which is the whole reason the format has this rule');

ok('  and the size it declares is the size that is there',
  (() => {
    const says = ((made[6] & 0x7f) << 21) | ((made[7] & 0x7f) << 14)
      | ((made[8] & 0x7f) << 7) | (made[9] & 0x7f);
    return 10 + says + AUDIO.length === made.length;
  })(),
  'a tag whose declared length is wrong leaves a reader inside the audio or'
  + ' short of it, and either way the song is damaged');

/* ── 3. The audio is untouched ─────────────────────────────────────────── */

ok('every byte of the original audio is still there, in order',
  (() => {
    const at = made.length - AUDIO.length;
    for (let i = 0; i < AUDIO.length; i += 1) if (made[at + i] !== AUDIO[i]) return false;
    return true;
  })(),
  'nothing is re-encoded and nothing is lost: the tag goes in front and the'
  + ' song that comes out is the song that went in');

/* ── 4. The picture frame ──────────────────────────────────────────────── */

const text = Buffer.from(made).toString('latin1');

ok('there is an APIC frame', text.includes('APIC'));

ok('  and it says it is the FRONT cover',
  (() => {
    const at = text.indexOf('APIC');
    /* id(4) size(4) flags(2) encoding(1) then the mime, a zero, then the
       picture type. 3 is front cover; anything else is a back cover or a
       booklet page, which players do not show. */
    const mimeAt = at + 11;
    const end = text.indexOf('\u0000', mimeAt);
    return made[end + 1] === 0x03;
  })(),
  'type 3 is the one every player looks for. A cover filed as a back cover'
  + ' is a cover nothing displays');

ok('  and the picture bytes are in it',
  (() => {
    const at = text.indexOf('APIC');
    const size = (made[at + 4] << 24) | (made[at + 5] << 16) | (made[at + 6] << 8) | made[at + 7];
    return size > ART.bytes.length && size < ART.bytes.length + 64;
  })(),
  'the frame size must cover the picture and its little header and nothing'
  + ' else');

ok('  and the mime is carried rather than assumed',
  text.includes('image/png'),
  'a picture declared PNG and sent as JPEG is a frame some players skip in'
  + ' silence');

/* ── 5. Afrikaans survives the title ───────────────────────────────────── */

ok('a title with an ô in it is written as UTF-16, not Latin-1',
  (() => {
    const at = text.indexOf('TIT2');
    /* encoding byte 1 means UTF-16, and ff fe is the byte-order mark. */
    return made[at + 10] === 0x01 && made[at + 11] === 0xff && made[at + 12] === 0xfe;
  })(),
  '"Môre" written as Latin-1 arrives in a player as "MÃ´re", and this app’s'
  + ' songs are Afrikaans more often than not');

/* ── 6. Tagging twice does not stack ───────────────────────────────────── */

ok('a song tagged twice carries one tag, not two',
  await (async () => {
    const again = await bytesOf(withCover(made, ART, { title: 'Môre' }));
    return Buffer.from(again).toString('latin1').split('ID3').length === 2;
  })(),
  'a reader that takes the first tag would show the older art for ever');

/* ── 7. And the screens all go through the one door ────────────────────── */

for (const screen of ['Channel', 'ShareRow', 'MakeMusic']) {
  const source = withoutComments(readFileSync(`app/components/${screen}.tsx`, 'utf8'));
  ok(`${screen} hands a song over through saveSong`,
    /saveSong\(/.test(source) && !/downloadBlob\([a-z]*(audio|blob)\b/i.test(source),
    'three call sites each guessing the extension is how this started, and'
    + ' it is how the next screen ships without the art');
}

console.log(bad === 0
  ? '\ncheck:omslag — the cover goes inside the song as a front-cover APIC in a'
  + ' v2.3 tag, the audio comes through byte for byte, an Afrikaans title'
  + ' survives, tagging twice leaves one tag, and all three screens hand a'
  + ' song over the same way.'
  : `\ncheck:omslag — ${bad} assertion(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
