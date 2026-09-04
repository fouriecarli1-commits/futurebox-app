# A presenter who says your script

*What it would actually take, read off the APIs rather than the marketing.*

## The correction first

I told the studio's owner that a presenter lip-syncing a script was "a
different product category — HeyGen, Synthesia" and that I would have to check
before promising it was doable. That was the right thing to say and it was
wrong.

It is on the endpoint this app already calls, and has been the whole time.

## What is there

`POST /v1/flows/video` — the same ElevenLabs broker `app/lib/server/video/eleven.ts`
already posts to for Seedance and Veo — takes seven model ids. One of them is

```
model_id: "creatify-aurora"
```

described in ElevenLabs' own SDK as *"Request body for the Creatify Aurora
lipsync video model"*. Read off `@elevenlabs/elevenlabs-js`'s serializers, the
same way this repository established the wire format for the models it already
runs — not off a docs page.

Its body is not a prompt. It is a picture and a sound file:

```jsonc
{
  "model_id": "creatify-aurora",
  "image": {                       // the character to animate
    "type": "inline_base64",
    "content_base64": "…",
    "mime_type": "image/jpeg"      // or png, webp, heic, heif
  },
  "audio": {                       // drives the lip movements
    "type": "inline_base64",
    "content_base64": "…",
    "mime_type": "audio/mpeg"      // or audio/wav
  },
  "resolution": "720p",            // or "480p" — those are the two
  "guidance_scale": 1.0,           // optional: adherence to the image
  "audio_guidance_scale": 1.0      // optional: adherence to the audio
}
```

Inline base64 is capped at 25MB decoded and is explicitly ephemeral — the SDK
says so: *"stored as an ephemeral asset with no guaranteed retention… To keep
an input and reuse it across generations, upload it via the assets API
(`POST /v1/assets`) and pass an `asset` reference instead."*

Both `image` and `audio` also accept `{"type": "asset", …}` and
`{"type": "generation", …}`.

## Why this app is already most of the way there

The model needs two things and this studio makes both.

**The picture** is a cast member. `lib/cast.ts` already keeps named reference
pictures against the account, already squares nothing and fits to 1024, already
re-encodes to strip EXIF, and already hands back a data URL — which is
`content_base64` with a prefix on it. The assets-API path is the obvious next
step for exactly the reason the SDK gives: a cast member is reused across
generations, which is what `POST /v1/assets` is for.

**The audio** is the voice studio. It already reads a script in a cloned or
stock ElevenLabs voice and hands back an mp3.

So the feature is: choose a cast member, write the line, choose the voice,
and post the two together. Not a new integration — a third input to two things
that already exist.

## The part that matters most here

**It speaks Afrikaans.**

Not because the video model knows any Afrikaans, but because it is never asked
to. It is handed audio; whatever language that audio is in is the language the
presenter speaks. ElevenLabs' speech models do Afrikaans, and this app already
uses them for exactly that reason — see the note in `VideoCanvas.tsx` about
silent footage with a voice laid over it being "the only way this app speaks
Afrikaans at all". A lip-synced presenter is that same argument, with the mouth
moving.

That is worth saying against the alternative. Kling has a lip-sync endpoint too
— `POST /v1/videos/lip-sync`, which takes `video_url` for an uploaded clip
(2–10s) or `video_id` for one Kling made. In `text2video` mode its
`voice_language` field accepts `zh` and `en` and nothing else. In
`audio2video` mode you supply the file, so the same escape applies — but the
input is a *video*, not a picture, which means making the clip first and paying
for it before the lip-sync.

Creatify Aurora takes a still. That is one generation instead of two, and a
still is what a cast member already is.

## What does not fit, and what is not known

**It is not a `Provider`.** `lib/server/video/types.ts` describes an engine that
takes a prompt, an aspect ratio and a number of seconds. This takes an image and
an audio file and derives its length from the audio. Bolting it into the grade
system would mean a grade whose length row and shape row mean nothing. It wants
its own path — and probably its own room, since "read this script" is a
different job from "describe a shot".

**The cost is not known.** Not in the SDK, and this project prices from its own
invoices rather than from a pricing page — which is how `CREDITS.video` came to
be 15 a unit rather than a flat 30. One clip on the account, then the number.

**Whether the account can call it is not known.** `bytedance-seedance-*` is in
the same model list and is behind `ELEVEN_SEEDANCE_READY` precisely because the
broker accepting a model id depends on the plan. Aurora deserves the same
treatment: a flag, off until one clip has come back.

**How long a clip can be is not known.** The request has no duration field, so
it is presumably the length of the audio, with some ceiling nobody has stated.
Also worth one clip to find out.

## Built

It is in the video desk, below the shot composer, and draws nothing at all
unless `ELEVEN_AURORA_READY=1` — an empty section explaining a feature nobody
can use is worse than no section.

Choose somebody from the cast, write what they say, hear it read first — the
reading costs a fraction of the video, and hearing the words in that voice
before the picture is made is the difference between one clip and three — then
tick the confirmation and make it.

Three of the unknowns above are still unknown and are answered by one clip.
`presenterCost` holds the middle rung as a deliberate placeholder, and the row
records `provider_units` for what it really took.

## Sources

- `@elevenlabs/elevenlabs-js` — `VideoGenerationRequest`, `CreatifyAuroraRequest`,
  `ImageReference`, `AudioReference`, `InlineImageReference`,
  `InlineAudioReference` and their serializers.
- Kling API documentation for `/v1/videos/lip-sync`, via
  https://github.com/199-mcp/mcp-kling/blob/main/kling-api-docs.md
- ElevenLabs' own announcement of Avatars in ElevenCreative, which is the same
  capability wearing a product name: https://elevenlabs.io/blog/introducing-avatars
