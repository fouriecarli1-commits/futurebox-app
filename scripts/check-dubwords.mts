/**
 * A dub already carries its own transcript, and we never asked for it.
 *
 * ── What was being paid for twice ────────────────────────────────────────
 *
 *   GET /v1/dubbing/{id}/transcript/{language}?format_type=json|srt|webvtt
 *
 * `json` gives utterances with a speaker and a start and end, and inside each
 * one the words with their own. `srt` gives a finished subtitle file. Both are
 * included in a dub that has already been paid for.
 *
 * `dubbed()` fetched the audio and nothing else, so every dub anybody has made
 * on this app has had word-level timings — in both languages — sitting unread
 * on ElevenLabs' side, while the timing ladder went off and paid to transcribe
 * the result back.
 *
 * ── The two properties worth holding ─────────────────────────────────────
 *
 * **The ownership check is not duplicated.** The transcript is served off the
 * same GET as the audio, after the same four lines that establish the dub
 * belongs to the caller. A second route would be a second copy of that check,
 * and a second copy is the one that drifts.
 *
 * **`/api/translate` stays.** It is careful work — it holds the line count on
 * the way back, because a subtitle one line out is worse than none — and it is
 * the right answer for a SONG, where this app owns the words and there is no
 * dub to ask. Only a dubbed episode gets the dub's transcript instead. A
 * commit that deletes the translate route to "simplify" this would be
 * replacing a general answer with a special one.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'FAIL'} ${what}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const eleven = readFileSync('app/lib/server/eleven.ts', 'utf8');
const route = readFileSync('app/api/dub/route.ts', 'utf8');

/* ── It is asked for at all ────────────────────────────────────────────── */
ok('the transcript endpoint is called', /dubbing\/\$\{encodeURIComponent\(id\)\}\/transcript\//.test(eleven));
ok('as json, for the word timings', /format_type=json/.test(eleven));
ok('and as srt, for a file somebody can upload with their episode',
  /format_type=\$\{format\}/.test(eleven) && /'srt' \| 'webvtt'/.test(eleven));

/* ── A shape it cannot read is not an empty episode ────────────────────── */
ok('an unreadable transcript says so rather than answering with no words',
  /has no transcript this app could read/.test(eleven),
  'an empty list for a dub that exists is a shape problem, not a silent episode');
ok('and an empty subtitle file does the same', /empty subtitle file/.test(eleven));
ok('both utterance shapes are read rather than one being assumed',
  /Array\.isArray\(body\)[\s\S]{0,200}utterances/.test(eleven));

/* ── Served off the same ownership check ───────────────────────────────── */
ok('the transcript is on the dub route, not a second one',
  /dubTranscript\(id, want\)/.test(route));
ok('and it is served after the check that the dub is theirs',
  route.indexOf('That dub is not yours') < route.indexOf('dubTranscript(id, want)'),
  'a transcript is the episode’s words; it must not outrun the ownership check');
ok('the audio collect is unchanged, so callers written before today still work',
  /collect === '1'/.test(route));
ok('the language is the dub’s own or the literal source, never anything asked for',
  /asked === 'source' \? 'source' : row\?\.target_lang/.test(route),
  'a free-text language would point this at another dub’s track');
ok('and it says the transcript costs nothing extra',
  /cost: 'none'/.test(route));

/* ── The general answer is not replaced by the special one ─────────────── */
let translate = '';
try {
  translate = readFileSync('app/api/translate/route.ts', 'utf8');
} catch {
  translate = '';
}
ok('/api/translate still exists, for songs, which have no dub to ask',
  translate.length > 0,
  'the dub transcript answers for a dubbed episode and for nothing else');
ok('and it still holds the line count, which is what made it careful',
  /line count|count is asserted/.test(translate));

console.log(
  failures
    ? `\ncheck:dubwords — ${failures} wrong.`
    : '\ncheck:dubwords — a dub’s own transcript is read rather than paid for twice, behind the same ownership check.',
);
process.exit(failures ? 1 : 0);
