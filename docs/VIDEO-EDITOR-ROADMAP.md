# Video Editor roadmap

The owner, 31 October 2026: *"Doen ook net goeie navorsing van video editors.
Dit moet al die features hê en ons slim AI intergrations."*

What the leading phone and desktop editors share today, set against what ours
has, and the order the gaps are being closed in. No other product is named in
the app; this page names none either.

## What every leading editor has now

- Speed curves with smooth slow motion (frame interpolation), 0.1× to 100×.
- Keyframes on every property.
- Picture-in-picture layers, masks and blend modes.
- Chroma key, and AI cutout without a green screen.
- Auto captions in many languages, with the spoken word lit karaoke-style.
- Beat markers on the timeline, and cuts that snap to them.
- AI restyle, AI reframe, text to speech, voice changers.
- One-press studio-quality voice (noise and room removed).
- Silence and filler-word removal.
- Dubbing into many languages, and lip-sync.
- AI upscaling and frame interpolation.
- Text to video, image to video, avatars.

## Ours, against that list

Already in the room: trim, split, reorder, undo, magnet and zoom; constant
speed 0.1–4×; keyframes and 19 preset moves on the shot; transitions; text with
22 motions; lyric-timed captions; shapes, frames, logo and **stickers** (31
October); filters, 27 effects and five adjust dials; canvas sizes with a
blurred background; ducking, fades and crossfades; voice-over; AI sound;
waveform; best moments; AI cutout, erase, restyle, change and reframe; text and
image to video.

## The gaps, in the order they are built

| # | Gap | How | Engine |
|---|---|---|---|
| 1 | Beat sync: beat marks on the song lane, cuts snap to them | on the device (`lib/onbeat.ts` exists) | none |
| 2 | Auto captions from speech, with the word lit as it is said | existing transcription route | `fal-ai/wizper` as an option |
| 3 | Lip-sync a made character to the song | engine | `fal-ai/sync-lipsync/v3` or `fal-ai/latentsync` |
| 4 | Speed ramps (a curve per shot, with presets) | on the device, in `lib/stitch.ts` | none |
| 5 | Smooth slow motion | engine | `fal-ai/rife/video` |
| 6 | Picture-in-picture video layers, then blend modes | on the device | none |
| 7 | Fast MP4 export (faster than real time) | WebCodecs | none |
| 8 | Chroma key | on the device (WebGL) | none |
| 9 | Song speed that keeps its pitch; pitch-shift voice effects | on the device (`lib/timepitch.ts`) | none |
| 10 | Take the sound out of a clip; split it into stems | on the device; existing stems route | `fal-ai/demucs` as an option |
| 11 | Freeze frame, reverse, free crop and rotate | on the device | none |
| 12 | AI upscale; dubbing into other languages | engine | `fal-ai/flashvsr/upscale/video`, `fal-ai/elevenlabs/dubbing` |

Rules before any engine above goes live: it is named on the privacy page
first, it is priced at the house margin with the price on its button, and its
safety checker stays on where it has one.
