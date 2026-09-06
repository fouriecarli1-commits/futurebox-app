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
