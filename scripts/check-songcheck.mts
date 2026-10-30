/**
 * The check on brought-in songs (`app/api/songcheck`, `lib/songcheck.ts`).
 *
 * The owner, 30 October 2026: *"Het google nie 'n produk wat ons kan gebruik om
 * te check vir plagiaat nie. As mense songs kan in bring kan dit legal issues
 * veroorsaak."* Held here: only a short piece goes, the key stays on the
 * server, nothing is charged, the company that hears it is named on the
 * privacy page, and what it found is said where it matters, on the song and
 * before a film with it goes out, without claiming more than it knows.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const route = withoutComments(readFileSync('app/api/songcheck/route.ts', 'utf8'));
const lib = withoutComments(readFileSync('app/lib/songcheck.ts', 'utf8'));
const channel = withoutComments(readFileSync('app/components/Channel.tsx', 'utf8'));
const editor = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const privacy = readFileSync('app/privacy/page.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

ok('the key is read on the server and nowhere else', /process\.env\.AUDD_API_TOKEN/.test(route) && !/AUDD/.test(lib + channel + editor));
ok('  and with no key the answer is "unchecked", which holds nothing up', /if \(!token\) return Response\.json\(\{ state: 'unchecked'/.test(route));
ok('a member must be signed in, and a flood is stopped', /callerFrom\(request\)/.test(route) && /refuseIfTooMany\('songcheck'/.test(route));
ok('nothing is charged', !/charge\(/.test(route));
ok('only a short piece is taken: twenty seconds, one channel, 16 kHz', /PIECE_SECONDS = 20/.test(lib) && /RATE = 16000/.test(lib) && /new OfflineAudioContext\(1,/.test(lib));
ok('  and the server refuses anything bigger than that could be', /MOST_BYTES = 2_000_000/.test(route) && /piece\.size > MOST_BYTES/.test(route));
ok('  and no file name or account goes with it', /ask\.set\('file', piece, 'piece\.wav'\)/.test(route) && !/caller\.(id|email)/.test(route.slice(route.indexOf('const ask'))));
ok('a found record is said by its name, nothing found is not called "yours"',
  /state: 'matched', match/.test(route) && /return Response\.json\(\{ state: 'clear' \}\)/.test(route)
  && /"chan\.checkClear": \{ en: "Checked: not a known record"/.test(words));
ok('AudD is named on the privacy page, and what it hears', /<strong className="text-white">AudD<\/strong>/.test(privacy) && /twenty seconds/.test(privacy));
ok('every brought-in song on the channel is checked, once, and the card says what was found',
  /checkSong\(id, audio\)/.test(channel) && /data-songcheck="matched"/.test(channel) && /songCheckOf\(id\)/.test(channel));
ok('a film with a matched song under it says so before it goes out', /checkSong\(id, edit\.under\)/.test(editor) && /data-editorbedmatched/.test(editor));

if (bad) {
  console.error(`\ncheck:songcheck — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:songcheck — a short piece of a brought-in song is heard, at no charge, by a company the privacy page names, and what it found is said on the song and before the film goes out.');
