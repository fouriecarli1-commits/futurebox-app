# Epos aan fal.ai — verwerkersooreenkoms en oorgrens-oordrag

Konsep vir Carli om te stuur. **Vul die drie plekhouers in waar jy dit stuur —
hulle staan met opset nie in hierdie lêer nie:** jou naam en rol onderaan, die
maatskappy se adres, en die kontak-e-pos.

Geskryf in Engels omdat fal.ai in die VSA sit.

---

## Hoekom hierdie brief bestaan

Drie funksies in die snykamer is geprys, staan op elke planskaart, en is **nie
aangeskakel nie**: agtergrond uithaal, 'n item uit 'n skoot haal, en 'n stuk
genereer wat jy nie het nie. Die skerm sê so, en sê ook hoekom.

Die rede is nie kode nie. `docs/REGS-OUDIT.md` (reël 148) hou fal.ai reeds
vooraf geregistreer in `check:verwerkers`: die dag wanneer iemand daardie
`fetch` skryf, word die bou rooi totdat die privaatheidsbladsy 'n reël daarvoor
het. Dit is met opset so gebou.

Wat ontbreek is drie antwoorde, en nie een van hulle is myne om te gee nie:

1. **'n Verwerkersooreenkoms (DPA).** Hulle verwerk persoonlike inligting
   namens FUTUREBOXSTUDIO (Pty) Ltd, nie vir hulleself nie.
2. **POPIA artikel 72.** Video van 'n mens se gesig gaan die land uit. Dit is
   net toelaatbaar onder een van die gronde in artikel 72, en die eenvoudigste
   is dat die ontvanger aan 'n wet of 'n bindende ooreenkoms gebind is wat
   wesenlik dieselfde beskerming bied.
3. **Of hulle daarop oplei.** 'n Verskaffer wat 'n lid se gesig in 'n
   opleidingstel sit, is 'n ander produk as een wat dit verwerk en weggooi, en
   die privaatheidsbladsy moet sê watter een dit is.

**Niks hiervan is 'n tegniese blokkasie nie.** Die oomblik wanneer daardie drie
antwoorde terug is, is dit 'n privaatheidsreël plus een `fetch`.

---

**Subject:** Data processing agreement and cross-border transfer — FutureBox Studio (South Africa)

Hi,

I'm the founder of FutureBox Studio (FUTUREBOXSTUDIO (Pty) Ltd, South Africa,
registration 2026/714071/07), a creative studio for music, voice and video
aimed at independent artists and small businesses.

We want to use fal.ai for three video features: background removal, object
removal, and generative fill. The integration is straightforward and we have
not built it yet, deliberately — these features will process video of
identifiable people, and our own build fails until the paperwork behind that is
in place. I'd rather have the answers before writing the call than after.

Four questions.

## 1. A data processing agreement

South Africa's Protection of Personal Information Act (POPIA) treats us as the
responsible party and fal.ai as an operator processing on our instruction. We
need a written agreement to that effect before any member's video is sent.

Do you have a standard DPA you can send? If you have a GDPR DPA, that is
usually most of what we need — POPIA's operator provisions (sections 20 and 21)
cover much the same ground — and we can tell you quickly whether it works as
written or needs an addendum.

## 2. Cross-border transfer

POPIA section 72 restricts sending personal information outside South Africa.
The ground we would rely on is section 72(1)(a): that the recipient is subject
to a law, binding corporate rules, or a binding agreement providing an
adequate level of protection, including provisions substantially similar to
POPIA's own conditions and to section 72 itself for onward transfers.

So, concretely: **does your DPA bind your sub-processors to the same terms on
onward transfer?** And is there a list of the sub-processors and the regions
our data would actually sit in or pass through?

## 3. Training

Do you train on, fine-tune from, or otherwise retain customer inputs or
outputs? If there is an opt-out, is it on by default or does it have to be
switched on, and is it per account or per request?

We would be sending video of people's faces. Our privacy notice names every
company that sees a member's data and says what they may do with it — a check
in our build fails if a supplier is missing from it — so I need to be able to
write one accurate sentence about this rather than a hedge.

## 4. Retention

How long are inputs and outputs held after a job completes, and is that
configurable? If a member asks us to delete their data, what is the mechanism
on your side and how long does it take?

---

I appreciate these are the unglamorous questions. We ask them of every supplier
before we integrate, not after — our privacy page already names ElevenLabs,
Supabase, Kits.AI, Music.ai, Anthropic and Paystack, and fal.ai is registered
in the same place waiting for these answers.

Happy to sign whatever you have in standard form if it covers the above.

Kind regards,

[JOU NAAM]
[JOU ROL], FUTUREBOXSTUDIO (Pty) Ltd
Reg. 2026/714071/07 · South Africa
[KONTAK-E-POS]

---

## Wat gebeur as hulle antwoord

| Antwoord | Wat ek doen |
|---|---|
| DPA + sub-verwerkerlys + geen opleiding | Privaatheidsbladsy kry fal.ai se reël, `check:verwerkers` word groen, drie funksies gaan aan |
| DPA maar hulle lei op, met 'n opt-out | Opt-out aan, en die privaatheidsbladsy sê dit presies so |
| DPA maar hulle lei op, geen opt-out | Ek stel 'n ander verskaffer voor. Ons kan nie 'n lid se gesig in iemand se opleidingstel sit en dit "verwerking" noem nie |
| Geen DPA | Ander verskaffer. Sonder een is artikel 72 nie haalbaar nie |

Die derde en vierde ry is nie teoreties nie: `docs/ANDER-VERSKAFFERS.md` hou al
die alternatiewe, en die vergelyking is reeds gedoen.
