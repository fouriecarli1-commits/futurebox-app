# Wat kos wat — die hele prys lys

> **Hierdie dokument word deur `npm run kaart` geskryf, nie met die hand nie.**
> `check:kaart` laat 'n stoot misluk as die kode en hierdie bladsy verskil,
> so wat hier staan is wat die app werklik doen op die dag wat jy dit lees.

'n Krediet verkoop vir tussen **R1.80** en **R1.50**.
Alles hieronder is teen **R1.50** gereken — die goedkoopste een, want
daardie lid druk dieselfde knoppies.

---

## 1. Elke funksie wat krediete kos, met wat die enjin ons kos

| Wat dit doen | Krediete | Ons vra | Enjin kos ons | **Wins** | Wins % | Hoeveel keer |
|---|---:|---:|---:|---:|---:|---:|
| dubbing, per minute | 110 | R165.09 | R40.48 | **R124.61** | 75% | 4.1× |
| eight advert lines | 40 | R60.03 | R3.24 | **R56.79** | 95% | 18.5× |
| a mark on the film (in the browser) | 15 | R22.51 | niks | **R22.51** | 100% | — geen enjin |
| a marketing plan | 15 | R22.51 | R4.84 | **R17.67** | 79% | 4.7× |
| putting a film together, per half minute (in the browser) | 10 | R15.01 | niks | **R15.01** | 100% | — geen enjin |
| reading a song, per minute (Music.ai) | 8 | R12.01 | R1.12 | **R10.89** | 91% | 10.7× |
| singing it, per minute (Kits) | 8 | R12.01 | R1.60 | **R10.41** | 87% | 7.5× |
| splitting stems, per minute | 8 | R12.01 | R2.21 | **R9.80** | 82% | 5.4× |
| cleaning a take, per minute | 8 | R12.01 | R2.21 | **R9.80** | 82% | 5.4× |
| a voice change, per minute | 8 | R12.01 | R2.21 | **R9.80** | 82% | 5.4× |
| a look over the film (in the browser) | 6 | R9.01 | niks | **R9.01** | 100% | — geen enjin |
| a style word | 6 | R9.01 | R0.31 | **R8.69** | 97% | 28.9× |
| a still picture changed by saying what to change | 6 | R9.01 | R0.96 | **R8.05** | 89% | 9.4× |
| a one-minute half song | 7 | R10.51 | R2.76 | **R7.75** | 74% | 3.8× |
| taking a post off the device (in the browser) | 5 | R7.50 | niks | **R7.50** | 100% | — geen enjin |
| a two-minute song | 8 | R12.01 | R5.52 | **R6.49** | 54% | 2.2× |
| transcribing, per minute | 4 | R6.00 | R0.07 | **R5.94** | 99% | 89.0× |
| an item taken out, per five seconds | 5 | R7.50 | R1.80 | **R5.70** | 76% | 4.2× |
| words set on the picture (in the browser) | 3 | R4.50 | niks | **R4.50** | 100% | — geen enjin |
| a join between two shots (in the browser) | 3 | R4.50 | niks | **R4.50** | 100% | — geen enjin |
| a song laid under the film (in the browser) | 3 | R4.50 | niks | **R4.50** | 100% | — geen enjin |
| bouncing a mix out (in the browser) | 3 | R4.50 | niks | **R4.50** | 100% | — geen enjin |
| a background taken out, per five seconds | 4 | R6.00 | R1.80 | **R4.20** | 70% | 3.3× |
| a sound effect, up to ten seconds | 3 | R4.50 | R0.74 | **R3.77** | 84% | 6.1× |
| the smallest read anybody is charged (300 characters) | 2 | R3.00 | R0.55 | **R2.45** | 82% | 5.4× |
| reading 150 characters (a rate, not a press) | 1 | R1.50 | R0.28 | **R1.22** | 82% | 5.4× |

**Elke een hierbo maak wins.** Die kleinste is *reading 150 characters (a rate, not a press)* teen R1.22, die grootste is *dubbing, per minute* teen R124.61.

### Pryse in die kode waarvoor daar nog nie 'n enjin-koste hier is nie

| Sleutel in die kode | Krediete | Ons vra | Enjin kos ons | Wins |
|---|---:|---:|---|---|
| `songMinute` | 8 | R12.01 | nog nie gelees nie | nog nie bekend nie |
| `kidSong` | 8 | R12.01 | nog nie gelees nie | nog nie bekend nie |
| `kidVideo` | 9 | R13.51 | nog nie gelees nie | nog nie bekend nie |
| `video` | 18 | R27.02 | nog nie gelees nie | nog nie bekend nie |
| `cover` | 15 | R22.51 | nog nie gelees nie | nog nie bekend nie |
| `browserVideo` | 0 | — (niks) | nog nie gelees nie | nog nie bekend nie |
| `clone` | 20 | R30.02 | nog nie gelees nie | nog nie bekend nie |
| `finetune` | 180 | R270.15 | nog nie gelees nie | nog nie bekend nie |
| `parts` | 8 | R12.01 | nog nie gelees nie | nog nie bekend nie |
| `grab` | 15 | R22.51 | nog nie gelees nie | nog nie bekend nie |

---

## 2. Elke roete wat 'n verskaffer bereik en niemand hef nie

| Roete | Hoekom dit niemand hef nie |
|---|---|
| `/api/kids/art` | the operator's own bench for the children's room artwork: owner-only, run a handful of times, and metered against the Google ceiling rather than credits |
| `/api/cubed/mark` | the operator's own bench for choosing a logo: owner-only, run a handful of times, and metered against the Google ceiling rather than credits |
| `/api/google/videotest` | makes one real four-second Veo clip to settle whether Google hands the video back as bytes or writes it to a Cloud Storage bucket. About R10, owner-only, and it answered `needsBucket: false` on 9 October 2026 — which closed a question no amount of reading could close, because every Google sample sends a `storageUri` and this app never does. Not a member action and not a feature |
| `/api/google/wordtest` | makes one short song to show which of Lyria's two text rows is the lyrics and which is the description. About R1.28, owner-only. It exists because the alternative instruction was "open the browser's network tab and decode a base64 header", which is asking a person to do a machine's job. Not a member action and not a feature |
| `/api/voice/own` | says which member a trained singing voice belongs to. It reads Kits' list of models to check the number is one of ours and then writes a row — no conversion, no audio, nothing generated. Owner-only, so it is not a member action at all, and the thing it guards (one member singing in another member's cloned voice) is the opposite of a bill |
| `/api/watch` | the health letter. It runs on a secret, for the owner, and it asks the suppliers what they have spent rather than spending anything |
| `/api/eleven/dictionary` | puts the pronunciation rules onto the account from the repo — our own setup, on a secret, not a member action |
| `/api/eleven/prices` | reads their invoice to answer whether we charge enough. Reading a bill is not adding to one |
| `/api/eleven/pronounce` | the Afrikaans test read. It DOES generate, and it is the one here that costs real money — guarded by a secret and meant for the owner alone, which is why it takes no credits and why it must never lose that guard |
| `/api/voice` | what this person may do with voices and which ones they have. A listing, so the studio can draw itself correctly on first paint |
| `/api/voice/preview` | a stock voice sample, which is a static file on their storage. Passed through our origin so their host stays off the media policy. Charging for it would price the one step that stops somebody buying the wrong voice |
| `/api/account` | deleting an account and everything in it. Nobody pays to leave |
| `/api/analyse/part` | one stem streamed back through our own origin. The job that made it was charged when it ran; this is collection, not work |
| `/api/analyse/setup` | lists the Music.ai workflows actually on the account. A setup page on a secret |
| `/api/allowance` | where the allowances stand. Reading a meter |
| `/api/kits/face` | the picture for a singing voice, passed through this app rather than linked, for the same policy reason as the voice sample |
| `/api/tone3000/start` | sends her to TONE3000 to choose an amp. Their fees are waived for us and she signs in with her OWN account, so there is no bill behind any of this — and the capture runs in her browser through lib/nam.ts, not on anything we pay for |
| `/api/tone3000/callback` | where they send her back. It trades a code for tokens on her behalf and spends nothing doing it |
| `/api/tone3000/tone` | fetches the capture she chose, on her own token. Free for the same reason as the two above: this supplier has no account key and sends us no invoice |
| `/api/kits/setup` | lists what is on the Kits account. A setup page on a secret |
| `/api/charts` | Spotify's public chart beside our own on Spotlight. Client credentials against a free endpoint — no account of ours is touched and no invoice exists to split. Charging a visitor to look at a chart would also be the first paywall on a page whose whole job is to be looked at |
| `/api/charts/spotify` | says which of the six ways the Spotify bar can fail to appear actually happened. A setup page on a secret, and the only one of these whose code path has never run where it was built |

---

## 3. Die kamers

| Kamer | Waarvoor dit is |
|---|---|
| `make` | Making a song from nothing: a title, a style, the words, then the track itself.. |
| `studio` | Editing a song that already exists: its sections, its arrangement, its timing.. |
| `booth` | Singing on your own track: recording takes over the backing, cleaning the room noise off a take, and lifting a vocal back out. |
| `canvas` | The video desk: marketing, podcast and social clips built scene by scene. |
| `videoedit` | The cutting room: their own footage on a clock, trimmed, split, reordered, faded, with words set on the picture, and put together in the browser. |
| `photo` | The photo editor: one still, made for social media. |
| `hooks_feed` | Short vertical clips — the fifteen seconds that make somebody stop scrolling. |
| `channels` | Your channel: your released music, in the order you want people to hear it. |
| `collab` | Finding another maker and working with them — the radar, the ask, and the room you share.. |
| `live` | The live room: one channel, everybody in it at the same time.. |
| `voice_studio` | Your voice: cloning it once, then reading anything in it.. |
| `podcast` | A show with its own feed: episodes, hosts, and the dub into other languages.. |
| `sound` | Training a sound of your own from songs you have already made, so the next ones come out sounding like them.. |
| `campaign` | Adverts: a brief in, and a set of adverts out — the line, the words under it, the button, the line to say aloud, and the shot to film.. |
| `albumart` | Album art by real artists: a wall of one-off pieces at R200 and up, each sold exactly once, and a way to commission a painter for a particular song.. |

---

*Geskryf deur `scripts/kredietkaart.mts`.*
