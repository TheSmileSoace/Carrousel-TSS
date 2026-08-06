# Montage B-roll — The Smile Space

Outil en ligne de commande pour assembler des **rushes vidéo** en un **B-roll
monté**, prêt pour les réseaux sociaux (Reels, TikTok, feed).

Tu déposes tes rushes dans un dossier, tu lances une commande, l'outil sort un
`.mp4` monté : chaque rush est recadré au bon format (sans déformation), un
segment est prélevé, puis tout est enchaîné (coupe franche ou fondu), avec une
musique de fond optionnelle.

## Prérequis

Python 3 et ffmpeg. Aucune installation d'ffmpeg n'est nécessaire si tu utilises
le binaire embarqué :

```bash
pip install imageio-ffmpeg
```

(Si un `ffmpeg` est déjà installé sur ta machine, il est utilisé en priorité.)

## Utilisation

1. Mets tes rushes dans un dossier, par exemple `rushes/` (formats reconnus :
   `.mp4 .mov .m4v .avi .mkv .webm .mpg .mpeg .mts .m2ts`).
2. Lance :

```bash
python montage/montage_broll.py --input rushes --output broll.mp4
```

### Exemples

Fondu enchaîné de 0,5 s, 3 s par plan, format carré, musique de fond :

```bash
python montage/montage_broll.py -i rushes -o broll.mp4 \
    --format 1x1 --clip-duration 3 --transition 0.5 --music musique.mp3
```

Montage vertical limité à 20 s, en ignorant les 2 premières secondes de chaque
rush (utile si tu démarres la caméra avant l'action) :

```bash
python montage/montage_broll.py -i rushes -o broll.mp4 \
    --total-duration 20 --start-offset 2
```

Prévisualiser la commande ffmpeg sans lancer l'encodage :

```bash
python montage/montage_broll.py -i rushes -o broll.mp4 --dry-run
```

## Options

| Option | Défaut | Rôle |
|---|---|---|
| `-i, --input` | *(requis)* | Dossier des rushes (parcouru récursivement). |
| `-o, --output` | `broll.mp4` | Fichier de sortie. |
| `-f, --format` | `9x16` | Ratio : `9x16` (Reels), `1x1`, `16x9`, `4x5` (feed portrait, comme les carrousels). |
| `--clip-duration` | `3.0` | Secondes prélevées sur chaque rush. |
| `--start-offset` | `0.0` | Secondes ignorées au début de chaque rush. |
| `--transition` | `0.0` | Durée du fondu enchaîné entre plans. `0` = coupe franche. |
| `--total-duration` | *(aucune)* | Durée maximale du montage final. |
| `--fps` | `30` | Images par seconde. |
| `--music` | *(aucune)* | Musique de fond. Boucle si trop courte, fondu de sortie d'1 s. |
| `--shuffle` | off | Mélange l'ordre des rushes (ordre reproductible). |
| `--limit` | *(aucune)* | Nombre maximum de rushes à utiliser. |
| `--dry-run` | off | Affiche la commande ffmpeg sans encoder. |

## Notes

- **Recadrage** : chaque rush est mis à l'échelle pour *couvrir* le cadre cible
  puis rogné au centre (`scale ... force_original_aspect_ratio=increase` + `crop`).
  Pas de bandes noires, pas de déformation.
- **Son** : par défaut le B-roll est **muet** (`-an`), pensé pour recouvrir une
  voix-off au montage final. Ajoute `--music` pour une piste de fond.
- **Ordre des plans** : les rushes sont pris par ordre alphabétique du nom de
  fichier. Préfixe-les (`01_`, `02_`, …) pour contrôler le montage, ou utilise
  `--shuffle`.
- Les rushes plus courts que `--start-offset` sont automatiquement ignorés.
