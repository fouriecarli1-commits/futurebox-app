# The ElevenLabs sales email

Written 9 September 2026, re-sent 10 September because no reply came back
through the in-app route. **Rewritten 15 September**, after reading the OEM
Terms and thirteen other ElevenLabs documents — see `ELEVENLABS-TERME.md`.
The letter changed character: it no longer asks whether we are allowed to
exist, it says how we read the terms and asks them to confirm it. Kept here
so it does not have to be reconstructed from a conversation a third time.

**Where to send it.** The support thread that answered on 9 and 10 September
is a known-live address — replying on it and asking to be handed to sales is
the one route that has demonstrably reached a human. `sales@elevenlabs.io` is
the obvious guess but **has not been verified from here** (this machine cannot
reach elevenlabs.io), so it is worth sending to both.

**What is deliberately not in it.** No physical address, no ID number, no key.
The registration number is public on the CIPC register; the address is not
ours to publish in a cold email.

---

**Subject:** Enterprise / custom plan enquiry — AI music platform, South Africa, launching to 5,000+ members

Hi,

I'm the founder of FutureBox (FUTUREBOXSTUDIO (Pty) Ltd, South Africa,
registration 2026/714071/07). We're an Afrikaans-first creative studio —
members write and record songs, generate music and voice-overs, make music
videos and publish to their own channels. We're built on ElevenLabs and
recently moved up to Business.

We're pre-launch, with no paying members yet, and I'd like to get the
commercial terms right *before* we open rather than after. I've now read the
OEM Terms, the Prohibited Use Policy, the ElevenAPI and Music API Terms, the
DPA and the service-specific terms, and I think they answer most of what I
was going to ask. What I need is confirmation, and three points of
interpretation.

**0. Our reading of the OEM Terms — please confirm it.**
OEM Terms §2(B)(f) prohibits Making Available the Services where the
customer "is not accessing the Services as a Business Entity", and spells
out that Free, Starter, Creator and Pro are excluded. §1(D) defines a
Business Entity as an organisation on a "Scale, Business, Enterprise, or
equivalent plan". We are a registered company on Business, so we read
§2(A) as granting us the right to Make Available the Bundled Service to our
members, and the Supplemental Terms precedence rule in your Terms of Service
as letting that override the "non-sublicensable" wording in §5(b).

**Is that right?** If it is, please say so in writing and I will build to it.
If an Order Form or an OEM Exhibit is needed to make it so, please tell me
what that involves.

**0b. Is `creatify-aurora` generally available, or a Beta Service?**
One sentence is enough. Your Beta Services Addendum §3(a) forbids commercial
or production use of a Beta Service, and §2 forbids sending one personal
information — so if the talking presenter is in preview we cannot ship it at
all, and we would rather know that now than after building the room around
it.

**1. The End User definition doesn't fit a creator.**
OEM Terms §1(I) defines an End User as a customer "licensing or using the
Customer Solution only for its own internal business operations". Our members
are individuals who write a song and then sell or monetise it — that is not
internal business operations, and your support noted on 9 September that this
shape "is not explicitly covered" by the self-serve terms.

Your **ElevenAgents Terms §4(A)** carry the same four minimum End User terms
as OEM §3(A), word for word, but define an End User as using the solution
"only for its own internal business operations **or personal use**". The OEM
version is missing those three words. Is that a drafting gap, or is the OEM
programme genuinely meant only for B2B resale? This is the one question that
could still stop us, so I'd rather have it answered plainly.

**1b. Prohibited Use Policy §9(i).**
§9(i) prohibits "developing or using any applications or software that
interact with our Services without our prior written authorization (such as
through our APIs)". Your ElevenAPI Terms, which postdate it by a year, define
a "Customer Application" as an ordinary thing and set out our obligations for
one. I've assumed the ElevenAPI Terms are the authorisation §9(i) refers to.
Please confirm, or tell me what written authorisation looks like.

**2. Volume, and a rate that reflects it.**
We're planning for 5,000–10,000 members at launch. Pro's 600,000 credits feeds
roughly 20–33 of them. Your published ladder carries no volume discount —
$99 ÷ 600,000 and $990 ÷ 6,000,000 are the same $0.000165 per credit — so
scaling up the standard plans doesn't change our unit economics, it only
changes the invoice. We've done the arithmetic and on the standard ladder the
members needed to cover the cost outnumber the members the credits can feed at
every tier below Business. We need a custom rate to make this viable, and I'd
rather show you our numbers than argue about them.

**3. Concurrency, past Business.**
Business gives us 15 concurrent requests and 60 concurrent transcriptions.
With 5,000 members that is the number that decides whether the studio feels
alive on a Friday night. What does an Enterprise agreement move it to?

**4. Voice slots — one follow-up only.**
Business gives 2,200 custom voice slots and 10 professional ones, which
answers the ceiling question. Every member clones their own voice, so at
scale we pass 2,200. What happens then — is it a hard stop, an overage, or
a conversation? (We've already hit the pagination limit on the voice-list
endpoint at 500 and worked around it.)

**5. Music for film, TV and radio.**
Your terms carve broadcast and film/TV/radio use out of the standard music
licence and into Enterprise Music. Some of our members will want exactly that.
What does that add?

**6. Seedance.**
Your support confirmed on 10 September that Seedance is Enterprise-only. We're
using Veo in the meantime. What does Enterprise access to it involve?

**7. Data and consent.**
We operate under South Africa's POPIA and take GDPR-equivalent obligations
seriously. I've read the DPA and understand it applies to us as a self-serve
customer, with us as controller and ElevenLabs as processor. Three things:

- Please send a current **SOC 2 Type II report** under DPA §10.1.
- **DPA §9.2.2** gives no deletion obligation for self-serve content, only a
  right to delete after 180 days of inactivity. Our members will ask us to
  delete their voice and we want to be able to say truthfully what that
  reaches. What does deletion actually do on our account today, and can we
  get the 30-day enterprise commitment in §9.2.1?
- DPA Annex I records sensitive data transferred as "N/A", but your Privacy
  Policy §12 treats voice as biometric data. Under POPIA biometrics are
  special personal information. Which is correct for voice recordings sent
  through the API?

**8. Two smaller ones.**
- **Music API Terms §4(A)** requires co-branding for a "Pure-play Music AI
  Creation Company". Generated music is a large part of what we do but not
  all of it. Are we in that category, and if so, does OEM §2(B)(d) — no
  public statement about our business with you without written approval —
  give way to it?
- **OEM §2(B)(e)** requires written consent before selling to a Government
  Entity. We expect interest from schools, many of them state schools.
  What's the process?

**8b. Your Studio page and your Studio terms disagree.**
The comparison table says Studio is "Commercial" on Starter and up. The
Studio Terms say "unless you are on an Enterprise plan, Studio is made
available solely for your personal, non-commercial use." We don't use Studio
and this doesn't block us — but somebody is going to buy Creator off that
table and get a surprise, and you'd probably rather hear it from us.

**8c. Your Speech to Text numbers don't reconcile, by 15x.**
The same table gives "Extra hour, API: $0.22" and, on Business,
"Transcription per month: 303 h 2 m". But 303 hours out of a $990 budget is
$3.27 an hour. Every other product on your tables reconciles exactly against
the credit pool — music at 900 credits a minute, the voice changer at 1,000,
sound effects at 200 a generation — so this one stands out. Is speech to
text over the API billed separately from the credit pool at $0.22, or does
the 303-hour figure govern? We transcribe every uploaded song to line the
lyrics up, so the answer changes our unit cost by an order of magnitude.

**9. Two documents I can't reach.**
The **Music Terms** (referenced by the Music API Terms and by the Music
Marketplace Addendum, which points at a "Prohibited Industries" list in
them), and confirmation of which version of the **Speech to Text
Model-Specific Terms** applies to the batch `scribe_v2` endpoint rather than
Scribe v2 Realtime.

Happy to share our projections, our cost modelling and a walkthrough of the
product on a call. What's the best way to start?

Kind regards,
Anré Fourie
Founder, FutureBox
futurebox.studio
