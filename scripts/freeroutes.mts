/**
 * The routes that reach a supplier and charge nobody, and why each one does.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * It lived in `check-gratis.mts`, which is the right home for the RULE —
 * nothing reaches a supplier for free by accident — and was the only home
 * for the list as well. Then the owner asked for the list itself:
 *
 *   *"noem alles wat gratis is en niks kos nie"*
 *
 * A second copy of it in a document is the copy that goes stale, so the
 * check asserts against this and `kredietkaart.mts` prints it, and neither
 * of them owns it.
 */

/**
 * Routes that reach a supplier and take no credits, and why.
 *
 * A route absent from here and absent from `charge()` is the thing this file
 * is for. A route present here that has started charging is a line that has
 * gone stale, and is reported too — a reason nobody re-reads is how a list
 * stops describing the app.
 */
export const FREE: Record<string, string> = {
  /* The bench where Google draws the Cubed mark. The operator's alone — the
     route refuses anybody who is not her — so a charge on it would be the app
     billing her for its own logo. It still asks the Google ceiling first, and
     for four pictures rather than one, because the money is hers either way.
     See check:merklab. */
  /* The bench where Google draws the children's room's pictures. The
     operator's alone — the route refuses anybody who is not her — so a charge
     on it would be the app billing her for her own artwork. It still asks the
     Google ceiling first, and for all twenty-three rather than one, because
     the money is hers either way. See check:kinderkuns. */
  'app/api/kids/art/route.ts':
    'the operator\'s own bench for the children\'s room artwork: owner-only,'
    + ' run a handful of times, and metered against the Google ceiling rather'
    + ' than credits',
  'app/api/cubed/mark/route.ts':
    'the operator\'s own bench for choosing a logo: owner-only, run a handful'
    + ' of times, and metered against the Google ceiling rather than credits',
  /* ── The two pages that answer a question nobody could answer ──────

     Both spend real money and charge nothing, and both are the owner's own
     diagnostic pages rather than member features. They are here with a
     reason rather than left out, which is the whole point of this file:
     the question is not "is this free" but "did somebody decide it".

     Both refuse to spend without `&go=yes` in the address, which is the
     thing that makes a money-spending page safe to have at all — a page
     that bills on being opened is a page a crawler can bill. */
  'app/api/google/videotest/route.ts':
    'makes one real four-second Veo clip to settle whether Google hands the'
    + ' video back as bytes or writes it to a Cloud Storage bucket. About'
    + ' R10, owner-only, and it answered `needsBucket: false` on'
    + ' 9 October 2026 — which closed a question no amount of reading could'
    + ' close, because every Google sample sends a `storageUri` and this app'
    + ' never does. Not a member action and not a feature',
  'app/api/google/wordtest/route.ts':
    'makes one short song to show which of Lyria\'s two text rows is the'
    + ' lyrics and which is the description. About R1.28, owner-only. It'
    + ' exists because the alternative instruction was "open the browser\'s'
    + ' network tab and decode a base64 header", which is asking a person to'
    + ' do a machine\'s job. Not a member action and not a feature',
  'app/api/voice/own/route.ts':
    'says which member a trained singing voice belongs to. It reads Kits\''
    + ' list of models to check the number is one of ours and then writes a'
    + ' row — no conversion, no audio, nothing generated. Owner-only, so it'
    + ' is not a member action at all, and the thing it guards (one member'
    + ' singing in another member\'s cloned voice) is the opposite of a bill',
  'app/api/watch/route.ts':
    'the health letter. It runs on a secret, for the owner, and it asks the'
    + ' suppliers what they have spent rather than spending anything',
  'app/api/eleven/dictionary/route.ts':
    "puts the pronunciation rules onto the account from the repo — our own"
    + ' setup, on a secret, not a member action',
  'app/api/eleven/prices/route.ts':
    'reads their invoice to answer whether we charge enough. Reading a bill'
    + ' is not adding to one',
  'app/api/eleven/pronounce/route.ts':
    'the Afrikaans test read. It DOES generate, and it is the one here that'
    + ' costs real money — guarded by a secret and meant for the owner alone,'
    + ' which is why it takes no credits and why it must never lose that'
    + ' guard',
  'app/api/voice/route.ts':
    'what this person may do with voices and which ones they have. A listing,'
    + ' so the studio can draw itself correctly on first paint',
  'app/api/voice/preview/route.ts':
    'a stock voice sample, which is a static file on their storage. Passed'
    + ' through our origin so their host stays off the media policy. Charging'
    + ' for it would price the one step that stops somebody buying the wrong'
    + ' voice',
  'app/api/account/route.ts':
    'deleting an account and everything in it. Nobody pays to leave',
  'app/api/analyse/part/route.ts':
    'one stem streamed back through our own origin. The job that made it was'
    + ' charged when it ran; this is collection, not work',
  'app/api/analyse/setup/route.ts':
    "lists the Music.ai workflows actually on the account. A setup page on a"
    + ' secret',
  'app/api/allowance/route.ts':
    'where the allowances stand. Reading a meter',
  'app/api/kits/face/route.ts':
    'the picture for a singing voice, passed through this app rather than'
    + ' linked, for the same policy reason as the voice sample',
  'app/api/tone3000/start/route.ts':
    'sends her to TONE3000 to choose an amp. Their fees are waived for us and'
    + ' she signs in with her OWN account, so there is no bill behind any of'
    + " this — and the capture runs in her browser through lib/nam.ts, not on"
    + ' anything we pay for',
  'app/api/tone3000/callback/route.ts':
    'where they send her back. It trades a code for tokens on her behalf and'
    + ' spends nothing doing it',
  'app/api/tone3000/tone/route.ts':
    'fetches the capture she chose, on her own token. Free for the same'
    + ' reason as the two above: this supplier has no account key and sends'
    + ' us no invoice',
  'app/api/kits/setup/route.ts':
    'lists what is on the Kits account. A setup page on a secret',
  'app/api/charts/apple/route.ts':
    "Apple Music's public top 20 beside our own chart on Spotlight. A public"
    + ' feed with no key and no account — no invoice exists to split.'
    + ' Charging a visitor to look at a chart would also be the first paywall'
    + ' on a page whose whole job is to be looked at',
};
