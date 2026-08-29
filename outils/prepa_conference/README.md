# Préparation d'images d'orthodontie pour conférence

Script réutilisable qui traite **tout un dossier d'images en une passe**, adapte
le traitement au **type d'image**, **anonymise** les fichiers de sortie et
exporte en **haute qualité** prête à projeter.

> ⚠️ **Sécurité d'abord.** Le script ne modifie **jamais** les originaux : il
> lit `--input` et écrit uniquement dans `--output` (dossier séparé). Il refuse
> de démarrer sans le drapeau `--confirme-selection-anonymisee`, qui atteste que
> `--input` est une **sélection déjà anonymisée** (jamais l'archive brute).

## Installation

```bash
pip install pillow numpy
pip install opencv-python-headless      # optionnel mais recommandé (CLAHE, anti-reflets, fond)
# exiftool (binaire système) optionnel : purge des métadonnées « ceinture + bretelles »
#   macOS : brew install exiftool   |   Debian/Ubuntu : sudo apt install libimage-exiftool-perl
```

Sans OpenCV/exiftool, le script fonctionne quand même : il bascule sur des
solutions de repli et le signale dans les logs.

## Utilisation

```bash
python prepa_images_ortho.py \
    --input  "chemin/vers/selection_anonymisee" \
    --output "chemin/vers/sortie_conference" \
    --code   P1 \
    --confirme-selection-anonymisee
```

Windows (PowerShell) — exemple avec un dossier `Z:\MARPE` :

```powershell
python prepa_images_ortho.py `
    --input  "Z:\MARPE" `
    --output "Z:\Conference\MARPE_anonymise" `
    --code   P1 `
    --confirme-selection-anonymisee
```

> Rappel : `--input` doit pointer sur la **copie de sélection anonymisée**, pas
> sur votre archive d'origine. `--output` doit être **en dehors** de `--input`.

## Vos 3 décisions (paramètres)

Modifiables en tête de script **ou** en ligne de commande :

| Paramètre | Défaut | Effet |
|---|---|---|
| `--code` | `P1` | Code patient anonyme (seul identifiant dans les fichiers). |
| `--crop-intra-serre` | *(off)* | Recadrage auto serré sur l'arcade (intra). Sinon, cadrage clinique d'origine conservé. |
| `--radio-contraste {aucun,leger,fort}` | `leger` | `aucun` = neutralité radiologique ; `leger` = CLAHE doux ; `fort` = contraste marqué. |
| `--retirer-bords` / `--garder-bords` | retirer | Recadre les bandes grises/noires inutiles autour des radios. |
| `--fond-noir-radio` / `--fond-radio-tel-quel` | fond noir | Met le pourtour des radios en noir (charte sombre). |
| `--montages` | *(off)* | Génère aussi les montages « T0 \| T1 » par vue, à taille identique. |

## Nomenclature d'entrée attendue

```
[Type]_[Vue]_-_[Phase]__[Date]__-_[N°].jpg
```

- **Type** : `Intrabuccale` · `Exobuccale` · `Radio` · `Tableau de mesures` · `Tracé céphalométrique`
- **Vue** : `bas`, `haut`, `face`, `profil_droit`, `panoramique`, `bouche_ouverte`, …
- **Phase** : `Avant traitement 1`, `Après traitement 1`, `Fin de traitement`, …
- **Date** : `JJ-MM-AA`   ·   **N°** : entier

Le parseur est **tolérant** (accents, espaces, séparateurs variables). Tout
fichier non reconnu est **journalisé et ignoré** (jamais de plantage), et
apparaît dans le manifest avec le statut `non_reconnu`.

## Ce que produit le script

Arborescence triée `CODE / Phase / Type`, noms normalisés au **code patient
uniquement** :

```
sortie_conference/
├── P1/
│   ├── T0/
│   │   ├── intra/   P1_T0_intra_haut.jpg
│   │   ├── exo/     P1_T0_exo_face_sourire.jpg
│   │   └── radio/   P1_T0_radio_profil_droit.png
│   ├── T1/ …
│   └── montages/    P1_intra_haut_montage.png   (si --montages)
└── manifest.csv     (origine -> sortie, pour votre traçabilité)
```

- **Phases** dérivées : `Avant → T0`, `Après N → T{N}`, `Fin → Tfin`.
- Une même **vue** présente à plusieurs phases est mise à la **même taille**
  (jamais d'agrandissement au-delà du natif) pour aligner les paires avant/après.

## Traitements par famille

| Famille | Traitement | Export |
|---|---|---|
| **Intra-orales** | balance des blancs, exposition normalisée, léger piqué, atténuation de petits reflets de salive, recadrage bords (+ serré sur l'arcade si demandé), sRGB | JPG q95 |
| **Exo-orales** (portraits) | expo + balance des blancs **douces** (teint préservé), fond crème léger sans halo. **Aucune** retouche des traits/peau | JPG q95 |
| **Radios** | niveaux de gris, contraste selon `--radio-contraste`, recadrage bandes, fond noir | PNG |
| **Tableaux / Tracés** | captures/schémas : **aucune** modif de niveaux/couleurs, recadrage propre des bords | PNG |

## Règle éthique (appliquée dans le code)

- **Autorisé** : recadrer, ajuster expo / balance des blancs / contraste, ôter
  de légers reflets de salive, uniformiser le fond.
- **Interdit** : modifier le contenu diagnostique (retoucher une dent, une
  suture, exagérer une correction). Aucun traitement ne déforme la géométrie ni
  n'invente de contenu.

## Anonymisation & traçabilité

- Fichiers de sortie nommés **au seul code patient** (`P1`, `P2`, …).
- **Métadonnées purgées** : chaque sortie est ré-encodée depuis les pixels
  (EXIF/IPTC/XMP largués), puis nettoyée par `exiftool` si présent.
- `manifest.csv` (nom d'origine → nom de sortie) reste **en local** pour votre
  suivi — ne le diffusez pas avec les images.

## Idempotence & robustesse

- Relançable sans casse : mêmes entrées → mêmes sorties (écrasées proprement).
- Ne plante pas sur un fichier isolé : l'erreur est journalisée, le reste passe.
- N'agrandit jamais au-delà de la résolution native.
