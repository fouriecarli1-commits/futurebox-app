# Google Ads: aansoek om die sleutelwoordbeplanner in die app

Doel: in die Adverts-kamer kan 'n lid sien **watter woorde mense op Google soek**,
hoeveel keer per maand, en hoe duur daai woorde is — die "Keyword Planner",
maar binne FutureBox. Google gee dit deur die **Google Ads API**, en jy moet
eers daarvoor aansoek doen. Hierdie is die stappe, in volgorde. Ek help jou
met elkeen wanneer jy gereed is.

**Belangrik:** sedert **9 September 2026** hang die toegang nie meer aan 'n
"developer token" nie, maar aan 'n **Google Cloud-projek**. Ou gidse op die
internet wat van 'n developer token praat, is dus deels verouderd.

## Wat jy nodig het

- 'n Google Ads **bestuurder-rekening** (Manager account, "MCC"). Gratis.
- Die **Google Cloud-projek** wat FutureBox reeds gebruik (vir Gemini, Veo
  en Lyria), of 'n nuwe een.
- **Handelsmerk-verifikasie** ("brand verification") van daai projek: Google
  wil weet die app behoort aan 'n regte besigheid. Die Pty Ltd se naam, die
  webwerf futurebox.studio en 'n besigheids-e-posadres op daardie domein.
- Die **privaatheidsbladsy** en **terme** wat reeds op futurebox.studio is.

## Die stappe

1. **Maak die bestuurder-rekening.** ads.google.com/home/tools/manager-accounts
   → skep een met die besigheid se e-posadres (nie jou persoonlike een nie).
2. **Skakel die Google Ads API aan** in die Google Cloud-projek: Cloud Console
   → APIs & Services → Library → "Google Ads API" → Enable.
3. **Doen die handelsmerk-verifikasie** van die projek: Cloud Console →
   Google Auth Platform → Branding → vul die app se naam, logo, webwerf,
   privaatheidsbladsy en terme in → stuur vir verifikasie. Dit neem 'n paar
   dae.
4. **Vra vir "Basic access"** vir die Google Ads API op daai projek (in die
   Cloud Console se Google Ads API-bladsy). Die vorm vra wat jy gaan doen.
   Die antwoord (ek skryf dit saam met jou volledig in Engels):
   - *Wat:* sleutelwoordnavorsing vir klein besighede wat advertensies in
     FutureBox maak — idees, soekvolumes en geskatte koste per klik.
   - *Wie:* lede van FutureBox, op hulle eie versoek, een navraag op 'n
     slag. Ons plaas of verander **nie** advertensies vir hulle nie.
   - *Diens:* `KeywordPlanIdeaService` (en dalk `KeywordPlanService`).
5. **Wag vir goedkeuring.** Google kan vrae terugstuur; stuur dit vir my.
6. **Wanneer dit goedgekeur is,** sit ek dit in die Adverts-kamer: 'n
   "Wat soek mense?"-knoppie by stap 1, met die prys op die knoppie, en die
   sleutels gaan net in Vercel (nooit in die kode of 'n gesprek nie).

## Wat dit nie is nie

- Dit plaas nie advertensies op Google nie, en dit spandeer nie iemand se
  advertensiegeld nie. Dit is net navorsing.
- Die lede hoef nie self 'n Google Ads-rekening te hê nie; die navrae loop
  deur FutureBox se bestuurder-rekening.
