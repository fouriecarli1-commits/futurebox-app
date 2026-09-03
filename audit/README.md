# The click-through audit

Scripts that open the real app in a real browser, sign in, and press things.
They exist because reading the code found neither of the two pricing bugs, nor
the thirteen stock photographs, nor the 404 on every page load, nor the picture
library that could not save a picture.

## Running them

```sh
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
