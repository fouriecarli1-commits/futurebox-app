# Copilot parity — what the studio has, and what is missing

Companion to `docs/ELEVENLABS_UI_TEARDOWN.md`. That document records what a mature competitor puts
on the screen. This one measures **our** studio against it, function by function, with file
references, so the work is a checklist rather than an opinion.

The rule being measured: *the copilot must do the same thing at every function.* Today it does not,
and the reason is structural rather than cosmetic.

---

## The structural finding

`Copilot` is mounted **once**, in the third pane beside every studio tab
(`app/page.tsx:1994`) — so its *placement* is already right. What is wrong is what it can see and
what it can do.

**What it can see** (`app/page.tsx:1995-2001`, `Copilot.tsx:38-44`):

```
title · style · lyrics · trackCount · engineReady
```

That is the song canvas and nothing else. Open the Booth, the video canvas, the podcast desk or a
dub, and the copilot beside you still only knows about a song's title, style and words. **It does
not know which tab you are on.**

**What it can do** (`Copilot.tsx:24-30`):

```
set_title · set_style · set_lyrics · generate · go
```

Four of the five act on the song. `generate` (`page.tsx:2006-2009`) **forces the tab back to
`make`** — so asking the copilot to generate anything, from anywhere, throws you out of the room you
were in.

**Where it can send you** (`page.tsx:2011-2016`):

```
make · video · podcast · hooks_feed · studio · collab
```

Six of eleven tabs. **`booth`, `canvas`, `channels`, `live` and `voice_studio` cannot be reached by
the copilot at all** — you can be standing in the Booth and the copilot has no way to name where you
are.

**Consequence.** The copilot is a *song-writing* assistant sitting in a *studio-wide* slot. Every gap
below follows from that one fact.

---

## Coverage today, per function

Measured across `app/components/`. `Cost` = the price is shown at the point of action. `Seeds` = 
contextual starter suggestions. `Recommend` = a one-tap AI recommendation on a specific field.

| Function | Component | Cost | Seeds | Recommend | Copilot aware |
|---|---|:--:|:--:|:--:|:--:|
| Make (song) | `MakeMusic.tsx` | ✅ | ✅ *(via `StyleFinder`, `LyricHelp`)* | ❌ | ✅ |
| Studio (song edit) | `SongSections.tsx`, `ThemeStudio.tsx` | ❌ | ❌ | ❌ | partial |
| Booth | `Booth.tsx`, `VocalBooth.tsx` | ✅ *(VocalBooth only)* | ⚠️ minimal | ❌ | ❌ |
| **ProBooth** | `ProBooth.tsx` | ❌ | ❌ | ❌ | ❌ |
| Video | `MusicVideo.tsx`, `VideoPanel.tsx` | ✅ *(VideoPanel only)* | ❌ | ❌ | ✅ |
| Canvas | `VideoCanvas.tsx` | ✅ | ✅ | ❌ | ❌ |
| Hooks | `Hooks.tsx` | ❌ | ❌ | ❌ | ✅ |
| Channels | `Channel.tsx` | ❌ | ❌ | ❌ | ❌ |
| **Collab** | `CollabRoom.tsx`, `CollabFinder.tsx`, `CollabRadar.tsx` | ❌ | ❌ | ❌ | ✅ |
| Live | `LiveChannel.tsx` | ❌ | ❌ | ❌ | ❌ |
| Voice studio | `VoiceLab.tsx`, `SoundTrainer.tsx` | ✅ | ❌ | ❌ | ❌ |
| Podcast | `PodcastStudio.tsx`, `TwoHosts.tsx`, `DubEpisode.tsx` | ✅ | ❌ | ❌ | ✅ |

**Three totals worth stating plainly.**

1. **`Recommend` is at zero.** Not one field in the app offers a one-tap AI recommendation with a
   reason — no voice pick, no style pick, no length pick, no language pick. The competitor has it on
   exactly one screen (`✨ Recommend` next to Voice in Text to Speech) and it is the single strongest
   AI affordance in their product.
2. **Cost is shown on 7 of 12 functions.** Task #16 landed it where generation is expensive; it is
   missing from `MusicVideo`, `Hooks`, `ProBooth`, `Booth`, `Channel`, `CollabRoom`, `LiveChannel`
   and `ThemeStudio`.
3. **Seeds exist on 4 of 12.** `StyleFinder` and `LyricHelp` do this well for songs; nothing
   equivalent exists for video, podcast, hooks, the booth or a dub.

---

## The work, in order

### 1. Give the copilot the room it is standing in  *(unblocks everything else)*

Widen `CopilotContext` from the song canvas to a **surface descriptor**:

```ts
export interface CopilotContext {
  surface: StudioTab;          // where the user actually is
  canvas: SongCanvas;          // what it has today
  surfaceState: unknown;       // what the current surface is holding
  recentRejections: string[];  // what the user already said no to
  credits: number;
  engineReady: boolean;
}
```

Then let each tab register what it is holding. Without this the copilot cannot answer "make this
shorter" in the Booth, because it does not know a recording exists.

### 2. Stop `generate` from teleporting

`page.tsx:2006` sets the tab to `make` on every generate. Generation should run **on the current
surface**; only fall back to `make` when the current surface has nothing to generate.

### 3. Complete the `go` allow-list

Add `booth`, `canvas`, `channels`, `live`, `voice_studio` (`page.tsx:2012`). Five rooms the copilot
cannot currently name is five rooms it cannot help in.

### 4. Per-surface action vocabulary

`CopilotAction` needs a branch per surface, not one song-shaped set. Minimum:

| Surface | Actions the copilot must be able to take |
|---|---|
| Booth / ProBooth | set take, retake, clean, lift vocal, set monitoring |
| Video / Canvas | set template, set length, set aspect, set hook, regenerate scene |
| Podcast | set hosts, set script, set language, dub, trim |
| Voice studio | pick voice, set stability/similarity/style, clone |
| Collab | draft the brief, invite, summarise the thread, propose the split |
| Channel / Live | set the running order, write the description, schedule |

### 5. `Recommend` as a shared control

One component, used beside every consequential field:

```tsx
<Recommend field="voice" context={surfaceContext} onPick={setVoice} />
```

It returns **a value and a one-line reason** — *"Roger: your script is conversational and 40 seconds;
his pacing suits it."* A recommendation without a reason is a lottery ticket, and it is the reason
that makes it trustworthy.

### 6. Seeds everywhere

Three regenerable, contextual starters above every prompt input. `StyleFinder` and `LyricHelp`
already prove the pattern for songs; generalise them rather than writing a fourth variant.

### 7. Finish the cost coverage

Add `<Cost>` to `MusicVideo`, `Hooks`, `ProBooth`, `Booth`, `Channel`, `LiveChannel` and
`ThemeStudio`. Where a function is free, say **free** — silence reads as a hidden charge.

### 8. Result critique

After every generation the copilot says, in one sentence, the most likely complaint and offers the
one-tap fix. This is the pattern the `madeTrack` prompt already gestures at
(`page.tsx:2027-2050`) — it suggests a music video after a song lands. Generalise that from one
hard-coded hand-off into a copilot judgement on every result.

---

## Two things that are ours and stay ours

Neither exists in the reference product, and no alignment pass may quietly drop them.

- **Collab** — `CollabRoom.tsx`, `CollabFinder.tsx`, `CollabRadar.tsx`, `/api/collab`. The competitor
  has a sidebar card that says *"Invite team members"*. We have rooms, a finder and a radar. That is
  a category difference, not a feature difference, and it is worth more than matching them screen for
  screen.
- **ProBooth** — `ProBooth.tsx`. Same rule. It also happens to be the function with the *least*
  copilot support in the table above, which makes it the first place to prove the new pattern rather
  than the last.

## One thing they have that we should take

**Ads Engine** (teardown §15) — and they gate it behind `Contact Sales`. See the teardown for the
ten-point capability list. The short version: a marketer's loop is brief → creative → localise →
publish → read performance → scale the winner, and there is no self-serve product doing it. Our
copilot, our voices, our video canvas and our credit system already cover the first four steps.
