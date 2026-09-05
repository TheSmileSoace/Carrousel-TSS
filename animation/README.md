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

---

# Animation 2 — Expansion maxillaire (MARPE) et tissus mous

Montre que l'élargissement transversal du maxillaire modifie le soutien des tissus
mous du tiers moyen. Message unique : **l'os bouge d'abord, les tissus suivent.**

## Fichiers
- `marpe_template.html` — source (CONFIG en tête : durées d'étape, amplitude d'expansion,
  opacité du calque tissus, marge basse vide, couleurs). Token `__LOGO_DATAURI__`.
- `marpe.html` — version autonome (logo embarqué).
- `export_marpe.js` — capture Playwright → MP4 1080×1920 30 fps **avec piste audio silencieuse** + still.

## Régénérer
```bash
python3 -c "import base64;t=open('animation/marpe_template.html').read();\
u='data:image/png;base64,'+base64.b64encode(open('assets/logo-light.png','rb').read()).decode();\
open('animation/marpe.html','w').write(t.replace('__LOGO_DATAURI__',u))"
node animation/export_marpe.js
```

## Sorties
- `sortie/reels/marpe_expansion_maxillaire.mp4` — Reel 1080×1920, ~21 s, boucle raccordée (1ʳᵉ = dernière image), piste audio silencieuse.
- `sortie/reels/expansion_maxillaire_etape3.png` — still étape 3 (base élargie) 1080×1350 pour le carrousel.

## Exactitude respectée
- Expansion **transversale** qui **s'atténue en remontant** (pivot haut sous-orbitaire) ; la **proéminence malaire ne bouge pas**.
- **L'os bouge d'abord, les tissus suivent** (le calque tissus est piloté avec un retard sur l'os).
- Effet tissulaire **discret** (para-nasal / sous-orbitaire), pas une transformation, aucun avant/après esthétique.
- Schéma stylisé, pas de visage photoréaliste. Marge basse de 300 px laissée vide (UI Instagram).
