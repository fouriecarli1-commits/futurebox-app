# What makes FutureBox unlike any other studio

Written 27 October 2026, after the whole fal.ai catalogue was read
(`docs/FAL-MODELLE.md`). The owner's brief, in her words: *"Dink regtig
regtig kreatief om hierdie prakties, eenvoudig, sinvol en die beste te maak
wat 'n mens kan bied"*, with two leads of her own: the 3D models as **an
avatar, the way games have one**, and **features in the Photo and Video
Editors that bring things to life**, down to *a drawing that becomes a
picture, or an object in a photo*.

Other apps offer a hundred tools. The idea here is three things that tie
every tool together, so a member never has to know the tools exist.

---

## 1. "What else can it become?": every creation is a seed

Under everything a member makes (a photo, a cover, a song, a clip, a
drawing) sits one button: **What else can it become?** It opens three or
four cards, each a picture of the result and its price:

| It is a… | It can become… |
|---|---|
| photo | a living photo · a world to step into · a 3D object · a cover |
| drawing | a finished picture · something inside a photo · a 3D figure · a sticker that moves |
| cover | a moving cover · a lyric video · a shirt · a poster in every size |
| song | a lyric video · a music video starring your avatar · sound for your clip |
| clip | a version for every platform · its own music · slow motion · a living cover |
| 3D figure | your avatar · a dance to your song · a figure printed in colour |

The chain is the product: a pencil sketch becomes a cover, the cover comes
alive, the song gets a video, the avatar dances in it, the cover goes on a
shirt the avatar wears. **Nothing is ever a dead end**, and each step is one
press with its price on it. The cards are chosen by the router
(`docs/FAL-MODELLE.md`, part 2), so a new model is a new card, not a new
screen.

## 2. Your character: one avatar through the whole studio

The way a game has one character that goes everywhere with you, FutureBox
gives each member **their own character**, and it turns up in everything
they make.

**Making it** (one sheet, three ways in):
- from a selfie: **the member's own face only**, with the consent step the
  Voice desk already has;
- from a drawing (`hunyuan3d-v3/sketch-to-3d`, `sketch_to_colored_image`);
- from words ("a fox in a yellow raincoat").

The studio makes a character sheet first (front, side, back:
`qwen-image-edit-2511-multiple-angles`), the member says yes, and only then
the 3D model (`trellis-2` first, fal.ai's own), rigged so it can move
(`meshy/rigging`).

**What it does:**
- **dances to your song**: motion from words (`hunyuan-motion`) or copied
  from a clip of the member dancing (`meshy/rigging/multi-animation`,
  motion transfer). A music video with no camera and no crew;
- **hosts your podcast**: a drawn character speaking your voice, mouth on
  the words; no face rule needed because it is nobody's face;
- **appears on your covers**, the same every time (`ideogram/character`);
- **stands in for you in the Live room** when the camera is off;
- **becomes merch**: a colour-printed figure (`hitem3d/hi3d/multicolor`),
  a sticker pack that moves (`omnilottie`).

**Its wardrobe is your own work.** Every cover, pattern or logo a member
makes can become an outfit for their character (`meshy/v7/retexture`), and
the same design goes onto a real shirt (`shirt-design`, try-on). The
character wears the merch before a fan does.

**Its world is your album.** One picture of the cover becomes a place to
look around (`hunyuan_world`), and later, when the real-time world models
are affordable, a place to walk through with the song playing. A fan does
not only hear the album; they visit it.

## 3. Bringing things to life in the editors

Each is one button, does one thing, and shows a draft first.

### Photo Editor

- **Draw it in.** Draw roughly on the photo where something should be (a
  cat on the couch, a moon in the sky), say or type what it is, and it
  appears there, in the photo's own light. (`bria/fibo-edit/add_object_by_text`,
  `chrono-edit-lora-gallery/paintbrush`, `flux-pro/v1/fill`.)
- **Draw it real.** A blank page: draw with a finger, and the finished
  picture forms beside the drawing as you draw
  (`flux-2/klein/realtime`), then becomes a picture, a cover or a 3D figure.
- **Wake it up.** The photo starts to move: hair in the wind, water,
  clouds, a slow camera move around it (`minimax/h3-max/camera-controls`),
  with its own sound (`mmaudio-v2`). A living photo, which is also a moving
  cover and a Live room post.
- **Step inside.** The photo gains depth (`depth-anything`), and on the
  phone it moves as the phone tilts. The depth is worked out once; the
  moving is done on the phone, so tilting costs nothing after that.
- **Pull it out.** Tap anything in the photo (`sam-3/image`), and it
  lifts off as a sticker; one more press and it is a 3D object
  (`trellis-2`) to spin, put in another photo, or print.
- **Change the time.** Golden hour, midnight, snow, rain, another season
  (`time-of-day`, `weather-effect`, `reseason`).
- **Bring it back.** An old photo repaired, its faces restored, its colour
  returned (`photo-restoration`, `codeformer`, `ddcolor`).

### Video Editor

- **Draw on the video.** Draw something on one frame, say what it is, and
  it is there for the whole shot, moving with it (`id-v2v`, the Wan VACE
  family). A dragon over the city, a hat on the dog.
- **Say what to change.** "Make it night", "add snow", "make it rain"
  (`kling/v4/video-to-video/edit`).
- **Your character in your footage**: the avatar walks into a real clip
  (reference-to-video).
- **The sound arrives by itself**: effects timed to what is seen, and music
  written to the cut (`mmaudio-v2`, Sonilo).
- **Find the moment**: "the part where she laughs" (`scene-finder`).
- **Redo just that bit** (`ltx-2.3/retake-video`), **every platform's
  shape** (`ltx-2.3/reframe`), **slow motion** (`rife/video`), **sharper**
  (`seedvr/upscale/video`).
- Background out and item out are already live.

---

## How this stays simple

- **Two new screens, not two hundred.** The "What else can it become?"
  sheet and the character sheet. Everything else is a button in a room
  that already exists.
- **One job runner.** `/api/footage` already does the hard part (upload to
  our own storage, the two yeses, the screen, the charge, the refund, the
  deletion). It becomes `/api/make` with a job name, and each new feature
  is a row in the router table plus a card.
- **Draft first, always.** The cheap model shows the idea; the member pays
  for the good one only when the draft is right.
- **The price on every button**, set by the owner's margin rule.

## The rules that come with it

- **18 and older for everything that goes to fal.ai** (their terms). The
  kids room gets none of it.
- **A face or a voice is the member's own**, or a drawn or invented
  character. Never a real person's.
- **Style cards name a style, never a studio or a living artist.**
- **What a member may sell** is decided per model by its licence before
  that model is offered for anything sold.
- Every partner model gets its privacy-page line first.

## The order, revised

0. Before launch: the picture screen on Live room posts, and alt text.
1. The shared job runner (`/api/make`) and the router table.
2. **Wake it up** and **Step inside** in the Photo Editor: the most
   magical, and the cheapest to try.
3. **What else can it become?** under photos, covers and clips.
4. **Draw it in** and **Draw it real**.
5. **Pull it out** (photo to sticker to 3D object).
6. **Your character**: sheet, 3D, rig, dance to your song.
7. **Draw on the video** and **Say what to change**.
8. The character's wardrobe, merch and printed figure.
9. The album world.
