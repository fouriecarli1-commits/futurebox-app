/**
 * The same performance, sung by a model built for singing.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * `/api/voice/change` is speech to speech. It is reliable on a spoken lane
 * and a gamble on a sung one, the Pro Booth says so on the button, and §9 of
 * `docs/DIENSTE-EN-KOSTE.md` has called that the one thing the app promises
 * and cannot deliver. This is the other engine: Kits.AI, RVC, models trained
 * on one singer. `lib/server/kits.ts` carries the wire format and, more
 * importantly, which half of it is known and which half is inferred.
 *
 * ── Everything else is the same as its sibling, on purpose ───────────────
 *
 * A key, never a URL, for anything over the platform's body limit — a lane is
 * a WAV, so fifty seconds is the wall and every real take is past it. Charged
 * by the minute, before the work, refunded when the work fails. Nothing about
 * whose file it is is taken from the form.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { configured, convert, namedModels, safeModelId, PHONE_CLEANUP, cleanupFrom, polishFrom } from '@/app/lib/server/kits';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS, perMinute } from '@/app/lib/credits';
import { billedSeconds } from '@/app/lib/server/audiolen';
import { charge } from '@/app/lib/server/credits';
import { audioFrom, dropWork } from '@/app/lib/server/workfile';
import { downloadSeconds, enough, note } from '@/app/lib/server/kitsminutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A conversion takes roughly as long as the audio does, and then some. */
export const maxDuration = 300;

/** Leaves the last forty seconds of the function for fetching the file back. */
const WAIT_MS = 260_000;

/** About ten minutes of mp3. Past this something is wrong with the request. */
const MAX_BYTES = 25 * 1024 * 1024;
/**
 * The longest piece this route will charge for.
 *
 * A ceiling rather than a refusal, for the same reason as everywhere else: a
 * length the browser reports could be wrong, and this bounds what a wrong one
 * can cost. Shorter than its sibling's thirty minutes because the wait above
 * is the real limit — a twenty-minute take cannot finish inside the function
 * whatever the billing says, and charging for one that cannot is the worst of
 * the options.
 */
const MAX_SECONDS = 10 * 60;

export async function POST(request: Request): Promise<Response> {
  /* A retry loop is stopped here, before anything is charged or asked for.
     `GENERATION` explains what these numbers are chosen against: not a
     person, but how fast one address could eat the month's allowance
     before the warning at half of it has time to arrive. */
  const flood = refuseIfTooMany('voice-sing', request, GENERATION);
  if (flood) return flood;

  if (!configured()) {
    return Response.json(
      { message: 'Singing in your own voice is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: 'Could not read the recording.' }, { status: 400 });
  }

  /* Either the audio itself, or a key to a file the browser already put in its
     own folder in storage — checked against the folder of whoever's token
     signed this request. Never a URL. */
  const got = await audioFrom(form, request, 'audio');
  if ('problem' in got) return got.problem;
  const { audio, owner: workOwner } = got;

  /* Done with the scratch file the moment the bytes are in hand. */
  if (workOwner) void dropWork(got.key, workOwner, 'wav');

  if (audio.size > MAX_BYTES) {
    return Response.json({ message: 'That take is too long to sing here.' }, { status: 413 });
  }

  /* Which trained voice. Digits only, and either one she named in the
     environment or one she typed in the room — the room remembers it locally
     because this app cannot list her models (see `namedModels`). */
  const wanted = safeModelId(form.get('voiceModelId')) ?? safeModelId(namedModels()[0]?.id);
  if (!wanted) {
    return Response.json(
      {
        message:
          'No singing voice has been chosen. Open a voice model on kits.ai and put its number in here.',
      },
      { status: 400 },
    );
  }

  /* The same plan rule as changing a voice over the speech model — written so
     that a deployment with metering switched off blocks nobody, rather than
     reading a signed-out caller as a free one and refusing everybody. */
  const caller = metered() ? await callerFrom(request) : null;
  if (metered() && !PODCAST_CAPS[caller?.tier ?? 'free'].clean) {
    return Response.json(
      { message: 'Singing a take in another voice needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  const billed = await billedSeconds(audio, Number(form.get('seconds')), MAX_SECONDS);

  /* Kits' plan has a roof of 400 download minutes a month, and this app spends
     one of them for every minute it hands back. The check goes here, before the
     credits are taken: a member turned away by a ceiling they cannot see should
     not also have paid for the turn. `kitsminutes.ts` carries the arithmetic
     and why it errs towards stopping early. */
  /* One file comes back from a conversion — the voice, or the mix, never
     both — so what is downloaded is one take's length. Said through
     `downloadSeconds` rather than left implicit, because the route beside
     this one downloads two and the difference is the whole point of that
     function. */
  const spend = downloadSeconds(billed, 1);
  /* The member's own share as well as the workspace's.

     Without the owner, `enough` only checks Kits' roof — which one member can
     empty on their own, leaving everybody else with a refusal in a room that
     worked yesterday. Five minutes each is the cap; see `minutesEach`. */
  const room = await enough(spend, caller?.id ?? null);
  if (room) {
    /* The code as well as the sentence, so `lib/apierror.ts` can say it in
       Afrikaans — and so "you are out" and "everybody is out" stay different
       answers on the screen as well as in here. */
    return Response.json(
      { error: room.code, message: room.message, left: room.left },
      { status: 429 },
    );
  }

  const paid = await charge(request, perMinute(billed, CREDITS.sing), 'sing');
  if (!paid.ok) return paid.response;

  /* Whether the music comes back with the voice.

     A whole song sent from Library or from a finished make wants the music
     back — that is what "sing this in my voice" means to the person pressing
     it. A lane in the Pro Booth wants only the voice, because the music is
     already on its own lanes and sending it back would double it.

     Kits returns both files and this used to take whichever their JSON
     happened to list first. The caller says now, and anything that does not
     say gets the bare voice, which is the safer of the two to be wrong
     about: an acapella can be put back over the music here, and a mix cannot
     be taken apart. */
  const want = form.get('want') === 'mix' ? 'mix' : 'voice';

  /* How many semitones to move the take before the model sings it.

     The one dial worth exposing today. A man singing through a voice trained
     on a woman is an octave out and sounds like a fault rather than a voice,
     and twelve semitones is that octave. Their range is -24 to 24 and the
     library clamps to it; a form that sends nothing gets Kits' own default. */
  const shift = Number(form.get('pitchShift'));

  /* ── The rest of the desk, which nothing could reach ──────────────────
 
     `Dials`, `Cleanup` and `Polish` have been in `lib/server/kits.ts` since
     they were written down, and `startConversion` has always sent all of
     them. This route read one field. `conversionStrength`, `modelVolumeMix`
     and both sets of effects were supported end to end and reachable by
     nothing — which is the same shape of fault as a button behind a bar.
 
     Carli: "Daar moet ook 'n mixer setting wees vir die stemme wat gebruik
     word wat 'n conversion slider het, 'n dynamic slider (model volume), pre
     en post processing effects om te hoor wat klink die beste."
 
     A ratio that is not a number is left out rather than defaulted: an
     omitted field is Kits' to choose, and a number this app invented is a
     number nobody tuned. */
  const ratio = (name: string): number | undefined => {
    const said = Number(form.get(name));
    return Number.isFinite(said) && said >= 0 && said <= 1 ? said : undefined;
  };
  const strength = ratio('conversionStrength');
  const modelVolume = ratio('modelVolumeMix');

  const dials = {
    ...(Number.isFinite(shift) && shift !== 0 ? { pitchShift: shift } : {}),
    ...(strength === undefined ? {} : { conversionStrength: strength }),
    ...(modelVolume === undefined ? {} : { modelVolumeMix: modelVolume }),
  };

  /* Names, not numbers. A gate is four numbers and a browser that could send
     them could send a threshold of +40 dB; the shapes live on the server and
     the wire carries what to switch on. An absent field keeps the tuned
     default for a phone take, which is what most of these are. */
  const named = (name: string): string[] =>
    String(form.get(name) ?? '').split(',').map((one) => one.trim()).filter(Boolean);
  const asked = form.has('pre') ? cleanupFrom(named('pre')) : PHONE_CLEANUP;
  const after = form.has('post') ? polishFrom(named('post')) : null;

  const done = await convert(
    wanted, audio, 'take.wav', Date.now() + WAIT_MS, want, dials, asked, after,
  );
  if (!done.ok) {
    await paid.refund();
    return Response.json({ message: done.message }, { status: done.status });
  }

  /* Written down only once the audio is actually in hand, because the minutes
     burn on download and a conversion that failed downloaded nothing. Not
     awaited: the member's file is ready and the bookkeeping must not hold it. */
  void note(spend, 'sing', caller?.id);

  return new Response(done.audio, {
    headers: { 'Content-Type': done.type, 'Cache-Control': 'no-store' },
  });
}
