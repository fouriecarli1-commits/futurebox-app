/**
 * Does Veo hand back the video, or put it in a bucket? Asked, not reasoned.
 *
 * ── The question ─────────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"hoe kan ek video toets om te sien of ek 'n bucket
 * nodig het"*.
 *
 * Every Veo sample on her Model Garden page answers with
 * `videos: [{ gcsUri: "gs://BUCKET/…" }]` — a file written into Cloud
 * Storage. If that is what Veo always does, this app cannot read its own
 * clips: it holds an API key, not a service account, and it has no bucket.
 * If it only does that when the request ASKS for it with `storageUri` —
 * which this app never sends — then no bucket is needed and nothing has to
 * change.
 *
 * Nobody here can settle that by reading. The samples all send `storageUri`,
 * so they cannot tell us what happens without it, and that is exactly the
 * case we are in. Google's own documentation is the same documentation that
 * had Lyria on the wrong API for a day.
 *
 * ── So it generates one real clip ────────────────────────────────────────
 *
 * Four seconds, through the app's OWN provider — `googleVeo.start` and
 * `googleVeo.check`, the same two functions a member's video goes through.
 * Not a hand-written request beside them. A probe that dials its own
 * endpoint measures the probe; this project has already had two of those in
 * one week, and both read as findings.
 *
 * It costs money: four seconds at the rate this app counts is about $0.60,
 * call it R10. That is the price of the answer, and there is no free version
 * of this question. So nothing is spent until the address says `&go=yes`,
 * and without it this page only says what it would do.
 *
 * ── How to read it ───────────────────────────────────────────────────────
 *
 *   needsBucket: false   the bytes came back. Nothing to do, ever.
 *   needsBucket: true    Google wrote it to `gs://…`. The clip we paid for
 *                        is in a bucket this app cannot read, and video
 *                        needs Cloud Storage switching on.
 *   needsBucket: null    not known yet — still making it, or it refused for
 *                        some other reason, which the message names.
 *
 * A clip takes a minute or two. The answer carries `pressNext`, which is
 * this same address with the job's name in it; opening that asks again and
 * spends nothing.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * Behind the owner's own sign-in, or POST_SECRET — see `ownerdoor.ts`. It is
 * a button that spends money, so it is not a page anybody may open. Nothing
 * of a member's is read or written: the clip is thrown away.
 */

import { opened } from '@/app/lib/server/ownerdoor';
import { configured as googleOn, project, region } from '@/app/lib/server/google';
import { googleVeo, googleVeoFull } from '@/app/lib/server/video';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** One start, or one ask. Never a wait for the clip — that is the next press. */
export const maxDuration = 60;

/** Four seconds, the shortest length Veo will make, because it is the cheapest. */
const SECONDS = 4;

/**
 * Which rung to ask, because the answer is per MODEL and not per project.
 *
 * Carli settled the cheap rung on 9 October 2026: `needsBucket: false`, the
 * bytes came back. The full model on `premium` is a different publisher
 * model and has never been asked, which is a good inference rather than a
 * measurement — and this project has been burnt by exactly that distinction
 * twice this week.
 *
 * So `?rung=premium` asks the other one. It is deliberately not the default:
 * four seconds of the full model is about $1.60 against the cheap rung's
 * $0.60, and nobody should spend the dearer one by leaving a parameter off.
 */
const RUNGS = { better: googleVeo, premium: googleVeoFull } as const;
type Rung = keyof typeof RUNGS;

/**
 * Deliberately dull, and deliberately not a person.
 *
 * The answer being looked for is the SHAPE of the response, so the picture
 * does not matter at all — and a prompt naming a person or a style would be
 * one more reason for the request to be refused on contents, which would
 * read as "no bucket needed" when nothing was measured.
 */
const PROMPT = 'A plain grey ceramic cup on a white table, still, soft daylight.';

export async function GET(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;

  const url = new URL(request.url);
  const job = url.searchParams.get('op') ?? '';
  const go = url.searchParams.get('go') === 'yes';
  const asked = url.searchParams.get('rung') ?? '';
  const rung: Rung = asked === 'premium' ? 'premium' : 'better';
  const engine = RUNGS[rung];
  /* The rung travels in every link this page hands back, because asking
     about a job on the wrong model gets a not-found rather than progress —
     an operation name belongs to the model that minted it. */
  const tail = rung === 'premium' ? '&rung=premium' : '';
  const here = `${url.origin}${url.pathname}`;

  if (!googleOn()) {
    return Response.json({
      ready: false,
      needsBucket: null,
      says: 'GOOGLE_VERTEX_KEY or GOOGLE_PROJECT is not set on this deployment,'
        + ' so there is nothing to test. See docs/GOOGLE-OPSTEL.md.',
    });
  }

  /* ── Asking about a clip already started. Free. ──────────────────── */
  if (job) {
    const where = await engine.check(job);
    if (where.state === 'running') {
      return Response.json({
        ready: true,
        needsBucket: null,
        done: false,
        says: 'Still making it. Google takes a minute or two for four seconds.'
          + ' Open pressNext again — asking costs nothing.',
        pressNext: `${here}?op=${encodeURIComponent(job)}${tail}`,
      });
    }
    if (where.state === 'unknown') {
      return Response.json({
        ready: true,
        needsBucket: null,
        done: false,
        says: `Google could not be reached to ask: ${where.message}`,
        pressNext: `${here}?op=${encodeURIComponent(job)}${tail}`,
      });
    }
    if (where.state === 'failed') {
      /* The provider already names the bucket case as itself rather than as
         an ordinary failure — see `placeOf` in `video/google.ts`. That one
         sentence is the entire answer to her question, so it is matched on
         rather than re-derived here. */
      const bucket = where.message.includes('storage bucket');
      return Response.json({
        ready: true,
        needsBucket: bucket ? true : null,
        done: true,
        says: bucket
          ? 'YES, a bucket is needed. Google finished the clip and wrote it into'
            + ' Cloud Storage instead of handing the bytes back, so this app'
            + ' paid for a video it cannot read. Video on her own Google'
            + ' project cannot be used until Cloud Storage is switched on and'
            + ' this app is given something that may read the bucket — which'
            + ' an API key may not.'
          : `Not answered: Google refused this clip for another reason. ${where.message}`,
        detail: where.message,
      });
    }
    /* Done, with something in hand. */
    const bytes = where.url.startsWith('data:');
    return Response.json({
      ready: true,
      needsBucket: bytes ? false : null,
      done: true,
      says: bytes
        ? 'NO bucket is needed. Google handed the video back as bytes, which is'
          + ' what this app asks for and already reads. Nothing to switch on,'
          + ' nothing to change, and the Cloud Storage question is closed.'
        : `Not answered: the clip came back as something other than bytes (${where.url.slice(0, 40)}).`,
      /* The clip itself is never returned. It is four seconds of a cup, it is
         megabytes, and the answer is its SHAPE. */
      cameBackAs: bytes ? `data: url, ${where.url.length} characters` : where.url.slice(0, 60),
    });
  }

  /* ── Nothing started yet ─────────────────────────────────────────── */
  if (!go) {
    return Response.json({
      ready: true,
      needsBucket: null,
      willSpend: true,
      says: `This makes one real ${SECONDS}-second clip on ${engine.name} to find`
        + ' out whether the video comes back as bytes or as a gs:// path in a'
        + ' bucket. There is no free way to ask. Add &go=yes to the address to'
        + ' spend it.'
        + (rung === 'premium'
          ? ' This is the DEARER rung: about $1.60, call it R26. The cheap one'
            + ' was already answered on 9 October 2026 — no bucket needed —'
            + ' so this only settles the full model behind the premium grade.'
          : ' About $0.60, call it R10. Carli already ran this on'
            + ' 9 October 2026 and it answered no bucket needed, so there is'
            + ' nothing left to find out here unless the model changes.'),
      alreadyAnswered: rung === 'better' ? 'needsBucket: false, 9 October 2026' : null,
      otherRung: rung === 'better'
        ? `${here}?rung=premium`
        : `${here}`,
      project: project(),
      region: region(),
      rung,
    model: engine.model,
      pressToStart: `${here}?go=yes${tail}`,
    });
  }

  const started = await engine.start({
    prompt: PROMPT,
    aspect: '16:9',
    seconds: SECONDS,
    speak: false,
  });
  if (!started.ok) {
    return Response.json({
      ready: true,
      needsBucket: null,
      done: true,
      says: `Google would not start it, so nothing was spent and nothing was`
        + ` measured. It answered ${started.status}: ${started.message}`,
    }, { status: 200 });
  }
  return Response.json({
    ready: true,
    needsBucket: null,
    done: false,
    says: 'Started. Google is making it now, which takes a minute or two.'
      + ' Open pressNext to ask whether it came back as bytes or as a bucket'
      + ' path — asking costs nothing.',
    pressNext: `${here}?op=${encodeURIComponent(started.taskId)}${tail}`,
  });
}
