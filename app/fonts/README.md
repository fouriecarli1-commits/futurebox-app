# The faces, served from here

Seven families, the same woff2 files Google Fonts serves, kept in the
repository so that a build asks nothing of Google's servers. Twice on 11 and
12 October 2026 a CI build died on the runner's fetch of one of them —
"next/font/google queries have exactly one entry" — and a Vercel build can die
the same way. `app/layout.tsx` and `app/lib/postfaces.ts` load these through
`next/font/local`.

All seven are under the SIL Open Font License, Version 1.1 — the text is in
`OFL.txt` beside this file, which the licence asks to travel with the fonts.
The copyright lines, from each family's own licence file:

| Files | Family | Copyright |
|---|---|---|
| `fredoka-*` | Fredoka (variable, 300–700) | Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One) |
| `inter-*` | Inter (variable, 100–900) | Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter) |
| `playfair-*` | Playfair Display (variable, 400–900) | Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name "Playfair Display" |
| `baloo2-*` | Baloo 2 (variable, 400–800) | Copyright 2019 The Baloo 2 Project Authors (https://github.com/EkType/Baloo2) |
| `caveat-*` | Caveat (variable, 400–700) | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) |
| `anton-*` | Anton (400) | Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git) |
| `courierprime-*` | Courier Prime (700) | Copyright 2015 The Courier Prime Project Authors (https://github.com/quoteunquoteapps/CourierPrime) |

`latin` and `latin-ext` subsets only, which is what the app asked Google for:
Afrikaans sits inside them. To update a family, fetch the css2 stylesheet
for it with a browser user agent, take the `latin` and `latin-ext` `src`
addresses, and replace the files — the weights above are the ranges each
variable file carries.
