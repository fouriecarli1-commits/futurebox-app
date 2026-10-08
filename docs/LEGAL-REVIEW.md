# What to put in front of the attorney

Carli's list, 7 October 2026: *"Legal check van app."*

This is a handover, not advice. I am not a lawyer and nothing here is legal
advice — what it is, is the work a lawyer should not have to do at their
hourly rate: a complete list of what the app already says, where it says it,
and the specific questions that are left. Hand them this and the review is
an hour of reading rather than a week of discovery.

**The one thing to read first:** the Google Play payments question at the
bottom. It is the only item here that can get the app removed from a store
rather than fined, and it needs answering before the Play listing is
submitted rather than after.

---

## 1. ECTA section 43 — what an online supplier must disclose

The Electronic Communications and Transactions Act 25 of 2002 lists twenty
particulars. `/legal` exists for this and carries most of them. This is each
one and where it stands.

| § | What it asks for | Where it is | Standing |
|---|---|---|---|
| 43(1)(a) | Full name and legal status | `/legal`, from `FUTUREBOX_LEGAL_NAME` | **Done** |
| 43(1)(b) | Physical address and telephone | `/legal` | **Waiting on you** — the address variable is deliberately empty until the CIPC record carries a business address, and the page says so rather than inventing one. Same for the telephone. |
| 43(1)(c) | Web address and email | `/legal` | **Done** |
| 43(1)(d) | Membership of any self-regulatory body | — | **Gap.** We belong to none. A line saying so is the honest answer and I have not written it, because "we subscribe to no code" is a statement with legal weight. |
| 43(1)(e) | Registration number, **names of office bearers**, place of registration | `/legal` has the number | **Gap** — the directors are not named, and the place of registration is not stated. Both are on the CIPC certificate. Note this is the one item that puts a **person's name** on a public page, which is why I have not added it without being told to. |
| 43(1)(f) | Any code of conduct it subscribes to | — | **Gap**, same as (d). |
| 43(1)(g) | Sufficient description of the goods | `/legal`, `/terms`, and every room says its own price | **Done** |
| 43(1)(h) | Full price, including transport, taxes and other fees | `/legal`, the plans screen, and on the button before every press | **Done** |
| 43(1)(i) | Manner of payment | `/legal` — Paystack | **Done** |
| 43(1)(j) | Terms of agreement and how to access them | `/terms`, linked from every footer | **Done** |
| 43(1)(k) | Time within which the goods will be delivered | `/legal` | **Check this one.** Credits are instant and most generation is minutes, but dubbing and some jobs are not. Worth an explicit sentence. |
| 43(1)(l) | Return, exchange and refund policy | `/legal`, "Cancelling, and getting money back" | **Done** |
| 43(1)(m) | **Alternative dispute resolution** code and how to read it | — | **Gap.** `/legal` names the National Consumer Commission and the Information Regulator, which is good practice and is not an ADR code. |
| 43(1)(n) | Security procedures and privacy policy for payment and personal information | `/privacy`, and `/legal` "Paying, and the security of it" | **Done** |
| 43(1)(o) | Minimum duration of the agreement for continuing goods | `/terms` — a month, cancellable from inside the app | **Done** |
| 43(1)(p) | **The right to withdraw under section 44** | — | **The biggest gap. See 2 below.** |

---

## 2. The cooling-off question — section 44

Section 44 gives a consumer **seven days** to cancel an electronic
transaction without reason and without penalty. Section 42(2) lists what it
does not apply to, and two of those exclusions may or may not cover what
this app sells:

* goods **made to the consumer's specification** — a generated song arguably is
* **audio or video recordings or computer software unsealed by the consumer** —
  written for a world of discs, and how it reads for a credit spent on a
  render is exactly the question

**Nothing on any page mentions section 44 at all**, and that is the part I
am confident about: 43(1)(p) requires the right to be *disclosed*, and a
disclosure is owed whether or not an exclusion later applies.

**Questions for the attorney**

1. Does section 44 apply to a credit bought and not yet spent? (My instinct:
   yes, and it is simply refundable.)
2. Does it apply to a credit already spent on a render? (My instinct: the
   s42(2) exclusions bite here, but that is a guess.)
3. Does it apply to a monthly plan? (Separately from the cancellation we
   already offer.)
4. **What sentence should go on `/legal`?** I deliberately have not written
   one. A wrong cooling-off clause is worse than none: it is a promise.

---

## 3. POPIA

| | Where | Standing |
|---|---|---|
| Information Officer named and registered | `/legal` | **Done** — registration with the Regulator is yours to confirm |
| What is collected, item by item | `/privacy` | **Done**, and it is unusually complete |
| Purpose of each processing | `/privacy` | **Done** |
| Third parties named | `/privacy` and the suppliers page | **Done** |
| Cross-border transfer, s72 | `/privacy` — "It leaves South Africa" | **Done** |
| Security safeguards, s19 | `/privacy` | **Done** |
| Breach notification, s22 | `/privacy` | **Done**, and it says the Regulator is told too |
| Access, correction, deletion | `/privacy`, `/account`, and the delete-account route | **Done** |
| Children under 18 | `/terms` | **Done** for voices. **Ask**: does the app knowingly process any child's information, and is an age gate needed? |
| Direct marketing consent, s69 | — | **Ask.** If a newsletter or a promotional email is ever sent, s69 needs an opt-in on file. Worth settling before the first one goes out, not after. |

---

## 4. Consumer Protection Act

Most of the CPA's online duties overlap ECTA. Three worth a look:

* **s48, unfair terms** — the terms are written plainly, which helps, but
  "plain" and "fair" are different tests.
* **s49, notices limiting liability** — any clause limiting our liability has
  to be drawn to the consumer's attention, in plain language, before the
  transaction. Worth confirming the terms clear that bar.
* **s14, fixed-term agreements** — probably not engaged by a monthly plan
  cancellable at any time, but worth one sentence from them.

---

## 5. The other three, in one line each

* **Copyright and the outputs.** `/terms` says plainly that generated music
  is not guaranteed unique and that film, television, radio and studio games
  are outside the licence. That is a supplier term we are passing on, and
  the attorney should check we are passing it on accurately rather than
  restating it.
* **Amp captures.** A song recorded through somebody else's capture may carry
  a NonCommercial licence. The app now stores and shows the licence — see
  `app/lib/amplicence.ts` — and the remaining question is whether showing it
  is enough or whether selling has to be prevented.
* **Masterclasses.** An NDA is on your list. That is a document to be
  drafted, not reviewed, and it should be the same attorney.

---

## 6. Google Play — the one that is time-critical

Google requires **Play Billing** for digital goods bought inside an app
distributed on Play. Credits are digital goods. There are exemptions and
there is nuance, and getting it wrong gets an app **removed**, not warned.

Play Billing is roughly 15% on the first million dollars a year — on top of
Paystack, not instead of it.

**Ask them:** does FutureBox's credit model, sold through a Trusted Web
Activity wrapper around a website, fall inside Play's billing requirement?
And if it does, is the answer to use Play Billing on Android, or to leave
Android to the browser and not list on Play at all?

`docs/PLAY-STORE.md` has everything else ready for the day that is answered.

---

## What I did not do, and why

I did not write any of the missing clauses. Every one of them — the
cooling-off right, the ADR line, the self-regulatory statement, naming the
directors — is a sentence with legal weight, and a sentence with legal weight
written by somebody who is not a lawyer is a liability wearing the costume of
diligence. The gaps are listed precisely so that writing them is a short job
for somebody qualified.

`check:ecta` holds this list against the pages: a particular that is marked
done here and disappears from the page fails the build, and one that is
filled in and still listed as a gap fails it too. So this document cannot
quietly stop being true.


---

## Added 8 October 2026 — does an AI-generated song attract copyright in South Africa?

Carli sent Google's Lyria terms summary on 8 October 2026. The royalty
answer was clean — no royalties, no ownership claim by Google, commercial
use permitted on the paid API — but it carried a sentence that has nothing
to do with Google and everything to do with this app:

> Purely AI-generated music does not hold exclusive traditional copyright
> protection in most jurisdictions. While you hold commercial usage rights,
> you cannot stop others from using similar AI-generated material unless
> human creative modification or arrangement is added.

**That applies to every generated song made in FutureBox today**, with the
supplier it already uses, and it is a different question from the one
`/terms` already answers.

The page said *"generated music is not guaranteed to be unique"* — the risk
of a member infringing somebody else. It had never said whether a member can
**enforce** anything. A bullet has been added saying so, stated as unsettled
rather than as law, and pointing at the Pro Booth: singing on a track, playing
on it, rewriting the arrangement or cutting it into her own film is the human
authorship that sentence turns on, and that room is already built.

**The questions for you:**

1. Under South African copyright law, does a musical work generated from a
   text prompt attract copyright, and if so who is the author? Section 1's
   definition of "computer-generated work" and the authorship rule for it
   are the obvious starting point and we have not read them — the network
   blocks gov.za from this machine, which is the same reason the ECTA work
   in this file is unverified.
2. How much human contribution is enough? A sung vocal over a generated
   backing track is the common case in this app and we would like to know
   whether that is sufficient, because if it is, it changes what we tell
   every member.
3. Does the answer change what `/terms` should say, and is the wording there
   now defensible as an interim statement?
4. A supplier watermark — Google's SynthID is embedded inaudibly in every
   Lyria track — what does it mean for a member's ownership, and for
   distributors who scan for it?

**The source is an AI summary, not a statute and not Google's own terms.**
It is recorded here as the reason the question is being asked, not as an
answer to it.
