# Story Maker cards — new ones every 30 days

Asked for on 19 October 2026: *"Daar is heeltemal te min storielyne. Ons moet
seker 10 verskillendes van elke opsie hê, dan moet jy 'n nota maak dat ons
elke 30 dae nuwe storielyn opsies shuffle."*

## How it works now

- Each of the four steps (Hero, Place, Surprise, Ending) has **20 cards** in
  `app/lib/kidsstoryboard.ts` (`STORY_SECTIONS`). The pictures have **10
  looks** (`VISUAL_STYLES`).
- A child sees **10 cards a step**. `cardsNow()` picks them, shuffled by the
  30-day window, so **the cards on show change by themselves every 30 days**
  and stay the same all month. `ROTATE_DAYS` and `CARDS_SHOWN` set both.
- Every card stays valid for the story engine whether it is showing or not.

## The note: every 30 days

The automatic shuffle keeps it fresh for a few months; new cards keep it
fresh for good. Every 30 days:

1. Add **2–4 new cards to each step** in `STORY_SECTIONS` (id, emoji, title,
   blurb, colours, and `visualScene` in English for the illustrator).
2. Add their English and Afrikaans words to `app/lib/i18n.tsx` as
   `kids.card.<id>` and `kids.card.<id>.b`.
3. Keep them picture-book safe: no real people, no characters somebody else
   owns, no brand names, nothing frightening.
4. Run `npm run check:kidstory` — it holds that every step has at least 20
   cards, that ten show at a time, and that a new window shows a new ten.

Ask Claude: *"Voeg nuwe storiekaarte by vir hierdie maand."*
