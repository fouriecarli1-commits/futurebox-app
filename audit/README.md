# The click-through audit

Scripts that open the real app in a real browser, sign in, and press things.
They exist because reading the code found neither of the two pricing bugs, nor
the thirteen stock photographs, nor the 404 on every page load, nor the picture
library that could not save a picture.

## Running them

Playwright is not a declared dependency — it is only used here, and declaring
it would make every CI run download browsers it never opens. Install it
alongside:

```sh
npm install --no-save playwright

npm run build && npm start          # in one terminal
node audit/rooms.mjs                # what the studio shows
node audit/deep.mjs "Video desk"    # press everything in one room
node audit/touch.mjs                # tap targets on an iPhone profile
node audit/price.mjs                # the price on the button vs the request
node audit/shots.mjs                # a screenshot of every room
node audit/a11y.mjs                 # controls a screen reader cannot name
node audit/contrast.mjs             # every text node against what is behind it
node audit/afrikaans.mjs            # the rooms in Afrikaans
node audit/errors.mjs               # does a refusal reach the screen
node audit/home2.mjs                # the tabs outside the studio
```

## What these have found

- Thirteen stock photographs standing in for the thumbnails of real, named
  things.
- A 404 on every page load: the app had no icon at all.
- The picture library unable to save, blocked by the app's own CSP.
- Twelve links too small to press on a phone, all of them `a` rather than
  `button`.
- Eighty keys showing English to an Afrikaans reader.
- One control in the studio a screen reader could not name.

None of them came from reading the code.

`enter.mjs` is shared: it signs in and opens the studio. Without a Supabase
project configured, signing up with any address puts you straight into the app
on-device, which is what makes an unattended run possible at all.

## Two results that look like findings and are not

**"Nothing changed on screen."** Compare the text and every toggle reads as
dead — the platform chips on the advert desk change a colour and an
`aria-pressed` attribute and not one character. Compare the markup.

**"Could not open."** Pressing controls in sequence leaves the app in a state
the next room cannot be reached from — a picker open over the rail, a recorder
holding the page. That is the harness, not the app. `deep.mjs` reopens the room
before every press for exactly this reason, and it is slower for exactly this
reason.

## What a run here cannot tell you

Anything that costs money. Without API keys the song writer, the copilot and
the engines answer 503, which is the correct refusal and as far as this gets.
Where a screen only appears once a service is connected, the probe is faked
with the same JSON the route really returns — see `frame.mjs`, `voices.mjs`
and `price.mjs` — so the component under test is still the real one.

## Two that need a bundle first

`photo.mjs` tests `app/lib/avatar.ts` on a real file, in a real browser,
through a real `<input>` — so it needs that module as something a page can
load:

```
npx esbuild app/lib/avatar.ts --bundle --format=iife --global-name=AV \
  --outfile=/tmp/avatar.bundle.js
node audit/photo.mjs 3000 en /tmp/avatar.bundle.js
```

Injecting the shipped module rather than reimplementing the squaring in the
page is the whole point: a test that redraws the canvas itself proves the test
can draw a canvas.

`help.mjs` and `subscription.mjs` need nothing extra — they stub the routes
with the JSON those routes really return and drive the real components.

## One that needs a stubbed account

`cast.mjs` tests an account feature, so a run with Supabase switched off would
test the refusal and nothing else. The first version of it did exactly that:
five green checks about a strip that was never going to work, because
`configured()` was false and every call returned "not signed in" before
touching anything.

So the app is built against a stub project and the session is seeded in the
browser in the shape supabase-js reads back:

```
NEXT_PUBLIC_SUPABASE_URL=https://stub.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=stub-anon-key npx next build
NEXT_PUBLIC_SUPABASE_URL=https://stub.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=stub-anon-key npx next start -p 3016
node audit/cast.mjs 3016 en
```

The run answers `/auth/v1/**`, `/rest/v1/**` and `/storage/v1/object/**`
itself, so the library, the component and `lib/imagefile.ts` are all real —
only the service behind them is not. It is what lets the run check the half
that matters: that a member added on one load is still there after a reload.

`language.mjs` uses the same stub, and needs it for a different reason: it
opens two fresh browser contexts against one stubbed auth service, because
the thing under test is a choice made on one device showing up on another.
The second context's session is seeded with *empty* metadata on purpose —
that is what a session issued before the choice looks like, and it is why the
language has to be asked of the server rather than read out of the token.
