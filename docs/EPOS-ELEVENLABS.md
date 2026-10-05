# Epos aan ElevenLabs — 'n kwotasie, hul plafon, en 'n datum

Carli, 5 Oktober 2026: *"Ek het al lank terug gemail. Het ook nog nie 'n
antwoord gekry nie."* En oor waarvoor sy wag: *"'n kwotasie en wat hulle
ceiling is, want ek wil groot gaan en baie kliënte aanneem."*

**Vul vier plekhouers in:** jou naam, jou rol, die kontak-e-pos, en die datum
waarop jy vantevore geskryf het. Die sperdatum hieronder staan as 19 Oktober
2026 — omtrent twee weke — en jy kan dit skuif, solank daar **een** is.

## Hoekom daar 'n datum in staan

Nie om te dreig nie. 'n Sperdatum sonder 'n gevolg is 'n versoek wat twee keer
gevra is; 'n sperdatum **met** 'n plan daaragter is 'n besigheidsbesluit wat
hulle kan sien aankom. Die verskil is dat die tweede een beantwoord word.

En die plan is eg: die seam in `app/lib/server/suppliers.ts` word nou gebou,
juis sodat hierdie brief se antwoord nie meer die enigste pad vorentoe is nie.
Dit is nie 'n bluf as dit reeds in die repo staan nie.

## Hoekom die plafon-vraag die belangrikste een is

'n Prys is 'n getal waaroor onderhandel kan word. 'n Plafon is 'n muur wat 'n
mens op 'n Vrydagaand met 'n saal vol kliënte ontdek. Sy wil groot gaan — dan
is "wat gebeur wanneer ons dit tref" die vraag wat eerste beantwoord moet
word, en dit is die een wat die meeste verskaffers nie uit hul eie opper nie.

---

**Subject:** FutureBox Studio — quotation, rate limits, and a DPA (third request)

Hi,

I'm writing for the third time, and this time with a date on it, because I
can't keep planning a launch around questions that aren't being answered.

I run FutureBox Studio, a creative studio for music, voice and video for
independent artists in South Africa. We are not a prospect kicking tyres —
ElevenLabs is already woven through the product. Twenty of our server routes
call your API, across thirteen distinct capabilities: text-to-speech with and
without timestamps, text-to-dialogue, speech-to-speech, voice cloning, the
voice catalogue, speech-to-text, forced alignment, music, stem separation,
audio isolation, the full dubbing pipeline with transcripts and SRT, the
pronunciation dictionary, and music finetunes. We are about to launch and
scale, and I want to do that on a supplier relationship that works.

I wrote on [DATUM] and again since, and have had no reply.

## Three things, in the order they matter to me

**1. Your ceiling.** This is the most important one and the least answered.
We are planning for growth and I need to know what happens at the top:

- concurrent requests per account, and per endpoint if they differ
- requests per minute, and characters or minutes per month
- what happens when a limit is reached — does the request queue, return 429,
  or fail outright? Is there a burst allowance?
- are the limits on music, dubbing and stem separation different from the
  text-to-speech ones?
- is there a tier with a higher ceiling, and what does it take to get onto it?

A price is something we can negotiate. A ceiling is something we discover on
a Friday night with customers watching, and I would rather be told now.

**2. A quotation.** Our member targets are 365 by month two and 2 000 by
month four. Usage is weighted towards text-to-speech and music; dubbing, stem
separation and alignment are a smaller professional slice. I'd rather give you
the assumption than a confident-looking number — if your pricing has
thresholds, tell me where they sit and I'll tell you which side we fall on.
What we need is the tier, the rate, any minimum monthly commitment, and
whether there is an overage or a hard stop.

**3. A data processing agreement.** We process the personal data of South
Africans, so POPIA applies. Sections 20 and 21 require a written agreement
with every operator that processes personal data on our behalf. Voice
recordings move through your API, which is about as personal as data gets.
We cannot go live without this, and it is the one item on this list that is
not a preference.

## The date

If I have not heard back by **19 October 2026**, I will take it that these
cannot be answered on a timeline that suits our launch, and we will move the
capabilities that have alternatives to suppliers who answer. That work is
already under way on our side — not as leverage, but because a business
cannot rest thirteen capabilities on a supplier it cannot reach.

I would rather not. The integration works, we've built carefully against your
API, and I would prefer to grow on it. But I need a reply.

If there is a better route to a person than this address — a partnerships
contact, an account manager, a sales line for South Africa — please point me
at it and I will take it from there.

Best regards,

[JOU NAAM]
[JOU ROL], FutureBoxStudio (Pty) Ltd
[KONTAK-E-POS]
South Africa

---

## Na die datum, as daar niks kom nie

Moenie 'n vierde brief skryf nie. `docs/WEG-VAN-ELEVENLABS.md` het die
volgorde: stems en alignment eerste, want 'n woordtyd is objektief reg of
verkeerd en die skuif kan gemeet word. Die twee sonder plaasvervanger — die
Sound trainer se finetune en die uitspraakwoordeboek — bly waar hulle is tot
daar een is, en dit is 'n eerlike uitkoms eerder as 'n mislukking.
