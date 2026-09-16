/**
 * Wat elke maand loop, sonder ElevenLabs — een lys, twee lesers.
 *
 * Dit het in `costs-eleven.mts` gewoon, en daardie lêer skryf 'n dokument
 * sodra 'n mens dit invoer. `check-koste.mts` kon dit dus nie invoer om teen
 * te toets nie, en het in plaas daarvan net die TOTAAL van die bladsy se
 * reëls met die generator se totaal vergelyk.
 *
 * Op 16 September 2026 het dit presies die fout deurgelaat wat 'n mens
 * verwag: Vercel en Supabase se twee bedrae was tussen die bladsy en die
 * generator omgeruil. R320 en R400 tel albei kante op tot R720, so die toets
 * het groen gebly terwyl een bladsy die verkeerde bedrag teen die verkeerde
 * diens gedra het. Dieselfde dag het 'n tweede een uitgekom: dieselfde R64
 * het hier Resend geheet en daar GitHub.
 *
 * 'n Totaal wat klop is nie dieselfde ding as reëls wat klop nie. Die lys
 * staan nou hier, sonder newe-effekte, sodat albei lesers dieselfde een sien
 * en die toets naam vir naam kan vergelyk.
 */

/** Rand per dollar. Een plek, want elke dollarreël hang daaraan. */
export const RAND_PER_USD = 16;

export const FIXED_CORE: Record<string, number> = {
  'Anthropic (kopiloot)': 1500,
  'Supabase Pro': 400,
  'Vercel Pro': 320,
  /* Resend, R64 ($4) — die posbus wat uitnodigings, wagwoorde en
     kennisgewings stuur. Sien `app/lib/server/email.ts`.

     Dit het tot 16 September 2026 **GitHub** hier gestaan, teen dieselfde
     R64, terwyl `docs/MAANDELIKSE-KOSTE.md` nommer 5 al die tyd Resend gesê
     het. Die totaal was dus heeltyd reg en die naam heeltyd verkeerd, wat die
     soort fout is wat niks breek nie en alles laat twyfel: 'n mens kan nie
     sien of dit een reël met die verkeerde naam is of twee reëls waarvan een
     ontbreek nie.

     Carli het dit op 16 September beantwoord: "Resend is reg, GitHub is nie
     op die lys nie." GitHub kos haar niks. */
  Resend: 64,
  /* Kits.AI, $40 = R640. Sangstem-omskakeling, gekies 7 September 2026. Die
     een reël op hierdie lys wat 'n gat toemaak eerder as om iets te laat loop:
     dit is die enigste model wat sing. Sien `docs/MAANDELIKSE-KOSTE.md`. */
  'Kits.AI': 640,
  /* Zoho, R241,50 — BTW reeds ingesluit, want dit is wat op die staat staan
     eerder as 'n plakkerprys wat omgereken moet word. Bevestig deur Carli op
     8 September 2026.

     Dit was tot vandag op GEEN kostelys nie. Nie 'n som wat verkeerd was nie —
     'n reël wat glad nie bestaan het nie, en die soort wat 'n mens eers sien
     wanneer die bank dit trek. */
  Zoho: 241.5,
  /* Domeine en Spaceship, bygevoeg 8 September 2026 nadat Carli gesê het
     "dit is nie net dit nie, dit is domains".

     AANNAME, en dit staan hier omdat dit geld raak: dit is TWEE reëls, nie
     een nie. Sy het hulle met 'n "en" tussenin genoem, wat hulle apart maak.
     Spaceship is self 'n domeinregistrateur, so as die R168 se domeine BY
     Spaceship staan, tel ons dit twee keer en die rekening is R210,24 te
     hoog. Een woord van haar maak dit reg; sien `docs/MAANDELIKSE-KOSTE.md`,
     waar dieselfde vraag staan sodat dit nie hier begrawe lê nie. */
  Domeine: 168,
  /* $13,14 deur dieselfde koers as al die ander dollarreëls, eerder as 'n
     rand-bedrag hier ingetik: verander die koers en hierdie reël volg saam.
     'n Ingetikte R210,24 sou stilweg verouder. */
  Spaceship: 13.14 * RAND_PER_USD,
};
