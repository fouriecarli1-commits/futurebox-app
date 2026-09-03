# Function inventory — what we have, what we are missing, what we left out on purpose

The specification, in our own words. `docs/reference/observed-elsewhere.md` is the raw
capture of a competitor's screens; this is what we checked ourselves against it and what
we found. Read this one.

**The question this answers.** Not *"does our screen look like theirs"* — it should not.
The question is *"can a person achieve here everything they could achieve there, in fewer
steps, and where they cannot, did we decide that or did we forget?"*

**Status.** Second pass, after a click-through of all thirteen rooms in a real browser
rather than a read of the code. Every claim below was checked, and anything not checked
says so. A gap with no reason written next to it is a gap we forgot, not a gap we chose.

Sections marked **closed** were open in the first pass and are not any more; what remains
open inside them is written under each. The audit harness is in `audit/`.

---

## The three gaps that are in every room

These cost more than any single missing feature, because each one is missing eleven times.

### 1. Nothing has a history or a favourites list — **closed**

Was: a generation you liked and did not immediately download was gone, and somebody who
made four videos and preferred the second had no way back to it.

Now `app/lib/makes.ts` and `History.tsx`, in the foot of every room that produces
something: the newest two dozen per room, details in localStorage and files in IndexedDB
beside the songs. The star means "never evicted" rather than "I liked this", which is
what makes the cap safe to have.

Still on this device only, and every room says so.

### 2. There is no asset library — **closed for pictures**

Was the single largest structural gap, because other things were blocked behind it.

Now `app/lib/assets.ts` and `Pictures.tsx`: pictures kept on the device, details in
localStorage and bytes in IndexedDB in the same store as the songs and the makes. Capped
at twenty with the same star-means-keep bargain as the history. It carries a thumbnail so
a strip of twenty costs one read rather than twenty full files.

It is deliberately a strip where pictures are used rather than a room of its own — a
library big enough to need its own room is a library nobody visits. It is what the video
desk's start frame picks from and where the brand kit's logo lives, which is what
unblocked both.

**Still open:** audio and video files. Nothing yet keeps a piece of music somebody brought
in from outside, and the makes list is per-room history rather than a library you file
into.

### 3. There is no search — **closed**

`Search.tsx`, on ⌘K and Ctrl-K, over the rooms, the songs and everything the rooms have
made. All three already live on the device, so it asks no server and works with the
network off. It navigates rather than showing results in place: picking a song opens it
in the room that can do something with it.

---

## Room by room

Legend: **✅ have** · **✖ missing** · **◇ deliberate** (missing, and we chose it)

### Make a song

| | |
|---|---|
| ✅ | Prompt, style, lyrics, generate; style help and lyric help as AI seeds; cost at the button; the copilot writes any field |
| ✖ | No history of previous generations — you cannot compare take one against take three |
| ✖ | No variants: the reference generates *n* at once and lets you pick. We generate one, and a second costs a second full charge |
| ◇ | No model picker. Deliberate — naming the engine moves a decision onto somebody with less information than we have, and it is ours to change |

### Studio (the timeline)

| | |
|---|---|
| ✅ | Sections, arrangement, regenerate from an edited sheet; the copilot picks the song |
| ✖ | No undo across an edit session |
| ✖ | No version history — regenerating replaces, and the previous arrangement is gone |

### The Booth

| | |
|---|---|
| ✅ | Record over the backing, keep a take, clean it, lift a vocal out; words on screen while you sing; costs shown for the paid steps |
| ✖ | **Takes are not kept side by side.** The copilot can be asked which take is best and there is no list of takes for it — or you — to compare |
| ✖ | No input-device picker, and no level meter before you commit to a take |

### ProBooth

| | |
|---|---|
| ✅ | Lanes, recording against the song, keeping a mix |
| ✖ | **No cost shown anywhere in it** — one of seven rooms still missing the counter |
| ✖ | No copilot operations registered. It is the room with the least assistance and the most controls |

### Music video

| | |
|---|---|
| ✅ | Five looks to start from; the engine's real lengths; browser-drawn free option; cost and wait; the copilot sets the look, the shot and the shape |
| ✖ | No history — a video you made and did not download is gone |
| ◇ | No spoken line. Deliberate: quoted text is read aloud and a voice over a song is two things fighting |

### Video desk

| | |
|---|---|
| ✅ | Six scene kinds with three written scaffolds each; grades priced in words; the engine's real lengths and shapes; the spoken-line rule taught in place; the cheaper route priced |
| ✖ | No start frame, end frame or reference image — the reference takes all three, and we take none, because there is nowhere to keep an image (gap 2) |
| ✖ | No history, no favourites |

### Hooks

| | |
|---|---|
| ✅ | Finds the hook in a song, cuts 15 or 30 seconds, the copilot picks the song and the length |
| ✖ | **No cost shown** |
| ✖ | No caption written for the clip, though the copilot's own seeds offer it — an operation that does not exist |

### Your voice

| | |
|---|---|
| ✅ | Clone once, read anything, change a recording into it; costs on all three; the copilot writes the script |
| ✖ | **No voice library.** The reference has thousands with search, filters by use case and language, verified creators, search-by-audio, and curated collections. We have your own clones and a stock list |
| ✖ | No `Recommend` on the voice picker — the reference's single strongest AI affordance, and we still have it nowhere |
| ✖ | No per-voice settings (stability, similarity, style) exposed, and no plain-language labels for them |

### Podcast

| | |
|---|---|
| ✅ | A show with a real feed, episodes, two hosts, dubbing into another language in the same voice; costs shown; the copilot writes the title and notes |
| ✖ | **No transcripts room and no speaker library.** `transcribe` exists but only as a step inside the Booth. The reference keeps a searchable archive with speakers recognised across files — the thing that turns transcription from a conversion into an archive |
| ✖ | Dubbing has no URL import: a link to a video cannot be pasted, only a file uploaded |

### Channel

| | |
|---|---|
| ✅ | Released music, playlists, sharing, the sound trainer; the copilot opens a playlist |
| ✖ | **No cost shown** |
| ✖ | **The sound trainer is buried here.** `rail.sound` — "Soundboard · Every genre, with audio" — exists in the copy and there is no such room. It sits inside the channel, where nobody looking for it would go |

### Live

| | |
|---|---|
| ✅ | One room, everybody in it, a running order, announcing elsewhere; the copilot writes what you say |
| ✖ | **No cost shown** |

### Collab

| | |
|---|---|
| ✅ | The radar, the finder, real direct messages, a shared room. **Beyond the reference**, which has a sidebar card saying "invite team members" |
| ✖ | **No cost shown** |
| ✖ | No roles or permissions, and no attribution on a shared generation — who made it, with what settings, at what cost |

### Adverts

| | |
|---|---|
| ✅ | A brief, a set of adverts with the angle named, copy written per market rather than translated, the shot handed to the video desk and the line to the voice studio. **Self-serve, where the reference gates the whole thing behind Contact Sales** |
| ◇ | No publishing to Meta, Google or TikTok. Deliberate and said in the room: those connections are not built, and a button that looks like it publishes and does not is worse than no button |
| ✖ | No format matrix — one creative cut to every placement, with safe areas respected |
| ✖ | No performance read-back, which is the half of the loop that makes the other half worth running |
| ✖ | No brand kit: logo, palette, fonts and the legal line, applied to everything automatically |

---

## What the reference has that we have no answer to at all

| Theirs | Ours | Verdict |
|---|---|---|
| Assets library | nothing | **Build it.** Blocks reference images, brand kits and start frames |
| Voice library with search and filters | your own clones only | **Build it.** The single biggest content gap |
| Sound effects tool, categories, soundboard | trainer buried in Channel | **Surface it.** The copy for the room already exists |
| Speech-to-text room with a speaker archive | a step inside the Booth | **Build it** |
| Global search with `⌘K` | nothing | **Build it** |
| Templates you can share | scene scaffolds, not shareable | Later |
| Node canvas (Flows) | nothing | ◇ **Deliberate.** The copilot builds the chain from a conversation; a graph editor is the power-user surface we do not want to be |
| Licensed music catalogue | nothing | ◇ Deliberate for now — it is a licensing business, not a feature |
| Pinned, user-editable tool list | fixed rail | Later, and cheap |

---

## The order to do them in

1. **Cost on the seven rooms still missing it** — ProBooth, Booth, Hooks, Channel, Live, Collab, the theme studio. Cheapest, and it is a promise the app already makes everywhere else.
2. **`Recommend` on every consequential field.** Still at zero across the whole app. One shared component, a value and a one-line reason.
3. **History per room.** Unblocks comparison, reassurance, and not losing work.
4. **The asset library.** Unblocks reference images, brand kits, start frames.
5. **Surface the soundboard.** The room's copy already exists.
6. **The voice library.**
7. **Transcripts and speakers.**
8. **Global search.**

---

## What is honestly not checked yet

- Whether every room reads correctly on a phone. The screenshots in this run were all desktop.
- Whether the copy is complete in Afrikaans. New strings were added with both languages, but nothing has swept the whole file.
- Whether the dark theme still holds after the contrast work. The solve is gated on light surfaces and the dark ramp is untouched, but no dark screenshot has been taken since.
