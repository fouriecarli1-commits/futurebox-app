/**
 * A presenter who says your script.
 *
 * ── What it is ───────────────────────────────────────────────────────────
 *
 * A picture of a person and a recording of a voice, handed to
 * `creatify-aurora` on the same ElevenLabs broker the video desk already
 * uses, which animates the mouth to the sound. See
 * `docs/TALKING_PRESENTER.md` for how that was established — off the SDK's
 * serializers, not a docs page.
 *
 * The two inputs are things this app already makes: a cast member and a read
 * from the voice studio. It is the third use of both rather than a new
 * integration.
 *
 * ── Why it speaks Afrikaans ──────────────────────────────────────────────
 *
 * Because it is never asked to know any language. It is handed audio, and
 * whatever language that audio is in is what comes out of the presenter's
 * mouth. Every other route to a talking presenter — Kling's `text2video`
 * lip-sync among them — takes a script and a language code, and those lists
 * are English, Chinese and a handful more.
 *
 * ── Why the script is screened even though nothing generates it ──────────
 *
 * This is the single most abusable thing in the app. A face that is not
 * yours, saying words it never said, in a voice that sounds right, is what
 * the terms call "a script for defrauding somebody — including anything read
 * in the name of a bank, an insurer or an authority", and it is the one
 * failure that would end this studio rather than embarrass it.
 *
 * So the words go through `guard` before anything is charged or started, the
 * same screen the video desk's prompt goes through. It costs one call and it
 * is the cheapest insurance here.
 *
 * The picture is covered from the other side: a cast member is a file the
 * account uploaded to its own private folder, and `ownedPath` will not let a
 * row claim anybody else's. That is not consent — nothing here can know
 * whether the person in a photograph agreed — which is why the panel asks and
 * the terms say what happens when the answer was a lie.
 *
 * ── The poll is the video desk's ─────────────────────────────────────────
 *
 * Everything after starting — running, failed, refunded, downloaded, kept,
 * signed — is identical whatever made the clip, so a row lands in `videos`
 * with `provider: 'aurora'` and `GET /api/video?id=…` carries it the rest of
 * the way. Only "who do I ask how it is going" differs, and that is two lines
 * there rather than a second copy of all of it here.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';
import { presenterCost } from '@/app/lib/credits';
import { TIER_SPECS } from '@/app/lib/plans';
import {
  PRESENTER_AUDIO_MIMES,
  PRESENTER_IMAGE_MIMES,
  PRESENTER_MAX_BYTES,
  presenterReady,
  startPresenter,
  type PresenterQuality,
} from '@/app/lib/server/video';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Starting is a POST that returns a task id; the waiting happens on the poll. */
export const maxDuration = 120;

interface Body {
  /** A data URL — the cast member's picture, or one attached on the spot. */
  image?: unknown;
  /** A data URL — what the voice studio read. */
  audio?: unknown;
  /** The words in the audio, for the screen. Not sent to the engine. */
  script?: unknown;
  quality?: unknown;
  /** How long the reading is, which is how long the clip will be. */
  seconds?: unknown;
  /** They have said the face is theirs, or that they have permission. */
  consent?: unknown;
}

/**
 * A data URL taken apart on the server.
 *
 * The mime is read out of the URL itself rather than trusted from a field
 * beside it: the route has to know what it is sending before it sends it, and
 * a check that re-reads a string the browser wrote alongside is a check
 * waiting to be fooled. Same rule as `readImage` on the video route.
 */
function readMedia(
  value: unknown,
  allowed: readonly string[],
): { data: string; mime: string } | null {
  if (typeof value !== 'string') return null;
  const match = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  if (allowed.indexOf(mime) === -1) return null;
  // Base64 is four characters per three bytes; this is the decoded size.
  if (Math.floor((match[2].length * 3) / 4) > PRESENTER_MAX_BYTES) return null;
  return { data: match[2], mime };
}

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  if (!presenterReady()) {
    return Response.json(
      { message: 'The presenter is not switched on for this app yet.', engine: false },
      { status: 503 },
    );
  }

  const image = readMedia(body.image, PRESENTER_IMAGE_MIMES);
  if (!image) {
    return Response.json(
      { message: 'That picture could not be read. A JPEG, PNG or WebP under 25MB works.' },
      { status: 400 },
    );
  }
  const audio = readMedia(body.audio, PRESENTER_AUDIO_MIMES);
  if (!audio) {
    return Response.json(
      { message: 'That reading could not be read. An mp3 or a wav under 25MB works.' },
      { status: 400 },
    );
  }

  /* The one they have to say out loud.

     Nothing here can tell whether the person in a photograph agreed to be
     animated saying these words. Nothing anywhere can. What this does is make
     it a claim somebody made rather than a thing that quietly happened — the
     same posture as the voice-cloning confirmation, and for the same reason:
     it is what makes a takedown a matter of fact rather than of argument. */
  if (body.consent !== true) {
    return Response.json(
      {
        message:
          'Confirm the person in the picture is you, or that they have agreed to this, before it is made.',
        needsConsent: true,
      },
      { status: 400 },
    );
  }

  /* The script, screened before a cent is spent.

     Empty is allowed through by `guard` itself, and the words are optional to
     the engine — it works off the audio. They are asked for anyway, because a
     presenter reading a script is the most abusable thing in this app and a
     screen that only runs when somebody chooses to fill in a box is not a
     screen. The panel sends what the voice studio read. */
  const script = typeof body.script === 'string' ? body.script.trim() : '';
  const allowed = await guard(request, script, 'video', caller);
  if (!allowed.ok) return allowed.response;

  if (TIER_SPECS[caller.tier].rand === 0) {
    return Response.json(
      {
        message:
          'The presenter starts on Maker. Everything that feeds it — the cast, the voice studio — works on the free tier.',
        needsPlan: true,
      },
      { status: 402 },
    );
  }

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  /* The clip is as long as the reading, and the reading was measured in the
     browser where the audio actually is. Clamped, because a number from a
     client decides a charge: a minute is longer than any advert, and a
     nonsense value should cost the least rather than the most. */
  const said = Number(body.seconds);
  const seconds = Number.isFinite(said) ? Math.min(60, Math.max(1, Math.round(said))) : 5;
  const quality: PresenterQuality = body.quality === '480p' ? '480p' : '720p';

  const price = presenterCost(seconds);
  const paid = await charge(request, price, 'video');
  if (!paid.ok) return paid.response;

  const started = await startPresenter({ image, audio, quality });
  if (!started.ok) {
    await paid.refund();
    return Response.json({ message: started.message }, { status: started.status });
  }

  const { data: row, error } = await client
    .from('videos')
    .insert({
      owner: caller.id,
      task_id: started.taskId,
      // What was said, not what was seen. There is no prompt, and a row with
      // an empty one is a row nobody can recognise a month later.
      prompt: script.slice(0, 2500) || 'A presenter reading a script.',
      // A talking head is filmed on its own terms: the shape is the picture's.
      aspect: '16:9',
      seconds,
      credits: price,
      provider: 'aurora',
      grade: 'better',
      // No published rate to estimate from — see `presenterCost`. The poll
      // writes what it really took, where the engine reports it.
      provider_units: 0,
      kling_credits: 0,
      model: 'creatify-aurora',
      status: 'running',
    })
    .select('id')
    .single();

  if (error || !row) {
    await paid.refund();
    return Response.json(
      { message: 'The presenter was started but could not be recorded, so it has been cancelled and refunded.' },
      { status: 500 },
    );
  }

  return Response.json({ id: row.id, state: 'running', seconds });
}

/** Whether the panel should offer itself at all. */
export async function GET(): Promise<Response> {
  return Response.json({ available: presenterReady() });
}
