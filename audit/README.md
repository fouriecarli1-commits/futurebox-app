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

`podlanguage.mjs` uses it too, and for the same reason a third time — the
Podcast room asks the server who is signed in before it draws anything, so a
run without `/api/show` answered tests the signed-out screen. It checks the
show's language is chosen from `data/dublanguages.ts` rather than typed: the
value goes straight into the RSS feed as `<language>`, where "English" or
"afrikaans" is a tag that does not mean what it says and the show is already
published by the time anybody finds out.

```
node audit/podlanguage.mjs 3016 en
node audit/podlanguage.mjs 3016 af
```

`where.mjs` is not a run. Every probe writes its screenshots through
`shot()`, which resolves against the audit directory rather than against
whatever directory the process started in. That was `audit/whatever.png` for a
long time, which is fine when a run is launched from the project root and
silently wrong when it is not: two screenshots ended up inside an unrelated
repository checked out beside this one, and were noticed only because a git
hook complained about untracked files.

`legalpage.mjs` runs against a plain build, twice: once with nothing
configured and once with the particulars set in the environment.

It is the only page in the app that prints an address, and it exists because
section 43 of ECTA requires a supplier selling to South Africans to publish its
name, registration number, physical address and telephone number before
somebody transacts — which a contact form cannot do. Everywhere else the
no-address rule stands, and `check:security` now has an eighth assertion that
this page exists, is linked from the footer, and reads its values from the
environment rather than having them typed in.

```
node audit/legalpage.mjs 3000
FUTUREBOX_LEGAL_NAME="..." FUTUREBOX_LEGAL_REGISTRATION="..." \
FUTUREBOX_LEGAL_ADDRESS="..." FUTUREBOX_LEGAL_PHONE="..." \
  npx next start -p 3111
node audit/legalpage.mjs 3111 configured
```

The unset run is the one that matters most today: with no company registered
there is nothing true to publish, and the page has to say so rather than show a
blank list or a plausible placeholder. The run checks it invents no
registration number.

The configured run found a real fault. Next pre-renders a server component with
no dynamic data at build time, so the particulars were read while the build ran
— with the variables unset — and frozen into the HTML; setting them afterwards
did nothing, silently, on the one page where being out of date is a legal
problem rather than a stale screen. It also checks that none of the particulars
reach the client bundle, which is what lets this page exist without undoing the
rule it appears to break.

`taste.mjs` needs it too, and is the only run whose subject is a table rather
than a screen. What it checks is that using the app in the ordinary way fills
it — no button built for the purpose — and that the welcome screen prefers the
account's counts over the browser's, which is the whole reason the table
exists: the browser is the one thing that does not follow somebody to their
phone. So the seeded library says trance and the seeded account says amapiano,
and the screen has to say amapiano.

```
node audit/taste.mjs 3016 en
node audit/taste.mjs 3016 af
```

It also checks the sentence under the greeting. It used to say "already on
this device, nothing is sent anywhere", which stopped being true the moment the
account started answering — and a privacy line that is quietly no longer true
is worse than not having one.

`devices.mjs` is the sweep across real device profiles: five phones and four
tablets, Apple and Android, tablets in both orientations. Each gets its own
viewport, pixel ratio and — the one that matters most — a coarse pointer,
because `globals.css` gives every control its 44-pixel minimum only under
`@media (pointer: coarse)`; measuring that in a desktop browser narrowed to a
phone's width measures a rule that is not being applied.

```
node audit/devices.mjs 3000
```

It found that "FUTUREBOX" in the hero, at `text-5xl` beside a 64-pixel mark,
is one unbreakable word 381 pixels wide — so on a 320-pixel screen the browser
zoomed the whole page out to fit it and every screen in the app came out
slightly small for the sake of the first word on the first one. That is why it
names the offending element rather than only the width: "the page is 61 pixels
too wide" is a fact nobody can act on.

`account.mjs` needs the stub build too. None of what it checks is new
machinery — the plan, the balance and the cancel button all existed — so what
it checks is findability: press your own name in the corner and everything
about the account is in front of you. That press used to set the studio's room
to Make a song, which does nothing unless the studio is already open, so on
every other screen it was a dead control.

```
node audit/account.mjs 3016 en
node audit/account.mjs 3016 af
```

It also asks for the balance in two of its three states. `wallet.ts` keeps
"could not ask", "not configured" and "zero" apart on purpose — a request that
never arrived used to look exactly like a working free account — and a screen
that collapses them back into one number undoes that.

`greeting.mjs` needs the stub build as well, and for the sharpest reason of
the four: the door is a screen made entirely of things that belong to one
person — their name, their picture, and a suggestion read off their own
library. Without an account it has nothing to say and a run would test the
empty case. It seeds five songs and two makes into the same stores the app
reads, so the derivation under test is the real one over real storage; only
the account and the picture are stubbed.

```
node audit/greeting.mjs 3016 en
node audit/greeting.mjs 3016 af
```

`check:habits` proves the arithmetic behind the suggestion — mostly by proving
it *refuses* to find a habit that is not there. This proves the arithmetic is
wired to the screen, which is a different claim and the one that has
historically been the wrong one.

It also found two things a build could not: an Afrikaans button that read
"Maak Maak ’n snit oop", and the dictionary holding two different apostrophes
— "Maak 'n snit" in the rail beside "Nog ’n liedjie" on the next screen.
`check:afrikaans` now refuses the second one.

`blurshot.mjs` is not a check — it writes `audit/blur.png`, the same wide clip
cut into the same tall film twice, once with black bars and once with the
blurred sides. Both frames are lifted out of real exported films rather than
drawn by the script, so the picture is of the shipped code. It takes the same
bundle `stitch.mjs` does.

`language.mjs` uses the same stub, and needs it for a different reason: it
opens two fresh browser contexts against one stubbed auth service, because
the thing under test is a choice made on one device showing up on another.
The second context's session is seeded with *empty* metadata on purpose —
that is what a session issued before the choice looks like, and it is why the
language has to be asked of the server rather than read out of the token.

`presenter.mjs` stubs the two services and nothing else. The voice route hands
back a real WAV, so the length on the button is measured off a file the way it
is in life rather than asserted by the test; the presenter route answers the
way it would with `ELEVEN_AURORA_READY=1` set, because a run that only proved
the refusal would be a run about the flag. What is checked is what actually
reaches the route: a picture, an audio file, the script, the measured length,
and a confirmation that was ticked rather than assumed.

`lanes.mjs` stubs the separation — it is a paid call — and nothing else. What
comes back is two genuine WAVs of different length and different loudness, so
a lane drawn from the wrong buffer shows up as two identical canvases rather
than passing quietly.

The faders are not proven by pressing play: a headless browser makes no sound,
and hearing is not something a run can assert. They are proven by rendering.
"Keep this balance" reads the same gain nodes the faders move, so two renders
that differ are two gains that differ — and muting the loud lane must drop the
loudest sample in the file, which is the difference between a fader wired to a
gain node and one that only moves a number on screen.

It also seeds the song's audio into `futurebox`/`audio` in IndexedDB. Without
it the split button is correctly disabled, and the run stops at a screen
behaving properly.

`stitch.mjs` needs the module bundled, like `photo.mjs`:

```
npx esbuild app/lib/stitch.ts --bundle --format=iife --global-name=ST \
  --outfile=/tmp/stitch.bundle.js
node audit/stitch.mjs /tmp/stitch.bundle.js
```

It makes its own clips in the page — canvas, recorded — so what is stitched is
genuine video with genuine durations rather than fixtures, and it reports how
long the cut took against how long the film is. That ratio is the feature's
real cost and belongs in the output where somebody reads it.

It also measures the background behind a shot that does not fill the frame.
A wide clip cut into a tall film leaves a band above and below it; black is the
default and a blurred, enlarged copy of the shot is the option. The run cuts
the same striped clip both ways into the same tall frame and samples the band:
black must still be black, blurred must not be, and its colour must come from
the clip — a blue shot gives a blue band, which a grey fill would not.

The one that separates a blur from an enlarged sharp copy is the stripe. The
clip carries a hard white band across its top eighth, which stays white in the
picture and has to be smeared away in the background behind it. Measured, it
peaks at 765 in the picture and 338 behind it.

Its audio check decodes the output rather than asking the video element.
`mozHasAudio`, `webkitAudioDecodedByteCount` and `audioTracks` are each
non-standard and none answers in Chromium, so the first version reported a
silent film for a file that had sound on it.

## One that builds the app itself

`safezones.mjs` needs a page that mounts one component on a box of known size,
and this app should not ship a route that exists for a test. So the run owns
the whole loop: it copies `app/safezoneprobe/page.probe.tsx` to `page.tsx`,
runs `next build`, starts a server, measures, and removes the page again —
whether it passed, failed or threw.

`.probe.tsx` files elsewhere in `app/` follow the same convention and are the
reason it exists; nothing ran them until this.

It asserts geometry rather than the presence of elements: where each shaded
strip falls against the frame's own box, in pixels. A bar in the wrong place
is worse than no bar — it says a subject is safe while a caption is about to
land on it, and that is found out after posting.

## The one that runs in another timezone

`queue.mjs` opens the browser in Johannesburg on purpose. This container runs
on UTC, where the conversion between a time somebody types and the instant
stored is the identity — so every timezone check would pass against a version
that ignored the zone entirely, which is the bug worth finding.

It types six in the evening, asserts that 16:00 UTC goes over the wire, and
then asserts that six in the evening is what comes back onto the screen. The
second half is the one `check:queue` cannot reach: a queue that stores the
instant correctly and displays it in UTC is wrong in the way nobody reports,
because "the reminder came at the wrong time" reads as a scheduling problem.
Adding `timeZone: 'UTC'` to the one `toLocaleString` in `Queue.tsx` was run
through it deliberately; it fails on that line and prints `16:00`.

It also asserts the sentence — that the room says it does not post for you, in
the language it is being read in, on its face rather than folded into the
explanation. That is a failure of words, so no type check or unit test can
find it.

## The one that buys something

`addon.mjs` flips `/api/addons` from "not bought" to "bought" part-way through
a run, because the interesting assertion is not what either state looks like —
it is that paying moves you from one to the other, and that nothing on the free
side of the line moved.

It asserts the price on the screen is the one the server sent (the stub
deliberately answers 249, not 199, so a number typed into the markup shows up
as a mismatch), that the sales screen says what stays free, that it does not
promise posting this app cannot do, and that the brief above it is still
editable while the desk below is locked.

What it cannot check is the lock itself — the stub build has no Supabase, so
`/api/plan` never reaches `hasAddon`. `check:addons` does that half against the
source: that both gated routes ask on the server with the caller's own id, that
reading and cancelling the queue are deliberately *not* gated, and that the
webhook reads a renewal's plan code before assuming a membership renewed.

## The one that measures audio

`mixdown.mjs` renders real tones through the real `mixSession` and reads the
samples back. `check:mix` pins what `trimFor` answers given a peak and an
average; it cannot answer whether the file that comes out has those properties,
and a pan wired to the wrong node, a trim applied to one channel, or a render
that differs from the last one all change the file somebody posts without
changing a number in a unit test.

It owns its loop the way `safezones.mjs` does — copies `app/mixprobe/
page.probe.tsx` in, builds, measures, removes it — so the app never ships a
route that exists for a test.

Two of its assertions were written wrong first and are worth keeping in mind:
a centred mono lane comes out at 1/√2 in each channel, not at full level in
both, because `StereoPannerNode` is equal-power. That is correct and it is what
every desk does, but it means every mix in this app is 3 dB quieter than a
linear panner would give — so the law itself is asserted rather than assumed.

## The one that presses the Pro Booth

`probooth.mjs` mounts the room on a probe page with a backing track of a known
length, because reaching it through the app means signing in, opening the
studio, opening the booth, and having a song with real audio in the browser's
own storage — four things that fail for reasons that have nothing to do with
the room.

It presses what is there and compares boxes rather than looking at them. That
is what caught the lane row: five controls after the waveform fitted on a
desktop and ran off the side of a phone, and no assertion about text would ever
have seen it. It also caught its own threshold — two controls sitting flush
come back overlapping by a tenth of a pixel, and reporting that as a defect is
how a check gets switched off.

The assertion that matters most on a phone is not "nothing overlaps" but "the
row is taller than it is on a desktop": a row that stays one line at 390 px has
not fitted, it has crushed every control in it to something nobody can hit.

## Two measurement mistakes worth remembering

`probooth.mjs` compares control boxes to find overlaps, and got it wrong twice
in ways that both looked like app defects.

`getBoundingClientRect` reports where an element *would* be even when it is
clipped out of a scrolling list or hidden behind a pinned bar. A slider scrolled
out of view therefore "overlaps" the master's, which is true and completely
fine. What was meant is "can a person hit this", and the way to ask that is
`document.elementFromPoint` at the control's centre: if the top element there is
the control, it is reachable. Only reachable controls are compared now.

And the real defect underneath — pinned bars with no background of their own,
so the lane list showed through them — cannot be found by geometry at all,
because content behind an opaque bar overlaps it in every measurement and is
correct. It is asserted as a painted colour instead.
