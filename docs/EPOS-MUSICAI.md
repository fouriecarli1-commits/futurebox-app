# Epos aan Music.ai — API-vermoëns en 'n kwotasie

Konsep vir Carli om te stuur. **Vul die drie plekhouers in waar jy dit stuur —
hulle staan met opset nie in hierdie lêer nie:** jou naam en rol onderaan, die
maatskappy se adres, en die kontak-e-pos.

Geskryf in Engels omdat Music.ai internasionaal is. Alles in die "what we
need"-lys kom uit wat die app werklik doen of werklik kortkom — niks is
bygedink om die lys langer te maak nie.

---

**Subject:** FutureBox Studio — API capabilities and a quotation

Hi Danny,

I'm building FutureBox Studio, a creative studio for music, voice and video
aimed at independent artists and small businesses in South Africa. We're
approaching launch and Music.ai is already integrated — I'd like to understand
the full extent of what's available over the API before we go live, and to get
a quotation.

## Where we are

Our integration is built and running against your documented API: `GET /upload`
for the signed pair, `POST /v1/job`, `GET /v1/job/{id}`, `GET /v1/application`,
and `GET /v1/workflow` to list what an account carries. We read a job's
`result` generically — every key that comes back is handled, whether it's a
JSON document or a file — so adding a new workflow on our side is a
configuration change rather than a development one.

That means the constraint isn't our code. It's knowing what to point it at.

## What I'd like to understand

**1. The template workflow catalogue.** Your documentation mentions template
workflows provided by the platform, and I've seen `music-ai/stems-vocals-accompaniment`
used as an example. Is there a published list of the `music-ai/…` workflows?
And are they available to every account as-is, or does each one still need to
be created in the account's own dashboard first? Our integration currently
assumes the latter and refuses to run until a slug is configured, which is
safe but means nothing works on day one.

**2. The module catalogue.** Since custom workflows chain modules, the list of
modules is really the list of what's possible. Is that available outside the
dashboard's builder?

**3. Output shapes.** For each workflow, what keys come back in `result` and in
what format — particularly for anything that returns structured data rather
than audio files.

## What we need, specifically

These are the things we've identified from building the product, in order of
how much they matter to us:

**a. Singing voice conversion.** This is our single biggest gap. The path we
want is: generate a song, split the vocal off, re-sing that vocal in the
member's own trained voice, mix it back. Every step but the third is built.
Speech-to-speech models handle talking well and singing badly, so we need a
model trained for singing. Do you offer singing voice conversion over the API,
and can a member's own voice be trained as a model? If so, what does training
require — how much clean audio, and how long does it take?

**b. Reading a recording.** Chords, key, tempo and section boundaries. We use
this to set a session's tempo and key in our multitrack booth, to place the
metronome and the bar grid, and to let somebody jump between sections. This is
already wired on our side and is the workflow we'd use most.

**c. Named stems.** Not just vocals and accompaniment — drums, bass, guitar,
keys separately, named, so each can land on its own lane in the booth.

**d. Lyric transcription with timing.** We put words on screen in time with the
music, both for singing along and for subtitles on video. Word-level or
line-level timings, in whatever form you return them.

**e. Guitar and amp tone.** We're building out a proper multitrack booth and
amp modelling is part of it — we already run neural amp captures in the
browser. Do you have anything on the audio-processing side for guitar tone:
amp or cabinet simulation, tone matching, re-amping, impulse responses? Even
if it isn't a headline feature, it would sit directly in a room we're building
now.

**f. Anything else you'd point a product like this at.** We would rather be
told about something useful than discover it in a year.

## Commercial

- What is the pricing model — per job, per minute of audio, or a monthly
  commitment? Are there volume tiers?
- Are there limits we should design around: maximum file length or size,
  concurrent jobs, rate limits?
- How long are uploaded files retained on your side, and is there a way to
  delete a file after a job completes? This matters to us beyond preference:
  our privacy policy makes specific commitments about what happens to a
  member's voice recording, and I'd rather those commitments match your
  behaviour than be written around it.
- Do you have a data processing agreement? We'll be processing personal data
  under South Africa's POPI Act.
- Which region do jobs run in? Our members are in South Africa and round-trip
  latency is worth knowing about.

## Volumes

[VUL IN: verwagte maandelikse minute klank, of die lede-teiken vir die eerste
ses maande — sien die nota onder.]

Happy to get on a call if that's easier than writing it all out.

Best regards,

[JOU NAAM]
[JOU ROL], FutureBoxStudio (Pty) Ltd
[KONTAK-E-POS]
South Africa

---

## Notas vir jou, nie vir die epos nie

**Die volumes.** Los dit nie leeg nie — 'n kwotasie sonder 'n getal kom terug
as 'n lysprys. Sê vir my jou lede-teiken vir die eerste ses maande en ek werk
die maandelikse minute uit die koste-model uit wat al staan, dan plak jy die
getal in.

**Hoekom die privaatheid-vraag daar is.** Ons privaatheidsbeleid maak spesifieke
beloftes oor wat met 'n lid se stemopname gebeur. As Music.ai lêers langer hou
as wat ons belowe, is dit ons wat verkeerd is, nie hulle nie. Beter om dit nou
te vra as om dit later te moet regskryf.

**Hoekom (a) eerste staan.** Dit is die een ding in die hele app wat gebou is
behalwe vir een stap — sien `docs/OPEN-QUESTIONS.md` §A1. Alles anders op die
lys is 'n verbetering; hierdie een maak 'n funksie klaar.
