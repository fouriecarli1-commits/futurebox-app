# Browser checks

Each of these mounts a piece of the app in a real browser and asserts on what
a person would actually see.

## Running one

The pages they mount live beside the code as `*.probe.tsx`, and that extension
is only a page when `PROBE=1`. A production build cannot see them.

```
PROBE=1 npm run build
npx next start -p 3111 &
node .probe/balance.mjs
```

`credits-ui.mjs` is the one exception: it drives a purchase, and `startCheckout`
refuses without a signed-in session, so that build needs a Supabase to point at.
It never reaches one — the check intercepts every request — but the client has
to exist for a session to be stored against:

```
PROBE=1 \
  NEXT_PUBLIC_SUPABASE_URL=https://probe.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=probe-anon-key \
  npm run build
```

## Every check must be runnable from a clean checkout

Seven of these were not. `voicelab`, `sound`, `collab`, `finetune-cost`,
`credits-ui` and `hero` each drove a `probe-*` page that had never been
committed — written in a working tree, run once, never filed — so from a fresh
clone they read a 404 and failed. `musicplan` imported a copy under `.probe/lib`
that was deleted on purpose, and stopped running entirely.

That is worse than having no check. A suite with permanently red entries is a
suite people learn to scroll past, and the eighth failure — a real one — arrives
looking exactly like the seven. `balance.mjs` proved it: it went red when a site
footer was added to the layout, stayed red, and was still red when the bug it
was built to catch came back.

So: if a check needs a mount, the mount is committed with it.

Without `PROBE=1` the mount is a 404 — and a probe reading a 404 page reports
whatever the 404 page happens to say, which is how one of these quietly passed
for a while. If a check fails in a way that makes no sense, confirm the mount
is there before believing it:

```
curl -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3111/probe-bal
```

## What each one is for

| File | Checks |
| --- | --- |
| `dialogue.mjs` | Cutting a long script into requests that fit their 2,000-character limit, without losing a word — arithmetic, run with `node --experimental-strip-types` |
| `converse.mjs` | What actually goes on the wire to text-to-dialogue, run against a fake ElevenLabs rather than grepped |
| `twohosts.mjs` | The script screen: true counts, an uncast speaker named rather than given a voice, the result becoming the episode draft |
| `nocompetitors.mjs` | That the make screen sells nothing but this app, and the demo tracks credit nobody who did not make them |
| `ownsound.mjs` | The tick that makes the next song in a sound of your own, in all four of its states — no plan, none trained, one training, one ready |
| `live.mjs` | The live channel: a missing table is not an empty room, the audio link is signed rather than public, and only your own post can be taken out |
| `dub.mjs` | Dubbing: their multipart names on the wire, an unfamiliar status never read as final, an id that cannot escape its path, and the route charging at the start and refunding through a claim |
| `studio.mjs` | Arranging a song — move, repeat, cut, add — and the arrangement surviving the trip back out as a lyric sheet, compared whole |
| `rooms.mjs` | That the two rooms about speaking stand together on the rail, each says what the other is for, and the directions point where the Booth actually is |
| `booth.mjs` | That the Booth has a rung on the rail, and that both doors into it file a take in the same place |
| `booth-screen.mjs` | An empty booth explains itself; a full one lists the songs, and one already sung on reopens rather than restarts |
| `balance.mjs` | The credit chip in all eight of its states — a number only when the system is genuinely working |
| `collab.mjs` | Ask, accept, talk, drop a song in; and that the room is shut until both agreed |
| `csp.mjs` | That the content policy does not refuse anything the app needs |
| `store.mjs` | robots.txt, the privacy policy, the four headers, no exposed config, no data without a token |
| `credits.mjs`, `ladder.mjs`, `entitlements.mjs` | Arithmetic, not a browser: run with `node --experimental-strip-types` |

The last three read `.probe/lib/`, which is a copy of the real module with its
import extensions made explicit so node can load TypeScript directly. Refresh
it before running:

```
sed "s|from './plans'|from './plans.ts'|" app/lib/credits.ts > .probe/lib/credits.ts
```

## Importing the app's own code

The checks that are pure logic import straight from `app/lib/*.ts` and run
under Node's type stripping:

```
node .probe/credits.mjs
```

There used to be copies of those files under `.probe/lib/`, and the copies are
gone on purpose. One of them was deleted and three checks stopped running with
a module-not-found that was easy to read as "the harness is broken" rather than
"nothing is being tested". A check that reads a copy is a check that passes
after the original has changed.
