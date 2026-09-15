# What the Kits.AI terms let FutureBox do

Read against the documents Carli pasted on 15 September 2026: the **Kits
Royalty-Free AI Model License Terms** (Arpeggi, Inc.) and six help-centre
answers on rights, datasets, licences and API access.

The short version: **Kits is the cleaner of our two voice suppliers, and it
is not close.** Where ElevenLabs took fourteen documents and a found
contract to reach "probably", Kits says in one sentence that the output is
yours for personal and commercial use — and expressly includes broadcast,
which ElevenLabs carves out.

What Kits does *not* answer is the same question ElevenLabs needed an OEM
agreement for: whether that licence reaches **our members** rather than us.
There is no Kits equivalent of the OEM Terms in anything pasted.

*Not legal advice. A reading of the text against `app/lib/server/kits.ts`,
which is the only place the app touches them.*

---

## 1. What we actually use

`app/lib/server/kits.ts` calls `https://arpeggi.io/api/kits/v1`, and the one
endpoint that matters is `POST /voice-conversions` — a member's recording in,
the same performance in another voice out. Plus the voice and instrument
catalogues, and the `instrumentsExist()` probe added last session.

Two things follow:

- **We are an API customer**, so the API help answer applies: the API is open
  to Starter, Producer and Professional tiers, with a token generated on the
  account page. Rate limits and enterprise are a support conversation.
- **We do not use Kits text-to-speech**, and could not: it was **deprecated
  from the API on 22 September 2025**. The `check:probes` sweep and the
  engines table should not grow a Kits TTS row.

---

## 2. The licence, which is the good news

**§1.1, AI Model Output Personal License** — once the output exists, Arpeggi
grants:

> a non-exclusive, **irrevocable** (except as set forth in Section 4.1),
> royalty-free, worldwide license to store, display, perform, reproduce,
> distribute, alter, transmit, make available, communicate to the public,
> **broadcast**, create derivative works of, and otherwise use the AI Model
> Output for both **personal and commercial uses**.

Four words in that sentence are worth more than they look:

- **irrevocable** — the opposite of ElevenLabs §5(b)'s *revocable*. It can
  still go, but only under §4.1 (a material breach by us), not at will.
- **broadcast** — named. ElevenLabs puts film, television and radio outside
  the standard music licence and behind Enterprise Music. Kits does not.
  **A Kits-converted vocal may go on the radio; an ElevenLabs-generated song
  may not.** That is a real, sellable difference and nothing in the app says
  it.
- **commercial** — settled, with no tier condition beyond holding a
  subscription with a minute in it (§1.1, first).
- **royalty-free** — and the help answers repeat it for all three model
  types.

The help answers put the same thing three ways, each with the same condition:

| Model | Answer |
|---|---|
| Royalty-Free Voice & Instrument Library | Royalty-free licence to the output, **so long as you had full rights to whatever you put in** |
| Instrument models you trained | Same |
| Voice models you trained | *"you have a license to use the output of your AI voice models however you like — personal use, commercial use, distribute & monetize on streaming platforms"* |

And the summary answer: *"Assuming you have rights to all the input data you
provide on Kits AI, you retain full ownership and usage rights over all
outputs generated on Kits, whether you are training a voice or converting
audio."*

**Every one of them turns on the input.** Which is the same place the
ElevenLabs reading landed, and the third independent reason for the copyright
check on uploads.

---

## 3. The gap, and it is the familiar one

The licence in §1.1 is granted to **you** — the subscriber. FutureBox holds
the subscription; a member does not. Nothing pasted addresses a platform
passing the service through to its own users: there is no Kits OEM Terms, no
"Bundled Service", no End User definition, no minimum terms to put on our
page.

That is not the same as a prohibition. §1.1's grant is *"store, display,
perform, reproduce, distribute, alter, transmit, make available … and
otherwise use"* — broad, and "make available" is the same verb ElevenLabs
uses for the thing their OEM Terms permit. But it is granted to us, and the
restrictions section (§2) contains only a hate-speech clause, so there is no
express no-sublicensing sentence to work around either.

**So the honest position is: silent, not forbidden.** It is worth one email
to Kits support, and the question is short — *"we run a platform where our
members convert their own recordings through our subscription and then
release the results commercially; does §1.1's output licence reach them, or
do you have a separate agreement for that?"* Cheap to ask, and if the answer
is yes it is cleaner than ElevenLabs'.

---

## 4. What to be careful of

| Where | What it says | What it means here |
|---|---|---|
| **§1.3 Right to Remove** | Arpeggi may remove or replace any model, and remove functionality, if they have *"any reason to believe"* it may infringe | **A voice or instrument a member builds a sound around can disappear.** The catalogue is not a stable dependency and the app should not present it as one |
| **§1.2** | An irrevocable covenant not to sue over outputs similar or identical to ours, by Arpeggi or by any other Kits user | Same non-uniqueness point as ElevenLabs, plus a waiver of the right to complain |
| **§2.1** | No unlawful, defamatory, harassing, abusive, fraudulent, racist, hateful, vulgar, cruel or obscene use, *"as determined in Arpeggi's sole discretion"*, and they may send takedown notices to third-party platforms | They can have a member's track pulled off TikTok directly. Our own safety gate is the thing that keeps this theoretical |
| **§3.5** | We indemnify them for our breach, our violation of third-party rights, and our use of the model | Same shape as the ElevenLabs and OEM indemnities. Three suppliers, three indemnities, one uploaded song |
| **§4.1** | A material breach terminates **all** licences, with notice only on commercially reasonable efforts and effective whether or not it arrives | The irrevocable output licence in §1.1 is irrevocable *except here* |
| **§4.3** | JAMS arbitration, sole arbitrator, **New York law**, class-action waiver, after a 90-day good-faith window | Identical shape to ElevenLabs' §12. Both our voice suppliers are a New York arbitration away |
| **§3.2** | Liability capped at the greater of **$1,000** or twelve months' subscription fees | Ten times ElevenLabs' $100 floor. Small, but better |

One oddity worth knowing about: **§3.4** says these terms *"are based on a
template that has been provided by Arpeggi or other third parties for public
use"*, and makes the template providers third-party beneficiaries with a
covenant not to sue them. It is unusual to admit that in the contract itself.
It does not change anything we do; it is a reason to read the operative
clauses rather than assume boilerplate.

---

## 5. What they train on — and why it is worth keeping

The datasets answer is the one document here that is purely good news, and
worth keeping because a distributor or a store will eventually ask.

Kits say their models are trained **exclusively** on fully-licensed
proprietary datasets with *"fair compensation to providers"*, plus
open-licence datasets. The open ones are named:

- **Emilia-YODAS** (Amphion / OpenMMLab) — CC BY 4.0, unmodified
- **VCTK Corpus 0.92** (University of Edinburgh, CSTR) — CC BY 4.0, unmodified

And the open-source pieces: **Parakeet TDT 0.6B V2** (NVIDIA, CC BY 4.0),
**Audiobox Aesthetics** (Meta AI, CC BY 4.0), **LAME** and **lamejs** (LGPL),
**FFmpeg** (LGPL 2.1-or-later). None modified.

Two reasons this matters to us:

1. **It is an answer to the question everyone asks about AI music.** "What
   was it trained on" has a documented answer for the Kits path, with named
   datasets under a named licence. ElevenLabs' privacy policy says only that
   they collect *"publicly available information from third-party sites"* for
   training. If a member, a school or a distributor asks, the Kits path is the
   one with a paper trail.
2. **CC BY 4.0 requires attribution.** That obligation sits on Kits, not on
   us — we license their output under §1.1, not the datasets. But if we ever
   publish an attributions page, these are the entries to carry across, and
   the LGPL components are the reason to keep the list rather than summarise
   it.

---

## 6. What to do

1. **Email Kits support** with the one question in §3: does the §1.1 output
   licence reach a platform's members? It is a short question and they answer
   help tickets, unlike the ElevenLabs sales route.
2. **Say the broadcast difference out loud somewhere.** Right now `/terms`
   tells a member that film, television and radio need a separate agreement,
   which is true of the generated song and **not** true of a Kits-converted
   vocal. That is a feature we are currently hiding from ourselves.
3. **Stop treating the Kits catalogue as stable.** §1.3 lets them pull a model
   at any time. Anywhere the app pins a member's sound to a specific Kits
   voice or instrument id, it should degrade to something rather than break.
4. **Keep §5 for the attributions page**, whenever there is one.
5. **No Kits text-to-speech**, ever — deprecated from the API in September
   2025.
