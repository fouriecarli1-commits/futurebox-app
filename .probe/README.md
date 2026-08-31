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
