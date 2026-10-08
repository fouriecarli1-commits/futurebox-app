# Our own voice conversion, and what it would really take to cut Kits out

*Carli, 8 October 2026:*

> "Ek wil die volgende doen, sodat ons kits ook eventually uitsny: So-VITS-SVC en Diff-SVC
> gebruik gevorderde AI-argitekture om die unieke kenmerke (die timbere en klankkleur) van een
> stem te 'aandryf' met die sanglyn van 'n ander stem."

The description she sent is right, and the limits it states about a coder-AI are right too. So
this document does not re-argue any of that. It does the three things that description leaves
out: **the arithmetic against what we already pay, which half of Kits this would actually
replace, and the two things that are not solved by money.**

The short version, up front, because it is not the obvious answer:

> **The conversion is worth cutting out. The cloning is not.** Kits charges us R1.60 a minute
> for conversion and nothing extra for a voice clone. A GPU costs about R0.12 a minute for the
> same conversion and R28–R70 *per voice trained*. So self-hosting makes conversion ~40× cheaper
> and cloning dramatically more expensive. Cut out the half that is metered, keep the half that
> is flat.

And before a line of it is written, two free things have to be settled: **what the licence
actually is**, and **what POPIA says about us holding a model of a member's voice.** Both cost
nothing to answer and are expensive to get wrong.

---

## 1. What SVC is, and which half of Kits it replaces

Singing voice conversion takes an existing *performance* and re-sings it in another voice. It
does **not** make singing out of written words. That distinction decides the whole scope:

| What Kits does for us | Would our own SVC replace it? |
|---|---|
| **Voice changer / Convert** — a recording in, the same performance in another voice out | **Yes.** This is exactly what So-VITS-SVC and Diff-SVC do. |
| **Harmonies** — one clean voice in, a harmony stack out | Partly. Pitch-shifted conversions stacked. Not the same thing, and worse at it. |
| **Lead Vocals (Generate)** — words plus a backing track in, a *sung* lead out | **No.** That is singing synthesis, not conversion. A different model family entirely. |
| **Voice Designer** — a voice with no dataset at all, from sliders | **No.** Nothing in the SVC pipeline above does this. |
| **Instant / Professional Voice Cloning** | Technically yes, and see §3 — this is the half where self-hosting costs *more*. |

So "cut Kits out" is not one decision. It is four, and only the first one is favourable.

---

## 2. The arithmetic on conversion

**What Kits costs us today**, from `docs/KITS-KAART.md`: R640 a month, with a ceiling of 400
download-minutes.

* R640 ÷ 400 = **R1.60 per minute** of audio a member gets back.
* A three-minute song converted = **R4.80**.
* The whole plan is about **133 conversions a month** across every member.

**What a GPU costs.** Checked on 8 October 2026 rather than remembered — prices moved a long way
in 2026, and the ones in my head are not current:

| | On-demand | Serverless (billed by the second) |
|---|---|---|
| **NVIDIA L4** | $0.44–0.80/hr | ~$0.39/hr (RunPod) to ~$0.80–0.85/hr (Modal, Cerebrium, Baseten) |
| **NVIDIA A10 / A10G** | from $0.24/hr, ~$0.09/hr spot | ~$1.10–1.21/hr |

At R16 to the dollar, an L4 at $0.44/hr is **R7.04 an hour, or R0.117 a GPU-minute.**

**So-VITS-SVC** is a VAE+GAN and runs comfortably faster than realtime on an L4. Taking a
deliberately pessimistic 3× realtime, a three-minute song is one GPU-minute:

> **R0.12 against Kits' R4.80. About forty times cheaper.**

**Diff-SVC** is a diffusion model and is much slower — it refines from noise over many steps.
Assume it runs at realtime or half realtime, so 3–6 GPU-minutes for the same song:

> **R0.35–R0.70. Still seven to fourteen times cheaper than Kits.**

Put the other way round: the entire 400-minute monthly Kits ceiling, converted on our own L4 at
3× realtime, is about 2.2 GPU-hours — **roughly R16 of compute against R640 of subscription.**

**What those numbers leave out,** and they must not be quoted without it: idle time, cold starts
(a model has to be loaded into GPU memory before the first second of audio is converted),
storage, egress, and the hours of somebody's attention that a GPU service needs and a supplier's
API does not. On serverless, billed by the second, the idle problem mostly goes away and the cold
start does not.

---

## 3. And why cloning flips the answer

This is the part that is easy to get wrong, and it is the reason this document does not simply
say "yes, build it".

Kits' voice cloning does not burn the 400 minutes. Our own note is explicit that the minutes run
when audio is **downloaded** — so a Professional Voice Clone is, as far as our bill is concerned,
included in the flat R640. *(Worth confirming against the current Kits terms before this is
relied on; it is the load-bearing assumption of this whole section.)*

Self-hosting a voice is not a conversion. It is a **training run**: 30 minutes to a few hours of
clean audio, and then several GPU-hours of training, per voice, per member.

* Say 4–10 GPU-hours on an L4 at $0.44/hr = $1.76–$4.40 = **R28–R70 per voice.**
* At the 2 000 subscribers she wants to start with, if each one clones their own voice once:
  **R56 000 to R140 000.**
* And it recurs: every new member who clones is another R28–R70, where Kits charges nothing
  extra.

Then the storage. A So-VITS-SVC checkpoint is a few hundred megabytes. Two thousand voices is
somewhere around **0.4–1.2 TB**, plus a backup of it, forever, because a member's voice model
disappearing is a member's work disappearing.

**So the shape of the right answer is a split, not a switch.** Conversion is metered and we are
being charged forty times over the odds for it. Cloning is flat and Kits is handing it to us
nearly free. Cut out the metered half.

---

## 4. The two things money does not solve

### The licence, which nobody has written down clearly

This is the first thing to settle because it is free to settle and fatal to assume. Searching on
8 October 2026 found the licence **genuinely unresolved**:

* One project catalogue lists `svc-develop-team/so-vits-svc` as **AGPL-3.0**, a strong copyleft
  licence, and notes that the original repository was **deleted** and what is there is a
  reconstruction.
* A derivative deployment project describes the upstream as "typically permissive (e.g. MIT)".
* Those two cannot both be right, and neither is the LICENSE file.

It matters enormously which it is. **AGPL-3.0 reaches network use.** If we run AGPL code as a
service our members use, the obligation to offer our corresponding source is triggered — not by
distributing a binary, but by running the service at all. For a closed product that is not a
detail, it is the end of the plan in that form.

Separately, and this is the part people miss: **the weights have their own terms, and the code's
licence does not cover them.** ContentVec, the HuBERT checkpoint, RMVPE, NSF-HiFiGAN — each comes
from a different place, and in the community setups the files are renamed mirrors on Hugging
Face, which can carry different terms than the original release. The so-vits-svc README's own
advice on pretrained models is to "ask the author in advance" — which is an admission that there
is no blanket grant. There is also at least one serious reading that AGPL weights plus a
non-AGPL inference script is a combined work subject to the AGPL.

**What to do:** one hour reading LICENSE files, and the model card of every single weight file
the pipeline loads, tracing each back to the people who released it rather than the person who
mirrored it. Before any code. If a required weight turns out to be non-commercial, the pipeline
does not work for us at any GPU price.

### POPIA, and who holds the voiceprint

Today Kits holds the model of a member's voice. Self-hosting means **we** hold it.

A trained model of an identified person's voice is not an ordinary record. POPIA treats
biometrics as **special personal information**, which cannot be processed on the strength of an
ordinary consent tick-box the way ordinary personal information can. Whether a voice conversion
checkpoint is "biometrics" within the Act's meaning is exactly the kind of question that needs
the attorney already named in `docs/LEGAL-REVIEW.md`, and it needs them **before** the first
training run, not after there are two thousand checkpoints on a disk.

This is not a reason not to do it. It is a reason the legal question goes first, because its
answer may change the architecture — for instance, a member's model living only on their own
device, or being deleted after every conversion, are both buildable and both cheaper to design
in than to retrofit.

---

## 5. Where it would run

**Not in the browser.** This app's CSP is `default-src 'self'` with no `blob:` workers, and every
model in it today is self-hosted and small enough to be. An SVC pipeline is hundreds of megabytes
of weights and wants a GPU. It is a server, and a new outward-facing one, with its own
authentication, its own rate limit and its own spend ceiling.

**Render, which she already pays for:** I could not verify whether Render offers GPU instances or
what they cost — the outbound proxy in this environment blocks render.com, and the search did not
turn up Render GPU pricing. Her existing Render spend is for Vibefy's web service and almost
certainly does not include a GPU. **Check render.com/pricing directly.** If Render has no GPUs,
that is not a problem: the serverless GPU providers bill by the second, which suits our traffic
(bursty, a few hundred conversions a month) far better than a box that bills while it idles.

**The middle path worth pricing before building anything:** so-vits-svc models are already hosted
on per-second inference platforms. That would be no GPU operations for us, no AGPL *hosting*
question for us, per-second billing, and conversion at a fraction of Kits' R1.60/minute — at the
cost of swapping one supplier for another rather than owning it. I could not price it from here;
the proxy blocks replicate.com and fal.ai. It should be priced before the self-hosting option is
chosen, because it may get most of the saving for none of the risk.

---

## 6. What I can build now, with no GPU and no money spent

In the order I would do it:

1. **The seam.** One interface in front of voice conversion, so the app asks for "this recording
   in this voice" and does not know or care which supplier answers. Kits behind it today, ours
   behind it later, and switching is configuration rather than a rewrite. **This is the highest
   value thing to build before any model exists**, and it is worth building even if we never
   self-host, because it is also how we survive Kits' §1.3 — the clause that lets them remove any
   model, any time, for any reason they believe.
2. **The counter and the brake, reused.** `app/lib/server/kitsminutes.ts` already counts minutes
   against a ceiling and refuses *before* taking credits. GPU-seconds are the same shape as
   download-minutes. The hard part of metering a new supplier is already written.
3. **The data preparation.** Cutting, resampling, trimming silence, removing noise — all CPU, all
   scriptable now, and all immediately useful for the files we upload to Kits today. A better
   dataset makes a Kits clone better too, so none of this work is wasted if the rest is never
   built.
4. Only then the pipeline itself, and only once §4 has answers.

What I cannot do, and the description she sent says so correctly: train anything. No GPU here, and
no amount of code substitutes for one. What I would write is a script she runs on a rented GPU,
and the honest first step of that is one voice, measured against the same lyric through Kits, and
listened to before anything is built around it.

---

## Sources for the prices and the licence position

Checked 8 October 2026. All of it should be re-checked before money moves.

* [NVIDIA L4 GPU: Price, Specs & Cloud Pricing Guide (2026) — Jarvislabs](https://jarvislabs.ai/blog/l4-gpu-price)
* [2026 GPU Buyer's Guide — Cerebrium](https://cerebrium.ai/blog/2026-gpu-buyers-guide)
* [NVIDIA A10 vs NVIDIA L4 — getdeploying](https://getdeploying.com/gpus/nvidia-a10-vs-nvidia-l4)
* [The cheapest inference GPU, and its limits — GMI Cloud](https://www.gmicloud.ai/en/blog/cheapest-inference-gpu-limits)
* [so-vits-svc project listing, licence and provenance — SourcePulse](https://www.sourcepulse.org/projects/1157773)
* [so-vits-svc deployment documents — SourcePulse](https://www.sourcepulse.org/projects/1832062)
* [On AGPL weights combined with a non-AGPL inference script — Ultralytics issue #2129](https://github.com/ultralytics/ultralytics/issues/2129)
* [getdeploying: GPUHub vs Render](https://getdeploying.com/gpuhub-vs-render) — listed with no GPU
  price, which is **not** evidence that Render has none; it is why §5 says to check their own page.
