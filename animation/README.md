# Animation — Déplacement dentaire au niveau du LAD

Animation 2D schématique (SVG + JS) du déplacement orthodontique, pour un Reel vertical.

## Fichiers
- `ldp_template.html` — source (config en tête : durées, couleurs, épaisseur LAD, géométrie). Contient le token `__LOGO_DATAURI__`.
- `ldp.html` — version **autonome** (logo embarqué en base64), à ouvrir directement dans un navigateur pour prévisualiser.
- `export_ldp.js` — capture headless (Playwright) → assemblage MP4 (H.264) + still.

## Régénérer
```bash
# 1) reconstruire ldp.html depuis le template (injecte le logo)
python3 -c "import base64;t=open('animation/ldp_template.html').read();\
u='data:image/png;base64,'+base64.b64encode(open('assets/logo-light.png','rb').read()).decode();\
open('animation/ldp.html','w').write(t.replace('__LOGO_DATAURI__',u))"

# 2) exporter le MP4 + le still (nécessite: pip install playwright imageio-ffmpeg)
node animation/export_ldp.js
```

## Sorties
- `sortie/reels/ldp_deplacement_dentaire.mp4` — Reel 1080×1920, boucle 14 s, 30 fps.
- `sortie/reels/TSS-022_slide6_etape3.png` — image fixe de l'étape 3, 1080×1350 (version « nue » pour le carrousel TSS-022).

## Paramètres (dans `ldp_template.html` → `CONFIG`)
Durée, fps, bornes des 4 étapes, fondu de boucle, couleurs (charte), épaisseur du LAD
(`pdlWidth`, exagérée pour la lisibilité ; réel 0,15–0,25 mm), `pdlMin` (le LAD ne
s'écrase jamais à zéro), géométrie racine/couronne, `netShift` (déplacement net).

## Exactitude respectée
- C'est l'**os** qui se remodèle (parois qui migrent + ostéoclastes/ostéoblastes + os neuf/résorbé), la dent ne « glisse » pas.
- Le **LAD ne disparaît jamais** (épaisseur minimale garantie côté pression).
- La force reste **légère et continue** — aucune suggestion qu'augmenter la force accélère.
- Schéma clair : pas de sang, pas de gencive détaillée, pas de photoréalisme.
- Prévisualisation `?still=<sec>` (fige une frame) · `?bare=1` (sans le chrome du reel).
