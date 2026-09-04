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

## Built

The storyboard is in the video desk, under the single-shot composer, because
it is the same desk asking a bigger question. Write the shots, make them one
at a time, choose a song, cut them into one file.

`audit/storyboard.mjs` drives the whole path in both languages and stubs only
the engine — at the wire, and returning a genuinely recorded clip, so
`generateVideo` does its real work of posting, polling and downloading and the
stitcher gets real video:

```
the storyboard survives a reload: true
each was asked for at the length on its row: true
the film is as long as its clips (6.0s wanted, 6.01s got): true
```

Trimming is built too, and it was as cheap as predicted: the stitcher plays a
clip, so it plays part of one. A shot gets two handles once it has a clip,
spanning the clip's **real** length rather than the length that was asked for
— the engine rounds a request to something it makes, and handles built on the
request would leave seconds nobody could reach.

```
the handles span the clip, not the request: true
the film is as long as its trimmed clips (5.0s wanted, 5.00s got): true
```

## What was built before this, and what is still not

**Built and proven:** the cut, and the storyboard on top of it. Scenes in
order, letterboxed into one frame, a song under them, one file out, progress
reported per scene, and a board that survives a reload because somebody will
spend an hour and a dozen paid generations on one.

**Still not built:** nothing on the original list. What is left is the second
half of the ads plan — reading numbers back — and WebCodecs, when the checks
can see it.

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
