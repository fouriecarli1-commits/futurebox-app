# fal.ai's models, and where each earns its place in the studio

Started 27 October 2026, as the owner sends the catalogue. The aim, in her
words: *"ons wil die meeste uit alles kry en wil alles benut"*, one creative
studio for everything, where **the magic is in helping people get the
product they are after**: the app chooses the best model for what was asked,
and guides the asking.

Read with `docs/FAL-TERME.md`. Two rules from there decide what may be used:

1. **Never a model marked "Pending Enterprise Ready"**: the DPA does not
   cover it and they may train on what we send.
2. **A partner model is another company.** Anything not under `fal-ai/`
   (`bria/`, `minimax/`, `bytedance/`, `openrouter/`, `mureka/`, `vast/`,
   `alibaba/`, …) sends the member's content on to that company, which then
   needs a line on the privacy page and a row in `check:verwerkers`. Prefer
   `fal-ai/` models; use a partner only where it is clearly the best for the
   member, and name it.

## Seen so far (screenshots of 27 October 2026)

The catalogue's own counts: text to image 210, image to image 411, text to
video 130, image to video 190, video to video 204, text to audio 53, text to
speech 41, audio to audio 42, audio to video 19, speech to text 13, text to
3D 14, speech to speech 5, video to audio 5, video to text 4, image to text
2, audio to text 2, text to JSON 3, text to text 2, LLMs 9, worlds 6.

| Model | Kind | What it could do here |
|---|---|---|
| `vast/eden-live-14b-game`, `vast/eden-live-5b-game` | world, real time | a playable scene made from a song or a prompt |
| `robbyant/lingbot-world-2`, `alibaba/abot-world-0` | world, real time | walk through a world in real time: an interactive music video |
| `minimax/h3-max/director`, `minimax/h3-max/reference-director` | world, real time | direct a continuous video stream live, keeping characters and setting |
| `openrouter/router/…` (chat, responses, embeddings, enterprise, decisions) | LLM gateway | not needed: the copilot already has its own model; adds a processor |
| `bytedance/seed/v2/mini` | LLM, multimodal | reads text, image and video together |
| `nvidia/nemotron-3-5-super/text`, `nvidia/nemotron-3-nano-omni` | LLM | reasoning; not needed beside the copilot |
| `video-prompt-generator` | text | turns a plain idea into a video prompt with camera, pacing and style |
| `mureka/api/generate/lyrics` | text | song words and a title from a topic |
| `bria/fibo/generate/structured_prompt`, `bria/fibo-lite/…`, `bria/fibo-edit/edit/structured_instruction` | text to JSON | turns a plain request into a structured, controllable prompt |

## The shape this is heading for

- **A router per capability**: picture, picture edit, video, video edit,
  sound, voice, music, 3D, upscale. The prompt and the member's choices pick
  the model (for example: words in the picture, a real person's likeness
  refused, photoreal or illustration, fast or best), each with its price
  shown before the press, through the credit rules that already exist.
- **Guided asking**: a few visual choices before the words (style cards
  with examples, shape, mood, length), compiled into a structured prompt.
  The `video-prompt-generator` and Bria's structured prompts are both built
  for this step.
- **New things the catalogue makes possible**, to be weighed one by one:
  sound for a silent clip (video to audio), an album cover that moves
  (image to video, the short loop the streaming apps show), a 3D version of
  the cover or a logo (text or image to 3D), a voice changer (speech to
  speech), an interactive world for a song (worlds).
