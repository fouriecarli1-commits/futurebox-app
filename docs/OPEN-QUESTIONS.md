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
| A spending ceiling no scan could see | 2026-09-06 | `2e6af49` |
| Back out of the booth a step at a time | 2026-09-07 | `b5e6cea` |
| Afrikaans that is not Dutch, in one rule for eight routes | 2026-09-07 | `b5e6cea` |
| A probe page can no longer be committed beside its own template | 2026-09-07 | `f02476e` |
| One video room; the song walks into it from Make a song | 2026-09-07 | `ddf14e8` |
| The beat rule, and the two faults its first test could not see | 2026-09-07 | `16a0b61` |
| The copilot's box clears the bar, measured in a browser | 2026-09-07 | `b4b92ac` |
| Which song, and which five seconds of it, dragged | 2026-09-07 | `242fbbc` |
| The booth keeps a take that runs to the end of the song | 2026-09-07 | `2714c7e` |
| A page that falls over says so, in her language, with a way out | 2026-09-07 | `f293a3a` |
| Nine routes that promised a body the platform would not carry | 2026-09-07 | `4b0a859` |
| Lanes you can cut; `audit/mixdown.mjs` is a check at last | 2026-09-07 | `cf8d191` |
| Her videos are on her channel; the share sheet clears the bar | 2026-09-07 | `2ec6bac` |
| The song-link bar is out, with the paragraph explaining it | 2026-09-07 | `077eecf` |

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

## M. The line she was meant to sing, and four more of the same shape

### The one that matters

`FollowWords` drew the current line with `text-white` over `bg-scrim`.
Measured in a real browser: **rgb(19, 18, 17) on rgb(17, 16, 14) — a contrast
ratio of 1.02.** The line she is meant to read, invisible, on the screen whose
entire job is to show it to her while she films herself singing it.

`text-white` is remapped onto `--fb-ink`, which is near-black because it is
the ink colour for a light page. `LiveChannel` carries a comment about this
exact trap and the exact fix; `FollowWords` was never given it.

**It survived because it fails in the direction nobody looks.** The lines she
is *not* singing use `text-zinc-700`, and `zinc` is remapped onto the surface
family, which lands light — those measure 8.79 and look right. So the screen
reads as working: there are words on it, they move, and the only one missing
is the one in the middle. I began this expecting the opposite — that the zinc
greys would be the dark ones — and measuring is what corrected it.

1.02 before, 19.02 after. The selfie probe asserts it now: the sung line must
clear 4.5 **and be the most readable thing on the screen rather than the
least**. A screenshot did not make it obvious — at 1.02 on near-black it reads
as a design choice.

### What the sweep for that class turned up

Four searches were clean: no component is never mounted, no browser call goes
to a route that does not exist, all 1377 translation keys are in the
dictionary, no server route is unreachable. Three were not:

- **Eighteen variables** the code reads were in no document. The one that
  mattered: `NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS` has no default, so the front
  door plays no introduction at all to an Afrikaans visitor. Drawing nothing
  rather than an English recording is right, and is why nothing looked broken.
  `check:envdoc` holds it both ways now.
- **`audit/contrast.mjs` had never run.** It reads the real colour of every
  text node against what is painted behind it, it is careful — it even carries
  a fix for a bug where it skipped every room and called that a pass — and it
  pointed at `localhost:3000` without starting a server, so it was in no
  script and no CI step. Running it found nothing: 593 nodes, none below AA.
  That is a limit of its scope, not a clean bill of health — it stops at
  `z-50` and the invisible line was at `z-[100]`.
- **A browser probe in a job with no browser.** `check:selfie` went in as a
  step in the source job, which never installs Chromium. It passed locally and
  would have failed in CI on its first line.

### The rule, restated harder

`check:everycheck` passed that last one because it asked whether the name
appeared *somewhere* in the workflow. **Named is not run.** `check:probes`
rule 3 passed a leaking probe because it asked whether the cleanup was
*written down*. **Written down is not reached.** Both are the same mistake as
the bugs they exist to catch, made inside the checks themselves.

So: **the checks are not exempt from the thing they check for.** When writing
one, the question is not "does the code say the right thing" but "would this
fail if the thing were false". The way to know is to make it false and watch.
Every check landed today was verified that way, and two of them passed the
first time with the fault injected — the camera-button rule with a 400-
character window that was too small, and the contrast rule before it existed.

### Still not proven from here

No probe has ever run against the deployed site, a real ElevenLabs key, or a
real camera. Chromium's fake devices make the recording path testable and do
not make it true.

## N. Breaking the checks on purpose, and what a scan for it is worth

Twelve of the seventy-six have now been broken deliberately to see whether they
go red. Three did not, and each failure was a different shape.

**A tautology.** `check:prices` compared `videoCost(...)` against
`CREDITS.video * units * mult`, with the constant on both sides. Changing the
video rate moved both together: twenty-four green ticks, and the price a member
pays had changed. A price test's expected values are the specification, not a
re-derivation of the thing being tested.

**A clause that outlived its constraint.** `check:addons` asserted
`on conflict (reference) do nothing` and not the unique index that clause needs
to be legal. Take `primary key` off the column and the check still passed,
while Postgres would raise on every call and nobody would get what they paid
for.

**A subject nothing looked at.** `check:listen` is about tempo and key
detection. The listen count — both numbers, and the owner join that is the only
access control on a `security definer` function — was in the bundler and in no
assertion at all.

### Scanning for the class, and what the scan was worth

Two scans. The first looked for the tautology signature — the same imported
value on both sides of a comparison — and found ten lines, of which eight were
`f(a) === x && f(b) === y` split by the regex and fine. The two real ones are
low stakes and now pinned anyway: `MOST_SHOTS` and `MOST_TILT_DB` were each
compared against the constant that defines them, which proves the cap is
applied and says nothing about what it is.

The second looked for checks that match a regex against source without
stripping comments, so a comment naming the thing satisfies the claim. It
listed twelve. **The listing overstated it**: most test a small extracted
substring — `check:tabbar` matches `paddingBottom` values, where a comment
cannot appear — and the whole-file ones were the checks already verified
against real injected faults. Recorded because the risk is real in principle,
not acted on, because acting on it would have been twelve files of churn for a
fault nobody has produced.

Worth noting which way that one fails: a comment naming a *removed* thing
breaks a negative assertion and raises a false **alarm**, which somebody
investigates. `check:probes` actually suffered that. The false-pass direction
needs a comment containing the exact expression the check looks for, which is
rarer.

### The method, since three of my own injections did not land

A stale bundle, a comment edited instead of the code, and a regex that matched
nothing. Each looked exactly like a check that does not work, and one of them
had me three runs deep into concluding `check:security` was toothless when it
was not. **Confirm the injection landed before drawing any conclusion from
it** — print the changed line, not just the exit code.

## O. "Sing it", over a model built for speech

The Pro Booth's voice-change panel is titled **"Sing this in another voice"**,
its button says **"Sing it"**, and a credit cost sits on the same screen. Its
note was careful about one thing — it will not fix your singing, and it keeps a
wrong note as faithfully as a right one — and silent about the thing that
decides whether the result is worth buying at all.

Behind it is `eleven_multilingual_sts_v2`. Speech to speech. §A1 above records
that it handles singing badly; §9 of `docs/DIENSTE-EN-KOSTE.md` calls a real
singing model the one thing this app promises and cannot deliver. Money is
spent from that panel, so being told afterwards is being told too late.

The caveat is on the panel now, **above the cost** rather than below it, and
`check:voicechange` holds the promise rather than the phrasing: it must name
what the model is built for, in both languages, before the cost. Verified
against the caveat removed, the caveat moved below the cost, and the Afrikaans
reduced to something true but empty.

### What was already honest, checked rather than assumed

Worth writing down, because the alarming version of this finding would have
been wrong. The landing page and the plan descriptions promise your own voice
for **reading** and for podcasts — "Podcasts in your own voice", "cloned, for
reading and for the show" — and never for singing. The Voice Lab, which calls
the same route, is titled "Say it again in another voice": *say*, not sing,
which is the accurate word for a speech model. `check:voicechange` pins that
too, so the honest framing cannot drift into the other one.

So the gap was one panel, not a claim running through the product.

### And the audit directory, which looked worse than it is

Ninety-one files in `audit/`, twenty-eight wired as checks, two helpers —
sixty-one run by nothing. That reads like sixty-one abandoned checks. It is
not: **none of the sixty-one has a failure path at all.** They are screenshot
takers and walkthroughs, exploration tools that were never meant to pass or
fail, and they are correctly outside CI. `contrast.mjs` was the single one
written as a rule with a verdict, and it is wired now.

Reported this way on purpose. "Sixty-one unused scripts" is the kind of number
that costs somebody an afternoon and turns out to be nothing.

## P. The music video was in the room next door

"die music video het steeds nie 'n editing bar om woorde in te sit nie, en
goeie video editing funksies nie."

There are two video rooms and only one of them makes videos.

**Musiekvideo** (`studioTab === 'video'` → `MusicVideo`) was 172 lines: pick a
song, then one clip with a length and a shape.

**Videolessenaar** (`studioTab === 'canvas'` → `VideoCanvas` → `Storyboard`) is
nearly two thousand: the shot list, the look they share, the words burned onto
the picture, the trim, and the stitcher that cuts them into one file.

So everything that makes a music video sat in the room beside the one named
for it. **This is a correction, not just a finding.** When she asked for a
scene window — "daar is huidiglik geen so window waarin die scenes en styl van
die video kom nie" — it was built into the board, in the room she was not
standing in, and reported as done. She then had to say the same thing twice.

### What it is now

The room asks one question after the song — a music video, or one clip — and
the answer decides what is on screen. Both sets of furniture at once would be
the busiest room in the app, and "nie te besig nie" is a standing instruction.

The board is **the same component the desk renders**, not a copy. Two boards
drift, and the one that stops getting fixed is always the one somebody is
actually standing in. It is handed the song the room already asked about, and
hides its own picker when it has one: two pickers for one decision, in the
room whose entire subject is that song, is furniture pretending to be a
choice.

### The rooms are still two, and that is the part left open

`VideoPanel` — one clip — is arguably what a "Video desk" is for, and a
storyboard is what "Musiekvideo" means. Swapping them outright is a decision
about her product rather than a bug fix, so it has not been taken here. What
has been fixed is that the room named for the job can now do the job.

### Where the words come from

`Shot.caption` is filled from the shot's own quoted line the first time
captions are switched on, so the usual case is one switch and no typing. The
stitcher burns them into the picture rather than carrying a subtitle track,
because a track is words nobody sees once the file is in a phone's gallery.
Both ends are asserted by `check:videoroom`, at her end and at the encoder's.

---

## Q. A spending ceiling nothing could see

`ELEVEN_VIDEO_CREDITS` capped what the app would spend on video generation.
It was read as `process.env[`ELEVEN_${KIND}_CREDITS`]` — the name built at
run time out of a variable — so no scan for `process.env.X` could find it, it
appeared in no document, and nobody could see it was there.

She asked the right question when it surfaced: *"Gaan dit oor krediete
beperking van die verskaffer se kant af? Of my krediete wat op raak?"*

**Neither.** It is a dial in her own app: how much of an ElevenLabs generation
this app is willing to buy on somebody's behalf. Raise it when the account is
comfortable and the demand is real; lower it if a month is running away. It
was always there and it belonged in `docs/SWITCH-ON.md`, where it now is.

The fix that mattered more was the scan: `check:security` derives the list of
secret names from `process.env.X` across `app/`, so a key assembled from a
template literal is invisible to it. Computed keys are named in the document
now, and the doc is checked.

**And the check bit me back.** My own doc-comment `process.env.X` was picked up
as a secret named `X`, so `check:security` searched every client chunk for the
letter X and failed. That was the comment-stripping weakness I had catalogued
earlier the same day and explicitly decided not to act on. Comments are
stripped now and names under four letters are ignored.

---

## R. Out of the booth a step at a time, and Afrikaans that is not Dutch

Two from the same message.

*"Binne pro booth is daar nie 'n manier om back te gaan nie, die foon se bak
knoppie spring na die groot home page."*

The phone's Back button walked the app's own layers — but only the layers
`page.tsx` knew about. Every overlay a room opened for itself was invisible to
it, so Back from inside the Pro Booth left the whole studio. `useBackLayer`
lets any overlay register itself as a layer; the Pro Booth, the words screen, a
full-screen song, the collab room and the theme studio all do. `check:backlayers`
holds it.

*"Die prompt in copilot is ook geneig om nederlands te prompt met afrikaanse
goed."*

Fifteen routes write Afrikaans and exactly one of them warned the model off
Dutch. `lib/server/afrikaans.ts` is that rule, in one place, applied to eight:
jy not je, die not het, nie not niet, and the double negative Afrikaans
actually uses. The copilot now sends which language it is being spoken to in.

`check:afrikaansrule` had to be rewritten before it was worth anything: its
first version matched the *name* `AFRIKAANS_RULE`, which the import line
satisfies, so deleting the rule from the prompt still passed. Imported is not
used, the same way named is not run.

---

## S. A probe page on `main`, and a race I had already dismissed

`app/videowords/page.tsx` — a test page, not part of the app — was committed to
`main`. It happened by running `git add -A` while a probe was mid-run: the
probes copy `page.probe.tsx` to `page.tsx`, build, measure, and delete it.

Earlier the same afternoon I had noticed exactly that race and dismissed it as
harmless because "in CI they are separate jobs". **The working tree is not two
jobs.** `check:probes` now refuses any `page.tsx` committed beside a
`page.probe.tsx`.

---

## T. One video room, and the song that walks into it

Left open at the end of section P: two rooms, one named for the job and the
other able to do it. Settled by removing the room rather than by swapping them.

**Musiekvideo is gone.** Pressing "maak 'n musiek video" in Make a song now
takes her to the Video desk with the song already in it, ready to prompt, with
the lipsync panel there. `check:videoroom` asserts the whole hand-off: the
offer goes to the desk, the desk is handed the song, the desk passes it to the
board, and the board stops asking once it has one.

### Which song, and which five seconds of it

*"as op die music video kies, dan moet hy vir my dadelik opsies op pop van my
liedjie, en 'n knoppie om een te kan upload. Dan moet die liedjie in 'n sound
bar gesit word met twee dragging lines wat gecap word op die lengte wat die
video lengte opsie gekies word."*

The desk had a song picker. It was at the foot of the storyboard behind
`board.shots.length > 0`, so it only appeared once a shot had been written —
which meant somebody who arrived with a song already made was shown a prompt
box and no way to name it. **A control that cannot be found is a control that
does not exist.**

`SongWindow` is under the Music tile now, the moment it is pressed: her songs
as buttons rather than behind a dropdown, a button to bring a file in, the song
drawn as its own waveform measured from the file, and two lines that drag. The
window is exactly as long as the video, because the film is five or ten seconds
and a shorter window would have to explain the silence.

On a song this app wrote, the sections are named along the bar — dragging to
"Chorus" beats dragging to 0:24 — and the start snaps to the beat, guarded by
`sane(bpm)` rather than a truthy check, because a row carrying 0 or 6000 would
drag the window to a grid that is not the song's.

No video engine takes an audio file, so the song is laid under the finished
clip by `lib/stitch.ts` in a second pass. That costs real time and the panel
says so.

### The beat rule, and two faults the test could not see

`lib/onbeat.ts` holds the arithmetic. Writing the check found two things worth
keeping: it passed with `floor` substituted for `round`, because every case
happened to fall under half a beat; and one branch was unreachable dead code.

The same trap showed up again in `check:songwindow`, which dragged to the
midpoint of the bar — exactly 32 beats at 96 BPM — so the beat assertion passed
whether the snapping ran or not. It drags to 0.53 now.

---

## U. Four wrong ways to measure a screen

Two of her reports, and the same lesson four times.

*"copilot se promting baar is nogsteeds weggesteek agter die button bar heel
onder."* — said twice, the second time after it was supposedly fixed.

`check:tabbar` was green both times, and reading what it asserts explains why:
it reads `paddingBottom` values out of `page.tsx` and checks each one calls
`barClearance()`. That is a rule about the page's padding. It never opens a
browser and cannot see whether the box a person types into is reachable.

*"die bars is oor al oor mekaar gedruk"* — the share sheet, with a photograph.
The sheet is `z-[92]`; the tab bar is `z-[95]` and opaque, so the app's own bar
was painted over the foot of a modal sheet, and the foot is where the platform
buttons are.

Both are fixed. What is worth writing down is the measuring:

1. **It scrolled the wrong thing.** The studio scrolls inside a fixed layer
   with the body behind it set to `overflow: hidden`. The numbers came back
   byte-identical twice, which is the tell that nothing moved.
2. **It measured the wrong element.** In Make a song it picked the song title
   field. `data-copilot-ask` and `data-share-sheet` exist so a probe cannot
   drift onto a neighbour.
3. **It scrolled too far.** Scrolling `html` carried the input 1788 pixels
   above the fold, and the check passed, because nothing off the screen can
   overlap anything. **A pass earned by hiding the element is worse than the
   failure it replaced.**
4. **It measured at the wrong size.** 390x844 with default text found nothing
   at all on the share sheet. Her screenshot is Samsung's in-app browser with
   the system text scaled up — 390x640 and larger letters. A sheet that only
   breaks there is not a sheet that works.

And a fifth, which is the one to remember: the share-sheet check tested only
*buttons*, so it went green while she was holding a photograph of it failing.
What lands in the dead band under the bar depends on how much content the sheet
happens to have. The rule is about the sheet now — nothing may be painted over
any part of it.

---

## V. The booth threw away every take that ran to the end

*"met die booth is daar nogteeds probleme."*

I asked which booth and what she was seeing. That was the wrong move: the room
is here and it can be pressed. `audit/boothwalk.mjs` walks it from the front
door at 390x844 with a real song and Chromium's fake microphone.

The take does not come back. The Stop button disappears on its own at nine
seconds — the song ending — with the keep button still dead.

The audio element's `ended` handler was `setPhase('idle')` and nothing else. So
the song runs out, the phase goes idle, Stop disappears and Record comes back,
while the `MediaRecorder` is still running and nobody ever calls `stop()`.
Everything she sang sits in `chunksRef` with no way to reach it, and the
microphone stays open.

**The only way to keep a take was to press Stop before the song ended, which is
the one thing nobody does.** You sing to the end.

Before concluding any of that I measured the microphone itself — four seconds
at full level through the same `getUserMedia` the booth uses. A probe that
reports a room as broken when its own rig failed is worse than no probe, and
this one had already misread the room twice.

---

## W. A white screen is never an acceptable answer

*"I accidentally went out of videodesk, and now when I want to go back in, it
only shows a white screen."*

There was no error boundary in this app at all — no `app/error.tsx`, no
`app/global-error.tsx`, no `componentDidCatch` anywhere. Anything that threw
while drawing, and any piece of JavaScript that failed to arrive, emptied the
page and left nothing: no words, no button, and no way to tell a broken app
from a phone that had lost its signal.

I could not reproduce her crash — in and out of the Video desk three times,
Music video pressed and left and returned to, the phone's Back button through
the whole stack, no error. What that leaves is the ordinary explanation: two
deploys went out while her page was open, and a page left open across a deploy
asks for a piece of itself by a filename the new deploy does not have.

Both boundaries exist now, in Afrikaans and English both — because the thing
that broke may be the thing that knows which language she reads — and with a
reload as the only button on a stale bundle, since a retry redraws the same
tree and asks for the same missing file.

---

## X. The 4.5 MB wall, which nine routes walked into

*"Ek sien die measure the mix gooi 'n 413 warning en dat klank nie geseperate
kan word nie."*

A serverless function on Vercel refuses a request body over about four and a
half megabytes, **at the edge, before any of this app's code runs**. So the
route's own ceiling was never consulted, its message was never said, and what
came back was a bare 413 with no body.

Nine routes claimed more than that:

| Route | Claimed | Real ceiling |
|---|---|---|
| `/api/analyse` | 60 MB | 53 seconds of WAV |
| `/api/episode` | 114 MB | the same |
| `/api/dub` | 100 MB | the same |
| `/api/finetunes` | 100 MB | never worked at all |
| `/api/voice/clean` | 57 MB | the same |
| `/api/stems` | 25 MB | the same |
| `/api/transcribe` | 25 MB | the same |
| `/api/voice/change` | 25 MB | the same |

`/api/analyse` posted `lane.wav` — 88 kB a second at 44.1 kHz mono — so reading
a song stopped working at fifty-three seconds. Training a sound needs a handful
of whole songs and has never worked for anybody with real music.

The browser puts a big file in storage itself now, in the folder inside its own
account the bucket policy already lets it write to, and posts the key.

**A key and not a URL.** A route that fetched any URL handed to it is an open
proxy — the rule `/api/analyse/part` was written under — and it does not bend
for a bigger file. `workPath` pins the key to the folder of whoever's token
signed *this* request, matched whole and refused rather than repaired.

`check:bodylimit` is the rule, and it found two routes I had missed after I
thought I had the list. Its own first version did not match `audioListFrom(`
against a pattern for `audioFrom(` — the substring is `ListFrom` — so it called
training broken after training was fixed.

---

## Y. Lanes you can cut, and a probe that was running nowhere

*"Moet die booth ook nie opsies hê om klanke op te laai nie? ... Ek dink maar
net of klanke gecut kan word? Dat verskillende klank bane onder mekaar kan sit
en uit eindelik geedit kan word?"*

Checked against the code rather than answered from memory. **Three of those
already existed** and the problem is that Pro sits three levels down, behind a
button inside an opened song:

- bringing sounds in — "Bring audio in", several files at once
- lanes stacked under each other, with levels, mutes and solos
- stem separation per lane, tone shaping, voice change, mix and master

**Cutting was the real gap.** A lane now carries `from` and `to` and each row
has two edges to drag. It is a cut and not a deletion: the recording underneath
is untouched and the whole shape is still drawn, faint where it was trimmed, so
an edge drags back out again by eye.

Trimming the front keeps the audio still on the clock — `at` moves by exactly
as much as `from`, so a note on beat three stays on beat three. Which turned up
a trap: `change` snaps `at` to the grid whenever `at` is in the patch, so a head
trim would have slid the lane by up to half a beat on every drag while the drag
fought the grid.

`startLane` is one function because it was two. And what gets separated or
voice-changed is the piece that plays, so a lane trimmed to its chorus is not
billed by the minute for the verses she cut out.

**`audit/mixdown.mjs` was wired to no check script at all.** It has been sitting
in the repository being run by nobody — which `check:everycheck` could not see,
because it only inspects things already called `check:`. It is `check:mixdown`
now.

### Still not built

- a library of instrument samples
- one AI button that balances the lanes: the pieces exist (measure, match
  loudness, master) but nothing presses them together
- **findability of Pro**, which is nearly free and is why she asked for three
  things she already had

---

## Z. Her video, and a promise nothing kept

*"Ek het nou net 'n video gegenerate, en toe gesê sit dit in my channel, en nou
kry ek dit nie in my channel nie."* Then: *"Kan jy asb ook daardie video vir my
soek? want ek kry dit meer nerens nie."*

It was not in the channel because nothing ever put it there, and nothing could.
A generated clip is kept under the room that made it, and the only two places
it appeared were that room's own history and the Find tab. The Library tab
opens the channel, the channel held songs and nothing else, so **"my channel"
was the one place a video could not be.**

Worse than missing: the copilot's next step out of the video desk said "Put it
on your channel", and out of the hooks desk too. There was no action anywhere
that put a video on a channel. **Somebody who asked for one was told it had been
done.** Both say "See it on your channel" now, which is true.

The channel has a Your videos card, from every room, covering both `video` and
`clip` — a single-kind filter would have shown her half of what she was looking
for and looked like it worked.

---

## AA. The link bar, taken out

*"as ons daai funksie van die links nie kan gebruik om na die styl van die
liedjie te luister nie, dan moet ons dit uithaal, asook die description oor wat
die link bar doen."*

She asked for it in the first place. What got built could not do it:
downloading the audio behind a YouTube, Spotify, SoundCloud, Apple Music or
TikTok link breaks every one of their terms, so it read the song's *name* off
the site's oEmbed endpoint and asked a model what music by that name sounds
like.

Which meant the screen carried three sentences saying it does not listen,
under a bar that looked exactly like the two beside it that really do measure a
file. **A control that needs a paragraph of apology under it is a control that
does not work, and the paragraph was the tell.**

Out in one piece: the bar, the explanation, the route, `lib/server/songlink.ts`,
`check:songlink` and its CI step, six dictionary entries, and the entry in
`check:asdata`'s list of routes to guard. `check:makeroom` asserts the opposite
of what it used to.

My first pass at editing that probe cut across a `try` block and left the file
unparseable, and **the source sweep went green anyway** — `check:makeroom` runs
a browser and is not in it. A file that cannot be parsed is not a check that
passed.

---

## What is still Carli's, as of this session

Unchanged from section E unless noted:

- **The legal entity.** CIPC `2026/714071/07` is recorded.
  `FUTUREBOX_LEGAL_NAME`, `_ADDRESS` and `_PHONE` are hers to set in Vercel.
  No placeholder registration number is published.
- **Singing voice conversion.** Still the one gap between a made song and her
  own voice. Stems and cloning are ElevenLabs and are built; step three needs a
  *singing* model — Moises Voice Studio over Music.ai, or Kits.AI. Neither is
  wired.
- **The booth's remaining asks**: instrument samples, and one button that
  balances a mix.
- **`ELEVEN_AURORA_READY`**, the Spotify keys, the mail variables and the three
  secrets, the Paystack plan codes, the Music.ai workflow slugs, the trademark
  classes and the POPIA information officer — all still as listed in section E.

### One question of hers still unanswered

*"Hoe gaan ons die github situasie uitsorteer?"*

Not answered, and it should be. What is known from this side: `git` itself
works — fetch, push and `git ls-remote` all succeed — and every commit in this
document reached `main`. What has repeatedly failed is the **GitHub MCP
server**, which times out at thirty seconds, so from here I cannot read whether
the CI job that runs these 88 checks is green. The checks are run locally
before every push, which is why the numbers in this document can be trusted;
the state of the run on GitHub cannot be, because nobody here has been able to
look at it.

That is a connection problem rather than a repository problem, and it is worth
her deciding whether it matters: if the pushes land and the local sweep is
green, CI is a second opinion rather than the gate.

### And one asked and answered, kept because the answer was easy to miss

*"het jy lipsync al ingewerk vir musiekvideos?"* — yes. `Presenter` is in the
Video desk, behind `ELEVEN_AURORA_READY`. It carries a caveat in as many words:
it is a lipsync model given a photograph and a *spoken* reading, and whether it
holds up on singing has never been tested. One clip would answer it.

---

# Session: the permission, the counts, and thinking like a musician

## What landed

Nine commits, all fast-forwarded onto `main`. 123 checks now run in CI, up
from 113.

| | |
|---|---|
| `33d437d` | The question asked before a song may be built on; six modal scrims fixed |
| `eb65a18` | A shared song can be cut, and started from, in Hooks |
| `caabf82` | A play counts once 65% has been listened to; the count on the row |
| `2a8bfd3` | `docs/MUSIEKDENKE.md` — the plan for teaching musical thinking |
| `6536aaf` | §3.1 A song drawn as its own shape |
| `4bcc0b8` | §3.4 A take engraved on a stave |
| `469fcfa` | §3.2 Every measurement says what it means |
| `284de09` | The header showed one person's handle to everybody |
| `7c6b745` | §3.3 The hook finder says *what* arrived |
| `c13ef61` | §3.6 The Pro Booth counts bars |
| `be4b208` | §3.5 The stave and the bar number explained; §3.5 closed |

`docs/MUSIEKDENKE.md` is complete: all six pieces built.

## Answered this session

**"hoekom is die live room empty? is daar 'n tyd wat musiek verdwyn?"**

Nothing expires. `live_posts` has no age filter and nothing deletes from it.
The only thing cleaned on a clock is `live_here`, the presence list — counted
over two minutes, swept after an hour. A song leaves the room when its maker
takes it out, or when an account is deleted and the row cascades. An empty
room means nothing has been put in it.

Her photograph also answered a question she had not asked, and it was a real
fault: see `284de09`.

## Still hers, and new since the last section

- **`supabase/buildon.sql` must be run again.** It gained
  `style text not null default ''`. Confirmed run — both columns verified in
  her SQL editor this session. *(Done.)*
- **Nothing else new.** Everything in the previous "What is still Carli's"
  section stands unchanged.

## The commercial licence, settled in writing

ElevenLabs support answered the legal question on **9 September 2026**, in
writing, to a direct question from her. Recorded here because it is the sort
of thing that gets remembered as roughly the opposite of what was said:

- **The Pro plan carries a commercial licence** covering music generated
  through ElevenLabs, the API included. So a member's song may be sold,
  streamed, put in their own videos, and played at a gig.
- **No attribution is required on a paid plan.** This was the open question —
  TONE3000 asks for its name on the product and it was reasonable to assume
  ElevenLabs might too. It does not. Nothing in this app has to carry their
  name, and nothing does.
- **Film, television, radio and studio games are carved out** and need an
  Enterprise Music plan. This is the one new fact, it affects every member,
  and it is now stated in `app/terms/page.tsx` rather than left under "satisfy
  yourself that you are entitled to". The terms date moved to 9 September 2026
  and `handbook.generated.ts` was rebuilt, so the help assistant answers it too.
  Terms: <https://elevenlabs.io/music-terms> and
  <https://elevenlabs.io/eleven-music-model-specific-terms>.
- **No certificate, registration or form** is needed to use ElevenLabs or its
  API in a business. Agreeing to the standard terms is the whole of it. This
  is separate from CIPC, which the ECT Act wants for a different reason —
  see the legal page.
- **Cloned voices are her responsibility**: the voice must be the member's own
  or the owner's explicit consent must be held. Already built and already
  stronger than a tick box — `app/api/voice/clone/route.ts` refuses without
  `consent === 'own-voice'` and writes the consent text, the moment and a
  hashed address into the row. See `supabase/moderation.sql`.
- **SOC 2, HIPAA and GDPR documentation is Enterprise.** Not needed for a
  South African consumer product under POPIA, and worth knowing before a
  business customer asks. <https://compliance.elevenlabs.io>.

**Still genuinely open, and worth one more question to them:** whether the
licence passes *through* her workspace to her members. Every generation on
FutureBox happens on her Pro key, so the licence is hers; whether she may
grant her members the commercial rights that `app/terms/page.tsx` promises
them is a different question, and their answer did not reach it. It is not a
reason to hold anything up — it is the ordinary shape of a platform reselling
a service — but it should be asked plainly rather than assumed.

## The voice wall, both halves (#117)

The listing half was fixed earlier: `stockVoices()` asks the paginated
`GET /v2/voices?category=premade&page_size=100` and keeps the unbounded v1
call underneath as a floor.

The wall itself is now guarded too. Every member's cloned voice takes a slot
on the one ElevenLabs workspace and holds it until the voice is deleted, so
the slots run out under everybody at once — and the per-member cap in
`/api/voice/clone` cannot see that, because it counts a different thing.
Before this, the member recorded a minute, was charged, was refused upstream,
was refunded, and read ElevenLabs' English sentence about an account limit
they have never heard of. Then so did the next member, and nothing told Carli.

Now: `voiceRoom()` reads the slots, the clone route asks **before** charging
and refuses with `voice_slots_full` (its own code, its own Afrikaans, and
deliberately not the per-plan cap's "remove one first" — there is nothing of
theirs to remove), a landed clone takes a slot locally so a burst inside the
cache window cannot all read the same "one left", and `watchVoiceSlots()`
writes to her at 50/75/90/100% on the same steps as the credits.

**Two field names that are documented and not observed**: `voice_limit` and
`voice_slots_used` on `GET /v1/user/subscription`. This machine cannot reach
elevenlabs.io, so the direction of the unknown answer is the design:
`voiceRoomFrom()` returns `null` — could not ask — for a missing field, a
wrong type, a misspelt name, a limit of zero or a negative count, and the
clone route lets the clone **through** on null. One mistyped field name must
degrade into a confusing upstream error for one member, never into voice
cloning switched off for the whole site with a reason that is not true.
`check:voicewall` puts nine such shapes through it.

**How she confirms it**: `/api/allowance?key=…` now reports `voiceSlots`. If
it says `used`/`limit`/`left` with numbers, the field names are right. If it
stays `null` with the note about field names, they are wrong and the guard is
doing nothing — which is the safe direction, but it is not the working one.

## Kits, measured — 9 September 2026

Her `/api/kits/setup` run against the live account, which closes one long-open
question and half-opens another.

**`POST /voice-models` answers 404. There is no create over the API.** Voice
training cannot come inside The Booth. Not because it has not been built —
because Kits does not offer it. This is worth stating carefully, because the
app got it wrong twice in one day in opposite directions: Kits *does* clone
voices for singing, it is the product, and it is what the subscription pays
for. It happens on their own site. Their API lists voices and sings in them.
So the link to kits.ai is not a hole being papered over; it is the only door
there is. `HowToTrain` says that now, with the date.

**`POST /voice-blender` answers 422 with no field names.** The whole body is
`{"error":"E_VALIDATION_FAILURE: Validation Exception","code":"E_VALIDATION_FAILURE"}`.
So the address is real, it takes a POST, it refused this body on its contents
— the blender is buildable — and it will not say what it wants. `fieldsIn`
correctly found none rather than inventing one. `blenderShape()` now hunts by
elimination: five plausible bodies, each still short of a real blend so each
refused and nothing created, watching for the error code to stop being
`E_VALIDATION_FAILURE`. It runs from the setup page only when the plain ask
named nothing.

**No trained voices on the account at all.** "stemme op die rekening: geen".
So "Sing it in my voice" currently offers only Kits' stock catalogue — which
works, and is not her voice. One voice trained at kits.ai fixes it, and the
number goes in the field that is already there.

**16 of 400 download minutes used.**

## ElevenLabs: the downstream licence is NOT covered on Pro

Asked and answered, 9 September 2026, after the first answer left it open:

> "the scenario you're describing — where your end users receive and
> commercially sell AI-generated output produced under your API key — is a
> platform/B2B2C arrangement that is not explicitly covered by ElevenLabs'
> self-serve plan terms."

**This makes `app/terms/page.tsx` over-promise.** It was rewritten this
morning to say "You may sell what you make", on the strength of their first
answer about the account holder's own commercial use. Their second answer says
that licence does not extend to members. Nobody is paying yet, so nobody has
relied on it, but the promise is live on the site and it is hers to decide:
soften it now, or leave it and close the gap with an Enterprise agreement
before launch. It should not simply be left un-decided.

A requirements document for that conversation was written for her:
downstream rights first, then the scale numbers (Pro carries 20–33 members
against a 5,000–10,000 launch, and their ladder has no volume discount), voice
slots, POPIA/GDPR and consent, the film/TV/radio carve-out, Seedance, and
operations.

## Two numbers ElevenLabs has not published (#112)

`/api/align` is new and calls `POST /v1/forced-alignment` — the words we
already have, placed against the audio instead of transcribed back out of it.
It is the better answer for a sung Afrikaans line, because a transcriber has
to work out *which* words as well as when, and a mis-heard word is not a
timing problem. It also reports a `loss`, which is the first confidence signal
anywhere in the timing ladder: `heard` has none, so a bad transcription has
always looked exactly like a good one.

Two things about it are unknown and are treated as unknown rather than
guessed:

1. **What it costs.** Their page does not say. The member is charged what a
   transcription of the same length costs — the call it replaces — so nobody
   is worse off than today, and the real figure arrives on the first live
   call: `noteCost` reads `character-cost` off the response and logs it.
   **When that number is known, revise the charge.** Charging nothing until
   then would have left a paid call with no ceiling.

2. **What a bad `loss` looks like.** Their scale is undocumented and this
   machine cannot reach the API. `POOR_LOSS = 1` in `app/api/align/route.ts`
   has never been checked against a real answer and says so in its own
   comment. It refuses nothing — it only sets a flag the client uses to drop a
   rung — and the raw number goes back on every answer, so the first real
   songs settle it.

**The dub's own transcript is now read (#112's fifth source).** Every dub
anybody has made on this app has carried word-level timings in both languages
and a finished SRT, on ElevenLabs' side, paid for, and nothing ever asked for
them — `dubbed()` fetched the audio and stopped. `/api/dub?collect=words` and
`?collect=srt` read them, off the same GET and behind the same ownership check
as the audio, because a second route would be a second copy of that check.
`?lang=source` gets the original rather than the target.

`/api/translate` stays exactly as it is. It holds the line count on the way
back — "a subtitle that is one line out for the rest of a song is worse than no
subtitle" — and it is the right answer for a **song**, where this app owns the
words and there is no dub to ask. Only a dubbed episode gets the dub's own
transcript, and it wins there because it is the translation that was actually
spoken at the times it was actually spoken, so it cannot drift from the audio.
`check:dubwords` holds both halves of that, including that the translate route
is not deleted to "simplify".

**What is still #112's and not built:** the `spoken` rung. TTS
`/with-timestamps` gives character-level alignment free with every read, and
`speakStream` is the caller that matters. It was left because
`/stream/with-timestamps` returns newline-delimited JSON rather than mp3
bytes, and `/api/voice/speak` pipes its body straight to the browser as
`audio/mpeg` — so taking the timings means transforming the stream server-side
and finding somewhere to put the alignment, which arrives only once the stream
ends. Streaming there is load-bearing (first sound in about a second, and a
long read that has not finished inside the five-minute function ceiling fails
outright), so it is worth doing properly rather than quickly. The dub
transcript (`GET /v1/dubbing/{id}/transcript/{lang}`) and
`/v1/music/detailed` are also still untouched.

## Their model numbers, read instead of assumed

`GET /v1/models` was in nothing. It carries four fields this app had been
guessing at, and `/api/allowance` now reports the two models we name against
what we assume:

- **`maximum_text_length_per_request`** is the one that can bite. The biggest
  plan lets somebody send a **12,000-character** script (`PODCAST_CAPS.label`
  → `speakChars`). If a model takes less, that read is charged here and
  refused there — the 4.5 MB wall (#90) all over again, and invisible for the
  same reason: nobody asked. The page prints the comparison and says which of
  `speakChars` or the script to change. **Open until she runs the page:**
  whether there is anything to fix.
- **`model_rates.character_cost_multiplier`** is what they actually bill,
  against `lib/credits.ts`, which is a number worked out from a document.
  `cost_discount_multiplier` sits beside it and is exactly the field an
  Enterprise agreement moves — worth watching before and after that
  conversation.
- **`languages`** says which models know Afrikaans. `/api/voice/speak` picks
  `eleven_v3` for a wide script on the strength of a comment; this is where
  that stops being a comment and bears on #115.
- **`concurrency_group`** is how many members can generate at once, which is a
  launch number rather than a curiosity.

`check:elevenmodels` drives the reader over five shapes that are not an
answer. An unreadable list comes back null — could not ask — and never an
empty one, because an empty list of models reads as "there are no models" and
the app would then have nothing to say about its own prices with complete
confidence. That is the sixth time that distinction has been made today.

## "Could not ask" rendered as "none" — a class, now ratcheted

Six times on 9 September 2026, in six unrelated places, none of which looked
like the others: `/api/live`'s hearts and plays, `stockVoices` returning `[]`,
`check:sing`'s `indexOf` answering −1, the voice-slot reader that would have
refused every clone on the site over one mistyped field name, the Kits blender
hunt reading a 429 as an answer, and `/api/account`'s delete.

Six is a class. The tab-bar faults went the same way and were ended by one
exported number and one probe; `check:couldnotask` is that, for this.

**The one that cost the most.** `/api/account`'s DELETE read the member's
cloned voices and, on a failed read, looped over nothing — then deleted the
account, cascading the `voices` row away with it, and answered
`deleted: true`. A recording of somebody's voice stays on ElevenLabs with no
row pointing at it, after this app told them it was gone. The terms and the
privacy policy both promise otherwise. It now refuses, like the subscription
step above it does, because at that point nothing has been destroyed and "try
again" is a real answer; the file-bucket listing reports into `left` instead,
because by then things are already gone and stopping cannot put them back.

**The check is a ratchet, not a wall.** Sixty reads in this app discard their
error and most are right to — a `maybeSingle` for ownership genuinely means
"not found". The narrow shape that has bitten every time is a read whose
failure turns into an empty list or a nought that somebody is shown. Fifteen
of those exist; every one is named with the reason it is harmless, a new one
fails the run, and the count cannot rise.

Two of its own bugs are worth recording, because both were found by the check
catching itself rather than by review. A trailing `\b` after `[]` meant the
pattern matched five of sixteen — `]` followed by `)` is not a word boundary.
And it walked past `((data as Row[] | null) ?? [])` until it learned to see
through a type assertion, which is how it found `purchaseLevel`, a case two
earlier sweeps had both missed.

## Open, and worth a decision

- **Does anybody pay yet?** Still unanswered, and it still decides whether the
  Paystack plan codes can simply be swapped or need a migration. It also
  decides whether the terms change of 9 September owes anybody an email: the
  document promises notice before a change takes effect, and with no paying
  members there is nobody to notify.
- **#119, the brake on the ElevenLabs allowance.** Still held at her
  instruction — "Moet nog nie bou nie" — pending ElevenLabs' reply.
- **Voice Blender's request fields**, `/api/kits/setup` for the
  `canCreateVoices` answer, and the pronunciation-test voice id (#115). All
  still waiting on her.
- **The GitHub MCP question**, unchanged and still worth her deciding: pushes
  land and the local sweep is green before every one of them; CI is a second
  opinion that nobody from this side has been able to read.

## What I would do next, in order

1. **#100, Kits.AI everywhere.** The largest thing still open that is not
   blocked on somebody else. Voice training is the half she named as missing
   and it is the reason she bought the product.
2. **#117, the voice list stops at 500.** Every member adds a voice, so this
   is a wall the app walks into on its own schedule rather than on anybody's
   decision. Cheap now, expensive at 500 members.
3. **#112 and #114**, both ElevenLabs cleanups: take the read's timings from
   their response instead of paying to transcribe them back, and move off the
   dubbing path they have labelled legacy.
