# The editing tools, and what each one costs us

Carli, 7 October 2026:

> "Kan jy wanneer jy nie besig is nie begin om te develop? ... magic grab om 'n item uit te
> haal en weer 'n ander item in te sit, BG remover, magic eraser, upscaler, auto focus, blur,
> grab text, image to video, om motion by 'n prent te sit. Dit is alles code wat ons oor tyd
> kan develop om ons editing tools te upgrade."

This is the list, split by the only thing that decides the order: **what each one costs us per
use.** Not by how hard it is, and not by how impressive it sounds.

The app's rule is hers, from 6 October: *"elke keer wanneer iets afgelaai word kos dit krediete
... hulle sal nie kan export sonder krediete nie."* A tool that runs on the member's own phone
costs us nothing however many times they press it, so it can be free to use and still be paid
for on the way out — which is exactly how the cutting room already works. A tool that calls an
engine costs us real money on every press, whether or not anything is ever exported, so it
needs its own price and a confirm before it spends.

---

## Done

| Tool | Where it runs | What it costs us |
|---|---|---|
| **Blur** | the phone | nothing |
| **Brightness, contrast, colour, warmth** | the phone | nothing |
| **Auto ("Lift it")** | the phone | nothing |
| **Crop, zoom, fill or fit** | the phone | nothing |
| **Words, three faces, safe zones** | the phone | nothing |
| **Transparent background** | the phone | nothing |

`app/lib/postlook.ts`, `app/lib/postcrop.ts`, `check:postlook`, `check:postcrop`,
`audit/postwalk.mjs`.

**"Auto focus" is answered by "Lift it" and is deliberately not called focus.** Nothing recovers
a photograph that was soft when it was taken. A control that claimed to would be a control that
lies, and this repository already has a rule against a check that measures something adjacent —
the same principle applies to a button.

---

## Next, and still free: runs on the phone, costs us nothing

### ~~Grab text~~ — done, 7 October 2026

Tesseract compiled to WebAssembly, English and Afrikaans, in `app/lib/ocr.ts`.

**Everything is served by this app**, which was not a preference. The policy in
`next.config.mjs` is `connect-src 'self'` and `default-src 'self'` with no `blob:` — and
Tesseract's defaults break on both, fetching its core and language data from a CDN and wrapping
its worker in a blob URL. Either is refused by the browser with a console line nobody reads and
a button that spins for ever. `audit/grabtext.mjs` proved it by turning the blob worker back on:
*"Refused to create a worker from blob:"*.

6.6 MB sits in `public/ocr/` and none of it is downloaded until somebody presses the button. A
member who only reads English never fetches the Afrikaans data.

The honest limit: printed text well, handwriting badly, and the room says so.

### ~~Background remover, for people~~ — done, 7 October 2026

MediaPipe's selfie segmentation, in `app/lib/cutout.ts`, self-hosted in `public/segment/`.

**6 MB, and that was a choice.** Google's current Tasks API ships a 13 MB WebAssembly bundle
because it carries hands, face and pose alongside segmentation. This older solution is 6 MB for
the same answer. It is deprecated — and self-hosting freezes it, so it will go on working exactly
as it does today whatever Google does next. Six megabytes still matters when members are on
prepaid data, so nothing is fetched until the button is pressed.

**It looks for a person, and says so.** It refuses with a reason when it finds nobody rather than
handing back an empty frame: a fully transparent picture and a deleted picture look identical on
a dark phone screen. And the cut can be undone, because the file somebody picked may itself have
been a crop they made elsewhere.

**The one thing no machine here can prove is that it finds a real person.** Nothing that can be
drawn into a canvas is one — a flat rectangle, a gradient and a drawn figure all come back as
nobody, correctly. `audit/cutout.mjs` proves the model loads, runs and answers under this app's
own policy, and that a mask keeps exactly what it covers. Whether the mask is a good one needs a
photograph and Carli's eyes. **This is the one item on this page waiting on her rather than on
me.**

### ~~Magic eraser, for small things~~ — done, 7 October 2026

`app/lib/erase.ts`. Paint over something small; the picture around the gap grows inwards over it,
a ring at a time from every edge at once, then a few smoothing passes over only what it wrote.

Good at a bin against a wall, a sign against a sky, a stranger at the edge of a beach. Bad at
anything with structure behind it, where it smears — and the room says so, because this is
arithmetic and not the *"magic grab"* on her list. Nothing here imagines what was behind
anything.

**The bug that would have shipped looking like the feature not working:** one brush disc per
pointer event leaves unmasked specks twenty pixels apart, those specks are pixels of the thing
being erased, and the fill grows them straight back over the hole. A stroke is a line of discs
overlapping by half a radius. It was found by the shape of the arithmetic, not by looking: the
first ring of a solid 45-by-258 hole should be about six hundred pixels and it was twelve
hundred, which is a region full of holes.

### A plain upscaler
Lanczos resampling makes a picture bigger without the blockiness of a naive stretch. It costs
nothing and it does not invent detail. Worth having under its own honest name — "make it bigger",
not "upscale" — so it is not confused with the paid one below.

---

## The ones that need an engine, and therefore a price

Every one of these calls out, costs us money on each press, and must show its price and take a
confirm **before** it spends — the pattern the cutting room already uses for the three doors
that need an engine.

| Tool | What it really is | The decision waiting on Carli |
|---|---|---|
| **Magic grab** — take an item out, put another in | generative inpainting with a mask | price per go |
| **Background remover for anything** | a segmentation model beyond people | price, or ship the free people-only one and leave it |
| **AI upscaler** | a super-resolution model that invents detail | price per go, and it scales with the output size |
| **Image to video / motion on a still** | an image-to-video model | **the expensive one.** Seconds of video from one still, priced per second |

I am not putting numbers in this table from memory. Supplier prices move, and a price written
down from memory and then charged to members is exactly the sort of thing that is wrong quietly.
When we build each one I will read the current price off the supplier and work the credit cost
back from it, the way `app/lib/credits.ts` already does for the engines we use.

---

## The order I would do them in

1. ~~Grab text~~ — done.
2. ~~Background remover for people~~ — done.
3. ~~Magic eraser (classical)~~ — done.
4. **Make it bigger (Lanczos)** — free, small.
5. Then the paid four, one at a time, each with its price decided first.

Four free tools before the first invoice. That is not caution for its own sake: every one of
them makes the room feel like an editor, and none of them can surprise her with a bill.
