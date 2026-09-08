/**
 * What this Kits.AI account actually has, asked rather than guessed.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli: "maak gebruik van al die features en intergrate dit in ons app."
 * One endpoint is known — the voice conversion she sent — and the rest of
 * Kits' product is behind addresses nobody here has seen. arpeggi.io is
 * blocked from the machine this app is written on, so there is no way to find
 * out from here, and inventing them would ship buttons that fail against a
 * service that is billing her. That is worse than not shipping them.
 *
 * So this asks with her key and reports what answers. Open it in a browser
 * once, send me what it says, and every guess in `lib/server/kits.ts` becomes
 * a fact. The same shape as `/api/analyse/setup`, which is a page she has
 * already used for the same reason.
 *
 * ── Guarded, and not by accident ─────────────────────────────────────────
 *
 * It confirms whether a paid key works and lists what the account carries, so
 * it refuses without `POST_SECRET` rather than defaulting to open. Compared in
 * constant time, like the others.
 *
 * It reports shapes, never content: how many of a thing there are and what the
 * fields of one are called. Nothing that comes back is somebody's audio, and
 * the key never appears in the answer.
 */

import crypto from 'node:crypto';
import {
  CANDIDATES, blenderNeeds, canCreateVoices, configured, listModels, namedModels, probe,
} from '@/app/lib/server/kits';
import { leftSeconds, monthlyMinutes, usedSeconds } from '@/app/lib/server/kitsminutes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Nine requests, and it used to be thirty-one.

   The list grew twice on guesses and then shrank once on a fact: Carli sent
   their API documentation, whose contents page lists five APIs. Guessing at
   twenty-two more addresses was work this page no longer has to do. */
export const maxDuration = 60;

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set POST_SECRET before using this.' },
      { status: 503 },
    );
  }
  const given =
    new URL(request.url).searchParams.get('key') ??
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!given || !sameSecret(given, wanted)) return new Response('no', { status: 404 });

  if (!configured()) {
    return Response.json({
      ready: false,
      why: 'The singing key is not set on this deployment. See docs/SWITCH-ON.md §11.',
    });
  }

  const found = [];
  for (const path of CANDIDATES) found.push(await probe(path));

  /* The control. If the one endpoint that is known to exist does not answer,
     the key is the problem and nothing else in this report means anything. */
  const control = found.find((one) => one.path === 'voice-conversions');
  const keyWorks = Boolean(control && control.status > 0 && control.status !== 401 && control.status !== 403);

  /* A 403 that names the plan is the most useful answer this page can give,
     and it is not the same as a refused key.

     Carli's first real run came back exactly this way: "Free tier users are
     not allowed to use the api" on every real endpoint. The key had reached
     them and they had recognised it — the account simply was not paying. That
     is the question this page was built to settle, and it deserves its own
     sentence rather than being lumped in with a wrong key. */
  const needsPlan = found.some((one) => /free tier|not allowed to use the api/i.test(one.note ?? ''));

  /* And which paths are real. A 403 proves a path exists and is guarded; a
     404 proves it does not. Both are worth more than a 200 from their
     website. */
  const real = found
    .filter((one) => one.status === 403 || (one.status === 200 && !/not an endpoint/.test(one.note ?? '')))
    .map((one) => one.path);

  return Response.json({
    ready: keyWorks,
    why: needsPlan
      ? 'The key is good and they recognised it — the account is on the free tier, and Kits does not allow the API there. Buying the plan is what switches this on.'
      : keyWorks
        ? 'The key answers. Everything below that is real can be wired.'
        : 'The known endpoint refused this key — check it, and check the plan carries API access.',
    needsPlan,
    realPaths: real,
    /* The voices on the account, by name.

       This is the one thing in the report that is not a shape: it is what the
       picker in the Pro Booth and on a finished song will show, so seeing it
       here is seeing what she will see. Names only — the ids are hers and
       there is no reason to put them in a page that gets pasted into a chat. */
    voices: (await listModels()).map((one) => one.name),
    namedModels: namedModels().map((one) => one.name),
    /* The question the voice-training room hangs on. Asked with a body that
       cannot become a voice model, so nothing is created whatever the answer.
       See `canCreateVoices` for what each status means. */
    kanStemmeSkep: await canCreateVoices(),
    /* And what the Voice Blender wants, asked the same safe way.

       `/voice-blender` is one of the five real addresses and nothing in this
       app has ever called it, because nobody knows what body it takes — their
       documentation names the address and not the shape. An empty body cannot
       become a blend, so what comes back is their own complaint, and a
       validation complaint names its fields. See `blenderNeeds`. */
    mengerWatVra: await blenderNeeds(),
    /* Where the month stands against the plan's roof.

       Kits' own dashboard is the authority on this; what is counted here is
       what this app spent, which is not the same number if anybody converts on
       their website too. It is here so the two can be compared: a large gap
       between them is worth knowing about before the roof is hit. */
    minutes: {
      ceiling: monthlyMinutes(),
      usedMinutes: Math.round((await usedSeconds()) / 60),
      leftMinutes: Math.floor((await leftSeconds()) / 60),
    },
    found,
  });
}
