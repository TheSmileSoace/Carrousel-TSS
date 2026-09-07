# Carrousel-TSS — Générateur de carrousels Instagram

Générateur de carrousels Instagram **1080 × 1350** pour **The Smile Space**,
à partir d'un fichier JSON (`bibliotheque_carrousels.carrousels[]`).

Le gabarit est **piloté par le rôle de chaque slide** — il s'adapte donc à un
nombre de slides variable (**7 ou 8**) et à un grand nombre de `type` différents.

## Rôles de slide

| rôle | déclenché par | rendu |
|------|---------------|-------|
| **couverture** | `type: hook` (1ʳᵉ slide) | Fond anthracite, gros titre + sous-titre, `sujet` en eyebrow |
| **contenu — texte** | tous les types « éditoriaux » | Kicker (libellé du type) + titre + texte, filet **or** (insight) ou **anthracite** (solution) |
| **contenu — photo** | types listés dans `config.photoTypes` (déf. `identification`) | Badge + titre + texte + zone `PHOTO PATIENT` |
| **clôture** | `type: cta` (dernière slide) | Fond anthracite, titre + `Écris <cta_conversion>` (mot-clé en or) + `cta_engagement` |

Les libellés de badge/kicker et la tonalité (or / anthracite) de chaque type sont
définis dans `TYPE_META` (fichier `template.js`) ; un type inconnu reçoit
automatiquement un libellé lisible et un filet or.

Communs à toutes : numéro `n/N`, rangée de `N` points de progression, pied de page
(logo + `@thesmilespace`), marges ~90 px.

## Installation

```bash
npm install
```

> Le navigateur Chromium de Playwright est requis. Si besoin :
> `npx playwright install chromium`
> (dans l'environnement managé, le binaire pré-installé est détecté automatiquement.)

## Rendu

```bash
node render.js                 # rend les 20 carrousels
node render.js TSS-ORTHO-001   # rend un (ou plusieurs) id précis
```

Relance simplement `node render.js` après chaque modification du JSON.

## Sortie

```
sortie/
  TSS-ORTHO-001/
    01.png … 07.png      # 1080×1350, deviceScaleFactor 2 → 2160×2700
    legende.txt          # légende + ligne vide + hashtags
  TSS-ORTHO-002/
  …
```

## Personnalisation

Toute l'identité de marque est dans **`config.js`** :

- couleurs dérivées du logo « Le Cabinet Orthodontie » — anthracite chaud
  `#3A3733`, or champagne `#C3A46E`, ivoire `#FAF7F1`, texte `#2B2926` ;
- polices (Poppins pour les titres, Inter pour les textes — embarquées en
  base64 dans `assets/fonts/fonts.css`, aucun accès réseau nécessaire au rendu) ;
- handle, nom de marque, chemin du logo.

### Logo

Le logo du cabinet est déjà en place dans **`assets/logo.png`** (affiché dans une
pastille blanche en pied de page, lisible sur fond clair comme sur fond anthracite).
Pour le remplacer, écrase ce fichier. En son absence, « The Smile Space » est
affiché en texte.

### Données

Le script lit le premier fichier existant de `config.js` → `dataFiles` :
`carrousels.json`, puis
`bibliotheque_27_carrousels_TU_final_The_Smile_Space.json` (source actuelle, 27
carrousels), puis l'ancien fichier 20 carrousels.

Chaque carrousel utilise : `sujet`, `angle`, `gabarit`, `cta_conversion` (le
mot-clé mis en avant sur la slide finale), `cta_engagement`, `legende`,
`hashtags`, et `slides[]` (`n`, `type`, `titre`, `texte`).

### Zones image (schéma v2.4)

Chaque slide porte un champ **`image`** que le générateur lit pour poser la zone
correspondante (placeholder légendé, à remplacer par la vraie image ensuite) :

| `image` | rendu |
|---------|-------|
| `null` | slide texte, aucune zone |
| `photo_patient` | cadre **PHOTO PATIENT** |
| `image_clinique_radio` | cadre **IMAGE CLINIQUE / RADIO** |
| `avant_apres` | double cadre **AVANT / APRÈS** |
| `schema:<légende>` | cadre **SCHÉMA** + la légende après `:` |

Les slides sombres (`hook`, `renversement`, `cta`) n'affichent jamais de zone image.

## Structure du projet

```
config.js      # identité de marque (couleurs, polices, logo, format)
template.js    # gabarit HTML/CSS unique, adapté selon slide.type
render.js      # charge le JSON, pilote Playwright, capture les PNG
assets/fonts/  # Poppins + Inter embarquées (fonts.css) + woff2
sortie/        # images générées
```
