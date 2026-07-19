# Carrousel-TSS — Générateur de carrousels Instagram

Générateur de carrousels Instagram **1080 × 1350** pour **The Smile Space**,
à partir d'un fichier JSON (`bibliotheque_carrousels.carrousels[]`).

Chaque carrousel produit **7 slides PNG** + un fichier `legende.txt` prêt à coller.

## Aperçu des 7 types de slides

| # | type                  | rendu |
|---|-----------------------|-------|
| 1 | `accroche`            | Couverture pleine couleur marque, gros titre + sous-titre, série en eyebrow |
| 2 | `patient_voit`        | Badge **CE QUE TU VOIS**, fond clair, grande zone `PHOTO PATIENT` |
| 3 | `ortho_voit`          | Badge **CE QUE JE VOIS** (accent), zone `IMAGE CLINIQUE / RADIO` |
| 4 | `raisonnement`        | Slide texte épurée, filet **accent** |
| 5 | `pourquoi_traitement` | Slide texte épurée, liseré **marque** (bascule « solution ») |
| 6 | `resultat`            | Badge **LE RÉSULTAT**, deux cadres **AVANT / APRÈS** |
| 7 | `lecon_cta`           | Clôture couleur marque, leçon + `Écris <MOT_CLE>` en évidence |

Communs à toutes : numéro `n/7`, rangée de 7 points de progression, pied de page
(logo ou « The Smile Space » + `@thesmilespace`), marges ~90 px.

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

- couleurs (marque `#1F3A5F`, accent `#2C7A7B`, fond clair, texte foncé) ;
- polices (Poppins pour les titres, Inter pour les textes — embarquées en
  base64 dans `assets/fonts/fonts.css`, aucun accès réseau nécessaire au rendu) ;
- handle, nom de marque, chemin du logo.

### Logo

Dépose ton logo dans **`assets/logo.png`** (ou `.svg` / `.jpg`, ajuste `config.js`).
En son absence, « The Smile Space » est affiché en pied de page.

### Données

Le script lit `carrousels.json` s'il existe, sinon
`20 carrousels orthodontie The Smile Space v3 diagnostic.json`
(liste modifiable dans `config.js` → `dataFiles`).

## Structure du projet

```
config.js      # identité de marque (couleurs, polices, logo, format)
template.js    # gabarit HTML/CSS unique, adapté selon slide.type
render.js      # charge le JSON, pilote Playwright, capture les PNG
assets/fonts/  # Poppins + Inter embarquées (fonts.css) + woff2
sortie/        # images générées
```
