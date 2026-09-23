# Epos aan TONE3000 — die captures-biblioteek en die lisensie

Konsep. **Dieselfde drie plekhouers as die Music.ai-een — vul hulle in waar jy
stuur.**

Hoekom dit 'n aparte epos is: TONE3000 is 'n ander maatskappy as Music.ai, en
die vraag aan hulle is 'n **lisensie**-vraag eerder as 'n vermoëns-vraag. Ons
het hulle enjin klaar aan die werk; wat ons van hulle nodig het, is toestemming
en 'n katalogus.

---

**Subject:** FutureBox Studio — TONE3000 API access and capture licensing

Hi,

I'm building FutureBox Studio, a creative studio for music, voice and video
aimed at independent artists in South Africa. We have a multitrack recording
room in it, and amp modelling is already working: we run neural amp captures
in the browser on `@opendaw/nam-wasm`, the MIT-licensed NeuralAmpModelerCore
compiled to WebAssembly by way of your WASM port. It's verified end to end on
our side and the model is baked into the mixdown, so the exported file sounds
like what the player hears.

What we don't have is anything for people to load. Today a member has to bring
their own `.nam` file, which means the feature works and is effectively unused.

Three questions:

**1. API access to the library.** You have an OAuth API. Could we use it to let
a member browse TONE3000 and load a capture directly inside our app, signing in
with their own TONE3000 account? That's the version we'd prefer — the captures
stay yours, the creators keep their attribution and their traffic, and we're
not redistributing anything.

**2. Licensing, if that isn't possible.** If the API route isn't open to us,
could we ship a small set of captures with the product instead — and if so,
whose permission do we need? My understanding is that most captures are
uploaded by their creators under your terms rather than owned by TONE3000, so
I'd rather ask than assume.

**3. Attribution.** We understand you ask for TONE3000 to be named where your
work is used. Tell us exactly how you want that done — wording and placement —
and we'll put it in. We'd rather get it right the first time than be corrected.

And if there are commercial terms attached to any of this — API fees, a
revenue share, a partnership arrangement — please say so and we'll work with
them.

Best regards,

[JOU NAAM]
[JOU ROL], FutureBoxStudio (Pty) Ltd
[KONTAK-E-POS]
South Africa

---

## Notas vir jou

**Wat ons al het.** `app/lib/nam.ts`, geverifieer deur `check:nam`: 12 000 uit
12 000 monsters verander, blokgrootte-onafhanklik tot 0.00e+0, en iets wat nie
'n capture is nie word geweier. Die enjin is MIT-gelisensieer, so die *kode* is
nie die vraag nie — die *captures* is.

**Hoekom vraag 1 eerste staan.** Dit is die antwoord wat vir almal die beste
werk: hulle hou hulle biblioteek, die maker kry sy erkenning, ons versprei niks
en ons hoef niks te onderhou nie. Vraag 2 is die terugval, nie die versoek nie.

**Hoekom die erkenning uitdruklik gevra word.** Dit staan al in
`docs/OPEN-QUESTIONS.md` dat TONE3000 hulle naam op die produk vra. Vra hoe,
eerder as om te raai en dit dan oor te doen.
