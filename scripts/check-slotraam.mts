/**
 * A clip that has to ARRIVE somewhere: Veo's closing frame.
 *
 * ── What was unused, and for how long ────────────────────────────────────
 *
 * Google's Veo request takes an opening frame and a closing one — `image`
 * and `lastFrame` in the same instance. This app sent the opening frame from
 * the day the call was written and never the closing one, so the field sat
 * unread in a request shape that has always had it.
 *
 * Carli sent a Gemini conversation on 9 October 2026 listing what Google's
 * models do, and *"eerste/laaste raam-instellings"* was in it. That is how it
 * was found: not by anything in this repository noticing.
 *
 * ── Why it is worth a check of its own ───────────────────────────────────
 *
 * Three things here fail silently, which is the whole reason for the file.
 *
 * **A field an endpoint does not read is dropped without a word.** Veo reads
 * `lastFrame` only beside an `image`. Sent alone it goes in the bin and the
 * member pays for a clip that ignores the frame they chose, with nothing
 * anywhere saying why. The same is true of an engine that has no such field
 * at all — ElevenLabs and Kling here. So `suits()` has to refuse both cases,
 * and `endFrame` has to be declared per engine rather than assumed.
 *
 * **Two frames are twice the body.** Each one may be three megabytes and the
 * platform refuses a request past four and a half BEFORE the route runs, as a
 * bare 413 with no sentence in it. A ceiling that passes each frame and then
 * sends both is the exact promise the edge breaks that `check:bodylimit` was
 * written about — so the TOTAL is what is measured.
 *
 * **One text box fills two slots.** The room has one prompt and one Draw
 * button with a switch saying which frame it fills. A draw aimed at the
 * closing frame that edited the opening one would overwrite work with no way
 * to tell why, and nothing would throw.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { PROVIDERS } from '../app/lib/server/video/index.ts';
import { suits, type StartRequest } from '../app/lib/server/video/types.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── Switched on, so `suits()` is answering about the CAPABILITY ─────────

   `suits()` asks `configured()` first, and this machine holds no keys — so
   every engine was refusing every request and the assertions below all read
   as "the capability is off". Green by accident in the other direction too:
   "an engine that reads only the opening frame is NOT offered both" passes
   for free when nothing is offered anything.

   The keys are set to the word test. Nothing here makes a call; what is being
   measured is the routing decision, and the routing decision is the part that
   silently bills for a dropped field. */
for (const name of [
  'GOOGLE_VERTEX_KEY', 'GOOGLE_PROJECT',
  'ELEVENLABS_API_KEY', 'KLINGAI_API_KEY',
]) {
  process.env[name] ||= 'test';
}

const FRAME = { data: 'AAAA', mime: 'image/png' } as const;
const ASK: StartRequest = {
  prompt: 'the door swings open',
  aspect: '16:9',
  seconds: 8,
  speak: false,
};

/* ── 1. Every engine says whether it reads a closing frame ─────────────── */

ok(`every video engine declares endFrame (${PROVIDERS.length})`,
  PROVIDERS.every((one) => typeof one.can.endFrame === 'boolean'),
  'a field an endpoint does not read is dropped in silence, so the member'
  + ' pays for a clip that ends wherever the engine liked');

ok('  and at least one of them does',
  PROVIDERS.some((one) => one.can.endFrame),
  'if none does, the whole capability is off and this check is measuring'
  + ' nothing');

ok('  and only an engine whose own request shape has the field',
  PROVIDERS.filter((one) => one.can.endFrame).every((one) => {
    const source = withoutComments(
      readFileSync(`app/lib/server/video/${one.id.startsWith('google') ? 'google' : one.id}.ts`, 'utf8'),
    );
    return /lastFrame/.test(source);
  }),
  'declaring it true without sending it is the same silence from the other'
  + ' side: the room offers the control and nothing goes on the wire');

/* ── 2. The pair is refused where it cannot work ───────────────────────── */

const takesBoth = PROVIDERS.filter((one) => one.can.startFrame && one.can.endFrame);

ok('an engine that reads both is offered both',
  takesBoth.filter((one) => one.configured()).length > 0
  && takesBoth.filter((one) => one.configured())
    .every((one) => suits(one, { ...ASK, image: FRAME, endImage: FRAME })),
  `${takesBoth.map((one) => one.id).join(', ') || 'none'} — a configured engine`
  + ' that reads the field and is never handed it is the capability still off');

/* ── An engine that reads only the opening frame ─────────────────────────

   Driven with a made-up provider rather than off `PROVIDERS`, and that is
   not a shortcut. Kling was retired on 9 October 2026 and it was the only
   engine with a start frame and no closing one — so there is nothing in the
   live list to test this with, and the first version of the assertion read
   `takesStartOnly.every(...)` over an EMPTY list, which is true for free.
   Green, measuring nothing, and it stayed green with the guard in `suits()`
   deleted.

   The rule outlives the engine: the next engine to arrive with one frame and
   not the other must not be handed a field it drops. `suits()` is a pure
   function, so it is given one. */
const MADE_UP = {
  ...(takesBoth[0] as typeof PROVIDERS[number]),
  id: 'made-up-start-only',
  configured: () => true,
  can: { ...takesBoth[0].can, startFrame: true, endFrame: false },
};

ok('  and an engine that reads only the opening frame is NOT',
  !suits(MADE_UP, { ...ASK, image: FRAME, endImage: FRAME }),
  'handed a closing frame it does not read, it bills for a clip that'
  + ' ignores it — and nothing anywhere says why');

ok('    while the single frame it does read still reaches it',
  suits(MADE_UP, { ...ASK, image: FRAME }),
  'refusing the pair must not refuse the frame that always worked');

ok('a closing frame with no opening frame is refused everywhere',
  PROVIDERS.every((one) => !suits(one, { ...ASK, endImage: FRAME })),
  'Veo reads `lastFrame` only beside an `image`, so alone it is interpolation'
  + ' from nothing — dropped in silence, and paid for');

/* ── 3. What Veo is actually sent ──────────────────────────────────────── */

const google = withoutComments(readFileSync('app/lib/server/video/google.ts', 'utf8'));

/**
 * Veo's provider driven with the network replaced, which is the only way to
 * see what actually went out.
 *
 * Read as source text first, and that was too weak to catch anything: a
 * regex for `request.image && request.endImage` matches just as happily
 * inside `false && request.image && request.endImage`, so disabling the
 * whole spread left the check green. The body is the thing that matters, so
 * the body is what is read.
 */
async function sentBy(provider: typeof PROVIDERS[number], ask: StartRequest): Promise<{
  instance: Record<string, unknown>;
  parameters: Record<string, unknown>;
}> {
  const wasFetch = globalThis.fetch;
  let body: { instances?: Record<string, unknown>[]; parameters?: Record<string, unknown> } = {};
  globalThis.fetch = (async (_where: unknown, how: { body?: string }) => {
    body = JSON.parse(how?.body ?? '{}');
    return { ok: false, status: 503, text: async () => 'stubbed' } as unknown as Response;
  }) as typeof globalThis.fetch;
  try {
    await provider.start(ask);
  } finally {
    globalThis.fetch = wasFetch;
  }
  return { instance: body.instances?.[0] ?? {}, parameters: body.parameters ?? {} };
}

const veo = takesBoth.find((one) => one.configured());
const both = veo ? await sentBy(veo, { ...ASK, image: FRAME, endImage: FRAME }) : null;
const startAlone = veo ? await sentBy(veo, { ...ASK, image: FRAME }) : null;

ok('the closing frame goes on the wire as Veo spells it',
  Boolean(both) && (() => {
    const last = both!.instance.lastFrame as { bytesBase64Encoded?: string } | undefined;
    return last?.bytesBase64Encoded === FRAME.data;
  })(),
  'their field is `lastFrame` with `bytesBase64Encoded` inside it, and a name'
  + ` this app invents is a field Google drops without complaint — sent:`
  + ` ${JSON.stringify(both?.instance ?? null).slice(0, 200)}`);

ok('  beside the opening frame, in the same instance',
  Boolean(both) && (both!.instance.image as { bytesBase64Encoded?: string } | undefined)
    ?.bytesBase64Encoded === FRAME.data,
  'Veo reads both frames per instance; a frame anywhere else is a frame'
  + ' nobody reads');

ok('  and NOT when there is no closing frame to send',
  Boolean(startAlone) && !('lastFrame' in (startAlone!.instance)),
  'an empty or absent field sent anyway is a request shape Google may read'
  + ' differently from one without it, for no gain');

ok('  and the length and ratio stay in parameters, where they belong',
  Boolean(both) && both!.parameters.durationSeconds === ASK.seconds
  && both!.parameters.aspectRatio === ASK.aspect,
  'a frame in `parameters` or a length in the instance is the same mistake'
  + ' in the other direction, and neither throws');

ok('  inside the instance, beside the opening frame, not in parameters',
  (() => {
    const instances = google.indexOf('instances: [{');
    const params = google.indexOf('parameters: {');
    const last = google.indexOf('lastFrame: {');
    return instances >= 0 && params > instances && last > instances && last < params;
  })(),
  'Veo takes both frames per instance and the length and ratio per request —'
  + ' a frame in `parameters` is a frame nobody reads');

/* ── 4. The route counts BOTH frames against one body ──────────────────── */

const route = withoutComments(readFileSync('app/api/video/route.ts', 'utf8'));

ok('the route reads a closing frame at all',
  /readImage\(body\.endImage/.test(route),
  'a browser that sends one and a route that ignores it is the control doing'
  + ' nothing, which is worse than not offering it');

ok('  and measures the two of them TOGETHER against the ceiling',
  /bytesOf\(image\.data\) \+ bytesOf\(endImage\.data\)/.test(route)
  && /both > IMAGE_MAX_BYTES/.test(route),
  'two frames of three megabytes are eight on the wire once base64 has run a'
  + ' third longer, and the platform refuses past four and a half BEFORE this'
  + ' route is reached — a bare 413 with no sentence in it');

ok('  and refuses a closing frame sent on its own, in words',
  /endImage && !image/.test(route) && /An end frame needs a start frame/.test(route),
  'the engines refuse it too, but a 503 naming a grade is not an answer to'
  + ' "why was my frame ignored"');

ok('  and says so when nothing on the grade reads one',
  /one\.can\.endFrame\)\s*$/m.test(route) || /inGrade\.some\(\(one\) => one\.can\.endFrame\)/.test(route),
  'the same sentence the start frame already gets: buy more, wait, or ask for'
  + ' something the engines can do are three different actions');

ok('  and hands it to the engine it picked',
  (route.match(/endImage,/g) ?? []).length >= 2,
  'read, checked, and then not passed on is the commonest way a field dies'
  + ' halfway down a route');

/* ── 5. One box, two slots, and no overwriting ─────────────────────────── */

const editor = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the cutting room has a switch for which frame is being drawn',
  /data-editorshotinto/.test(editor) && /useState<'start' \| 'end'>\('start'\)/.test(editor),
  'two text boxes and two buttons is the same room twice, and nobody finds'
  + ' the second one');

ok('  and the Draw button fills the slot the switch points at',
  /if \(drawInto === 'end'\) setShotEnd\(/.test(editor)
  && /else setShotPic\(/.test(editor),
  'a draw aimed at the closing frame that edited the opening one would'
  + ' overwrite work with no way to tell why, and nothing would throw');

ok('  and a change is made to the frame the switch points at, not always the first',
  /const onBench = drawInto === 'end' \? shotEnd : shotPic;/.test(editor)
  && !/const lead = shotPic \? await imageFrom\(shotPic\)/.test(editor),
  'the picture sent up to be CHANGED has to be the one on the bench, or'
  + ' "make it evening" rewrites the opening frame while she is looking at'
  + ' the closing one');

ok('  and the closing frame is shown, so she can see what she chose',
  /data-editorshotendframe/.test(editor),
  'a frame that is in the request and not on the screen is a thing she'
  + ' cannot check before paying for a clip');

ok('  and can be taken off again',
  /data-editorshotendoff/.test(editor) && /setShotEnd\(null\)/.test(editor),
  'a setting with no way back is a setting somebody is stuck with');

ok('  and taking it off forgets the clip made with it',
  (() => {
    const at = editor.indexOf('data-editorshotendoff');
    return at >= 0 && /setShotReady\(null\)/.test(editor.slice(at, at + 400));
  })(),
  'the clip on offer was made from two frames; with one of them gone it is a'
  + ' clip of something she has just changed');

ok('  and the clip is only ever sent a closing frame beside an opening one',
  /\.\.\.\(shotEnd \? \{ endImage: await smallerFrame\(shotEnd\) \} : \{\}\)/.test(editor)
  && /if \(!shotPic \|\| !words \|\| shotBusy\) return;/.test(editor),
  'the button is already gated on the opening frame, which is what makes the'
  + ' spread above safe — and that gate is asserted here so it cannot quietly'
  + ' go');

ok('  and both frames are shrunk before they travel',
  /image: await smallerFrame\(shotPic\)/.test(editor)
  && /endImage: await smallerFrame\(shotEnd\)/.test(editor)
  && !/endImage: shotEnd\b/.test(editor),
  'the frames she looks at are 2K; two of those as base64 is well past what'
  + ' the platform carries, and the engine renders at its own size anyway');

console.log(bad === 0
  ? '\n  The closing frame: declared, refused where it cannot work, counted, and drawable.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
