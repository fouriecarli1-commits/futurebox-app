# Epos aan Music.ai — API-vermoëns en 'n kwotasie

> ## ⬇ STUUR HIERDIE EEN
>
> Carli, 5 Oktober 2026, oor ElevenLabs: *"Hulle antwoord my nie, en ek sal
> nie so kan besigheid doen nie."*
>
> Hierdie lêer het **twee** briewe gedra: 'n eerste kontak met volumes wat te
> hoog was, en 'n opvolg van 23 September wat hulle regstel. Dit was reg
> **as** die eerste een al gestuur is.
>
> As nog niks gestuur is nie, is twee briewe verkeerd: die een hieronder is
> hulle saamgevoeg, met die **reggestelde** volumes in, plus wat ons op
> 5 Oktober uitgevind het oor waarvoor ons hulle nou werklik nodig het.
> Die twee oorspronklikes staan onder dit as geskiedenis.
>
> **Vul drie plekhouers in voor jy stuur** — hulle staan met opset nie in
> hierdie lêer nie: jou naam, jou rol, en die kontak-e-pos.

---

**Subject:** FutureBox Studio — API capabilities, and a quotation at our real volumes

Hi Danny,

I'm building FutureBox Studio, a creative studio for music, voice and video
aimed at independent artists and small businesses in South Africa. We're
approaching launch, Music.ai is already integrated and running, and I'd like
two things: to understand the full extent of what's available over the API,
and a quotation against volumes that are honest rather than flattering.

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

In order of how much they matter to us:

**a. Singing voice conversion.** This is our single biggest gap. The path we
want is: generate a song, split the vocal off, re-sing that vocal in the
member's own trained voice, mix it back. Every step but the third is built.
Speech-to-speech models handle talking well and singing badly, so we need a
model trained for singing. Do you offer singing voice conversion over the API,
and can a member's own voice be trained as a model? If so, what does training
require — how much clean audio, and how long does it take?

**b. Lyric and speech alignment with word-level timing.** We put words on
screen in time with the music, for singing along and for subtitles on video.
I can see syllable alignment on your public pricing; what I'd like to know is
the full shape of what comes back, and whether it handles **Afrikaans** as
well as English. Our members are South African and most of what moves through
this app is in Afrikaans — that one answer matters more to us than the price.

**c. Named stems.** Not just vocals and accompaniment — drums, bass, guitar,
keys separately, named, so each can land on its own lane in our booth.

**d. Reading a recording.** Chords, key, tempo and section boundaries. We use
this to set a session's tempo and key in the multitrack booth, to place the
metronome and the bar grid, and to let somebody jump between sections.

**e. Transcription.** Same question as (b) on Afrikaans.

**f. Guitar and amp tone.** We run neural amp captures in the browser already.
Anything on the audio-processing side — amp or cabinet simulation, tone
matching, re-amping, impulse responses — would sit directly in a room we're
building now.

**g. Anything else you'd point a product like this at.** We would rather be
told about something useful than discover it in a year.

Items (b), (c) and (e) carry more weight for us than they did a month ago,
and I'll be straight about why: we currently buy those from another supplier
and that relationship isn't working — repeated emails, no replies. I'm not
shopping you against them on price. I'm asking whether you'd be a supplier we
can reach when something is wrong, because that has turned out to matter more
to me than any feature on either list.

## Commercial

- What is the pricing model — per job, per minute of audio, or a monthly
  commitment? Are there volume tiers, and **is there a minimum monthly
  commitment?** At our size that question decides more than the rate does.
- Are there limits we should design around: maximum file length or size,
  concurrent jobs, rate limits?
- How long are uploaded files retained on your side, and is there a way to
  delete a file after a job completes? This matters beyond preference: our
  privacy policy makes specific commitments about what happens to a member's
  voice recording, and I'd rather those commitments match your behaviour than
  be written around it.
- **Do you have a data processing agreement?** We process personal data under
  South Africa's POPI Act, which requires a written agreement with each
  operator. This one is not a nice-to-have for us — we can't go live without
  it.
- Which region do jobs run in? Our members are in South Africa and round-trip
  latency is worth knowing about.

## Volumes

So you can quote against something real. Our member targets are 365 by month
two and 2 000 by month four — but these workflows are **multitrack booth**
work, used by somebody tracking a session properly, not by somebody generating
a song from a prompt. Realistically that's a small professional slice:

| | by month 2 (365 members) | by month 4 (2 000 members) |
|---|---|---|
| low (5% of members) | ~130 min | ~700 min |
| **expected (8%)** | **~200 min** | **~1 100 min** |
| high (15%) | ~380 min | ~2 100 min |

A couple of hundred minutes a month to start. I'd rather give you the
assumption than a confident-looking number: the 8% is our own estimate and not
something we have measured, so if your pricing has thresholds, tell me where
they sit and I'll tell you which side of them we land on.

At this size we're a small customer, and I'd rather be a small customer you're
glad to have than one who quoted big and delivered small.

The workflow list and the module catalogue matter more to us than the price
does, because they decide what we can build at all.

Happy to get on a call if that's easier than writing it out.

Best regards,

[JOU NAAM]
[JOU ROL], FutureBoxStudio (Pty) Ltd
[KONTAK-E-POS]
South Africa

---
---

# Geskiedenis — die twee oorspronklike briewe

Gehou omdat hulle wys hoe die getalle verander het en hoekom. **Moenie
hierdie twee stuur as jy die een hierbo gestuur het nie.**

---

## Die oorspronklike eerste kontak

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

So you can quote against something real rather than a list price — our targets
are 365 members by month two and 2 000 by month four. Assuming an average song
of three and a half minutes:

| | by month 2 (365 members) | by month 4 (2 000 members) |
|---|---|---|
| conservative — one job per member per month | ~1 300 min | ~7 000 min |
| **expected** — 60% of members active, two jobs each | **~1 500 min** | **~8 400 min** |
| busy — every member, four jobs each | ~5 100 min | ~28 000 min |

The expected row is the one to quote against. The mix is split between reading
a recording and separating stems, and we'd expect the read to be the larger
share since it runs whenever somebody opens a session in the booth.

I'd rather give you the assumption than a single confident number: the 60% is
our own usage estimate and not something we've measured yet, so if your pricing
has thresholds, please tell me where they sit and I'll tell you which side of
them we land on.

Happy to get on a call if that's easier than writing it all out.

Best regards,

[JOU NAAM]
[JOU ROL], FutureBoxStudio (Pty) Ltd
[KONTAK-E-POS]
South Africa

---

## Notas vir jou, nie vir die epos nie

**Die volumes, en waarop hulle rus.** Jou teikens is 365 lede teen maand twee
en 2 000 teen maand vier. Daaruit:

| | maand 2 | maand 4 |
|---|---|---|
| versigtig (1 job per lid) | 1 278 min | 7 000 min |
| **verwag (60% aktief, 2 jobs elk)** | **1 533 min** | **8 400 min** |
| besig (almal, 4 jobs elk) | 5 110 min | 28 000 min |

Een eerlikheid: die koste-model in `docs/KOSTE-EN-WINS.md` modelleer
**krediete**, nie Music.ai-minute nie. Om minute daaruit te kry verg twee
aannames wat nêrens in die repo staan nie — hoe lank 'n gemiddelde liedjie is
(3,5 min) en hoeveel jobs 'n aktiewe lid per maand laat loop (2). Die 60%
aktief kom wél uit die model se "realisties"-geval.

Daarom staan die aannames in die epos self. 'n Verskaffer respekteer 'n
gestelde aanname meer as 'n getal wat presies lyk en niks agter het nie — en as
hulle prys drumpels het, sal Danny nou self kan sê aan watter kant ons val.

**Hoekom die privaatheid-vraag daar is.** Ons privaatheidsbeleid maak spesifieke
beloftes oor wat met 'n lid se stemopname gebeur. As Music.ai lêers langer hou
as wat ons belowe, is dit ons wat verkeerd is, nie hulle nie. Beter om dit nou
te vra as om dit later te moet regskryf.

**Hoekom (a) eerste staan.** Dit is die een ding in die hele app wat gebou is
behalwe vir een stap — sien `docs/OPEN-QUESTIONS.md` §A1. Alles anders op die
lys is 'n verbetering; hierdie een maak 'n funksie klaar.

---

# Opvolg-epos — die volumes reggestel

Carli, 23 September 2026: *"Ek dink nou net ons het die verkeerde getalle vir
music.ai gestuur, want in realiteit gaan ons net enkele professionele mense kry
wat die produk so gaan gebruik."*

Sy is reg. Die getalle in die epos hierbo het aangeneem elke lid is 'n
kandidaat vir die read en die stems. Hulle is nie. Albei is **Pro Booth**-werk
— iemand wat 'n opname multitrack opneem en die tempo, toonaard en stemme
daaruit wil hê. Die meeste lede maak 'n liedjie uit 'n prompt en raak nooit aan
daardie kamer nie.

**Stuur dit voordat hy kwoteer.**

---

**Subject:** Re: FutureBox Studio — API capabilities and a quotation

Hi Danny,

One correction before you put a quote together, and I'd rather send it now
than have you price against a number that was wrong.

The volumes I gave you assumed every member is a candidate for these
workflows. They aren't. Reading a recording and separating stems are both part
of our multitrack recording room — they're what somebody uses when they're
tracking a session properly, not what somebody does when they generate a song
from a prompt. Realistically that's a small professional slice of our members,
not all of them.

On the same member targets — 365 by month two, 2 000 by month four — and
assuming five to fifteen per cent of members actually work that way:

| | by month 2 | by month 4 |
|---|---|---|
| low (5% of members) | ~130 min | ~700 min |
| **expected (8%)** | **~200 min** | **~1 100 min** |
| high (15%) | ~380 min | ~2 100 min |

So roughly an order of magnitude below what I sent — a couple of hundred
minutes a month to start, rather than fifteen hundred.

Two things follow from that, and they're the reason I'm writing rather than
letting it ride:

- **Is there a minimum monthly commitment?** If your entry plan is built
  around a volume we won't reach for a year, I'd rather know now and start on
  pay-as-you-go than sign up to minutes we don't use.
- **Where does your pricing start?** At this size we're a small customer, and
  I'd rather be a small customer you're happy to have than one who quoted big
  and delivered small.

The rest of the questions in my first email stand — the template workflow list
and the module catalogue matter more to us than the price does, because they
decide what we can build at all.

Best regards,

[JOU NAAM]
[JOU ROL], FutureBoxStudio (Pty) Ltd
[KONTAK-E-POS]
South Africa

---

## Hoekom dit die moeite werd is om reg te stel

Nie netheid nie. Die egte risiko van 'n te hoë getal is 'n **minimum maandelikse
verbintenis**. As Danny 'n plan kwoteer wat om 8 400 minute gebou is, betaal jy
vir minute wat jy nie gebruik nie — elke maand, vir 'n jaar. Dit is die soort
ding wat 'n mens eers agterkom as die faktuur kom.

En 'n verskaffer wat jou hoor sê *"ek stel dit reg voordat jy kwoteer"* lees dit
as iemand wat weet wat sy doen. Die teenoorgestelde — 'n groot getal wat nie
realiseer nie — lees as iemand wat nie weet nie.

Die 8% is steeds 'n skatting, nie 'n meting nie, en die epos sê so deur 'n band
te gee eerder as een getal.
