# Packaging: what to take from the screenshots, and what to leave

Carli sent nine screenshots of Suno's Android app (September 2026) with one
instruction: *"Dit is wat ek wil hê vir ons app, net met al ons ekstra oulike
goed by. Die oulike goed waaraan ons gewerk het moenie wegval nie, dit moet net
soos in hierdie prente eenvoudiger verpak word."*

So this is not a feature list. Everything in this app stays. This is about how
it is **packed**, and the screenshots answer that question in one sentence:

> A tiny permanent surface, and everything else folded behind a chevron, a
> chip, or a mode switch.

---

## 1. The single most important idea in the screenshots

**Simple / Custom / Advanced.** The Create screen's title is a dropdown that
says "Advanced". That one control is how an app carrying a professional DAW's
worth of features still opens as one box and one button.

We have been trying to solve "too much writing on screen" by taking things
away. That is the wrong lever and it is why four working features got hidden
once already. The right lever is a **mode**: the app opens in the simplest
mode, and every knob we have built lives one tap deeper, in the same place,
always findable.

Nothing is deleted. Ever. That is the rule this document exists to protect.

---

## 2. The shape of the app

### Five tabs, at the bottom, on every screen

Suno has exactly five and nothing else: feed, search, create (centred and
highlighted), library, profile. No rail. No dropdown. No hamburger.

We have thirteen rooms. They do not become thirteen tabs — they become **chips
inside the tab they belong to**.

| Tab | Icon | What is in it |
|---|---|---|
| **Listen** | play | Live, Hooks — as one vertical full-screen slider |
| **Find** | search | Search, Collab Radar, Masterclasses, the picks |
| **Make** | sparkle note (centre) | Make a song, and every other making room as a chip: Studio, Booth, Your voice, Soundboard, Music video, Video desk, Hooks, Podcast, Adverts |
| **Library** | bars | Your channel: songs, playlists, liked, videos, episodes |
| **You** | avatar | Profile, brand name, credits, plan, settings |

The studio front door built in `Greeting.tsx` does not go away — it becomes
what the **Make** tab shows when nothing is open, which is what it already is.

### One screen, one column, one big button

The Create screen is a single scrolling column of cards, with **Create** pinned
full-width above the tab bar. Not a two-column desk. Not a sidebar. On a phone
there is one column and there always was.

### Every card is: a chevron, a magic wand, a box, and a row of small buttons

This is the pattern Carli means by *"elke opsie is klein buttons onder"*:

```
┌────────────────────────────────────────┐
│  ⌄  Lyrics                        [✨] │   ← collapse, and auto-write
│                                        │
│  Write lyrics or a prompt              │   ← the one box
│                                        │
│  [≡]  [✓ Instrumental]           [⤢]   │   ← the options, small, at the bottom
└────────────────────────────────────────┘
```

Everything that is currently a sentence under a field becomes one of those
small buttons. The sentence moves behind the `Hint` mark we already built.

### The controls worth copying exactly

- **A magic wand on each card** that fills it in. We have a copilot; this is
  the copilot with a shorter journey.
- **A re-roll button** beside the style chips. One tap, different suggestions.
- **An expand button** on a text box, for when somebody really is writing a
  lyric sheet. Fullscreen, then back.
- **Sliders with a live percentage** — Weirdness 50%, Style influence 50%.
  Numbers, not adjectives.
- **A version badge** on every song (`v5.5`). Ours says which engine made it.
- **`+ Audio` and `+ Voice`** as two pills at the very top of Create. We now
  have "Bring a song in" — this is where it belongs on a phone.
- **An "Exclude styles" field.** Cheap, and it is the control people reach for
  after the third attempt.
- **A vocal gender toggle**, which we do not have and ElevenLabs Music
  supports through the prompt.

---

## 3. Listen: the feed as a vertical slider

*"Dit is belangrik dat die live opsie uiteindelik soos 'n tiktok slider gespeel
word."*

Full-bleed video or cover art, one per screen, swipe up for the next. The
furniture, read off the screenshot:

- **Right rail, vertical:** heart + count, comment + count, share arrow, `⋯`.
- **Bottom left:** title, small avatar, creator name, a `Follow` pill, and the
  caption under it.
- **A song chip** at the bottom: cover, title, play count, an add-to-playlist
  button, and a **Remix** button.
- **Top right:** `+ Hook` — cut a hook out of what you are watching, without
  leaving it.
- **Page dots** at the top: the same post has more than one page.

Two of those are ours already and are worth putting on the slider first:
**Remix** (we have remix) and **+ Hook** (we have the hooks room). A viewer who
can remix the thing they are watching, in one tap, is the whole loop.

---

## 4. Get Inspired: a song from a photo

The carousel above the feed is the single best idea in these screenshots for
this app, because it removes the blank page. Each card is a sentence and an
icon — a **camera** (start from a photo) or a **microphone** (start by talking)
— and the app does the rest.

### It is buildable now, with keys that are already set

`claude-opus-5` is already the model behind `/api/copilot` and
`app/lib/server/safety.ts`, and it reads images. So the chain is:

1. Camera or gallery → the picture, in the browser (`lib/imagefile.ts` exists).
2. The picture plus a prompt card's own instruction → Claude → a title, a style
   line, and lyrics, in the reader's language.
3. Straight into Make a song, filled in, with **Create** already lit.

Nothing new needs buying. It is one route, one screen, and a list of prompts.

### One rule about the picture

It is analysed and then it is gone, unless somebody chooses to keep it as
cover art. A photo of a person's kitchen is not something to store because it
was convenient. The consent posture is the same one the voice clone and the
presenter already use.

### The prompts

**Universal, from a photo (camera):**

- Turn any photo into a song
- Turn an old photo into a song
- What colour is your vibe? *(selfie)*
- This room, as a mood
- The view from right here
- Your plate, as a song
- Your pet's theme tune
- This outfit, as a genre
- The receipt song — what today cost you
- Your bookshelf, as an album
- Your handwriting, as a chorus *(a photo of a note)*
- Turn a screenshot of your chat into a song

**South African, from a photo — this is where we are not competing with Suno:**

- Braai-liedjie — wys my die vuur
- Die pad huis toe *(uit die kar se venster)*
- Jou dorp se hoofstraat, as 'n liedjie
- Ouma se kombuis
- Boerekos as 'n genre
- Bakkie-liedjie
- Jou span se kleure *(sport)*
- Die see by jou naaste strand
- Die eerste reën
- Jou tuin, hierdie week
- Matriekafskeid — een foto, een liedjie
- Jou kind se eerste skooldag
- Jou kerk se liedjie vir Sondag
- Ouma se resep, gesing

**By talking (microphone):**

- Vertel my van jou dag — ek sing dit
- Vertel my van vanoggend se verkeer
- Say one thing your mom does, and I will write her a song
- Describe the person you miss
- Name the blessing you need today
- Celebrate your bestie at full volume
- Send your partner a daily love song

**Recurring, which is what makes somebody open the app tomorrow:**

- A **daily** prompt with a countdown on the card — Suno's read `7:23:33`
  under a "New Feature" flag. One a day, in Afrikaans and English, and it
  expires. That is a habit, and `lib/habits.ts` already exists to hold it.
- **Continue Listening** and **Made with Studio** as two small pinned tiles
  under the carousel — a way back into the thing you were in the middle of.

---

## 5. Library and You

**Library:** two big gradient tiles (`Liked`, `Playlists`), then `My Songs`
with a **Filter**, and rows of: cover, title, a version badge, the style and
BPM on one grey line, a `⋯` menu, and **an unheard dot** on the left of
anything new. That dot is a small thing that makes a library feel alive.

**You:** avatar, name, `@handle`, plays and likes, one big play button, and
chips for `11 songs` / `1 following`. Under it, `Complete Your Profile — Step 2
of 3` with the single next action as a card. Then `Creators to Follow` with an
`X` on each, and `Recent Songs` with durations and play counts. Top bar: a
`Pro` crown, share, a bell with a dot, settings.

Two things from there we should take:
- **The step counter.** "Step 2 of 3" with one action beats a settings page.
  We have a list of things Carli still has to switch on; this is its shape.
- **Changing your name is on this screen**, not buried. It is the recording
  name that goes out with every post — on a song, on a video, in the slider
  and on the Collab Radar. Asked for three times, and it does not exist:
  today the name is a fragment of the sign-up email and nothing can change it.
  See `docs/OPEN-QUESTIONS.md` §F2.

## 6. The share sheet

Big round icons in a bottom sheet: Copy Link, **WhatsApp**, Messages, Email,
More. For this app's audience WhatsApp is not one of five options, it is *the*
option, and it belongs first and largest.

---

## 7. What we deliberately do not take

- **Their emptiness.** Suno can be that bare because it does one thing. We do
  thirteen, and hiding twelve of them behind a feed would be the dropdown
  problem again in a new coat. Hence the chip row inside **Make**.
- **Tooltips as the only explanation.** A `title` attribute does not exist on a
  phone. Our `Hint` mark does, and it stays.
- **Silence about money.** Every paid button in this app says what it costs
  before it is pressed, and that does not become a chevron.

---

## 8. The order to build it in

1. **The five tabs and the Make chip row.** Everything else hangs off this.
2. **Simple / Advanced on Make a song.** The mode switch, before any card work.
3. **Card shape** — chevron, wand, box, small buttons at the bottom — applied
   to Make a song first, then to each room in the order they are used.
4. **Get Inspired**, with the photo route and the first twenty prompts.
5. **The Listen slider**, with Remix and + Hook on it.
6. **Library and You**, with the unheard dot, the filter and the name change.

Each step ships on its own and leaves the app working. None of them removes a
feature; if a step cannot be done without removing one, the step is wrong.
