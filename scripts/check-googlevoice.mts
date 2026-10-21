/**
 * When ElevenLabs cannot, Google reads aloud and writes down — and only then.
 *
 * The owner, 21 October 2026: *"Ja, bou die Google rugsteun vir stem en
 * transkripsie."* `lib/server/googlevoice.ts` is the backup; `/api/voice/speak`
 * and `/api/transcribe` decide when to use it. This runs both real routes
 * against fake suppliers and checks the decisions: busy and unreachable fall
 * back, a refusal does not, a healthy ElevenLabs is never bypassed, and what
 * comes back is a file a player opens.
 */
process.env.ELEVENLABS_API_KEY = 'test-key';
process.env.GOOGLE_VERTEX_KEY = 'test-google';
process.env.GOOGLE_PROJECT = 'test-project';

const voice = await import('../app/lib/server/googlevoice.ts');

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

/* ── The pieces that need no network ─────────────────────────────────── */

const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} is here, and it says a little more than nothing.`).join(' ');
const pieces = voice.piecesOf(long);
ok('a long script is cut into pieces no longer than a piece', pieces.length > 1 && pieces.every((one) => one.length <= 1200), `${pieces.map((one) => one.length).join(',')}`);
ok('nothing is lost or doubled in the cutting', pieces.join(' ').replace(/\s+/g, ' ') === long.replace(/\s+/g, ' '));
ok('a cut falls where a sentence ends', pieces.slice(0, -1).every((one) => /[.!?…]["')\]]*$/.test(one)));
const unbroken = 'word '.repeat(600).trim();
ok('one endless sentence is still cut, at a space', voice.piecesOf(unbroken).every((one) => one.length <= 1200 && !/^\S*word\S+word/.test(one)));

const wav = new Uint8Array(voice.wavOf(new Uint8Array(4800), 24000));
const text = (from: number, to: number) => String.fromCharCode(...wav.slice(from, to));
ok('the read is a WAV a player opens', text(0, 4) === 'RIFF' && text(8, 12) === 'WAVE' && text(36, 40) === 'data' && wav.length === 44 + 4800);

const words = voice.wordsFromSegments([
  { start: 1, end: 3, text: 'Ek sing vir jou' },
  { start: 4, end: 5, text: 'vannag', speaker: 'speaker_1' },
]);
ok('every word of a phrase gets a time inside that phrase', words.length === 5 && words[0].start === 1 && words[3].end === 3 && words.every((one) => one.end > one.start));
ok('words keep their order', words.every((one, i) => i === 0 || one.start >= words[i - 1].end - 1e-9));
ok('a speaker stays on the words that were theirs', words[4].speaker === 'speaker_1' && !words[0].speaker);

const segs = voice.segmentsIn({ candidates: [{ content: { parts: [{ text: '```json\n{"segments":[{"start":"0:01.5","end":2.5,"text":"hallo"}]}\n```' }] } }] });
ok('phrases are read out of a fenced answer, and a clock time is seconds', segs?.length === 1 && segs[0].start === 1.5 && segs[0].end === 2.5);

ok('a woman\'s stock voice is answered by a woman\'s', ['Kore', 'Aoede'].includes(voice.voiceFor('abc', 'american, young, female, narration')));
ok('a man\'s by a man\'s', ['Charon', 'Puck'].includes(voice.voiceFor('abc', 'british, old, male')));
ok('the same stock voice always gets the same stand-in', voice.voiceFor('xyz', 'female') === voice.voiceFor('xyz', 'female'));
ok('busy, broken and unanswered fall back; a refusal does not', voice.fallsBack(429) && voice.fallsBack(503) && voice.fallsBack(0) && !voice.fallsBack(401) && !voice.fallsBack(422));

/* ── The routes, against fake suppliers ──────────────────────────────── */

type Eleven = 'fine' | 'busy' | 'gone' | 'refuses';
let eleven: Eleven = 'fine';
let askedGoogle = 0;
let askedElevenSpeak = 0;
const pcm = Buffer.alloc(2400).toString('base64');

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('elevenlabs.io')) {
    if (/\/voices/.test(url)) {
      return Response.json({ voices: [{ voice_id: 'stock1', name: 'Stock', category: 'premade', labels: { gender: 'female' } }], has_more: false });
    }
    if (/\/models/.test(url)) return Response.json([]);
    if (/\/user|subscription/.test(url)) return Response.json({ character_count: 10, character_limit: 100000 });
    if (/text-to-speech|speech-to-text/.test(url)) askedElevenSpeak += 1;
    if (eleven === 'gone') throw new TypeError('fetch failed');
    if (eleven === 'busy') {
      return new Response(JSON.stringify({ detail: { status: 'too_many_concurrent_requests', message: 'busy' } }), { status: 429, headers: { 'retry-after': '0.01' } });
    }
    if (eleven === 'refuses') return new Response(JSON.stringify({ detail: { message: 'bad key' } }), { status: 401 });
    if (/speech-to-text/.test(url)) {
      return Response.json({ text: 'theirs', words: [{ text: 'theirs', start: 0, end: 1, type: 'word' }] });
    }
    return new Response(new Uint8Array([0xff, 0xfb, 1, 2]), { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
  }
  if (url.includes('aiplatform.googleapis.com')) {
    const body = JSON.parse(String(init?.body ?? '{}'));
    /* Counted only when it is asked to read or to listen — the safety screen
       asks Gemini about the script too, and that is not a backup. */
    const parts = JSON.stringify(body.contents ?? []);
    if (body.generationConfig?.responseModalities?.includes('AUDIO') || parts.includes('inlineData')) askedGoogle += 1;
    if (body.generationConfig?.responseModalities?.includes('AUDIO')) {
      return Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm } }] } }] });
    }
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ segments: [{ start: 0.5, end: 2, text: 'ek sing' }] }) }] } }] });
  }
  return Response.json({});
}) as typeof fetch;

const { POST: speakRoute } = await import('../app/api/voice/speak/route.ts');
const { POST: hearRoute } = await import('../app/api/transcribe/route.ts');

const speak = (timings = false) => speakRoute(new Request('http://localhost/api/voice/speak', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` },
  body: JSON.stringify({ voiceId: 'stock1', text: 'Hallo daar, dit is net ’n toets.', language: 'af', ...(timings ? { timings: true } : {}) }),
}));

const hear = () => {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(2000)], { type: 'audio/wav' }), 'take.wav');
  form.append('seconds', '3');
  return hearRoute(new Request('http://localhost/api/transcribe', {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.0.1.${Math.floor(Math.random() * 250)}` },
    body: form,
  }));
};

eleven = 'fine'; askedGoogle = 0;
let got = await speak();
ok('a healthy ElevenLabs reads it, and Google is not asked', got.status === 200 && got.headers.get('X-Read-Engine') !== 'backup' && askedGoogle === 0, `status ${got.status}, google ${askedGoogle}`);

eleven = 'busy'; askedGoogle = 0;
got = await speak();
let bytes = new Uint8Array(await got.arrayBuffer());
ok('busy: Google reads it, as a WAV, and says so', got.status === 200 && got.headers.get('X-Read-Engine') === 'backup'
  && got.headers.get('Content-Type') === 'audio/wav' && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && askedGoogle > 0, `status ${got.status}`);

eleven = 'gone'; askedGoogle = 0;
got = await speak();
ok('unreachable: Google reads it, instead of a bare 500 with the credits kept', got.status === 200 && got.headers.get('X-Read-Engine') === 'backup', `status ${got.status}`);

eleven = 'busy';
got = await speak(true);
const timed = (await got.json()) as { engine?: string; type?: string; words?: unknown; why?: string };
ok('busy, timed read: audio with no timings, and the reason said', got.status === 200 && timed.engine === 'backup' && timed.type === 'audio/wav' && timed.words === null && !!timed.why);

eleven = 'refuses'; askedGoogle = 0;
got = await speak();
ok('a refusal is not handed to Google', got.status !== 200 && askedGoogle === 0, `status ${got.status}, google ${askedGoogle}`);

eleven = 'busy'; askedGoogle = 0;
let heard = await hear();
const back = (await heard.json()) as { engine?: string; words?: Array<{ start: number; end: number }>; text?: string };
ok('busy transcription: Google listens, with a time on every word', heard.status === 200 && back.engine === 'backup' && back.text === 'ek sing'
  && back.words?.length === 2 && back.words[0].start === 0.5 && back.words[1].end === 2, `status ${heard.status} ${JSON.stringify(back).slice(0, 120)}`);

eleven = 'fine'; askedGoogle = 0;
heard = await hear();
const theirs = (await heard.json()) as { engine?: string; text?: string };
ok('a healthy ElevenLabs transcribes, and Google is not asked', heard.status === 200 && theirs.engine !== 'backup' && theirs.text === 'theirs' && askedGoogle === 0);

/* ── A child's story page: /api/kids/read ────────────────────────────── */

const { POST: kidsRead } = await import('../app/api/kids/read/route.ts');
const page = () => kidsRead(new Request('http://localhost/api/kids/read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.0.2.${Math.floor(Math.random() * 250)}` },
  body: JSON.stringify({ lang: 'af', lines: [{ who: 'owl', text: 'Eendag, lank gelede...' }, { who: 'pip', text: '[giggles] Kom ons gaan!' }] }),
}));
const voicesAsked: string[] = [];
const was = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const body = String(init?.body ?? '');
  const named = /"voiceName":"([A-Za-z]+)"/.exec(body);
  if (named) voicesAsked.push(named[1]);
  if (/giggles/.test(body) && String(input).includes('aiplatform')) voicesAsked.push('READ-THE-TAG');
  return was(input, init);
}) as typeof fetch;
eleven = 'busy'; voicesAsked.length = 0;
let story = await page();
ok('busy: a child\'s page is read by Google, not left silent', story.status === 200 && story.headers.get('X-Read-Engine') === 'backup'
  && story.headers.get('Content-Type') === 'audio/wav', `status ${story.status}`);
ok('each persona keeps its own voice, and a stage direction is not read out', voicesAsked.includes('Charon') && voicesAsked.includes('Puck') && !voicesAsked.includes('READ-THE-TAG'), voicesAsked.join(','));
eleven = 'fine'; voicesAsked.length = 0;
story = await page();
ok('a healthy ElevenLabs reads the page, and Google is not asked', story.status === 200 && story.headers.get('X-Read-Engine') !== 'backup' && !voicesAsked.length, `status ${story.status} ${voicesAsked.join(',')}`);
globalThis.fetch = was;

/* ── The owner's test button: /google → /api/google/voicetest ─────────── */

process.env.POST_SECRET = 'a-test-secret';
const { POST: testRoute } = await import('../app/api/google/voicetest/route.ts');
const test = (text: string, secret = 'a-test-secret') => testRoute(new Request('http://localhost/api/google/voicetest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
  body: JSON.stringify({ text, language: 'af', voice: 'Charon' }),
}));

let tested = await test('Goeiemôre, hier is jou liedjie.', 'wrong');
ok('the test button is the owner\'s alone', tested.status === 404);
tested = await test('Goeiemôre, hier is jou liedjie.');
const read = (await tested.json()) as { audio?: string; voice?: string; heard?: string | null };
ok('the owner hears the backup voice, and sees what it heard', tested.status === 200 && !!read.audio && read.voice === 'Charon' && read.heard === 'ek sing',
  `status ${tested.status} ${JSON.stringify(read).slice(0, 120)}`);
tested = await test('a'.repeat(401));
ok('a test is a line, not a podcast', tested.status === 413);

delete process.env.GOOGLE_VERTEX_KEY;
eleven = 'busy';
got = await speak();
ok('no Google key: busy is said as busy, not a crash', got.status >= 400 && got.status < 600 && got.status !== 500, `status ${got.status}`);

if (failures) {
  console.error(`\ncheck:googlevoice — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:googlevoice — Google stands in when ElevenLabs cannot, and only then.');
