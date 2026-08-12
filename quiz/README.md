# Maquette Quiz vidéo — The Smile Space

Modèle réutilisable pour transformer une vidéo verticale (1080×1920) en reel quiz
on-brand : en-tête « Le quiz ! » + logo en haut, question et options qui
apparaissent en fondu, verre dépoli derrière le texte, audio corrigé.

## Utilisation
1. Ouvre `build_quiz.js` et édite le bloc **CONFIG** :
   - `header` : titre en haut (pastille or) — `""` pour masquer.
   - `question` : la question.
   - `answers` : les 4 réponses `[["A","20"],...]`.
   - `anim` : timings d'apparition — `{question:0.5, options:2.0, dur:0.4}` (secondes).
   - `font` : `"poppins"` (charte) ou `"slab"` (Roboto Slab).
   - `logoTopH` : taille du logo en haut (px).
   - `paneAlpha` : opacité des bandes (0–1).
   - `qTop/qH`, `optsTop/optsH`… : position/hauteur des bandes si besoin.
2. Lance :
   ```bash
   node quiz/build_quiz.js chemin/vers/rush.mp4 sortie/reels/mon_quiz.mp4
   ```
   Prérequis : `npm i playwright` + `pip install imageio-ffmpeg`.

## Réglages « signature » (déjà appliqués)
- Vidéo source **sans texte incrusté** (calque texte désactivé à l'export).
- Logo **clair en haut à gauche** (zone sûre IG/TikTok), en-tête « Le quiz ! » au centre.
- Question centrée ; réponses **horizontales** (sans révéler la bonne).
- Apparition animée : question à 0,5 s, options à 2 s.
- Audio **dupliqué sur les 2 canaux** (certaines sources n'ont le son qu'à droite),
  AAC 192k, `+faststart`.
- Format natif **1080×1920 / H.264 / AAC** — prêt pour Reels et TikTok.

## Bon à savoir
- L'algorithme ne pénalise pas ton propre logo ; il pénalise les **watermarks
  d'autres applis** (TikTok/CapCut) → exporte sans.
- Mets le **vote dans la description** (« Réponds A/B/C/D en commentaire »).
