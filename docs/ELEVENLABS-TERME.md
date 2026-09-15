# What the ElevenLabs terms let FutureBox do

Read against the fourteen documents Carli pasted on 15 September 2026. The
short version is at the top because it changed while the document was being
written: **the OEM Terms turned up, and on the Business plan they permit the
thing that was blocking the product.**

*Not legal advice. This is a reading of the text against what the app
actually does, written so that a lawyer can be pointed at the places that
matter instead of at fourteen documents.*

---

## 0. The headline

The question that has been open since ElevenLabs support answered on
9 September is: **may FutureBox's members generate music and voices through
our account and then sell what comes out?**

Support said that arrangement was *"not explicitly covered"* by the
self-serve plan terms. The Terms of Service §5(b) says our licence is
*"non-transferable, non-sublicensable"*. On that pair alone the answer was
no.

The **OEM Terms** (28 February 2025) are the document that covers it, and
they say this:

> **§2(B)(f)** — Customer may not *"Make Available the Services or Bundled
> Service if Customer is not accessing the Services as a Business Entity.
> For the avoidance of doubt, if you are a Customer accessing the Services
> under a **Free, Starter, Creator, or Pro tier plan**, you are expressly
> prohibited from Making Available the Services or any Bundled Service."*

and

> **§1(D)** — *"'Business Entity' means any organization, company, or entity
> that enters into an Underlying ElevenLabs Agreement under a **Scale,
> Business, Enterprise, or equivalent plan** to access or use the Services in
> a commercial or organizational capacity, including startups, publishers,
> and enterprises."*

"Make Available" is defined in the first paragraph as *"bundle, make
available and sublicense"*. So the prohibition is drawn along the plan line,
and **Business is on the permitted side of it**. §2(A) then makes the actual
grant: a right to *"demonstrate and Make Available the Bundled Service to
potential End Users"* and to support them.

Two things make this stick rather than being wishful reading:

- The OEM Terms **supplement the ElevenLabs Terms of Service** where there is
  no separate signed agreement — they say so in their own first sentence, so
  a self-serve customer can be on them.
- The Terms of Service introduction says Supplemental Terms *"become part of
  your agreement with us if you use the applicable Services"* and that
  *"if there is a conflict between these Terms and the Supplemental Terms,
  the Supplemental Terms will control."* So the OEM Terms override §5(b)'s
  no-sublicensing, which is the only route by which this product is licensed
  properly.

**Moving to Business was the thing that unblocked it.** On Pro it was
expressly forbidden, in those words.

### What is left

Not nothing. Three things:

1. **The account has to be the company's.** "Business Entity" *"expressly
   exclude[s] individual users acting in their personal capacity."* If the
   ElevenLabs account is in Carli's own name rather than FUTUREBOXSTUDIO
   (Pty) Ltd's, the definition is not met on its face. This is a five-minute
   fix and it is worth making before anything else on this list.
2. **The End User definition does not fit a creator.** §1(I) defines an End
   User as a customer *"licensing or using the Customer Solution **only for
   its own internal business operations**"*. A member who sells a song is not
   doing that. The definition is written for B2B software resale. Either our
   members are not "End Users" as this document means the term, or the
   internal-use limit collides with §1(c)(ii) of the Terms, which gives a
   Paid User commercial rights. **This is now the sharpest question for the
   sales email** — it is the one place where the OEM answer could still come
   apart.
3. **One line of confirmation.** The OEM Terms open with *"as expressly
   permitted in the applicable Underlying ElevenLabs Agreement"*, which can
   be read as requiring an Order Form that says so. §2(B)(f)'s "for the
   avoidance of doubt" sentence only makes sense if the plan tier is the
   gate, so the better reading is ours — but it is worth one written sentence
   from sales, and asking for it is free.
4. **The permission is service by service.** The OEM grant covers "the
   Services", but individual service terms cut their own holes in it. The
   clearest is the **Studio Terms**: *"unless you are on an **Enterprise**
   plan, Studio is made available solely for your personal, non-commercial
   use."* Business is not Enterprise. We do not use ElevenLabs Studio (see
   §6) — but it is proof that "we are on Business" is not a blanket answer,
   and every new engine has to be checked against its own terms before it
   ships.

There is one more piece of support for the §1(I) reading, and it is a good
one. The **ElevenAgents Terms** §4(A) carry the *same* four minimum End User
terms as OEM §3(A), word for word — but their End User definition reads
*"only for its own internal business operations **or personal use**"*. The
OEM version is missing those three words. Two documents from the same drafter
with the same clause, one of which contemplates personal-use end users
explicitly. That is worth quoting in the email: it suggests the OEM omission
is a drafting gap, not a policy.

The sales email therefore changes character. It was *"please tell us whether
we are allowed to exist."* It is now *"we read the OEM Terms, we believe
Business puts us inside §2(B)(f), please confirm and tell us how §1(I) is
meant to read for consumer creators."* That is a much better letter to send.

---

## 1. The documents that bind us, and which wins

Fourteen were pasted. This is the shape of the stack:

| Document | Date | Does it apply to us? |
|---|---|---|
| Terms of Service (non-EEA) | 31 Mar 2026 | **Yes — the base.** South African company, so the non-EEA version |
| Terms of Service (EEA) | 31 Mar 2026 | No. Applies to EEA/UK/Swiss residents |
| **OEM Terms** | 28 Feb 2025 | **Yes — the one that permits the product** |
| Prohibited Use Policy | 17 Aug 2026 | **Yes — incorporated into everything** |
| ElevenAPI Terms | 24 Aug 2026 | **Yes — every call we make** |
| Music API Terms | 18 Aug 2025 | **Yes — music is most of what we buy** |
| Privacy Policy | 20 May 2026 | Partly — see §9 |
| Data Processing Addendum | 8 Apr 2026 | **Yes — self-serve is named in it** |
| Beta Services Addendum | 13 Nov 2024 | Only if we touch a Beta Service |
| Dubbing v2 Model Terms | 28 May 2026 | Yes, for the dubbing path |
| Image & Video Terms | 11 Jun 2026 | Yes, for the video path |
| **Speech to Text Terms** | 2 Apr 2026 | **Yes — `/api/transcribe` and `/api/align`** |
| Scribe v2 Realtime Terms | 11 Nov 2025 | Probably not — we call the batch endpoint |
| Voice Library Addendum | 6 Mar 2026 | Only if a member shares a voice — see §6 |
| Studio Terms | 7 May 2026 | No, and **may not be** — Enterprise-only for commercial use |
| Music Marketplace Addendum | 28 Feb 2026 | No — we do not sell into their marketplace |
| Sound Effects Terms | 12 Feb 2026 | Not today — we generate no sound effects |
| Productions Terms | 31 Mar 2026 | No — human-in-the-loop service we do not buy |
| Speech Engine Terms | 20 May 2026 | Not today. Would apply to a voice help desk |
| ElevenAgents Terms | 29 Apr 2026 | Not today. Would apply to the help-desk agent |
| Ads Engine Terms | 22 Jun 2026 | No — our adverts desk is our own |
| ElevenReader Terms | 28 Feb 2025 | No — their reading app |
| Enterprise Pilot Terms | 8 Aug 2025 | No — we are on no pilot |
| CLI Terms | 24 Aug 2026 | No — we do not use the CLI |
| MCP Terms | 17 Aug 2026 | No — MCP is off |

One document named in the precedence lists has **not** been read, and it now
matters twice over: the **Music Terms** (as distinct from the Music API
Terms). The Music API Terms rank it second of three, and the Music
Marketplace Addendum §3(c) refers to *"the **Prohibited Industries**
described in the Music Terms"*. **There is a list of industries our music may
not serve, and we have never seen it.** That is a real gap for an app that
sells adverts. Fetch it.

**Order of precedence**, assembled from the four documents that state one:

1. Anything in a signed agreement or Order Form that expressly addresses the
   point (an **OEM Exhibit** would supersede the OEM Terms entirely)
2. The **Beta Services Addendum**, for anything designated beta
3. **Music API Terms** → **Music Terms**, for the music service
4. Service-specific terms (Sound Effects, Speech Engine, Image & Video,
   Dubbing v2) — each says it prevails as to its own service
5. **ElevenAPI Terms**
6. The Terms of Service and the rest

The **Prohibited Use Policy** is not in that ladder because it is
incorporated by every document and sits across all of them.

---

## 2. What being a Paid User buys

**§1(c)(ii)** — *"if you access or use our Services through a paid
subscription plan (such a user, a 'Paid User'), you may use the Services for
commercial purposes"*. Free accounts are non-commercial only, §1(c)(i).

**§4(c)(ii)** — *"as between you and ElevenLabs, you retain all rights in and
to your Output."* We own what comes back. Note the qualifier: *as between you
and ElevenLabs*. It settles nothing against a third party.

Business changed the volume, the price and — per §0 — the OEM permission. It
did not change these two sentences; both already applied on Pro.

---

## 3. The OEM Terms, in detail

Having found them, they are worth reading properly, because they are a
working contract with real obligations, not a permission slip.

### What we are granted (§2(A))

A non-exclusive, non-transferable right to integrate, to demonstrate and Make
Available the **Bundled Service**, and to support End Users. "Bundled
Service" is defined (§1(C)) as *"the combined offering of the Services and
the Customer Solution"*, with the sentence: ***"Services cannot be used
independent of the Customer Solution."***

FutureBox is the Customer Solution. We may not expose raw ElevenLabs access;
everything has to come through our own product. It does — nothing in the app
hands a member an ElevenLabs endpoint.

### What we may not do (§2(B))

| | What it says | What it means here |
|---|---|---|
| (a) | No Making Available to a third party who will itself Make Available | No white-labelling FutureBox to another platform |
| (b) | No transferring or sublicensing our rights except as these terms permit | — |
| (c) | We may not represent ourselves as ElevenLabs' agent | — |
| (d) | **No public statement about our business with ElevenLabs without prior written approval** | See §4 — this collides with the Music co-branding duty |
| (e) | **No selling to a Government Entity without prior written consent** | **A state school is a Government Entity.** The school-choir idea needs consent first |
| (f) | Not below Business | Cleared, per §0 |

§2(B) also says access credentials *"may not be used by more than one
individual"*. Read against the ElevenAPI Terms, which contemplate an
application calling with a service credential, this is plainly about human
seats, not about a server key. Worth knowing it is there.

### What we must do (§2(C), §2(D), §6)

- Ensure End Users' use complies with the agreement, and use **best efforts**
  to prevent and terminate unauthorised access
- Notify ElevenLabs promptly of unauthorised use
- **Forward to members any notice ElevenLabs sends that affects them** — we
  have no mechanism for this today; the newsletter path would serve
- Obtain the consents ElevenLabs needs to process member data (§2(D)) — the
  same duty the DPA imposes at §2.2
- **Be first line for all support.** §6: *"ElevenLabs has no obligation to
  provide direct support to any End Users."* A member with a broken voice
  clone is ours to answer

### What our terms page must contain — OEM §3(A)

This is the most concrete finding in the whole read. Every End User *"must
have executed an End User Agreement that includes"* four terms:

1. **Restrictions at least as restrictive as the ElevenLabs Terms of Service,
   including the incorporated Prohibited Use Policy** (and updated versions)
2. That the member is **not** ElevenLabs' agent, partner or joint venturer
3. That **ElevenLabs is a third-party beneficiary** of our agreement with the
   member
4. That the member **grants ElevenLabs and its affiliates and subcontractors
   a non-exclusive right to process and use their Data** to provide and
   support the Services

And it must be *"a written contract, or 'clickwrap' style online agreements
involving **conspicuous notice** to End Users and an **affirmative click to
accept**"*.

Two gaps against what we ship:

- Our `/terms` page carries none of points 2, 3 or 4, and does not pass the
  Prohibited Use Policy through.
- Accepting the terms is not, as far as this read can tell, an **affirmative
  click** at sign-up. A footer link is not clickwrap. **This is a build
  task, not a wording task**, and it is the one thing on this whole list that
  the OEM permission actually depends on.

### Audit, price, indemnity

- **§3(C)** — ElevenLabs may audit our compliance on 10 business days'
  notice, once a year (more if something is found), **for the term plus three
  years**. They pay the auditor. We should be able to produce, on request:
  the terms members accepted, when they accepted, and the consent records.
  The voice-consent row the privacy page already describes is exactly the
  right shape; it just needs company.
- **§5(A) Independent Pricing** — *"Customer will independently establish the
  subscription price of the Bundled Service for its End Users."* **No floor,
  no revenue share, no approval.** Good news, and it is the answer to a
  pricing question that was open. (Pricing itself stays parked until
  ElevenLabs replies on cost.)
- **§5(B)** — fees are non-cancellable and non-refundable, and we may not
  set off against them if a member does not pay us.
- **§7** — we indemnify ElevenLabs for our breach, for our End Users'
  breach, and for **Data submitted through the Services by End Users**. A
  member's infringing upload is our legal bill. This is now the third
  independent reason for the copyright check on uploads.

---

## 4. Music API Terms — the two that bite

Music is most of what we buy, so these matter more than their length
suggests.

### (a) Co-branding may be mandatory

**§4(A)** — an **Authorized Reseller** or a **"Pure-play Music AI Creation
Company"** *"shall prominently co-brand the Bundled Services … including all
advertisements and promotional content presented to your end users … by
displaying ElevenLabs' name, trademarks and logos alongside its own, which
may be in the format of 'powered by ElevenLabs' or 'ElevenLabs Music'."*

**§4(C)(ii)** defines the second category as an entity whose application uses
AI to generate *"sound recordings and embodied musical compositions **as its
primary commercial product or service**."*

Whether that is FutureBox is genuinely arguable. Generated songs are a large
part of it; the booth, the live room, the videos, the covers and the
distribution are not. If it is, a **"powered by ElevenLabs" mark is required
on the product and on the advertising** — including the three adverts for the
style catalogue that are still outstanding, so it is worth settling before
they are made.

Note the good news in **§4(C)(iii)**: a "Reseller" is one that adds no
*"substantial functionality beyond basic user interface changes"*, or
aggregates models. **FutureBox is neither**, so the §3(A) ban on reselling
API access does not reach us.

Note also the collision: OEM §2(B)(d) forbids public statements about our
business with ElevenLabs without written approval, while this section
*requires* public attribution. §4(B) grants the trademark licence that
resolves it, subject to elevenlabs.io/brand. Ask sales to confirm which duty
governs rather than guessing.

### (b) Our privacy policy must name ElevenLabs

**§2(D)** — *"You must provide, and at all times comply with, a privacy
policy for your API Client that clearly and accurately describes to users the
types of information you collect, how such information is used and shared
(**including with ElevenLabs and third parties**)."*

`/privacy` already does this properly: ElevenLabs is named in the list of
services, with what is sent there. This is the one obligation in the whole
read that we already meet without changes. What it is missing is the
processing described in §9 below — moderation, retention, transfer to the US.

### (c) Advertising

**§5** — we may **not** bid on ElevenLabs trademarks as search keywords
(exact, phrase or broad match), do SEO aimed at ElevenLabs-branded queries,
or divert traffic from them. Breach terminates API access. Straightforward,
and worth writing into whatever marketing plan comes after the adverts.

### (d) Security notification

**§2(B)** — on unauthorised access we must notify **ElevenLabs and the
affected users**. Combined with the DPA at §10 below and POPIA §22, that is
three notification duties from one incident and no process for any of them.

---

## 5. Prohibited Use Policy — the fence around everything

Incorporated by every other document. The sections that touch us:

- **§9(b)** — no selling or sublicensing the Services without written
  authorization, but with the sentence that matters: *"For the avoidance of
  doubt, this does not preclude your use of Output in accordance with the
  applicable terms and conditions."* Read with the OEM Terms, the
  "authorization" is the OEM grant.
- **§9(i)** — *"Developing or using any applications or software that
  interact with our Services **without our prior written authorization**
  (such as through our APIs)."* On its face this reads as forbidding our
  existence. It cannot mean that: the **ElevenAPI Terms** (24 Aug 2026, a
  year newer) define a *"Customer Application"* as a normal thing, set out
  our obligations for one, and are accepted simply by using the API. The
  sensible reading is that using the API on its published terms *is* the
  authorization. Worth one sentence of confirmation in the same email, but
  it is not the blocker it first looks like.
- **§9(n)** — the B2B2C clause. We may not make the Services or Output
  available to end users *"on terms that are **less restrictive or more
  permissive**"* than ours. This is the same duty as OEM §3(A)(a) from the
  other side, and it means our terms page cannot promise a member anything
  ElevenLabs does not promise us. Every over-generous sentence on `/terms`
  is a breach, not just a misstatement.
- **§9(r)** — no users under 13; 13 to 18 require verifiable parental
  consent. **But see §9 below — the Privacy Policy is stricter on voice,
  and the stricter rule is the one to build to.**
- **§9(c)** — Sound Effects output may not be sold on a standalone basis.
  Not applicable today.
- **§9(j), (k), (l)** — no competing product, no training any model on
  Output, no reverse engineering.

---

## 6. Per-service terms

### Speech to Text — we use this one

`app/api/transcribe/route.ts` calls `POST /v1/speech-to-text` with
`scribe_v2`, falling back to `scribe_v1`; `app/api/align/route.ts` sits on
top of it. So the **Speech to Text Terms** (2 April 2026) bind us.

- **§2** — the automatic redaction features *"may not be accurate or
  complete"* and *"are not intended to be relied upon as a substitute for
  legal, regulatory, or compliance obligations."* We do not use redaction, so
  this is only a warning against ever treating it as a privacy control.
- **§3** points at **Model-Specific Terms**, currently one: **Scribe v2
  Realtime**. We call the batch endpoint with a file, not the realtime
  socket, so on the better reading those terms do not reach us. Two of their
  rules are worth honouring anyway, because they cost nothing:
  - **§1(A) Prohibited Data** — no financial account numbers, government
    identifiers or health information as Input. A member reading an ID
    number aloud into a take is unlikely but not impossible.
  - **§2** — if speech-to-text is used *"for interactions with end users"*,
    they must be told they are talking to AI and that conversations are
    recorded and may be shared with ElevenLabs. We transcribe singing to
    line up lyrics, which is not an interaction; if the help-desk agent is
    ever built, it is.
  - **§3** — consent records kept for **five years**.

### Studio — Enterprise only, and we do not use it

**"Studio" here is ElevenLabs' own product** — a timeline editor with AI
agents, plus **GenFM** for generated podcasts. It is not the FutureBox room
of the same name, and the app calls no Studio endpoint.

That is just as well, because the Studio Terms say: *"unless you are on an
**Enterprise** plan, Studio is made available solely for your personal,
non-commercial use."* **Business is not Enterprise.** If the podcast or
episode work is ever tempted toward GenFM, that sentence stops it.

Two more, if it ever comes up: §4(A) forbids representing Output as
human-generated when it is not, and §4(F) repeats the Prohibited Data rule.

### Voice Library Addendum — the limit on taking a voice back

Applies the moment a member shares a cloned voice into the ElevenLabs Voice
Library. The app does not offer that today. It matters anyway, because it is
the third and hardest limit on the deletion promise, and because the voice
picker already reaches into the library on the consuming side.

- **§3** — eligibility. The voice must be **your own**, not another
  person's and not an altered version of your own; you must hold the rights;
  and — oddly specific — **you may not be a resident of Illinois**. If we
  ever expose sharing, these are four checkboxes, not a paragraph.
- **§4 Notice Period** — the one that bites. Removing a shared voice does
  **not** take it back: outputs already generated stay, and the model
  remains in the accounts of everyone who added it **for the whole notice
  period**. And: *"you will not be able to reduce your Notice Period, but
  you will be able to increase it."* A member who picks 30 days has made an
  irreversible choice.
- **§8 Royalty waiver** — *"ElevenLabs and all other users of the Services
  have discharged any obligations present or future, to pay royalties,
  equitable remuneration, or equivalent amounts"*. Rewards are the only
  money. Separately, they may remove or rename any shared voice at their
  sole discretion, without notice.
- **§4 Rewards** — paid via Stripe Connect, never earned from Free users,
  and capped at **$0.01 per minute** for ElevenAgents use.

### Music Marketplace — theirs, not ours

ElevenLabs runs its own marketplace where users buy and sell music made with
the Services. We do not sell into it, and there is no reason to: they set the
listing price *"at our discretion"* (§2(d)), the royalty waiver of §2(g)
matches the Voice Library one, and §2(h) means a buyer keeps their licence
after the seller deletes the track.

The reason to read it at all is **§3(c)**, which forbids buyers from using
Music *"in any of the **Prohibited Industries** described in the Music
Terms."* A list of forbidden industries exists, and we have not seen it. For
an app that sells an adverts add-on, that is worth knowing before a customer
in one of them signs up.

### ElevenAgents — for the help-desk voice agent

Not used today; this is the document that would govern it.

- **§4(A)** carries the same four minimum End User terms as OEM §3(A) and
  the same clickwrap requirement — and, as noted in §0, its End User
  definition says *"internal business operations **or personal use**"*.
- **§3(B)** — members must be told plainly that they are talking to AI and
  that conversations are recorded and may be shared with ElevenLabs and the
  LLM provider, and *"Customer is also required to update its privacy
  policies accordingly."*
- **§3(A)** — telephony is resold through third-party carriers and itemised
  on the invoice. A phone number is a separate line on the bill.
- **§6** — we indemnify them for any breach of telemarketing law. Any
  outbound calling would need real care.
- **§7** — a whole regime for bringing your own LLM, including §7(C)(iii)
  making us liable for everything that happens under our API keys.

### Dubbing v2 — a carve-out in our favour

**§2**: Output may not be used in film, television, scripted streaming, VOD
or theatrical distribution — ***but the restriction expressly does not apply
to YouTube, TikTok, Instagram or similar creator platforms.***

The `/terms` page and the note at `app/terms/page.tsx:28` already record the
9 September answer about film and television. This is the written version of
it, and it is more generous than the note assumes: **the creator platforms
are carved out by name**, which is where a FutureBox member actually
publishes. The dubbing path is labelled legacy in the app; this is a reason
to look at it again rather than let it rot.

### Image & Video — two findings

- **§6** — ElevenLabs' third-party IP infringement indemnity **does not apply
  to Image & Video output.** Everywhere else they stand behind the model;
  here they do not. A generated video that infringes is entirely our
  exposure, on top of the OEM §7 indemnity running the other way.
- **§7(C)** — **Stock Avatars may not be sold or sublicensed standalone.**
  This is the one that touches the house presenter faces: a stock face inside
  a member's video is fine; offering the faces themselves as something a
  member buys is not.

### Sound Effects — a switch to flip if we ever use it

**§2** — SFX Outputs are **sublicensed to third parties, including other
ElevenLabs users, by default**, with a "Disable" toggle on the Sound Effects
product page; the opt-out is not retroactive. We generate no sound effects
today. If that ever changes, flip the toggle before the first generation, not
after. The Prohibited Use Policy §9(c) separately forbids selling sound
effects output standalone.

### Speech Engine — the layer under a voice agent

Not used today. **§3(B)** puts the whole notice-and-consent burden for
recording, transcription and monitoring on us, and §2 makes us solely
responsible for whatever model sits behind the voice.

### Ads Engine, Productions — neither is ours

**Ads Engine** is a workflow tool for localising advertising creative into
Google Ads and Meta Ads. Our adverts desk is our own build and connects to
neither. Worth remembering it exists if the advert work ever grows into
multi-language campaigns.

**Productions** is a human-in-the-loop professional service — their
linguists, their studio. We do not buy it. Two things if that changes:
**§3(A)(i)** forbids submitting Personal Data with source material, and
**§5(D)** removes confidentiality over Source Material.

### ElevenReader and the Enterprise Pilot Terms — neither applies

**ElevenReader** is their own text-to-audio reading app. Nothing in FutureBox
touches it. One detail travels: §1 and §2 set its floor at **16**, a third
different age threshold across these documents — see §8(d).

**Enterprise Pilot Terms** would apply only if ElevenLabs ever offered a
trial of something. Worth knowing the shape before saying yes: a pilot is
30 days, free, **"may not be used for commercial, production, or
public-facing purposes"**, and carries a five-year confidentiality
obligation. It is the Beta addendum's restriction in a different wrapper —
the same reason not to build a shipped feature on one. The one thing in our
favour: §5 says they will not train on Content during a pilot.

## 7. The Beta addendum, and the Aurora question

One of the Supplemental Terms; becomes part of the agreement the moment a
Beta Service is used; where it conflicts with anything else *"this Addendum
shall prevail"*.

> **§3** — *"You agree not to (and agree not to permit any third party to):
> (a) use the Beta Services for **any commercial purposes or in any
> production environment**"*

Not "on the free tier". Not "without a licence". **At all.** Three more:

- **§2 — no personal information** may be provided in connection with a Beta
  Service. A recording of a member's voice is personal information, so a Beta
  Service cannot be given one.
- **§5 — confidentiality.** No public announcements about a Beta Service, so
  it cannot even be listed as a feature.
- **§8(a)** — liability for a Beta Service is capped at a flat **$100**.

The CLI, MCP and ElevenAPI Terms each carry the same hook for anything
labelled alpha, beta, preview or pilot, which is a good indication of how
often ElevenLabs uses those labels.

**What this means for the talking presenter.** `creatify-aurora` is built,
priced at the middle video rung, and dark behind `ELEVEN_AURORA_READY`. If
Aurora is designated beta or preview, §3(a) forbids shipping it and §2
forbids sending it a member's voice — which is most of what a talking
presenter is for. Making one clip is still the right next step, because it is
free and settles three unknowns at once; but **before the flag goes on for
anybody but her**, the account page or support has to say plainly whether
Aurora is generally available. The same question applies to any engine that
arrives with a "new" or "preview" label.

Nothing shipped today is affected: text-to-speech, music, dubbing, voice
cloning and separation are all generally available.

---

## 8. What our own pages have to change

Five things, in rough order of how much they matter.

### (a) Sign-up needs an affirmative click

OEM §3(A) requires clickwrap with conspicuous notice and an affirmative
click. The OEM permission — the thing that makes the product lawful — is
conditioned on it. **This is the highest-value item on the list**, and it is
a small build.

### (b) `/terms` needs the four OEM minimum terms

Points 1 to 4 in §3 above: pass-through of the ElevenLabs restrictions and
the Prohibited Use Policy; no agency; ElevenLabs as third-party beneficiary;
the member's grant to ElevenLabs to process their Data. PUP §9(n) says the
same thing from the other side — our terms may not be more permissive than
theirs.

### (c) The deletion promise is more generous than the upstream terms support

This is the finding that could embarrass her, because the page is kinder than
the contract. Three separate provisions:

- **ToS §4(d)** — the licence ElevenLabs holds over Content, which includes a
  member's voice, is *"perpetual and irrevocable … sub-licensable, through
  multiple tiers"*, and expressly allows them to *"reproduce, modify,
  publish, create derivative works from, distribute, publicly or otherwise
  perform, and use your voice, and other indicia of your persona"*. §4(e)
  grants the same over the voice model. The one limit: they will not
  commercialise a voice standalone without permission. **§4(i)**: a training
  opt-out *"does not affect any uses of … your Content prior to that date."*
- **DPA §9.2.2** — for **Self-Serve Services**, ElevenLabs *"reserves the
  right, but has no obligation to, delete Customer Content … after a period
  of inactivity of one-hundred and eighty (180) days."* Enterprise customers
  get deletion within 30 days of termination. **Self-serve gets no deletion
  obligation at all.**
- **Privacy Policy §6** — they will not keep data generated about a voice
  *"longer than 3 years after your last interaction"*. That is a ceiling, not
  a deletion-on-request.

Our `/privacy` says deleting a voice *"removes it from ElevenLabs as well as
from here"*, and `/terms` says keeping recordings for a month after being
asked to stop *"would be the opposite of what you asked for."* Both are true
about **the model** and about **our copies**. Neither is true about the
licence and the retention above. A member reading those pages would
reasonably conclude deletion is complete, and it is not.

It needs one honest paragraph on each page, not a rewrite. The honest
paragraph is also the more defensible position: promising less than you
deliver costs nothing, promising more is the thing that bites.

### (d) Under-18s

Three rules, and they do not agree:

- **PUP §9(r)** — no under-13s; 13 to 18 with verifiable parental consent.
- **ElevenReader §2** — a floor of 16 for that app.
- **Privacy Policy §11** — Services *"are not intended for or directed at
  children under the age of 18"*, they do not knowingly collect Personal Data
  from under-18s, and — the sentence that matters — *"**all users are
  strictly prohibited from uploading, transmitting, emailing, or otherwise
  making Voice Data from children under the age of 18 available to us** or to
  other users or using them for any of our Services."*

Three different numbers in three documents from the same company is a good
sign that nobody has reconciled them, and that the strictest is the one to
plan around. For a singing app that is not a footnote. A child singing into the booth,
a school choir, a family recording — any of those sends under-18 Voice Data
to ElevenLabs, and the second rule prohibits it outright with no parental
consent carve-out. **Build to the stricter rule**: an age statement at
sign-up, and no voice cloning or voice-carrying generation for an account
that is not 18. This also settles how to answer a school: a school can use
the app, but not the voice features, and see the Government Entity point in
§3.

### (e) Two smaller ones

- **ToS §10** — *"the Output generated by you using the Services may not be
  unique across users … Two different parties may receive the same or similar
  Output."* Nothing in the app says this, and somebody selling a song should
  know it.
- **ToS §4(g)** — *"You may not provide Input or create Output for which you
  do not have all the rights necessary to grant us the license described
  above."* Every uploaded song is an Input, so when a member uploads somebody
  else's recording, **we** are in breach, not only them. With OEM §7 and
  Music API §6 on top, the copyright check on uploads now has three
  independent reasons behind it, and they belong in the decision.

---

## 9. The data side — Privacy Policy and DPA

### Which document governs

The Privacy Policy **§1(b)** limits itself to where ElevenLabs acts as a
controller, *"including where ElevenLabs provides Services to individual
users"*, and says it **does not apply** where they process on behalf of
business customers — there the **DPA** governs. The DPA in turn says
explicitly that for **Self-Serve Services** the "Agreement" means the Terms
and "Customer" means you.

So: **the DPA is our operative data document**, and the Privacy Policy tells
us how they treat Carli's own account data and what their practices look like
generally.

### What the DPA puts on us

- **§2.2** — *"Customer … will provide notice to Data Subjects about the
  Processing of Personal Data by ElevenLabs as described in this DPA, and
  obtain Data Subjects' consent … as necessary."* The same duty as OEM §2(D).
  `/privacy` gives the notice; the **consent** is the affirmative click from
  §8(a).
- **§6** — subprocessors are generally authorised, listed at
  compliance.elevenlabs.io, with 30 days' notice of a new one by updating
  that list. Nobody watches that page. Under POPIA we are supposed to know
  who processes our members' data; a quarterly look is the cheap version.
- **§8** — they notify us of a security incident without undue delay. We then
  owe our members and the Information Regulator under POPIA §22, and
  ElevenLabs and the affected users under Music API §2(B). **We have no
  breach process.** One page in `docs/` would do.
- **§10.1** — on written request they provide a **SOC 2 Type II report**.
  Free, useful in our own compliance file, and the sort of thing a
  distributor or a school will eventually ask for.
- **§11** — the EU SCCs are deemed executed, governed by Irish law.
- **§13** — data residency is at their discretion, and even where granted,
  support staff and the **moderation team** access data from outside it.

### What is worth knowing from the Privacy Policy

- **§3(d) Content moderation** — they *"reserve the right to moderate all
  Input … and Output"* and *"may share your Input or Output, which may
  include Personal Data, with third parties to support the content
  moderation and safety initiatives."* **A member's recording can be listened
  to by a person, and passed to a moderation vendor.** That is not on our
  privacy page and it should be.
- **§5** — hosting in the United States, the Netherlands and Singapore, and
  *"regardless of your location, all Personal Data will be transferred to the
  United States for storage."* POPIA §72 wants a basis for that transfer. The
  SCCs in DPA §11 are the answer; it should be written down somewhere.
- **§12** — biometric data retained until no longer needed or three years
  after the relationship ends, whichever is sooner. Note the tension: the DPA
  Annex I records sensitive data transferred as **"N/A"**, while the Privacy
  Policy treats voice as biometric. Under POPIA biometrics are **special
  personal information** (§26, §32) and need a ground beyond ordinary
  consent. The consent row the app already keeps is the right instinct; it
  needs to be pointed at the right legal basis.
- **§8** — the training opt-out lives in **Data use**, under *Terms and
  Privacy*, in the account. It is not retroactive, so the sooner it is on the
  less it covers. Still a five-minute job that has not been done.

---

## 10. The engineering rules — ElevenAPI Terms

These are the ones that constrain code rather than contracts.

- **§2(C) No client-side exposure.** No API key, OAuth secret or webhook
  signing secret in any browser or mobile artifact; call with an API key
  *"only from a server or other environment you control."* **We pass.**
  Every ElevenLabs call is in `app/api/**` or `app/lib/server/**`, and there
  is no `NEXT_PUBLIC_` variable carrying a key. The rule that keys live in
  Vercel and nowhere else was already the right one; it is now also a
  contractual term.
- **§2(B)** — *"issue separate credentials for separate applications,
  environments, and users."* Preview and production sharing one key would be
  a breach. Worth checking in the Vercel environment settings.
- **§3 Customer Applications** — the first place in any of these documents
  that describes our shape from ElevenLabs' own side: an application of ours
  through which the Services are reached. It makes us responsible for
  *"authenticating and authorizing its users and for ensuring that a user
  cannot access Services resources, including agents, voices, conversations,
  and generated files, that you have not authorized that user to access."*
  That is exactly what the RLS policies and the signed-URL buckets do. It is
  also the best evidence that PUP §9(i) does not mean what it appears to say.
- **§4(1) Rate limits** — exponential backoff, not immediate retries; on a
  concurrency limit, wait for requests in flight rather than retrying; poll
  no faster than any published interval.
- **§4(2) Webhooks** — **verify the signature before acting**, handle
  deliveries **idempotently** because the same event may arrive twice, and
  retrieve results from expiring signed URLs before they expire, because
  there is no obligation to retain them or reissue access. The dub hook at
  `app/api/dub/hook/route.ts` is the one place this lands; worth a look
  against all three requirements.
- **§4(3) Version compatibility** — ignore unrecognised response fields, do
  not apply strict type checking to responses, do not depend on undocumented
  behaviour. A strict schema parser on an ElevenLabs response would breach
  this and break on their next additive change.
- **§2(D)** — every call is attributed to us *"whether or not you authorized
  it"*, including calls made by a script or an AI tool.

**CLI Terms** and **MCP Terms** do not apply: we use neither. Two notes for
if that changes — the CLI Terms §3 forbid committing any credential or secret
to version control (already our rule), and MCP Features are **unavailable**
in Zero Retention Mode, which is worth remembering before anyone enables
either.

---

## 11. Worth knowing, in order of what it can cost

| Where | What it says | What it means here |
|---|---|---|
| OEM §7 | We indemnify for End Users' breaches and their submitted Data | A member's infringing upload is our bill |
| ToS §9 | She indemnifies ElevenLabs for Claims from her use and the Content | Same, from the base agreement |
| Music API §6 | Indemnity for end users' misuse of the APIs | Same again — three overlapping indemnities |
| ToS §11(b) | Their total liability caps at the greater of **$100** or 12 months' spend | If they break and members lose work, recovery is about one year's fees |
| Beta §8(a) | **$100** flat for a Beta Service | Another reason not to ship one |
| ToS §3, §6(b)(vi), §6(b)(x) | Credits forfeited on closure or suspension; prepaid credits expire at **12 months**, no warning | Never prepay against a balance she might not draw down |
| OEM §5(B) | Fees non-refundable, no set-off if a member does not pay us | Cash-flow risk sits with us |
| OEM §3(C) | Audit right, term **plus three years** | Keep the consent and acceptance records |
| ToS §14 | They may modify, limit or terminate any Service at any time | Every engine in this app is on that footing |
| ElevenAPI §1(2) | No warranty that any endpoint or model stays available | Same |
| Music API §1(B) | Access may be staggered by sector and capacity | A new music model may reach us late, and that is not a breach |

---

## 12. What to do, in order

**Free, and this week:**

1. **Check the ElevenLabs account is in FUTUREBOXSTUDIO (Pty) Ltd's name**,
   not Carli's personal name. The OEM permission rests on being a Business
   Entity, and the definition excludes individuals in a personal capacity.
2. **Flip the training opt-out** — account → Terms and Privacy → Data use.
   Not retroactive, so every day it is off costs something.
3. **Send the sales email**, rewritten. It now asks ElevenLabs to confirm the
   OEM reading rather than to explain whether we may exist, and it asks how
   §1(I)'s "internal business operations" is meant to read for consumer
   creators — quoting the ElevenAgents wording against it. It also asks for
   the **Music Terms** (which hold a Prohibited Industries list we have never
   seen) and a **SOC 2 Type II report**, both free.

**Build, in order of what the permission depends on:**

4. **An affirmative click at sign-up.** OEM §3(A) requires clickwrap. This is
   the one build task the OEM permission is conditioned on.
5. **The four minimum terms on `/terms`** — pass-through of the ElevenLabs
   restrictions and the Prohibited Use Policy, no agency, ElevenLabs as
   third-party beneficiary, and the member's data grant.
6. **An age gate, built to the stricter rule.** No voice features for an
   account that is not 18, because Privacy Policy §11 prohibits under-18
   Voice Data outright.
7. **One honest paragraph each on `/terms` and `/privacy`** about what
   deletion does and does not reach, and one sentence about moderation.
8. **A look at `app/api/dub/hook/route.ts`** against ElevenAPI §4(2):
   signature verified, idempotent, results fetched before the URL expires.

**Decide:**

9. **The copyright check on uploads.** Three independent contractual reasons
   now point at it; it is still her call how heavy the check is.
10. **Whether FutureBox is a "Pure-play Music AI Creation Company."** If it
    is, "powered by ElevenLabs" is mandatory on the product and on the
    advertising — worth settling before the three style-catalogue adverts are
    made.
11. **Whether Aurora is a Beta Service**, before that flag goes on for
    anybody but her.
12. **Government Entity consent**, if a state school is ever a customer.
