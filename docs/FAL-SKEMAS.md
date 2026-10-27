# fal.ai models: the fields and prices the code relies on

Copied by the owner from each model's own page (`fal.ai/models/<id>/llms.txt`)
on 27 October 2026, because fal.ai cannot be reached from the build machine.
Only what the code sends or reads is kept here. A field that changes on
fal.ai's side is a change to `app/lib/server/fal.ts` and to this page.

None of these pages carried "Pending Enterprise Ready".

## `fal-ai/sam-3/image`: cut out one thing (Pull it out)

- **Price:** $0.005 per request.
- **Sync:** yes, `https://fal.run/fal-ai/sam-3/image`.
- **In:** `image_url` (required; a data URI is accepted), `prompt` (text,
  **defaults to "wheel"**, so it is always sent), `point_prompts`
  (list of PointPrompt), `box_prompts`, `apply_mask` (default true),
  `sync_mode` (true returns the media as a data URI), `output_format`
  (png | jpeg | webp), `return_multiple_masks`, `max_masks` (1 to 32),
  `include_scores`, `include_boxes`.
- **Out:** `masks` (list of Image, required), `image` (preview),
  `metadata`, `scores`, `boxes` (normalised `[cx, cy, w, h]`).
- **Unconfirmed:** the PointPrompt's own fields. Sent as
  `{ x, y, label: 1 }` in pixels, the shape fal.ai's SAM 2 uses. The first
  live tap confirms it.

## `fal-ai/birefnet/v2`: clean edges on a cut-out

- **Price:** "$0 per compute seconds", so billed by GPU time; a fraction
  of a cent per picture.
- **Sync:** yes.
- **In:** `image_url` (required), `model` ("General Use (Light)" default,
  "Matting", "Portrait", ...), `operating_resolution` (1024x1024 default),
  `output_mask`, `refine_foreground` (default true), `sync_mode`,
  `output_format` (png | webp | gif), `mask_only`.
- **Out:** `image` (the cut-out, or the mask with `mask_only`),
  `mask_image`.

## `fal-ai/trellis-2`: a picture to a 3D model (Make it 3D)

- **Price:** $0.25 at 512, $0.30 at 1024, $0.35 at 1536.
- **Queue:** yes; it takes a while.
- **In:** `image_url` (required), `resolution` (512 | 1024 | 1536, default
  1024), `decimation_target` (vertices, default 500 000; fal.ai's own
  advice is 20k to 50k for web and phones), `texture_size` (1024 | 2048 |
  4096, default 2048), `remesh` (default true), `seed`, and the guidance
  and sampling settings, left at their defaults.
- **Out:** `model_glb` (`{ url }`, required): a GLB file.
- **Chosen:** `resolution` 512 for the phone's view (the cheapest), with
  `decimation_target` 40 000 and `texture_size` 1024, so the file opens
  quickly on a phone.

## `fal-ai/ltx-2.3/image-to-video/fast`: a photo comes alive (Wake it up)

- **Price:** $0.06 a second at 1080p ($0.12 at 1440p, $0.24 at 2160p).
  The shortest clip is 6 seconds, so the least one press costs is $0.36.
- **Queue:** yes.
- **In:** `image_url` (required; a data URI is accepted), `prompt`
  (required), `end_image_url` (a transition to a second picture),
  `duration` (6 | 8 | 10 ... 20; above 10 only at 25 fps and 1080p),
  `resolution` (1080p | 1440p | 2160p), `aspect_ratio` (auto | 16:9 |
  9:16), `fps` (24 | 25 | 48 | 50), `generate_audio` (default true),
  `enable_safety_checker` (default true, left on).
- **Out:** `video` (`{ url, content_type, file_name }`).
- **Worth knowing:** it makes the sound with the picture
  (`generate_audio`), so a living photo has its own sound without a second
  model. `end_image_url` is the cover-to-cover transition, for free in the
  same call.
- **Chosen:** 6 seconds, 1080p, `aspect_ratio` auto, sound on.

## `fal-ai/ltx-2.3/image-to-video`: the final living photo

- **Price:** $0.08 a second at 1080p ($0.16 at 1440p, $0.32 at 2160p);
  6 seconds is $0.48.
- **Queue:** yes.
- **In:** the same as the fast one, but `duration` is only 6 | 8 | 10.
- **Out:** `video` (`{ url, content_type, file_name }`).
- **Chosen:** the fast one is good enough for a phone and a third cheaper,
  so it is the default; this one is kept for a later "best quality" press.

## `fal-ai/mmaudio-v2`: sound for a silent clip

- **Price:** $0.001 a second: an 8-second clip is under one US cent.
- **Queue:** yes.
- **In:** `video_url` (required), `prompt` (required; what it should sound
  like), `negative_prompt`, `seed`, `num_steps` (default 25), `duration`
  (1 to 30, default 8), `cfg_strength` (default 4.5), `mask_away_clip`.
- **Out:** `video` (`{ url, content_type, file_size, file_name }`): the
  same clip with its new sound on it.
- **Worth knowing:** the LTX models already make sound with the picture,
  so this is for a member's own silent footage in the Video Editor, and it
  costs so little that the price is nearly all margin.

## `fal-ai/image-preprocessors/depth-anything/v2`: depth (Step inside)

- **Price:** "$0 per compute seconds", billed by GPU time; a fraction of a
  cent.
- **Sync:** yes.
- **In:** `image_url` (required). Nothing else.
- **Out:** `image`: the depth map as a picture (near is light).
- **Worth knowing:** the depth is worked out once; the tilting is done on
  the phone from the photo and this map, so moving it costs nothing more.

## `fal-ai/flux-pro/v1/fill`: draw something into a photo (Draw it in)

- **Price:** $0.05 a megapixel: a 1024 x 1024 photo is about $0.05.
- **Sync:** yes.
- **In:** `prompt` (required; what to put there), `image_url` and
  `mask_url` (both required, **the same size**; white is where it goes),
  `num_images` (1 to 4), `output_format` (jpeg | png), `safety_tolerance`
  ("1" strictest to "6"; default "2", kept), `enhance_prompt`, `seed`,
  `sync_mode`.
- **Out:** `images` (list of `{ url, content_type }`), `has_nsfw_concepts`
  (list of booleans: a true one is treated as a refusal), `seed`, `prompt`.
- **To know:** FLUX.1 [pro] is Black Forest Labs' own model, served under
  `fal-ai/`. Under the rule in `docs/FAL-TERME.md` it counts as fal.ai's;
  if fal.ai's terms say it is passed on to Black Forest Labs, it moves to
  the partner list and needs its privacy-page line.

## `fal-ai/flux-2/klein/realtime`: the picture forms as you draw (Draw it real)

- **Price:** $0.00194 a compute second. A few frames a second while
  somebody draws is roughly a US cent a minute; it is charged per session
  of drawing, not per frame.
- **Realtime:** a **WebSocket**, not the queue. The phone talks to fal.ai
  directly, which needs a short-lived token our server hands out (the
  `FAL_KEY` itself never leaves the server). Built after the queue ones.
- **In:** `image_url` (required; **a data URI only**, 704 x 704 JPEG at
  50% quality is fastest), `prompt` ("Turn this into ..."), `image_size`
  (square 768 | square_hd 1024), `seed` (default 35; kept fixed so the
  picture changes only where the drawing does), `num_inference_steps`
  (1 to 8, default 3), `schedule_mu`, `output_feedback_strength`,
  `enable_interpolation`.
- **Out:** `images` (raw JPEG bytes), `seed`.
