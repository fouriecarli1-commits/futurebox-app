# Everything that still costs no credits, and a proposed price for each

The owner, 27 October 2026: *"Niks is gratis nie, alles wat 'n sinvolle
funksie regoor die app is moet krediete kos."* She sets the prices; this is
the proposal, with the engine cost and the profit beside each, the way
`credits.ts` asks. Nothing here is charged until she writes her number next
to it in `credits.ts`.

**The arithmetic.** A credit is worth at least **R1.50** (the Label plan's
R599 for 399, the cheapest a credit is ever sold). For 80% profit the cost
may be at most a fifth of that: **R0.30 of cost per credit**. Model calls
are Claude Opus 5 at $5 per million tokens in and $25 per million out, at
R16 to the dollar (`plans.ts`). Each cost below is given twice: a typical
answer, and the **ceiling** (the longest answer the route allows, its
`max_tokens`), because the 80% rule has to hold on the long answer too.

---

## 1. Calls a paid model and charges nothing (cost to us on every press)

| Feature (route) | What it does | Typical cost | Ceiling | Proposed | Profit at the ceiling |
|---|---|---|---|---|---|
| **Pick for me** (`/api/recommend`) | fills one field with a choice and a reason | R0.35 | R1.00 (2,000 out) | **4 credits** | R6.00 − R1.00 = R5.00 (83%) |
| **Lyrics under the video** (`/api/translate`) | translates the words on screen | R0.60 | R1.75 (4,000 out) | **6 credits** | R9.00 − R1.75 = R7.25 (81%) |
| **Tell me, and get a song** (`/api/songfrom`) | turns what was said into a song's words and style (the song itself is already 8) | R0.50 | R1.75 | **6 credits** | R7.25 (81%) |
| **A song from a photo** (`/api/photosong`) | reads the photo and writes the song's words and style | R0.80 | R1.90 (picture in + 4,000 out) | **7 credits** | R10.50 − R1.90 = R8.60 (82%) |
| **Ask the copilot about the mix** (`/api/mixdesk`) | suggests mix changes and makes them | R0.55 | R1.75 | **6 credits** | R7.25 (81%) |
| **Songwriter help** (`/api/songwriter`) | writes or improves the words | R0.90 | R3.40 (8,000 out) | **12 credits** | R18.00 − R3.40 = R14.60 (81%) |
| **Story helper: Write it for me / Make mine better** (`/api/story`) | writes the story the pictures and the reading are made from | R0.90 | R3.40 | **12 credits** | R14.60 (81%) |
| **Kids story** (`/api/kids/story`) | the same, in the kids room, from the parent's allowance | R0.90 | R3.40 | **12 credits** | R14.60 (81%) |
| **The copilot** (`/api/copilot`) | every question in the copilot panel | R0.70 | R3.40 | see below | |

**The copilot is the one to decide differently.** At 12 credits a question
nobody would ask it anything, and it is what sells everything else. Three
ways, the owner's choice:

- **(a) 3 credits a question, with its answers capped shorter** (1,500
  tokens instead of 8,000, enough for any answer it gives in the panel):
  ceiling R1.00, profit R3.50 (78%), so 4 credits for a clean 80%.
- **(b) A number of questions included in each plan** (for example 30 a
  month on Maker, 100 on Studio, 300 on Label), then 3 credits each.
- **(c) Free, as the one exception**, because it is the shop assistant and
  not the product. This breaks the rule, so it needs her yes.

Proposal: **(b)**. It is free enough to be used and still never unlimited.

Capping `max_tokens` lower lowers every ceiling above too; the prices are
set for the routes as they are today.

## 2. Made on the phone, kept or taken out with no charge

These cost us nothing to run. Priced to match the paid things beside them.

| Feature | Where | Proposed | Why that number |
|---|---|---|---|
| **A video drawn on the phone** (`video.here`, `CREDITS.browserVideo` is 0) | the song's video panel, beside the engine's video | **6 credits** | below the engine's (18+) and the Video Editor's film out (10); above a picture out (5) |
| **A kids' film from their drawings** (`lib/kidsfilm.ts`) | kids room, Easy Editing | **3 credits** | from the parent's allowance; a third of an AI kids video (9) |

## 3. Already paid, at the door out (no change proposed)

The tools themselves cost nothing, but nothing leaves the room without a
charge, and charging per tool would stop people trying things:

- **Photo Editor** tools (looks, cut a person out, read the words, paint,
  shapes, crop, grids): the picture out is **5 credits** (`postOut`).
- **Video Editor** cutting, best moments, voice-over, own filming: the film
  out is **10 credits** (`filmOut`), plus words, looks and joins.
- **Pro Booth** tools (tuner, cut at the playhead, marks, smoothing, the
  pedalboard, hum to instrument): the bounce is charged by the minute.
- **Keep it in the app** (a picture to the Channel for the cutting room):
  it stays on the device; the film it goes into is paid.

## 4. Stays free (not features, or not ours to charge)

- Previews and samples: voice samples, the play button, starting templates.
- Playing, keeping and looking at what was already paid for: replays, the
  kids' TV, gallery and sleep list, reopening separated lanes, fetching a
  cover that was paid for and never saved.
- **Loading a TONE3000 tone**: their API terms forbid charging for access to
  their catalogue (`docs/TONE3000-API-TERME.md`). The button is not in the
  app at launch anyway.

---

**To switch on:** for each line she approves, the number goes into
`credits.ts` with her decision beside it, the route gets its `charge()` and
refund, the button gets its price, `scripts/enginecost.mts` gets the cost
row, and `check:kredietkoste` holds the 80%.
