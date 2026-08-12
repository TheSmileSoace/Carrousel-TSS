# Quiz vidéo Instagram — The Smile Space

Transforme une vidéo de quiz (avec texte incrusté) en un reel propre :
le texte d'origine est **flouté** (verre dépoli) et remplacé par des bandes
fines translucides on-brand (question + 4 réponses à l'horizontale).

## Utilisation
1. Édite le bloc `CONFIG` en tête de `build_quiz.js` : `question`, `answers`,
   `font` (`"poppins"` = charte, `"slab"` = Roboto Slab), `paneAlpha` (0.70),
   et la zone `blurZone` à flouter (position du texte incrusté).
2. Lance :
   ```bash
   node quiz/build_quiz.js chemin/vers/quiz.mp4 sortie/reels/quiz.mp4
   ```
   (nécessite : `npm i playwright` + `pip install imageio-ffmpeg`)

## Notes
- Idéal : partir d'une vidéo **sans texte incrusté** (calque texte désactivé),
  on peut alors baisser `paneAlpha` et supprimer le flou pour une netteté totale.
- Polices dans `assets/fonts/` (Poppins/Inter charte + RobotoSlab700.ttf).
