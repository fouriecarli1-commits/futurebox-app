# A lyric video, out of what the song already came with

*Carli, 8 October 2026, on a song she had just generated:*

> "Ek het hierdie liedjie nou net op lyria gegenerate. wat dit awesome maak dat dit dadelik
> 'n video en album art saam create wat ek vir ons engine ook sal wil hê."

---

## What was actually in her file

`Vrye_Vlug.mp4`, 7.8 MB, 169 seconds. Three tracks, not two:

| Track | What it is |
| --- | --- |
| H.264, 1024 × 1024 | the picture |
| AAC | the song |
| **`tx3g`** | **the lyrics, line by line, with the second each one lands on** |

The third one is the valuable part and it is easy to miss, because on screen it looks like
writing burnt into the picture. It is not. It is data, 51 lines of it:

```
 12.30–15.38  Ek sit hier stil en word van alles waar
 15.38–18.45  Daar buite in die vroeë lig se gloed
 ...
166.00–169.00  Altyd vry... altyd vry...
```

**That is the one thing a lyric video needs and this app cannot work out for itself.** Knowing
*when* each line is sung is the hard half. Drawing words on a frame is not — the cutting room
has done that since 30 September, with a font, a colour, a band behind the letters and a
position she can drag.

So a song that comes back with its lyrics is **assembly**, not a new engine, and it runs on the
phone for nothing.

---

## What is built

Two pieces, each measured on its own, and a button that joins them.

**`app/lib/timedtext.ts`** reads the lines out of an MP4. Written by hand, because there is no
demuxer in a browser: `<track>` reads WebVTT from a separate file and will not reach into an
MP4, and ffmpeg.wasm is twenty-odd megabytes to read a few hundred bytes of text. It is a short
walk through the atoms instead. Held by `check:timedtext`.

**`app/lib/lyriccut.ts`** turns those lines into cuts. One shot per line, each line landing on
the frame it was sung on and going down again when the singing stops. Held by `check:lyriccut`,
including on a real MP4 — `public/welcome.mp4` with a text track put into it, so the reader has
to find it in amongst two tracks a real encoder wrote.

**The button** is in the cutting room, on the words bench, and only appears on a film that
arrived with lines in it. An offer, not something that happens on the way in: it turns one shot
into fifty-two, which is a big change to somebody's work and hers to want. One press of undo
puts it back.

**And the bar carries a dot** on the words bench while there are lines waiting, because an offer
on one bench is invisible until somebody opens that bench — which is how the whole-photo blur
got built and then not found. The dot is a colour, so it is in the button's name as well: *"Words.
… Something new is waiting here."*

### The two things that are measured rather than assumed

- **The film is exactly as long afterwards.** Cutting a 169-second song into 52 shots gives back
  169.000000 seconds. A feature that quietly shortened her song by the instrumental would be
  worse than no feature.
- **No frame is lost.** The 12.3 seconds before the first line is sung is a shot with no words
  on it, not 12.3 seconds thrown away. Same at the tail.

### The quirk that would have shipped wrong

The samples in her file are not one line each. They are a rolling karaoke window — the line
before, the line now, the line next — so the same words appear in three consecutive samples. A
reader that takes each sample whole gives a lyric sheet with every line in it three times. That
is not hypothetical; it is what the first run against her file did.

The new line is the last one in each sample. And it is compared only against the line before it,
not against everything seen, so a chorus that really does repeat is kept — her chorus appears
three times and all three belong in the sheet.

---

## What is **not** built, and what is not known

**Nothing here generates a lyric track.** This reads one if the song arrives with one. A song
made in this app's own booth has no `tx3g` track, so the button will not appear on it.

**Which suppliers send one back is an open question.** The only thing known for certain is that
the file Lyria gave her on 8 October had one. Whether Mureka, MiniMax or anyone else returns
timed lyrics through their API — as a text track, a `.vtt`, `.srt`, or a JSON array of lines
with timings — has not been established and should be asked in the sales conversations, because
it is worth money to us: it is the difference between a lyric video being assembly and being an
alignment problem.

**The press cannot be walked in a browser probe.** The Chromium that Playwright installs is
built without the proprietary codecs, so it cannot decode H.264 at all — `public/welcome.mp4`
itself fails in it with `DEMUXER_ERROR_NO_SUPPORTED_STREAMS`, before any of this code is
involved. That is why every video probe in `audit/` records its own WebM in the page, and WebM
has no timed-text track.

So the reading, the cutting, and the two of them joined on a real file are held in CI, the wire
from the file to the button is held by reading the room's own source, and **the press itself was
walked by hand.** `scripts/lyricfilm.mts` says all of this in the place a reviewer will be
standing when it matters.

**Album art is the other half of her sentence and is not this.** Her file came with a cover as
well as a lyric track. The cutting room already takes a cover (`coverFrom`, `frameFrom`), so
what is missing there is not a feature but a decision about where a supplied cover lands when a
song arrives — which has not been made.

---

## What it costs

Fifty-two shots all pointing at the same 7.8 MB file. The renderer walks the pieces in order and
seeks the material for each, so that is 52 seeks over one file rather than 52 files — but it is
still 52, and a long song cut this way takes longer to lay down than the same song as one piece.
Said here so that if a three-minute song is ever noticeably slower to export than it used to be,
this is why and not a mystery.

Nothing in it calls out, so it costs nothing per press. It is paid for on the way out, like
every other tool that runs on the member's own phone.
