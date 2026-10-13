# Oorhandiging aan Claude (Handover to Claude) — FutureBox

**Hierdie lêer is spesifiek saamgestel sodat Claude dadelik die konteks, veranderinge, argitektuur en toetsstatus kan verstaan en moeiteloos kan voortgaan.**

---

## 1. Agtergrond & Carli se Versoeke

Carli, 11 Oktober 2026:
> *"Dan weet ek nie of google 'n template pack het waarvan 'n video of foto kan begin nie? Dit is wat meeste editing programme amazing maak is hulle templates. En foto's en video's moet 'n plek hê waar jy die standaard sizes kan kies, asook custom sizes. Met export moet mens die kwaliteit van export kies, en daardie verstellings moet alles krediete kos. Ek werk so standaard op 5 krediete."*

Drie kernfunksies is versoek en volledig gebou:
1. **Sjabloon-verkenner & Beginpakette (Templates Explorer & Starter Packs):** Canva- en Google-styl biblioteek vir foto- en videovervaardiging.
2. **Standaard- en Pasgemaakte Doekgroottes (Standard & Custom Sizes):** Doekafmetingskieser met standaard sosiale- en videopresets en pasgemaakte px-afmetings met aspekverhouding-slot.
3. **Export-kwaliteit met Standaard 5 Krediete:** Keuse tussen Konsep Web (720p), Standaard HD (1080p), en Ultra 4K / Drukwerk — almal teen die standaard 5 krediete.

---

## 2. Nuwe Lêers Geskep (New Files Created)

| Lêer | Beskrywing |
|---|---|
| [`app/components/StudioTemplatesModal.tsx`](app/components/StudioTemplatesModal.tsx) | Canva & Google-styl sjabloon-verkenner met soektog, 19 kategorie-knoppies, afdelings vir *„Onlangs bekyk”*, *„Geïnspireer deur jou ontwerpe”*, en *„Voorleggings & Aanbiedings”*. |
| [`app/lib/studiotemplates.ts`](app/lib/studiotemplates.ts) | 19 kategorieë (`TEMPLATE_CATEGORIES`) en 14 vektor-gebaseerde vooraflaaide sjablone (`STARTER_TEMPLATES`) oor pitch decks, 4K natuurvideo's, plakkate, sertifikate en QR promosies. |
| [`app/components/CanvasSizeModal.tsx`](app/components/CanvasSizeModal.tsx) | Doekgroottekieser met 9 standaard sosiale/video-presets (Instagram Plasing/Storie, YouTube, Facebook, A4 Plakkaat, Pamflet, ens.) en pasgemaakte wydte/hoogte met aspekverhouding-slot en 0.5×–2× vermenigvuldigers. |
| [`app/components/CanvasFloatingToolbar.tsx`](app/components/CanvasFloatingToolbar.tsx) | Swaaiende nutsbalk bokant die doek met vinnige toegang tot Sjablone, Doekgrootte, Towerstel (Magic Suite), en Staafkode. |
| [`app/lib/elementsdata.ts`](app/lib/elementsdata.ts) | Vektor-elemente en vorm-subkategorieë (spraakborrels, wolke, harte, baniere, waterdruppels, ratte) met skoon SVG-ikone. |
| [`app/components/ElementsBrowserModal.tsx`](app/components/ElementsBrowserModal.tsx) | Element-verkenner wat die nuwe vorms en ontwerpelemente vertoon. |

---

## 3. Lêers Gewysig (Modified Files)

### A. [`app/components/PostStudio.tsx`](app/components/PostStudio.tsx)
* **Koppeling van modale vensters:** `StudioTemplatesModal` en `CanvasSizeModal` ingevoer en gemonteer.
* **Toestand-hake:** `showTemplatesModal`, `showSizeModal`, `exportQuality: 'draft' | 'standard' | 'ultra'`.
* **Hanteerders:** `handleSelectStudioTemplate` (stel doekgrootte, agtergrond en voorbeeldwoorde) en `handleApplyCanvasSize` (stel pasgemaakte resolusie dinamies).
* **Export-kwaliteit in `paidPicture` en `take`:** Bereken `effectiveQuality` en `exportScale: Scale` (1 vir draft/standard, 2 vir ultra) sonder om die AST-toetsreël vir `check:postpaid` te breek.
* **Knoppies bygevoeg:** Vinnige knoppies in die boonste nutsbalk bo die doek, in die `frameBench` (Vorm) paneel, en die 5-krediet kwaliteit-keuse in `saveBench`.

### B. [`app/components/VideoEditor.tsx`](app/components/VideoEditor.tsx)
* `StudioTemplatesModal` en `CanvasSizeModal` gekoppel aan die film-ateljee met sneller-knoppies in die werkbank.

### C. [`app/lib/credits.ts`](app/lib/credits.ts)
* `CREDITS.postOut` op **5** gestel (was 2), soos Carli uitdruklik gevra het (*„Ek werk so standaard op 5 krediete”*).

### D. [`scripts/check-sold.mts`](scripts/check-sold.mts) & [`scripts/check-postpaid.mts`](scripts/check-postpaid.mts)
* Bygewerk om die 5-krediet standaard te handhaaf en te bevestig.

### E. [`app/lib/posttext.ts`](app/lib/posttext.ts)
* `PostSize['id']` verbreed na `string` sodat pasgemaakte groottes (`custom_WxH`) en nuwe sjablone tipe-veilig is.

### F. [`app/lib/i18n.tsx`](app/lib/i18n.tsx)
* Alle vertalings bygevoeg vir `size.*`, `elem.*`, `stpl.*`, `tplcat.*`, en `post.exportQuality*`.
* 100% tweetalig met egte krul-afkappingstekens (`’n`, `’s`).

### G. [`scripts/check-probes.mts`](scripts/check-probes.mts) & [`scripts/check-security.mts`](scripts/check-security.mts)
* Windows-versoenbaarheid bygevoeg vir pad-skeiers (`\\` na `/`) sodat plaaslike toetse op Windows nie vals negatiewe lewer nie.

---

## 4. Huisreëls & Randgevalle (House Rules & Gotchas)

1. **Standaard Koste = 5 Krediete:**
   * Export van foto's en video-omslae kos 5 krediete. `scripts/check-postpaid.mts` en `scripts/check-sold.mts` toets dit spesifiek.
2. **`bg-white` is VERBODE:**
   * Soos Claude in [`docs/ANTIGRAVITY.md`](docs/ANTIGRAVITY.md) uiteengesit het, gebruik slegs `zinc-*`, `emerald-*`, of `bg-zinc-900`/`bg-zinc-950`.
3. **Afrikaans Krul-afkappingstekens:**
   * Gebruik altyd die regte Unicode krulteken (`’n`, `’s`) — nooit die reguit apostroof (`'n`, `'s`) in Afrikaanse stringe nie. `npm run check:afrikaans` verifieer 4,592 sleutels.
4. **`Scale = 1 | 2` Tipe-beperking:**
   * In `app/lib/postfile.ts` is `Scale` streng getipeer as `1 | 2`. Moenie `number` stuur nie; gebruik `const exportScale: Scale = exportQuality === 'ultra' ? 2 : (scale === 2 ? 2 : 1)`.

---

## 5. Hoe om Verifikasietoetse te Hardloop (Verification Suite)

Alle relevante toetse slaag 100%:

```sh
# 1. Tipe-toetsing (0 foute)
npm run check:types

# 2. Afrikaans-validering (4,592 sleutels geverifieer)
npm run check:afrikaans

# 3. Tema- en CSS-toetsing
npm run check:theme

# 4. Krediete- en export-integriteit
npx tsx scripts/check-postpaid.mts
npx tsx scripts/check-sold.mts
npx tsx scripts/check-lessenaar.mts

# 5. Volledige klik-deur en isolasie-toetse (106 toetse)
npm run check:probes
```
