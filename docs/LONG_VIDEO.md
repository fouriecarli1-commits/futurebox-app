# A long video out of short ones

*What it takes to get past the engines' ceiling, with the load-bearing part
built and measured.*

## The problem, stated exactly

| Engine | Longest single generation |
| --- | --- |
| Veo 3.1 | 8s |
| Kling | 10s |
| Seedance | 30s |

A music video is three minutes. No prompt closes that gap — it is a hard limit
of the models. A long video has to be built the way film always has been: shot
by shot, cut together.

Generating twelve clips was already possible. What was missing was any way to
end up with **one file**.

## The load-bearing question, answered

Can a browser cut a dozen clips into one film? It can. `app/lib/stitch.ts`
does it and `audit/stitch.mjs` measures it on real recorded files:

```
the film is as long as its scenes (4.93s wanted, 5.02s got): true
the song under it survived onto the file: true
a tall clip in a wide frame is letterboxed, not stretched: true
— 4.9s of film took 5.1s to cut: 1.03× real time
```

Three things worth pulling out of that.

**It works.** Scenes of different shapes, a song laid under the whole thing,
one file out.

**It costs real time.** 1.03×, and that is not slowness to optimise away — it
is what recording a canvas means. Frames are captured as they are painted, so
a three-minute film takes three minutes with the tab open and awake. Anybody
planning this feature should plan around that number, not around a hope.

**The sound needed doing on purpose.** `canvas.captureStream()` carries
pictures only, so the first honest version of this would have exported a
silent music video. The song goes through an `AudioContext` into a
`MediaStreamAudioDestinationNode` whose track joins the same stream.

### Why not WebCodecs

`VideoEncoder` would beat real time several times over — decode and re-encode
with nothing playing. It is not used, and the reason is not technical
preference:

```
VideoEncoder: false
VideoDecoder: false
```

That is this project's own check browser. A WebCodecs path could be written
here and could not be verified, and everything else in this repository is
measured before it is claimed. It is the right upgrade the day the checks run
somewhere it exists — as a *faster path with the current one as the fallback*,
never as a replacement, because it is absent on plenty of real phones too.

### Why not a server

Twelve clips up and one film back is a great deal of somebody's mobile data
for work the laptop is already holding the files for. It also needs a machine
this app does not run: a Vercel function has neither the time nor the memory
for a three-minute encode.

## What is built, and what is not

**Built and proven:** the cut. Scenes in order, letterboxed into one frame, a
song under them, one file out, progress reported per scene.

**Not built:** the room somebody does this in. That is the next slice, and it
is the bigger half:

1. **A storyboard.** Scenes in order, each with its own prompt, each showing
   its length and the running total against the song's length. This is the
   piece that makes twelve generations feel like one film rather than twelve
   files.
2. **Generating into a slot.** The desk already generates a clip; here it
   generates *the next scene*, and drops it where it belongs. The cast is what
   keeps the same face across all twelve.
3. **Trimming.** A clip that is 10s where 6s was wanted. Cheap to add once the
   storyboard exists — the stitcher plays a clip, so it can play part of one.
4. **The export.** Already done, needs a button and a progress line that says
   the honest thing: *this takes as long as the film is*.

## Three things worth stealing, from Kapwing

The studio's owner sent these. Each is a real idea and each is a different size.

**Safe zones.** An overlay showing where TikTok's, Reels' and Shorts' own
interface covers the frame, so a caption is not put where the platform will
print a username over it. Small — a few rectangles per platform against the
canvas — and worth doing before the storyboard, because it changes what
somebody frames rather than what they build.

**Versions.** "Save current version", with drafts listed by time and a
*restore*. This app has `lib/makes.ts` keeping what was generated already, so
the storage is half there; what is missing is a named snapshot of *the
project* rather than of one output. Medium, and it earns its place the moment
a film has twelve scenes somebody has been arranging for an hour.

**The canvas itself.** A general video editor — layers, text, transitions,
subtitles. This is not a feature, it is a product, and Kapwing is a company
that does only that. Worth taking the *shape* of and none of the scope: this
app's version should stay a storyboard for AI scenes with a song under them,
because that is a thing Kapwing does not do and a thing a general editor
cannot be steered into being.

## The honest sequencing

1. Safe zones — small, immediately useful, independent of everything else.
2. The storyboard and the export button — the feature the owner actually asked
   for, on top of a cut that already works.
3. Trimming — cheap once (2) exists.
4. Versions — when a project is worth snapshotting, which is after (2).
5. WebCodecs — when the checks can see it, and never as the only path.
