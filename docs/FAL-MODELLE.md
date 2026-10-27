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


### Pictures (text to image), second batch

| Model | Note |
|---|---|
| `flux/schnell`, `flux/dev`, `flux-lora`, `flux-2`, `flux-2/klein/9b`, `flux-2-pro`, `flux-pro/v1.1`, `flux-pro/v1.1-ultra`, `blackforestlabs/flux-3/text-to-image` | Black Forest Labs family: schnell is the fast draft, ultra and FLUX 3 are 2K/4K finals; `flux-lora` takes a trained style |
| `nano-banana`, `nano-banana-2`, `nano-banana-pro`, `google/nano-banana-2.1`, `google/nano-banana-2-lite` | Google; the app already calls Nano Banana on her own Google project, so fal is a second road to the same model |
| `openai/gpt-image-2`, `openai/gpt-image-2.5/flare`, `…/sunburst` | strongest at words inside the picture and complex layouts |
| `ideogram/v3` | posters, logos and typography |
| `bytedance/seedream/v4`, `v4.5`, `v5/pro` | words in 14 languages, editing in the same model |
| `z-image/turbo` | very fast and cheap: live previews while somebody types |
| `meta/muse-image/text-to-image` | text, plots and QR codes rendered faithfully |
| `xai/grok-imagine-image` | aesthetic stills |

### Sound and music (text to audio), first 16 of 53

| Model | Note |
|---|---|
| `elevenlabs/music`, `elevenlabs/music/v2.5`, `elevenlabs/sound-effects/v2`, `elevenlabs/tts/eleven-v3`, `elevenlabs/tts/multilingual-v2` | the same engines the app already reaches directly. **Licence check first:** the commercial licence the app relies on comes from her own ElevenLabs plan, and does not travel to calls billed through fal.ai |
| `google/lyria-3.5`, `lyria2`, `lyria3/pro` | Google music; Lyria is already used on her own Google project |
| `minimax-music/v2`, `minimax-music/v2.6`, `minimax/music-3` | full songs with singing from lyrics and a style, up to five minutes |
| `stable-audio-25/text-to-audio`, `stable-audio-3/medium/text-to-audio` | music and sound effects, up to six minutes, stereo |
| `cassetteai/music-generator` | a 30-second sample in under two seconds: fast sketches |
| `ace-step` | songs with lyrics; open weights |
| `bytedance/seed-audio-1.0` | sound from text, a reference audio or a picture |

**For every music model:** who owns what it makes, and whether a member
may sell it, is the question that decided ElevenLabs. Each one needs that
answer from its own licence before it is offered for a song a member
releases.

### Sound and music (text to audio), the rest

| Model | Note |
|---|---|
| `sonilo/v1.1/text-to-music`, `sonilo/v1.1/text-to-sound-effects` | calls itself "licensed, commercial-use-safe": **the first candidate for songs a member may release**, once its licence is read |
| `mirelo-ai/sfx2.0` | sound effects and ambience up to ten minutes: room tone, rain, a crowd |
| `cassetteai/sound-effects-generator`, `stable-audio-3/small/sfx`, `…/small/music`, `…/base` | quick effects and sketches |
| `mmaudio-v2/text-to-audio` | effects from words; its video-to-audio twin puts sound on a silent clip |
| `diffrhythm` | words to a whole song in under 30 seconds: the fastest full-song sketch |
| `ace-step/prompt-to-audio` | a song from one sentence, no lyrics needed |
| `mureka/api/generate/song`, `…/instrumental`, `…/podcast` | partner; songs, beds and a two-voice podcast from a topic |
| `minimax-music/v1.5`, `v2.5`, `minimax-music` | older versions of the song models above |
| `elevenlabs/music/v2`, `elevenlabs/text-to-dialogue/eleven-v3` | see the ElevenLabs licence note above |
| `ltx-2.3-quality/text-to-audio`, `…/lora` | sound from Lightricks' video model; the LoRA takes a trained sound |

### Voices (text to speech), 41

| Model | Note |
|---|---|
| `elevenlabs/tts/eleven-v4`, `…/eleven-v4-turbo`, `…/turbo-v2.5`, `elevenlabs/text-to-dialogue/eleven-v3` | audio tags, stability and IPA pronunciation; the licence note above applies |
| `google/gemini-3.8-flash-tts`, `…-flash-lite-tts`, `gemini-3.1-flash-tts` | 30 voices, style told in words, two-speaker dialogue: **the podcast desk's two hosts** |
| `minimax/speech-2.8-hd`, `-2.8-turbo`, `-2.6-hd`, `-2.6-turbo`, `-02-hd`, `-02-turbo`, `preview/speech-2.5-hd`, `…-turbo` | partner; HD for finals, turbo for drafts |
| `minimax/voice-design`, `qwen-3-tts/voice-design/1.7b` | **a new voice made from a description** ("an old man, warm, slow"): nobody's real voice, so no likeness question. Narrators for stories and ads |
| `minimax/voice-clone`, `qwen-3-tts/text-to-speech/1.7b` and `/0.6b` (clone), `zonos2`, `zonos`, `f5-tts`, `heygen/heygen-voice`, `…/turbo`, `resemble-ai/chatterboxhd/text-to-speech`, `chatterbox/text-to-speech`, `…/multilingual`, `async/tts-pro/v1.0` | **voice cloning.** Only the member's own voice, with the consent step the Voice desk already has; never a famous voice |
| `vibevoice`, `vibevoice/7b`, `vibevoice/0.5b`, `dia-tts`, `csm-1b` | long multi-voice talk with laughter and breaths: full podcast episodes from a script |
| `kokoro/american-english`, `…/british-english` and seven other languages | the cheapest narration; no Afrikaans |
| `orpheus-tts`, `maya`, `maya/batch`, `maya/stream`, `inworld-tts`, `index-tts-2/text-to-speech`, `xai/tts/v1`, `kling-video/v1/tts`, `bytedance/seed-speech/tts/v2`, `alibaba/qwen-audio-3-tts` | expressive or fast alternatives, to be compared by ear |
| `kotoba-technologies/kotoba-tts/v2/tts/ws` | Japanese, streamed, tagged commercial-use |

**Afrikaans:** no model names it. The multilingual ones (Gemini, Eleven v4,
Chatterbox multilingual, Qwen) must be tried by ear before the app promises
an Afrikaans voice.

### 3D (text to 3D), 14

| Model | Note |
|---|---|
| `tripo3d/h3.1/text-to-3d`, `tripo3d/p2/…`, `tripo3d/p1/…` | partner; P2 has PBR textures, face counts, low-poly |
| `hunyuan-3d/v3.1/pro/text-to-3d`, `…/rapid/…`, `hunyuan3d-v3/text-to-3d` | textured models ready for Unity, Unreal and Blender |
| `meshy/v7.1/text-to-3d`, `meshy/v7`, `meshy/v6`, `meshy/v6-preview` | partner; untextured preview first, then textured: a cheap draft before the paid final |
| `hyper3d/rodin/v2.5/text-to-3d`, `…/fast` | partner; production meshes, fast drafts |
| `hunyuan-motion`, `hunyuan-motion/fast` | **3D human motion from words**: a dance for an avatar, to a member's song |

### Video (text to video), 130: the ones that matter

| Model | Note |
|---|---|
| `kling-video/v3/pro`, `v3/standard`, `v3/turbo/…`, `v3/4k`, `o3/pro`, `o3/standard`, `o3/4k`, `kling/v4` (3 to 30 seconds, per-shot prompts), `v2.6/pro`, `v2.5-turbo/pro` | partner; cinematic, native sound, several shots: **the music video** |
| `minimax/h3`, `h3-max`, `h3-max-turbo`, `hailuo-2.3/pro`, `…/standard`, `hailuo-02/…`, `video-01`, `video-01-live` | partner; `h3/text-to-video/lora` keeps a trained character or style |
| `minimax/h3-max/styles/hand-drawn`, `…/vhs`, `…/16bit-pixel`, `…/retro-toon-70s`, `…/low-poly` | **ready-made looks**: exactly the style cards for guided asking |
| `bytedance/seedance-2.0/fast`, `…/mini`, `…/us`, `seedance-2.5/us` (to 30 seconds), `seedance/v1.5/pro`, `v1/pro`, `v1/pro/fast` | partner; multi-shot with sound; `mini` is the cheap draft |
| `google/gemini-omni-flash`, `…/v1.1` | video with sound, grounded in real-world knowledge |
| `blackforestlabs/flux-3/text-to-video`, `…/draft`, `flux-3-max` | `draft` keeps a cache so the final costs less: **draft, then final** |
| `alibaba/wan-3.0`, `wan-3.0-prime`, `wan/v2.7`, `v2.6`, `v2.2-a14b` (+ `/turbo`, `/lora`), `v2.2-5b` (+ `fast-wan`), `wan-25-preview`, `wan-t2v`, `wan-t2v-lora` | open weights; LoRAs for a member's own style |
| `alibaba/happy-horse`, `…/v1.1` | 1080p with sound and lip-sync in several languages |
| `ltx-2.3/text-to-video`, `…/fast`, `ltx-2.3-22b/…`, `…/distilled`, `ltx-2.3-quality`, `lightricks/ltx-2.5/…/fast`, `…/pro`, older `ltx-video` | open; sound and picture in one pass, cheap |
| `xai/grok-imagine-video/…`, `v1.5`, `v1.5/lite` | video with sound |
| `pixverse/v6`, `v5.5`, `v5`, `v4.5`, `c1` | partner; `c1` is film-grade with sound to 15 seconds |
| `vidu/q3`, `q3/turbo`, `q2`, `q1`; `luma/agent/ray/v3.2` (seamless loops); `kandinsky6-pro`, `kandinsky6-lite`, `kandinsky5-pro`, `kandinsky5/distill`; `hunyuan-video`, `hunyuan-video-v1.5`; `longcat-video/distilled/720p`, `/480p` (long clips); `cogvideox-5b`; `fast-animatediff`; `kling-video/v1.6/…/effects` | alternatives; **Luma's loops are the moving album cover** |
| `creatify/boreal` | product, UGC and presenter videos with sound: **an ad for a member's own release** |
| `heygen/heygen-video`, `heygen/v3/video-agent`, `heygen/avatar5/digital-twin`, `veed/avatars/…`, `veed/fabric-1.0/text`, `infinitalk/single-text`, `kling-video/lipsync/audio-to-video` | talking people and lip-sync. **A real person's face only with that person's own consent, and only their own**: the same rule as voices. VEED is a partner and stays out |

Also in text to video: `moonvalley/marey/t2v` (partner; **trained only on
fully licensed material**, the safest video to sell), `bytedance/bernini-r`
(makes and edits in one model), `ovi` (picture and sound together),
`minimax/video-01-director` (camera moves in words), `kling-video/lipsync/text-to-video`,
`cosmos-predict-2.5` (+ `/distilled`), `infinity-star` (ten times faster),
`magi-distilled` (real physics), `krea-wan-14b`, `wan-pro`, `t2v-turbo`,
`fast-svd`, `fast-svd-lcm`, `fast-animatediff/turbo`, `longcat-video/text-to-video/720p`,
`/480p`, `pixverse/v5.6`, `v4`, `v3.5` (+ `/fast`), `kling-video/v1/standard/effects`,
`v1.5/pro/effects`, LTX LoRA variants, and more avatars
(`heygen/avatar3`, `avatar4/digital-twin`, `heygen/v2/video-agent`,
`argil/avatars/text-to-video`) under the same face rule.

### Sound in, sound out (audio to audio), 42

| Model | Note |
|---|---|
| `demucs` | stems: voice, drums, bass, guitar and more. The one fal.ai's own email pointed to |
| `sam-audio/separate`, `sam-audio/span-separate` | **take out any sound by naming it** ("the dog barking", "the crowd"): a member's own recording cleaned in words |
| `deepfilternet3`, `veed/clean-audio` | noise out of speech, up to 48 kHz; VEED is a partner and stays out |
| `elevenlabs/audio-isolation`, `elevenlabs/voice-changer` | licence note above applies |
| `audio-understanding` | answers questions about a recording: **lets the copilot hear a member's song** and say what it is, its tempo, its mood |
| `ace-step/audio-to-audio`, `ace-step/audio-outpaint`, `ace-step/audio-inpaint` | a song in the style of an example; **make a song longer**; rewrite one part of it with new words |
| `stable-audio-3/medium/audio-to-audio`, `…/audio-inpainting`, `…/audio-outpainting`, the `small/music`, `small/sfx` and `base` variants of each, `stable-audio-25/audio-to-audio`, `stable-audio-25/inpaint` | variations, fixing a bad bar, extending an intro or outro |
| `qwen-3-tts/clone-voice/1.7b`, `/0.6b`, `dia-tts/voice-clone`, `kling-video/create-voice` | voice cloning: the member's own voice only |
| `personaplex`, `personaplex/realtime` | a real-time two-way spoken conversation with a set character: **talk to the copilot out loud** |
| `tada/3b/text-to-speech`, `tada/1b/…` | speech kept in step with its words |
| `ffmpeg-api/merge-audios`, `workflow-utilities/audio-compressor`, `workflow-utilities/impulse-response` | plain tools: the app already does these on the phone, without credits |

### Hearing (audio to text), 2

| Model | Note |
|---|---|
| `nvidia/nemotron-3-nano-omni/audio` | partner; answers a question about a recording, like `audio-understanding` |
| `silero-vad` | finds where speech is, with times: cuts silences out of a podcast, places captions |

### Sound to picture (audio to video), 19

| Model | Note |
|---|---|
| `pixverse/music-video/vibemv` | partner; **a music video from the song itself**, with a character reference, lyric subtitles and style presets. The most direct fit in the catalogue |
| `mureka/api/generate/lyrics-video` | partner; a lyric video from a song, with layouts, shapes and backgrounds |
| `lightricks/ltx-2.5/audio-to-video/pro`, `…/fast`, `ltx-2.3/audio-to-video`, `ltx-2.3-quality/…`, `ltx-2.3-22b/…`, `…/distilled`, and their `/lora` versions | video timed to a given song or voice: visuals that move on the beat |
| `elevenlabs/dubbing` | **a video or a podcast in another language**, in the same voice; licence note above |
| `wan/v2.2-14b/speech-to-video`, `flashtalk`, `echomimic-v3`, `longcat-single-avatar/audio-to-video`, `…/image-audio-to-video` | a still picture that speaks or sings to the audio. Face rule applies |
| `veed/avatars/audio-to-video`, `argil/avatars/audio-to-video` | stock avatars; VEED stays out, Argil is a partner |

### Video in, video out (video to video), 204: first page

| Model | Note |
|---|---|
| `kling/v4/video-to-video/edit`, `kling-video/o3/pro/video-to-video/edit`, `…/o3/standard/…`, `google/gemini-omni-flash/v1.1/edit` | **change a member's own clip in words** ("make it night", "add rain"). The next step for the Video Editor after the two engine presses it already has |
| `kling/v4/reference-to-video`, `alibaba/wan-3.0/reference-to-video`, `…/wan-3.0-prime/reference-to-video` | a new clip that keeps a character, product or place from reference pictures and clips: **the same face across every shot of a music video** |
| `kling-video/v3/pro/motion-control`, `…/v3/standard/…`, `…/v2.6/standard/…`, `wan/v2.2-14b/animate/replace`, `minimax/h3-max/recast` | a dance or a movement copied onto another character, or the people in a clip swapped. **Face rule applies twice**: the person in the clip and the person put in must both be the member, or have said yes |
| `sync-lipsync/v3`, `sync-lipsync/v2`, `…/v2/pro`, `latentsync` | mouth moved to new audio: a dubbed clip, a corrected line. Face rule applies |
| `topaz/upscale/video/precision`, `bytedance-upscaler/upscale/video`, `seedvr/upscale/video` | up to four times sharper: **phone footage to a clean final**. Topaz is a partner |
| `mmaudio-v2` | **sound for a silent clip**, timed to the picture |
| `ffmpeg-api/merge-videos`, `ffmpeg-api/merge-audio-video`, `ffmpeg-api/compose`, `workflow-utilities/trim-video`, `workflow-utilities/scale-video` | plain tools the Video Editor already does on the phone, without credits |

Second page:

| Model | Note |
|---|---|
| `birefnet/v2/video` | background out of a clip: **a second engine beside `ben/v2/video`**, to compare on the first real clips. `bria/video/background-removal/v3` is a partner; VEED's stays out |
| `sam-3/video`, `sam-3/video-rle` | finds and follows a named thing through a clip ("the red car"): **a sharper mask for "take an item out"** than the words alone |
| `minimax/h3-max/extend-video` | a clip made longer, guided by words |
| `rife/video` | frames filled in between: **smooth slow motion** from phone footage |
| `workflow-utilities/auto-subtitle` | captions burned in. The Video Editor's own captions stay the default; this is the fallback for a language the phone cannot hear |
| `decart/lucy-2-5/realtime` | partner; **restyles a live webcam picture as it streams**: a look for the Live room. Live video of a person, so the face rule and the 18+ rule both apply |
| `bytedance/seedance-2.5/draft/complete` | the draft is made cheap, and only the one the member keeps is finished at 1080p: the draft-then-final pattern, built in |
| `kling-video/o1/video-to-video/edit`, `kling-video/o3/…/video-to-video/reference`, `wan/v2.7/edit-video`, `xai/grok-imagine-video/edit-video`, `alibaba/happy-horse/video-edit`, `blackforestlabs/flux-3/edit-video`, `luma/agent/ray/v3.2/video-to-video` | more ways to change a clip in words; to be compared on the same clip before one is picked |
| `kling-video/v2.6/pro/motion-control`, `wan/v2.2-14b/animate/move`, `bytedance/dreamactor/v2` | movement copied from a clip onto a picture of a character (Dreamactor also for animals and objects). Face rule |
| `sync-lipsync`, `pixverse/lipsync`, `veed/lipsync`, `…/v2`, `infinitalk` | more lip-sync; VEED stays out |
| `topaz/upscale/video/generative`, `blackforestlabs/flux-video-upscale` | upscaling that rebuilds detail, to 4K |
| `depth-anything-video` | depth for every frame: background blur, 3D-looking parallax |


Third and fourth pages:

| Model | Note |
|---|---|
| `ben/v2/video`, `void-video-inpainting` | **the two the Video Editor already uses**, seen in the catalogue as fal.ai's own (no company in front of the name). VOID also takes out what the item did to the scene (its shadow, its splash) |
| `ltx-2.3/reframe`, `minimax/h3-max/reframe-video`, `luma/agent/ray/v3.2/reframe` | **a wide clip made tall, or the other way**, by filling in the sides instead of cropping: one video, every platform's shape |
| `sonilo/v1.1/video-to-video-music` | **licensed music written to fit a clip, cleared for commercial use**. With Sonilo's text-to-music this is the strongest music candidate so far |
| `mirelo-ai/sfx2.0/video-to-video`, `hunyuan-video-foley` | sound effects laid on a clip, speech kept |
| `heygen/v2/translate/precision`, `heygen/v3/lipsync/precision` | partner; a clip spoken in another language with the mouth matched. Face and voice rules apply |
| `minimax/h3-max/relight` | the light in a clip changed after filming |
| `minimax/h3-max/3d-to-video`, `ltx-2.3-quality/render-to-real` | a rough 3D scene turned into a real-looking clip: with the 3D models above, **plan a shot in 3D, film it in words** |
| `decart/lucy-restyle` | partner; a whole clip, up to 30 minutes, in a new style |
| extend: `minimax/h3-max-turbo/extend-video`, `xai/grok-imagine-video/extend-video`, `blackforestlabs/flux-3/extend-video`, `ltx-2.3/extend-video` | to be compared with `h3-max/extend-video` |
| slow motion: `topaz/interpolate/video` (to 120 fps), `film/video` | beside `rife/video`; Topaz is a partner |
| upscale: `flashvsr/upscale/video` (fastest), `video-upscaler`, `topaz/upscale/video/creative` | beside the upscalers above |
| masks: `sam-3-1/video`, `…/video-rle`, `sam2/video` | following several things at once |
| `wan-vace-14b/inpainting`, `wan-vace-14b/depth`, `ltx-2.3-quality/inpaint`, `ltx-2.3-quality/reference-video-to-video`, `wan-motion`, `kling-video/o1/…/reference`, `kling-video/o3/4k/video-to-video/edit`, `kling-video/o1/standard/video-to-video/edit`, `google/gemini-omni-flash/edit`, `minimax/h3/reference-to-video/lora`, `sync-lipsync/react-1` | more of the same jobs, to compare |
| `bria/video/background-removal`, `bria/video/erase/mask`, `pixelcut/video-background-removal` | partners doing what `ben` and `void` already do; not needed |

Fifth and sixth pages:

| Model | Note |
|---|---|
| `id-v2v` | **edit one frame as a photo, and the whole clip follows**: the Photo Editor and the Video Editor joined. Keeps faces, gaze and movement |
| `ltx-2.3/retake-video` | redo one stretch of a clip and keep the rest |
| `blackforestlabs/flux-3/draft-enhance` | the kept draft re-made at full quality with the same seed and the same movement: the draft-then-final pattern again |
| `minimax/h3-max/insert-video` | a new scene put into the middle of a clip, guided by words or pictures |
| `bytedance/bernini-r/reference-edit-video` | partner; an object, a material, a background or the weather taken from a picture into a clip |
| `sonilo/v1.1/video-to-video-sound-effects` | **royalty-free, commercial-use-safe sound effects** laid on a clip. Sonilo now covers music, effects, and both fitted to video |
| `thinksound` | sound for a clip, with an optional word prompt |
| `decart/lucy2-vton/realtime` | partner; **clothes tried on live**: a member's own merch on camera before it is printed |
| `topaz/deblur/video`, `topaz/sdr-to-hdr/video`, `kandinsky6-vsr`, `clarityai/crystal-video-upscaler` | partners except Kandinsky; motion blur out, HDR, sharper and flicker-free |
| `wan-vace-apps/video-edit`, `wan-vace-14b` with `/outpainting`, `/pose`, `/reframe`, `/inpainting`, `/depth`, `wan-22-vace-fun-a14b/…`, `wan/v2.2-a14b/video-to-video`, `wan/v2.6/reference-to-video`, `ltx-2.3-quality/outpaint`, `ltx-2.3-quality/extend-video`, `ltx-2.3-22b/reference-video-to-video`, `kling-video/o3/4k/video-to-video/reference`, `kling-video/o1/standard/…/reference`, `pixverse/extend`, `pixverse/v6/extend`, `scail-2`, `infinitalk/video-to-video`, `heygen/v2/translate/speed`, `heygen/v3/lipsync/speed` | more of the jobs above, to compare; the Wan VACE family is open and does almost every edit in one model |
| `dwpose/video` | a person's pose read from a clip: the input for motion copying |
| `workflow-utilities/reverse-video`, `workflow-utilities/blend-video` | plain tools; the phone can do these |
| `bria/video/erase/prompt`, `…/erase/keypoints`, `bria/bria_video_eraser/…` | partner; **says it is trained on licensed data**, the one to reach for if VOID's results are not safe enough to sell |

Seventh and eighth pages:

| Model | Note |
|---|---|
| `lightx/recamera`, `lightx/relight`, `id-v2v/relight` | **the camera angle or the light changed after filming** |
| `ltx-2.3-quality/colorization` | **old black-and-white footage in colour**: family films for a tribute song or a memorial video |
| `ltx-2.3-quality/clean-plate` | a person taken out of a clip, leaving the empty scene |
| `auto-caption` | captions in a chosen colour and font, from the clip's own sound |
| `pixverse/sound-effects`, `cassetteai/video-sound-effects-generator`, `controlfoley`, `thinksound/audio` | effects and background music laid on a clip; Sonilo stays first for anything sold |
| `moonvalley/marey/motion-transfer`, `…/pose-transfer` | partner; movement copied with the licensed-data model: **the safest motion copying to sell**. Face rule applies |
| `vast/eden-live-14b-video`, `…-5b-video` | partner; a live stream re-drawn in real time from a reference: the Live room again |
| `one-to-all-animation/14b`, `/1.3b` | a character picture moved by a pose |
| `editto`, `vidu/q2/video-extension/pro`, `magi-distilled/extend-video`, `blackforestlabs/flux-3/extend-video/draft`, `wan/v2.6/reference-to-video/flash`, `wan-vace-apps/long-reframe`, `bytedance/bernini-r/edit-video`, LTX multiconditioning, `ltx-2.3-22b/video-to-video`, `hunyuan-video/video-to-video`, `cogvideox-5b/video-to-video`, `fast-animatediff/turbo/video-to-video`, `amt-interpolation` | more of the jobs above |
| `topaz/denoise/video`, `ltx-2.3-quality/hdr`, `kandinsky6-vsr/lite`, `bria/video/increase-resolution` (to 8K, licensed data), `bria/video/background-removal/green-screen-despill` | clean-up and finishing |

## Where this is pointing, so far

- **Every category has a draft tier and a final tier** (Flux 3 draft,
  Seedance mini, Meshy preview, MiniMax turbo, schnell). The router can
  always show a cheap draft first and charge for the final only once the
  member likes it. That is the single biggest help to "get the product
  they are after", and it saves credits.
- **Style cards come free with the catalogue**: MiniMax's styles, LoRAs,
  the 3D low-poly options. Guided asking can start from pictures of looks.
- **Voices without likeness questions**: voice design makes a new narrator
  from a sentence; cloning stays for the member's own voice only.
- **Whole new products** now visible: a podcast episode from a script with
  two hosts; a music video from a song; a dance for a 3D avatar
  (`hunyuan-motion`); an ad for a release (`creatify/boreal`); a moving
  album cover (Luma loops); sound for a silent clip (`mmaudio`).
- **Editing a song, not only making one**: extend it, rewrite one part,
  take a named sound out, make variations. Together with stems this is a
  whole repair-and-remix desk.
- **The copilot can listen** (`audio-understanding`) and **talk back out
  loud** (`personaplex`): guidance by voice, for people who do not know
  what to type.
- **A song in, a video out**: VibeMV, lyric videos and beat-timed LTX
  turn a finished song into something to post, without the member writing
  a word. That is the shortest road from the Music room to the Live room.
- **The editors join up**: one frame fixed in the Photo Editor carries
  through the whole clip (`id-v2v`); a bad stretch is retaken without
  redoing the rest.
- **One video, every shape**: reframe fills in the sides, so a member's
  wide clip becomes a tall one for stories without cutting anybody out.
- **What is safest to sell** decides the default: Sonilo for music and
  Marey for video say they are trained on licensed material. Their own
  terms are read before that is promised.

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
