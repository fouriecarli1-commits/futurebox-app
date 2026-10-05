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

Now `app/lib/makes.ts` and `History.tsx`: details in localStorage and files in IndexedDB
beside the songs. The star means "never evicted" rather than "I liked this", which is
what makes the cap safe to have.

~~in the foot of every room that produces something~~ — **that was not true when it was
written.** Counted on 5 October 2026: four rooms recorded into it and four showed it, and
the cutting room — which makes a whole film and charges for it — did neither, so a film
exported and not downloaded in the same minute was gone. It has both halves now, and
`check:history` reads the two sets out of the components and fails on a room that records
into a history nothing displays. The rooms still without one are named in the order of
work below.

The cap was also wrong, and in the way that matters. Two dozen per room was written for
clips and readings, where a count is a fine proxy for size; the cutting room's output is a
stitched film, and two dozen of those is nearly two gigabytes. So the thing built to stop
her losing work would have filled her phone instead — and failed the NEXT write, silently,
while she was saving something else. The budget is 250 MB per room now, with the count kept
as a second ceiling, a film over half the budget refused rather than allowed to evict
everything, and the refusal said on the screen. `roomFor` is pure and `check:history`
executes it: eviction is the half that loses work and it is invisible until after it has.

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

~~**Still open:** audio and video files.~~ — **closed** on 5 October 2026. `app/lib/brought.ts`
is the same bargain for sound and video: details in localStorage, bytes in the same IndexedDB
store, a star that means keep. It is NOT `assets.ts` with another `kind`, and the reason is the
one decision that matters: a picture is tens of kilobytes and twenty of them is a count worth
capping, while a minute of phone video is tens of megabytes and twelve of those is most of a
browser's quota. So this shelf is capped in BYTES first and by count second, and a file larger
than half the budget is refused rather than allowed to evict everything on its way in.

Filed as material goes past rather than behind a button — a shelf somebody has to remember to
put things on is a shelf with nothing on it — and drawn as a strip on the two benches where
clips and songs are brought in, for the same reason the pictures are a strip: a library big
enough to need its own room is a library nobody visits.

The makes list is still per-room history, and that is deliberate: it is a record of what this
app made, which is a different thing from a shelf of what was carried in.

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
| ✅ | The price is on the button that spends it, read from `credits.ts` at both ends. `check:priceonit` holds every room that reaches a charging route — 19 routes, 13 rooms |
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

### Video Editor

Built after the first pass of this document and missing from it until 5 October 2026, which is what
`check:inventory` now exists to stop: the largest room in the app was not in the list the order of
work is read off.

| | |
|---|---|
| ✅ | Clips brought in from the phone or pulled out of her own channel; trims, splits, order, fades and transitions; the clock scrubs and the cursor runs the length of every lane |
| ✅ | Words on screen with font, size, colour, box and position, timed per shot, and able to run past the shot they belong to when they are on their own line |
| ✅ | Looks and adjustments, a logo mark with a corner and an opacity, and a cover frame lifted out of the film itself |
| ✅ | A song underneath with speed, loop, noise reduction, duplicate, mute and solo per lane, a mono fold, and ducking under a shot that speaks |
| ✅ | The shape, the picture size and the frame rate, with the file's size in megabytes shown before the press rather than after it |
| ✅ | The project is kept on the device between visits — the material, the trims, the words and the name — and a device that cannot keep it says so while there is still a film to save. `check:filmkeep` and `audit/filmkeep.mjs`, which breaks the read on purpose |
| ✅ | The finished film downloads **and** goes into her channel, under a name she sets, which is the same name in both places |
| ✅ | The price is on the button that spends it, read from `credits.ts` at both ends |
| ✖ | **No history of finished films.** A film exported and then neither saved nor kept is gone from the room — the only copies are the ones she asked for |
| ✖ | **The shape is not read off the material.** A film cut from upright clips still opens tall because tall is the default, not because anything measured the clips |
| ✅ | `Recommend` on the shape and on the picture size, worked out locally rather than asked of a model: the shape is a count of the measured clips, the picture size is the sharpest rung whose file still uploads easily, and each one shows the reason with her own numbers in it. `check:recommend` calls every rule twice and fails one whose answer does not move |
| ◇ | No `Recommend` on the frame rate. Deliberate: thirty is right for every film this room can make, so a rule would answer thirty whatever it was given — a button that looks like it considered the film and did not |

### Sound trainer

| | |
|---|---|
| ✅ | Trains a sound of your own on finished tracks already in your channel, which is a few ticks rather than a file dialogue — and is the honest answer to where a music model's training data came from |
| ✅ | Recordings brought in from outside, with the ownership asked for in words and stored with the finetune, because it is a heavier claim and reads as one |
| ✅ | The cost and the wait are shown before the press, and a trained sound can be forgotten |
| ✅ | It has a door of its own in the rail. The Channel's entry below used to say there was no such room; that was true when it was written and is not now |
| ✖ | No history: what a sound was trained on is not shown again afterwards, so a sound you are unhappy with cannot be compared with its own training set |
| ✖ | Fewer than three songs and the room offers nothing — correctly, since three is the floor — but it does not say which three of yours would be the better set |

### Album art

| | |
|---|---|
| ✅ | A crate you flick through, one sleeve at a time, with the spine showing and `1 / 1` pressed into the corner: unique, sold once, and the room shows it rather than claiming it |
| ✅ | The artist is on the back of the sleeve, in their own words, with the one button under them |
| ✅ | Bidding opens at R200 in steps of R20 over 36 hours, R500 for a one-off, 70/30 on the profit. `check:artmarket` holds every cent across 2007 prices |
| ✅ | A commission conversation with no text box anywhere — one button and one of your own songs; the artist answers with a price and one of four windows. There is no column in the schema to put a message in |
| ✅ | A buyer may generate art or buy ours and may not upload their own: the only file input is on the artist's desk, and `/api/artmarket` refuses an upload from anybody without an approved artist row |
| ✅ | The credit travels with the song into the channel and into Live |
| ✖ | No way for a buyer to see what a piece looked like on their own song before buying it — the sleeve is the artwork, not the artwork on their record |

### Hooks

| | |
|---|---|
| ✅ | Finds the hook in a song, cuts 15 or 30 seconds, the copilot picks the song and the length |
| ✅ | The price is on the button that spends it, read from `credits.ts` at both ends. `check:priceonit` holds every room that reaches a charging route — 19 routes, 13 rooms |
| ✖ | No caption written for the clip, though the copilot's own seeds offer it — an operation that does not exist |

### Your voice

| | |
|---|---|
| ✅ | Clone once, read anything, change a recording into it; costs on all three; the copilot writes the script |
| ✖ | **No voice library.** The reference has thousands with search, filters by use case and language, verified creators, search-by-audio, and curated collections. We have your own clones and a stock list |
| ~~✖~~ | ~~No `Recommend` on the voice picker — the reference's single strongest AI affordance, and we still have it nowhere~~ — **stale, and it was stale when it was written here twice over.** `VoiceLab.tsx` has carried `Recommend` on the voice picker since it was built, as do the video desk and the video panel |
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
| ✅ | The price is on the button that spends it, read from `credits.ts` at both ends. `check:priceonit` holds every room that reaches a charging route — 19 routes, 13 rooms |
| ~~✖~~ | ~~**The sound trainer is buried here.** `rail.sound` — "Soundboard · Every genre, with audio" — exists in the copy and there is no such room. It sits inside the channel, where nobody looking for it would go~~ — **closed, and this line was stale before anybody noticed.** The trainer has its own door in the rail and its own section above. Walked in a browser on 5 October 2026 rather than read off the code |

### Live

| | |
|---|---|
| ✅ | One room, everybody in it, a running order, announcing elsewhere; the copilot writes what you say |
| ✅ | The price is on the button that spends it, read from `credits.ts` at both ends. `check:priceonit` holds every room that reaches a charging route — 19 routes, 13 rooms |

### Collab

| | |
|---|---|
| ✅ | The radar, the finder, real direct messages, a shared room. **Beyond the reference**, which has a sidebar card saying "invite team members" |
| ✅ | The price is on the button that spends it, read from `credits.ts` at both ends. `check:priceonit` holds every room that reaches a charging route — 19 routes, 13 rooms |
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

1. ~~**Cost on the seven rooms still missing it** — ProBooth, Booth, Hooks, Channel, Live, Collab, the theme studio.~~ — **done.** `check:priceonit` reads the charging routes out of the handlers rather than off a list, finds the rooms that call them, and fails on a room that spends without a number on the press: 19 routes, 13 rooms, all 13 saying what it costs.
2. **`Recommend` on every consequential field.** ~~Still at zero across the whole app.~~ — **the "zero" was wrong.** `app/components/Recommend.tsx` already sat beside the voice picker, the video desk's scene and the video panel's, asking `/api/recommend` for the taste questions. What was missing was the other kind: a field whose answer is arithmetic rather than opinion. The cutting room's shape and picture size have it as of 5 October 2026, through the same component, worked out locally — a model asked which way up a film should be, when the clips can be counted, is slower, different each time, and able to be wrong about something countable.
   Still open: the fields nothing has looked at yet — the hook length, the voice settings once they are exposed, and the advert platforms. Each one needs an answer that can be read off something, and a field with nothing to read it off must keep getting no button rather than a default with a lightbulb beside it.
3. **History per room.** Five rooms have one: the video desk, the song panel, Hooks, the adverts desk and the cutting room. ~~Unblocks comparison, reassurance, and not losing work.~~ — the rooms still without one, each of which makes something somebody would want back: **ProBooth** (a mix), **the Booth** (a take), **Your voice** (a reading), **Podcast** (an episode), **Album art** (generated art) and the two dub paths. `check:history` cannot catch these — it holds that a room which RECORDS also shows, and these record nothing — so they are named here instead of being counted.
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
