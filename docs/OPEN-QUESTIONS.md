# Open questions and things not yet settled

A running register. Carli asks about a service, a limit or an idea, an answer
gets given in a conversation, and then it is gone. This is where those live so
they can be reviewed in one place instead of remembered.

**Rules for this file.** Every entry says what is *verified* and what is
*unverified*, and by what. "I think" is not an answer here — if something could
not be checked, it says so and it says how to check it. Entries move to
**Settled** with a date and a commit rather than being deleted.

Last updated: 2026-09-05.

---

## A. Voices, singing, and using your own voice

### A1. Can Music.ai give us "record your voice → improve it → use it in AI songs"?

**Asked:** 2026-09-05.

**What is verified.**

- Music.ai is the developer arm of **Moises** — the same company.
- Their API is *processing and analysis*: stems, key, tempo, transcription,
  mastering, and a workflow builder over 50-odd audio modules. It does not
  generate songs.
- Moises' **Voice Studio** does voice **conversion**: it keeps the melody,
  timing and emotion of a real performance and replaces the timbre. That is
  singing conversion, not speech, and it is the right tool for this.
- Our song engine is **ElevenLabs Music**. Its API takes a style and lyrics.
  It does **not** take a voice model. So "sing this in my voice" cannot be
  asked of the generator. This is not a gap in our code.

**What is unverified, and why.**

Whether the voice-conversion module is exposed over the **Music.ai API** or
only inside the Moises consumer app. `music.ai` is blocked by this
environment's network egress proxy, so their documentation could not be read,
and web search does not answer it.

**How to settle it.** Two ways, both cheap, and the second one now answers
the question rather than only listing:

1. Their dashboard's workflow builder lists every module on the account.
2. `/api/analyse/setup?key=…` prints the workflows on the account **and says
   whether any of them looks like singing voice conversion**. It matches on
   the names you gave your own workflows, so it is reported as "looks like"
   rather than as a fact, and it deliberately refuses the ones that sound
   similar and are not: vocal removal and voice isolation are stem separation,
   which this app already does. `check:analyse` holds it to twelve named
   cases, six that must match and six that must not.

**The path that works either way**, with what is already built:

1. Make the song — ElevenLabs Music. *Built.*
2. Split the vocal from the backing — stems. *Built.*
3. Run the vocal through singing voice conversion with your own model.
   **Missing. This is the only gap.**
4. Mix it back — Pro Booth mixdown. *Built.*

Our current voice change is ElevenLabs **speech**-to-speech
(`eleven_multilingual_sts_v2`). It is for talking and handles singing badly.
Step 3 needs a singing model: Moises Voice Studio, or an RVC service such as
Kits.AI.

### A2. TONE3000 — amp models

**Settled, 2026-09.** I first said they had no public API. **That was wrong.**
They have an official OAuth API, an MIT-licensed engine, and a WASM runtime.
Built: `app/lib/nam.ts` on `@opendaw/nam-wasm` 1.2.0, with the binary served
from our own origin. Verified by `scripts/check-nam.mts` — 12,000 of 12,000
samples changed, block-size independent to 0.00e+0, and non-captures refused.

Still open: whether to pull the TONE3000 **library** over their OAuth API so
somebody can browse and load captures inside the app, rather than only using
the ones we ship.

### A3. Voice cloning and consent

Built and gated: a clone may only be used by the person who cloned it, checked
against our own table because ElevenLabs has no idea who our users are, and
the consent is stored with the voice. No open question — listed so it is not
re-asked.

---

## B. Mixing and mastering — what else could make this better

Carli's question: *"die ekstra apps wat mixing ens beter kan maak"*.

### B1. What we do ourselves, today

| Thing | Where | Verified by |
|---|---|---|
| Mixdown: pan, levels, ceiling, loudness match | `lib/mixdown.ts` | rendered audio, measured |
| Equal-power panning (1/√2) | `lib/mixdown.ts` | measured: 0.1414 amped vs 0.5657 bare |
| Amp modelling (NAM) | `lib/nam.ts` | `check:nam` |
| Tone shaping per lane | Pro Booth | `check:tone` |
| Stems | `/api/stems` | `check:mix` |
| Determinism | mixdown | measured across runs |

### B2. Services worth reviewing, and what each would actually add

Nothing below is wired. This is the shortlist to decide on, not a plan.

- **Music.ai mastering module.** Same account as A1. Mastering is the one
  thing in this list where a service reliably beats a browser, because it is
  a trained decision rather than a filter chain.
- **LANDR / eMastered / CloudBounce.** Mastering-as-an-API. Known quantity,
  per-track pricing, no relationship needed. The question is whether ours is
  already good enough that the credit is better spent elsewhere.
- **iZotope / Sonible** — desktop plug-ins, no API. Not usable from a web app.
  Listed so the answer is written down rather than re-investigated.
- **Dolby.io Media Enhance.** Speech-first: de-noise, de-reverb, loudness to a
  target. Overlaps ElevenLabs audio isolation, which we already use.
- **Kits.AI.** Singing voice conversion (RVC) with an API. This is the direct
  answer to A1 step 3 if Music.ai turns out not to expose theirs.
- **TONE3000 OAuth library.** See A2.

### B3. The honest position on mixing

The mixer was doubted and then measured, and it does mix — the numbers are in
the session record and in `check:mix`. What it does **not** have is a mastering
brain: it matches loudness and stops clipping, which is not the same as a
record sounding finished. That is the gap a service would fill, and it is worth
one paid call per track rather than a subscription.

---

## C. Video

### C1. Dubbing scope

**Settled, 2026-09-05, commit `bb6b2df`.** Dubbing was podcast-episodes only.
It now also works on a film made at the video desk, on any clip that has
something spoken on it. It is deliberately *not* offered on a silent clip or a
music video: a dub re-performs speech, and paying to dub a song would hand back
something wrong.

Still open: **dubbing a song.** ElevenLabs dubbing translates speech; a sung
vocal is not speech. Doing this properly is: stems → the vocal → translate the
lyric → re-sing it. That is a different feature from dubbing and it needs A1
step 3.

### C2. Subtitles

**Settled, 2026-09-05, commit `7b9fe33`.** Burned into the picture, because a
subtitle file beside the video is ignored by every place these get posted.

Still open: **subtitles on a music video** (as opposed to the video desk's
films). The music video room already has a words-on-screen mode driven by the
song's own section plan; whether that and the desk's captions should become one
thing has not been decided.

### C3. The language of the picture

Not solvable by us and worth writing down as such: the video engines are
English-first and their API has no language field. The app's whole language
strategy is silent footage with a voice laid over it. That is why the language
button is on the dub and not on the generation.

---

## D. Music.ai, once the account exists

Everything here is blocked on one thing: `MUSIC_AI_API_KEY` on Vercel, and the
workflow slugs read off the account.

- `MUSIC_AI_WORKFLOW_READ` — chords, key, tempo, sections.
- `MUSIC_AI_WORKFLOW_STEMS` — stems by name, rather than the two ElevenLabs
  gives.
- Whatever the account actually carries — read it with
  `/api/analyse/setup?key=…` rather than guessing. A feature whose slug is not
  set says so instead of failing against a bill.

Two things about their API that are easy to get wrong and are already handled:
the header is `Authorization: <key>` with **no** `Bearer`, and a failure comes
back as HTTP 200 with `FAILED` as often as it comes back as an HTTP error.

---

## G. Hooks and YouTube

**Asked:** 2026-09-05 — "ek wonder of hooks nie ook youtube kan connect en
stukkies daar uit haal nie, mits dit permitted is."

**The answer is no, and the "mits dit permitted is" is the whole answer.**

YouTube's Terms say a user may not access content "through any technology or
means other than the video playback pages of the Service itself, the
embeddable player, or other explicitly authorized means YouTube may
designate", and separately may not reproduce, download or alter any part of
the Content except as the Service permits. The **YouTube Data API** is the
authorised programmatic route and it serves *metadata* — titles, durations,
captions where the owner published them — never the media stream. There is no
API that hands over the frames, and the third-party rippers that do are the
thing the Terms name.

**What is possible, and is a different feature:**

- **Play** an embedded segment from a start to an end time, through the IFrame
  player. Nothing is extracted; the clip is YouTube playing on our page. Fine
  for a reference, useless for making a hook that gets posted.
- **Clip your own upload** — if somebody has the source file, the hooks room
  already cuts it. The gap is that they must have the file, not the URL.
- **Read the captions** of a video whose owner published them, through the
  Data API, which is the one piece of a video that is legitimately fetchable.

So: a "paste a YouTube link and cut a hook out of it" button cannot be built
honestly, and the hooks room now says that on screen rather than leaving
somebody to wonder why it is missing.

**Settled, 2026-09-05**, commit `602c32b`: the lawful half is built. Bring a
video you own into the hooks room and the moments are found in its own sound,
then cut with that sound on them. Bringing a song in works there too.

---

## E2. `OWNER_EMAIL` — the variable nothing documented, and what it costs

**Found 2026-09-05**, by Carli: "ek het gevra dat niemand die futurebox naam
kan gebruik nie, maar jy het my ook op dit geblok."

She is right, and the cause is not the rule. `server/owners.ts` reads
`OWNER_EMAIL`, a comma-separated list of the addresses that run the place. It
appears in **no document in this repository** — not GOING_LIVE, not here —
so it has almost certainly never been set on the deployment. With it unset,
`ownerEmails()` is empty, `isOwnerEmail()` is false for everybody, and the
app has no owner at all.

**What that costs, beyond the name.** The same check decides metering:
`callerFrom` does `isOwner(email) ? 'label' : await tierOf(...)`, so the
person who pays the engine bills is being charged credits on her own app like
any free user. That is worth checking on the live deployment before anything
else in this file.

**Fixed, as far as code can fix it.** The name field now tells the two
refusals apart — "you are not the owner", which is the rule working, and
"this app has no owner set", which is a missing variable and which was
refusing the owner with no way to tell why. The route sends one bit,
`ownerSet`; the owner list itself still never reaches a browser.

**Set it to:** the address you sign in with, on Vercel, then redeploy.

---

## E. Still Carli's to switch on

**The working list is `docs/SWITCH-ON.md`** — in dependency order, each entry
saying where it goes, what is broken until it does, and how to tell it worked.
Almost every one of these fails silently, and a one-line list does not carry
enough to act on at seven in the morning.

What follows is the index of it.

- `NEXT_PUBLIC_SITE_HOST = futurebox.studio`, then redeploy. *(Test:
  `/sitemap.xml` should carry that host.)*
- The four Vercel domain redirects: only `futurebox.studio` is Production; the
  other three point at it.
- Supabase: email confirmation on, a `{{ .Token }}` template, Resend SMTP.
- Resend: "Enable Receiving" **off**, the API key, and the four mail variables.
- `PAYSTACK_SECRET_KEY`.
- `supabase/addons.sql` and `supabase/posting.sql`.
- `supabase/dubs.sql` — without it, dubbing answers "not set up".
- `supabase/invites.sql` — without it, the invite link answers "not set up".
- **`OWNER_EMAIL`** — see E2. Unset today, which blocks you from your own
  app's name and bills you for your own engines.
- Music.ai key and workflow slugs (section D).
- CIPC: the registration number, then the legal page and the entity name.
- The trademark search, classes 9 and 42.

---

## F2. The artist name — settled, and what I got wrong about it

**Settled, 2026-09-05**, commits `39f7feb`, `6eff4b5`, `af225d7`.

**The correction first.** I wrote here that the name "does not exist" and
that "no screen anywhere can change it". That was wrong. The recording name
has been on the `creators` row all along, editable in the channel, and the
live room and the collab radar have both been reading it.

What was true is worse in a quieter way: the app had **two** names for one
person and showed one at a time. `toAccount` builds a name out of the
sign-up email, because at sign-up that is all there is, and the header, the
greeting and the account panel showed that. The recording name went out on
the releases. So somebody called Anré was `anrefourie` in the corner of every
screen and "Anré Fourie" on their own song, with nothing to say which was
which.

Now the chosen name is read once and used by all of the chrome, the handle
can be changed too (it could not), the field is one component mounted in both
places somebody looks, and the app's own name is refused to everybody but the
owner — in the field as it is typed, and again by the route, which is the half
that holds.

**Still open.** Work already posted keeps the name it went out under. The copy
says so; nothing enforces it, because posts carry the row rather than a copy of
the name at the time. Whether a rename should rewrite old credits, leave them,
or keep both is a decision nobody has made.

---

## F. Asked for, agreed, not yet built

- The right-hand rail on the live slider: Remix and **+ Hook**, which the
  packaging notes call the whole loop. Held back deliberately — remixing
  somebody else's post is a rights question before it is a button, and that
  decision has not been made. Still the only thing in this section nobody has
  started, and it is a decision rather than a build.
- Nothing else from §4. Both halves are in: twenty-six photo cards and seven
  you talk to.

---

## What was found by looking rather than by breaking

Three things this session, all of the same kind: a thing that looked done and
was not, found by asking the question rather than by anybody hitting it.

**Sixty-one probes could only run on one laptop.** Each carried that machine's
browser path as a constant. On any other machine they failed on the first line
with a path error, which reads like the app being broken. Fourteen
click-through probes had therefore never run in CI at all.

**Nineteen checks ran nowhere.** `check:mail`, `check:entity`,
`check:makesong`, `check:listen`, `check:tempo` and fourteen others — written
on purpose, all passing, run only by somebody remembering to type them. That
is worse than not having written them: the file exists, it is read during a
review, and it is taken as evidence that the thing it describes is still true.
`check:entity` is the sharpest case, since its whole point is to be right
months later for somebody who will never open it.

**Four assertions passed for the wrong reason**, three of them in one probe.
All the same shape: asserting that words exist somewhere on the page rather
than that a thing is in a place. One of them measured the probe's own click.

The first two now have checks of their own — `check:launch` and
`check:everycheck` — because none of the nineteen were added carelessly. Each
arrived in a commit about something else, and wiring CI was a separate step
nobody was reminded of. That will happen again with the sixty-third.

## Two corrections, kept where corrections belong

**`df2994b`'s card count.** Its message says "14 cards across 5 rooms now, up
from 10 across 4". I wrote that before running the probe; the run said 4
rooms, because Spotlight is not one of the thirteen studio rooms
`audit/cards.mjs` walks, so its four new bars were not counted at all. The
probe counts Spotlight now and the figure is 21 across 10 of 14 screens.

**`/api/charts` published songs nobody had shared.** I shipped that route in
`df2994b` and did not run `check:security` after it. The chart is built from
plays counted one per person per song per day, so somebody playing their own
song once a day for a month reaches the top of it — and the query read every
track by id, shared or not. A private song would have gone on the front
screen with its title and its maker's name for thirty days. Fixed in
`adef346`, with the `shared` clause asserted rather than described, and
verified by deleting it and watching the check fail.

Both are the same failure in different clothes: a claim made without running
the thing that would have checked it. The rule that follows from the second
one is narrow and worth writing down — **a new route that calls `admin()`
needs `check:security` run before it is pushed, not two commits later.**

## A correction, kept where corrections belong

`df2994b`'s message says "check:cards — 14 cards across 5 rooms now, up from
10 across 4". That number was written before the probe was run and it was
wrong: the run said 4 rooms, because Spotlight is not one of the thirteen
studio rooms the probe walks, so its four new bars were not counted at all.

The probe counts Spotlight now and the true figure is **13 cards across 5 of
14 screens**. The commit is on `main` and its message is not being rewritten
for one wrong sentence; this is the record instead.

It is worth saying why it matters more here than it would elsewhere. The
whole argument for these probes is that a claim gets measured rather than
asserted — and a measured number quoted from memory is just an assertion
wearing the probe's clothes.

## Settled

| What | When | Where |
|---|---|---|
| TONE3000 has an API; amp modelling built | 2026-09 | `lib/nam.ts`, `check:nam` |
| The mixer really does mix | 2026-09 | `check:mix`, measured audio |
| Bring a song in from a file | 2026-09-05 | `099f958` |
| Subtitles burned into the film | 2026-09-05 | `7b9fe33` |
| Dubbing widened past podcasts; the language button | 2026-09-05 | `bb6b2df` |
| Five tabs at the bottom, on every screen | 2026-09-05 | `eb3466b` |
| One artist name, and nobody may be the official channel | 2026-09-05 | `39f7feb`, `6eff4b5` |
| Back goes back; deleting the account left the working room | 2026-09-05 | `af225d7` |
| Simple / Everything, so nothing has to be deleted | 2026-09-05 | `c1513c9` |
| The play button nobody could see; rooms measured for width | 2026-09-05 | `58c1172` |
| A song full screen, words moving with it | 2026-09-05 | `22afff6` |
| A hook cut from a file you own, with its sound | 2026-09-05 | `602c32b` |
| The words are timed by listening to the song | 2026-09-05 | `5064550` |
| The Lyrics sheet is a portal, and follows the song | 2026-09-05 | `cfa3efd` |
| The Find tab did nothing; the app was not Afrikaans | 2026-09-05 | `0f65b72` |
| The free tier was throwing the lyrics away | 2026-09-05 | `2a2fdb2` |
| The engine is told which language to sing in | 2026-09-05 | `e82320a` |
| Spotlight back, Live on a tab, search in the corner | 2026-09-05 | `09bd29d` |
| A song has a shape; the style is no longer padded | 2026-09-05 | `ab1a8b1` |
| A style learned by listening to a song you like | 2026-09-05 | `580f9f8` |
| Signed in stays signed in; the safety review | 2026-09-05 | `ebb4be4` |
| The switch-on list, so it can be worked from | 2026-09-05 | `2d9bf46` |
| The style is no longer outvoted by our own words | 2026-09-05 | `a0131df` |
| Live plays as a full-screen slider | 2026-09-05 | `d9f57f3` |
| A cover on a song in the channel | 2026-09-05 | `d0bd0db` |
| Fifty songs to start from | 2026-09-05 | `df7484c` |
| A song from a photograph, measured on the device | 2026-09-05 | `5bb766c` |
| One panel for both ways of pointing at a sound | 2026-09-05 | `a7d2209` |
| The picture read by the model, not only measured | 2026-09-05 | `a109a66` |
| The unheard dot, and a way to narrow the channel | 2026-09-05 | `aaf3ed2` |
| The music video's words: whose timing, whose language | 2026-09-05 | `34e8ec9` |
| The reading in every room, counted and cut | 2026-09-05 | `b49277e` |
| The card shape: a chevron, a box, small buttons under | 2026-09-05 | `2161e68` |
| The account is asked about voice conversion | 2026-09-05 | `644091c` |
| The legal page proved right for both ways of selling | 2026-09-05 | `4d87b57` |
| A song can be downloaded from the channel | 2026-09-06 | `8fcf9c7` |
| A style off a link, reading the name and saying so | 2026-09-06 | `8fcf9c7` |
| The card shape in nine more panels, coverage counted | 2026-09-06 | `3bb51d8` |
| Post it is a sheet; every song reaches Live | 2026-09-06 | `76517ed` |
| The radar introduces people, shuffled daily | 2026-09-06 | `01eafa5` |
| Every word Afrikaans, with a check that holds it | 2026-09-06 | `0e1b516` |
| Three fabricated masterclasses deleted | 2026-09-06 | `6fb25e6` |
| Spotlight's bars, on plays that are really counted | 2026-09-06 | `df2994b` |
| The card shape in the rest of the rooms, proved room by room | 2026-09-06 | `399426c`, `3e7c33a` |
| The wand fills a card in, one press | 2026-09-06 | `e2a985d` |
| Twenty-six prompt cards instead of an empty box | 2026-09-06 | `b3aab44` |
| CIPC 2026/714071/07 recorded; the number's shape checked | 2026-09-06 | `b3aab44` |
| The owner is reported, not implied by a letter arriving | 2026-09-06 | `0e5b58f` |
| The charts stopped publishing songs nobody shared | 2026-09-06 | `adef346` |
| The live room: two questions, messages, panels, a closed link list | 2026-09-06 | `c9c4075` |
| Connections on the profile; the engine bill removed | 2026-09-06 | `c398614`, `e98d21a` |
| The talking prompt cards, recording and all | 2026-09-06 | `HEAD` |
| Untrusted words cannot close their own fence | 2026-09-06 | `bfe8a2f` |
| The first hour, as one path with no dead ends | 2026-09-06 | `1ce3103` |
| The click-through probes run in CI at all | 2026-09-06 | `b9a2712` |
| Nineteen checks that ran nowhere now run, and must | 2026-09-06 | `HEAD` |
| An id cannot walk out of the folder it was put in | 2026-09-06 | `aba051c` |
| What every service still wants, and what the money does | 2026-09-06 | `HEAD` |

---

## H. Kling is out, and what that changed

Asked on 6 September: *"Ek gaan nie kling gebruik nie, net elevenlabs vir nou."*

Nothing had to be built for it. `video/index.ts` falls through any engine that
is not configured, so leaving `KLINGAI_ACCESS_KEY` unset removes Kling from
every list it appears in, and the `premium` grade simply stops being offered
rather than failing. Seedance and Veo both run on the ElevenLabs key that is
already there.

What it changed is the arithmetic, and `docs/KOSTE-EN-WINS.md` is the whole of
it, generated by `npm run costs:eleven` so it cannot drift from the price card.
The finding worth repeating here, because it is the one that decides things:

**On ElevenLabs' standard ladder only Business can ever break even.** Not
because the smaller plans are dear — they are cheaper — but because each plan
has a credit ceiling, and on Creator, Pro and Scale the members needed to cover
the fixed costs outnumber the members those credits can feed. Signing more
people up makes it worse. On Business, worst case, break-even is 128 members
against a ceiling of 136 — and putting the R4,000 of workshops back moves
break-even to 157, past what the plan can feed. So the workshops are not an
expense, they are a decision with a date on it.

Two levers move it, and both are hers:

1. **The free tier's music.** Nineteen free users behind every paying one, ten
   credits each, is more ElevenLabs credits than the paying member spends. Cut
   it to browser sketches only and the first viable plan drops from Business
   ($990) to Scale ($330).
2. **A custom plan.** The gap between Scale and Business is exactly where this
   business sits for its first year. `docs/DIENSTE-EN-KOSTE.md` has the four
   questions to put to them.

**What could not be checked from here:** every ElevenLabs price in that
document. elevenlabs.io is refused by the proxy in this environment, so the
four plan rows are what the code has been assuming, not what was read off their
page. That is the first thing the email has to confirm, and the whole answer
hangs on it.


---

## I. The CI job for the click-through probes, which did not work

Merged on 5 September with the claim that all twenty-six probes now run
anywhere. Running the group the way CI runs it failed five of six in the first
shard, and none of the failures was about the room being tested. Three faults,
found by running the group rather than the probes:

1. **Nothing started a server.** `firstscreen` and `studiohome` are the only
   two of the twenty-six that do not start their own — they went to :3000 and
   assumed one was there. On this machine one always was. Both start their own
   now, via `serve()` in `audit/where.mjs`.
2. **`signupcode` poisoned `.next` for everything after it.** It builds with a
   Supabase address in the environment, because `cloud.configured()` is read at
   build time, and that is the point of the probe. It never put the plain build
   back, so every probe after it in the group signed in through a project that
   does not exist and reported whatever room it was looking at as broken. It
   rebuilds plainly in its `finally` now.
3. **A probe that threw kept its server.** A `next-server` was found still
   holding a port from a run half an hour earlier, quietly answering the next
   probe that asked for it. `serve()` stops on process exit and kills the
   group, because `next start` forks.

And a fourth, in the probes rather than the job: ten of them slept a flat
1800–2800ms after submitting the sign-in form instead of waiting for anything. That is how long signing in takes on an idle laptop.
On a loaded one it is sometimes short, and the probe then drives the
signed-out page while believing it is in — which reports the room as broken
when the fault is the wait. They wait for the bottom bar now, which is on every
signed-in screen and no signed-out one, and appears in about 130ms.

The reason nine of the ten survived it is `click()`, which auto-waits — a
sleep that is too short is invisible right up to the first `count()`, and
`count()` waits for nothing. `photosong` is where it stopped being invisible:
it read a room it had not opened yet, found no file input, set no picture, and
reported "the picture is measured either way — nothing". A true sentence about
the wrong room.

`check:probes` reads the probes CI names out of the workflow and holds all of
it. Verified by putting each fault back and watching the run go red for that
fault alone. Its own first version of the last rule asked only whether a file
*named* the bottom bar, which `photosong` did — a rule a broken file passes is
not a rule, so it asks for a `waitFor` on it now, and that found seven more.

Two more, found only by reading whole failure logs rather than their first
lines:

4. **`check:photosong` had been broken since the prompt cards landed.** It
   addressed the picture input as the first `accept="image/*"` on the screen,
   which it was until twenty-six prompt cards were added above it with a camera
   of their own. From then on it filled the prompt cards' input, StyleFrom
   measured nothing, and the room was reported as broken. The input carries a
   `data-take="picture"` handle now. Same lesson as `data-card` on the talking
   cards: address the thing, not its position.

   This one is the argument for the whole exercise. It was broken for three
   days and nobody could have known, because the check that would have caught
   it could not run.

5. **`bringsong` pressed Studio through the screen it was trying to open.**
   After its reload the app comes back at the studio's own front door, which
   covers the header. Playwright said so for thirty seconds a run — "subtree
   intercepts pointer events" — and three runs were spent reading it as
   flakiness because only the first line of the error was ever looked at.

**Verified, 6 September:** all twenty-six run and pass, each one on its own
server and its own build, checked individually after the fixes rather than
taken on trust from a green group.

**A note for anyone running `npx tsc --noEmit` locally after a probe run:** the
probe-page probes build with a page in `app/`, delete the page, and leave
`.next/types` referencing it, so tsc reports a missing module that is not a
fault in the source. `rm -rf .next/types` clears it. Left alone rather than
patched into seven working probes: CI checks out clean, so it costs nothing
there.

**Also worth knowing:** building while a server serves the same `.next`
produces a build the browser cannot finish loading. Not a probe fault, but it
is an afternoon of looking for one.

---

## J. The afternoon she tested it on her phone

Six things found in one sitting, all real, and the pattern in them is worth as
much as the fixes: every one was a place where the app did something defensible
and said nothing about it.

**The language jumped on sign-in.** A language chosen in this browser is never
overruled; the account answers only when this browser has nothing stored.
Following the browser's own locale is a guess rather than a choice, so it stores
nothing — right, because a guess should not beat somebody who told us once on
another device. The hole is the moment in between: the page had been showing
English, she had been reading it, and signing in swapped it with no word about
why. The account still wins. It just says so now, with one press to go back,
and pressing it stores the choice so the notice never returns on that device.

**The live room's songs did not look like themselves.** `Cover` draws from a
hash of its seed, and the room seeded it on the *post* rather than the song. One
song had one picture in Make a song and a different one in the room — and two
different ones if it was posted twice. Seeded on `sourceId` now. The full-screen
player had no picture at all, which reads as a song that failed to load.

**Play played under the list.** The swipe screen — the thing the room is for —
could only be reached by pressing the picture. Two controls, one obvious and one
not, and the obvious one went to the lesser place.

**The bottom bar was eating the copilot's input.** The bar is `BAR_HEIGHT` of
content *plus* `env(safe-area-inset-bottom)`, because it pads itself away from
the home indicator; every page reserved the bare number. Short by exactly the
inset — 34px on an iPhone, most of a text field. Invisible on a desktop,
invisible in a screenshot without an inset, and invisible to anybody who does
not already know the bar pads itself. `barClearance()` and `check:tabbar` now.

**The share sheet never saved the file it told you to save.** Its own
instruction said "save the file", its own doc comment claimed it saved one, and
there was no button. The one step that needs the app was the one step missing,
which is what made a portal read as a list of links.

**The cancellation letter was correct and cold.** Every fact right and nothing
human in it. She asked for "'n mooi brief om te sê jammer dat hulle gaan".

### And the listen count

`events` carries a unique index over (kind, listener, thing, day). That index is
why the chart is honest — it stops somebody pressing their own song to the top —
and it threw the repeats away, so "my song was played 47 times" had nowhere to
come from. `supabase/listens.sql` puts a counter on the row that already
existed: the chart still counts rows, so it still counts listeners and is
unchanged, and the raw number is the sum of the counters. Both numbers on the
card, never one — "40 listens" alone would make a song one person played forty
times look like a song forty people heard.

**It counts from the day the file was run.** Everything played before it counts
as one listen each, and those repeats cannot be recovered.

### The scene window, and what was already there

Asked for an editable scene list and a storyboard showing each clip. Most of the
second existed: the board already held shots you could write, reorder and throw
away, each row already showed its clip with a trim. What was missing is the half
she named — the copilot could describe a music video in the chat and the person
had to retype it, shot by shot. `write_scenes` and `set_look` are registered
now.

The rule worth remembering: `write_scenes` replaces the list, and a shot already
generated has been paid for. Made shots survive, and survive first.

### Three questions answered rather than built

- **Lipsync exists** — `creatify-aurora` in the Video desk, invisible because
  `ELEVEN_AURORA_READY` is unset. It is a photo plus a voice recording, built
  for a presenter reading a script. Whether it holds up on singing is unknown
  and one clip answers it.
- **The code on sign-in** is on sign-up only, and that is the right choice.
- **Spotify and Apple Music cannot be uploaded to by anyone.** Not an approval
  queue — there is no artist upload API at all. Everyone goes through a
  distributor. Saying otherwise on a page of connection buttons would be the
  exact lie `ShareRow` was written to avoid.


## K. The bug class I shipped twice in one day

Three features went in that evening — the words of an uploaded song written out
by the app, the language rule pulled out of two React effects so it could be
tested, and the talking prompt cards. Two of the three shipped broken in exactly
the same way, and the second one is what turned a patch into a check.

**`callerFrom` reads the `Authorization: Bearer` header and nothing else.** No
cookie, no session fallback. That is deliberate and it should stay that way. The
consequence is easy to forget an hour later: a browser `fetch('/api/…')` that
sends no header is a 401 for *everybody*, however properly they are signed in.
It does not fail for some people, or intermittently, or under load. It has never
worked once.

`heardFor` posted `/api/transcribe` unsigned. That is the words button on a song
— press it, it spins, nothing happens, no reason given. I found it an hour after
reporting it done. `PromptCards` posted the same route unsigned. That is "say
one thing to a card, get a song", which she asked for this session and which I
also reported as done.

**Neither probe could have caught it, and that is the part worth keeping.** A
probe stubs the route it is testing. It proves the screen sends what the screen
means to send. It cannot prove the real route would accept it, because the real
route is not there. `check:makeroom` passed on both. So the answer is not a
better probe — it is a check that reads the code:

`scripts/check-signed.mts` walks `app/api` for every route that calls
`callerFrom` (40 of them), then every `fetch('/api/…')` in `app/components` and
`app/lib`, and requires an Authorization header on each call that lands on one.
83 calls. Two are exempt, by name and with a reason written next to them:
`engines.ts` asks `/api/music` what it can do before anybody has signed in, and
`collab.ts` hands `/api/collab/invite` to strangers by definition. The check also
asserts each exemption still points at a call that exists — an exemption must not
outlive the thing it excused, quietly covering a different call that grew into
its place later.

Verified the only way that counts: the header taken back out, the check naming
the file and the route and exiting 1, the header put back.

**The general shape.** Twice now the failure has been "the screen is right, the
wire is wrong, and the test stubs the wire". `check:reachable` came from the same
shape — buttons that led nowhere. Where a probe has to stub something to run, the
stub is the blind spot, and the blind spot needs a check that reads source rather
than clicks.

### What is still not proven

None of this proves the routes work against ElevenLabs, only that they will be
reached. Egress is blocked from here to elevenlabs.io, music.ai and the deployed
site. The first real recording she makes on the phone is still the first true
test of the talking cards, and if it fails now it will fail with a reason
printed, which it did not before.

## L. Three more of the same, and the one that was red on main

### The scene window's operations were registered and never offered

`write_scenes` and `set_look` went into the storyboard and `surfaces.ts` was
never told they exist. The copilot is offered the operations named in the
registry and nothing else, so it could still describe a music video in the chat
and she would still have had to retype it shot by shot — which is the exact half
of her ask that was missing before that commit.

`check:ops` catches it. I did not run `check:ops` before landing that commit, so
main was red from the moment it went in until it was found here. Every check
lands straight on main, main is what Vercel deploys, and a check that is only run
when somebody remembers is not a check. **The full source sweep is 44 checks and
takes about four minutes; run it before landing, not the three that look
relevant.**

### Sing over a song you brought in yourself

The selfie camera lives behind the words button on a card in the channel, and the
channel read `loadTracks()` only. Uploads live beside it on purpose — the channel
is what you made here, it syncs, it is what gets posted — so a recording she
already had never had a card, and so never had the camera. The booth has stood
the two side by side for months for exactly this reason.

They are shown now and still not *in* it. Three of the card's controls would be
false for a brought-in song and each is off: **Post to Live** would put it in the
public room under her recording name, which is a claim of authorship over a file
that may be anyone's — and the person that wrongs is not in the room to object;
**Cover art** bills a generation and files artwork on the account for a song the
account did not make; **the studio** regenerates from a plan a brought-in song has
never had.

### The take that did not have the song on it

The words screen recorded the stream `getUserMedia` returns — camera and
microphone — so the song reached the file only as room sound. On headphones it
did not reach the file at all, and headphones are how anybody sings along.

The clean copy is mixed in now, from a buffer source rather than an `<audio>`
element: an element routed into a Web Audio graph stays routed after the screen
closes, which is the objection that kept this unbuilt, and a buffer source does
not have it.

**It is a choice and the choice is real.** The microphone stays open, so a clean
copy while the song also comes off a speaker puts the song on the file twice,
milliseconds apart. No browser will say whether headphones are plugged in, so she
is asked — once, remembered, because it is a fact about her and not about the
song — and there is no Record button until it is answered.

Two failures in that screen are silent until somebody plays a take back, so both
are checked rather than trusted: the camera stream carries its own microphone
track and the graph carries the same microphone again, and putting both on one
file doubles every word she sings; and the shared element is muted while the mix
runs, so a path out of recording that forgets to unmute leaves every song she
plays afterwards silent.

### Where the bug class stands

Four instances now — two unsigned calls, one undescribed op pair, one screen
reading the wrong list. All four are the same shape: the feature was built
correctly and the thing that makes it reachable was not, and in every case the
room's own probe passed. Four checks exist for it now (`check:signed`,
`check:reachable`, `check:ops`, `check:broughtin`), and the general rule stands:
**where a probe has to stub or mock something to run, the stub is the blind spot,
and the blind spot needs a check that reads source rather than clicks.**

### Still not proven from here

Nothing in this section has run against a real camera, a real microphone or a
real deployment. Playwright is not launched with fake media devices, so no probe
exercises `getUserMedia` at all — the mixing is checked as a rule and as source,
not as a recording anybody has watched. The first take she films on her phone is
the first real test of it.
