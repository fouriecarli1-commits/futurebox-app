# Running the ads, not just writing them

What it would take for FutureBox to run a client's advertising across the web and
social platforms — the thing the competitor's Ads Engine sells behind Contact Sales.

**Status.** A plan, not a measurement. Everything about our own code was checked. Everything
about the platforms is from knowledge that goes stale: their permission names, approval
tiers and review requirements change every few months, and this session has no route to
the open internet to re-check them. Treat every platform requirement below as *"this is
the shape of it — confirm the specifics before you rely on a date or a scope name."*

---

## What they are actually selling

Three things, from their own screen:

1. **Localise your creatives** — translate and adapt ad creative for any market.
2. **Launch across platforms** — push ads to Meta, Google, LinkedIn without leaving the tool.
3. **Optimize performance** — insights to find and scale the best-performing ads.

Worth being clear-eyed about which of these we are behind on.

**We already beat them on (1).** Their word is *translate*. `app/api/campaign/route.ts`
writes the copy **in** the market's language rather than translating into it, and the
reason is in the file: carried-over English idiom is the clearest possible sign of an
imported ad, and an ad that reads imported has already lost the room. For an Afrikaans
market that is not a small difference.

**(2) is the real gap.** We write the ad, make the video, read the line, and then hand
somebody a caption and open the platform's own composer. The last step is manual.

**(3) we have none of.** Nothing reads back what happened.

---

## The distinction that decides everything

`app/data/social.ts` already documents what posting to each platform requires — TikTok's
Content Posting API, YouTube Data API v3, the Instagram Graph API. **Those are the wrong
APIs for this.**

Posting a video to your own TikTok and running a paid campaign are different products
with different permissions, different review processes and different money:

| | Organic posting | Paid advertising |
|---|---|---|
| Meta | Instagram Graph API | **Marketing API** |
| Google | YouTube Data API | **Google Ads API** |
| Access | your own account | **the client's ad account** |
| Who pays | nobody | **somebody's card, every day** |

Everything below is the right-hand column.

---

## What each platform wants, roughly

**Meta (Facebook and Instagram) — Marketing API.** A Meta app, Business Verification with
real company documents, and the `ads_management` permission through App Review. The client
grants you access either by logging in with Facebook or — better — by adding your Business
Manager as a Partner on theirs. Campaign, ad set, creative and ad are separate objects.

**Google — Google Ads API.** A **developer token**, which is applied for through a Google
Ads *manager* account (an MCC) and arrives in tiers: test access first, then basic, then
standard, each a separate application with usage evidence. Then OAuth to the client, or
link their account under your MCC.

**LinkedIn — Marketing Developer Platform.** A partner application. Historically the most
restrictive of the three; do not plan around it early.

**TikTok — Business API.** Developer app and approval.

None of these are a weekend. Business Verification alone is a document exercise that needs
the company registered — which is item 2 on `docs/GOING_LIVE.md`'s registration list, and
another reason to do that first.

---

## How to actually get there, in the order that pays

### Stage 1 — be an agency, with no API at all

The client adds you as a Partner on their existing Meta Business Manager, and links their
Google Ads account under your manager account. You place the ads by hand, in the platforms'
own tools, using what FutureBox generated.

This needs **no approvals and no engineering**, works this week, and is how essentially
every small agency starts. It is worth saying plainly: at your volume, the plumbing is not
what a client is paying for. The creative is. FutureBox already makes the creative.

Do this until it is genuinely the bottleneck. If placing ads by hand for six clients is
the thing eating your week, that is a good problem and Stage 3 is the answer to it. Before
that it is a project that delays revenue.

### Stage 2 — read the numbers back, before you write anything

**Reading insights is far easier to get approved than creating campaigns**, on both Meta
and Google. Read-only scopes are a much smaller ask at App Review, and there is no risk of
your code spending somebody's money by mistake.

So the first thing to automate is the **report**: spend, impressions, clicks, cost per
result, pulled into a FutureBox screen next to the ad that produced them.

This is the half clients re-buy for. "Here is what your R2 000 did last month, and which
of the three angles worked" is a monthly invoice. "We wrote you some ads" is a one-off.

It also closes the last open item in `docs/FUNCTION_INVENTORY.md` — advert performance
read-back — and closes it in the achievable direction.

### Stage 3 — publish from here

Only once there is volume to justify Business Verification and App Review, and once the
company exists to be verified.

Start with Meta alone. It is one API covering Facebook and Instagram, which is most of the
spend for a small South African business, and it is the least restrictive of the three.
Google second. LinkedIn only if a client asks and pays for it.

---

## The money question, which is not a technical one

Whose card pays for the ad spend?

**The client's own ad account, on the client's card.** You get Partner access to place
ads; the platform bills them directly. You never touch their money, you carry no float,
and a dispute is between them and Meta.

**Your ad account, and you invoice.** You are now a lender. You pay Meta on the 1st and
chase the client on the 30th, you carry the credit risk on every client, and one bad
month is your money. Agencies do this at scale with credit checks and deposits. Do not
start here.

The first is strictly better until you are big enough for the second to be a deliberate
financing decision.

---

## What to build now, in this app, that needs nobody's permission

Everything above is gated on approvals and a registered company. This is not:

1. **A schedule.** What goes out, where, on which day. The adverts already exist and are
   kept in the history; what is missing is a calendar and a reminder.
2. **UTM tags on every link.** Free, needs no API, and it is what makes any of the later
   read-back attributable. Without it, Stage 2 cannot tell which ad did anything.
3. **A per-platform posting run.** The composers already open with the caption ready. A
   checklist that walks the platforms in order and marks each done turns four separate
   tasks into one.
4. **The brand kit on the creative** — already built, and it is what makes a set of ads
   look like one campaign rather than three unrelated posts.

That is a real advertising service, delivered by hand where it has to be, and it is worth
charging for on day one.

---

## What this would mean for the room

The advert desk currently ends at "here is your ad, here is the composer". The honest
version of this service adds two things after that: **when it goes out**, and **what it
did**. The first can be built now. The second is Stage 2.

Nothing in the room should imply we publish for you until we do. It says so today — see
the note at the foot of `Campaign.tsx` — and that note should survive until it stops being
true.
