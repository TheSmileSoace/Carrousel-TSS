#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Montage B-roll — The Smile Space
================================

Assemble automatiquement des rushes vidéo en un B-roll monté, prêt pour les
réseaux sociaux (Reels / TikTok / feed).

Principe : tu déposes tes rushes dans un dossier, tu lances le script, il :
  1. sélectionne un segment de chaque rush (durée réglable) ;
  2. recadre chaque segment au format cible (9:16 par défaut) sans déformation ;
  3. enchaîne les segments (coupe franche ou fondu enchaîné) ;
  4. ajoute éventuellement une musique de fond (avec fondu de sortie) ;
  5. exporte un unique fichier .mp4 monté.

Aucune installation d'ffmpeg n'est requise : le binaire fourni par le paquet
Python « imageio-ffmpeg » est utilisé automatiquement. Si un ffmpeg système est
présent, il est également accepté.

Exemples
--------
Montage vertical basique de tous les rushes du dossier ./rushes :
    python montage/montage_broll.py --input rushes --output broll.mp4

Fondu enchaîné de 0,5 s, 3 s par plan, format carré, musique de fond :
    python montage/montage_broll.py -i rushes -o broll.mp4 \
        --format 1x1 --clip-duration 3 --transition 0.5 --music musique.mp3

Limiter la durée finale à 20 s et couper les 2 premières secondes de chaque rush :
    python montage/montage_broll.py -i rushes -o broll.mp4 \
        --total-duration 20 --start-offset 2
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import random

# Extensions de fichiers vidéo reconnues comme rushes.
VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm", ".mpg", ".mpeg", ".mts", ".m2ts"}

# Formats cibles : nom -> (largeur, hauteur).
FORMATS = {
    "9x16": (1080, 1920),   # Reels / TikTok / Stories (défaut)
    "1x1": (1080, 1080),    # feed Instagram carré
    "16x9": (1920, 1080),   # YouTube / paysage / salle d'attente
    "4x5": (1080, 1350),    # feed portrait (identique aux carrousels TSS)
}


def find_ffmpeg() -> str:
    """Renvoie le chemin d'un exécutable ffmpeg utilisable."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:  # pragma: no cover - dépend de l'environnement
        sys.exit(
            "ffmpeg introuvable. Installe-le (apt install ffmpeg) ou le paquet "
            f"Python : pip install imageio-ffmpeg. Détail : {exc}"
        )


def probe_duration(ffmpeg: str, path: str) -> float | None:
    """Durée du fichier en secondes, lue depuis la sortie de ffmpeg.

    On n'utilise pas ffprobe (absent du paquet imageio-ffmpeg). On lit la ligne
    « Duration: HH:MM:SS.ss » que ffmpeg écrit sur stderr.
    """
    proc = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", proc.stderr)
    if not match:
        return None
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def list_rushes(input_dir: str) -> list[str]:
    """Liste triée des rushes du dossier (récursif)."""
    files = []
    for root, _dirs, names in os.walk(input_dir):
        for name in names:
            if os.path.splitext(name)[1].lower() in VIDEO_EXTS:
                files.append(os.path.join(root, name))
    files.sort()
    return files


def build_filtergraph(
    n_clips: int,
    width: int,
    height: int,
    clip_dur: float,
    start_offset: float,
    transition: float,
    fps: int,
    has_music: bool,
) -> tuple[str, str, float]:
    """Construit le filter_complex ffmpeg.

    Renvoie (filtergraph, label_video_final, duree_totale_estimee).
    """
    parts = []
    # Normalisation de chaque segment : découpe, recadrage « cover », fps, format.
    for i in range(n_clips):
        parts.append(
            f"[{i}:v]"
            f"trim=start={start_offset:.3f}:duration={clip_dur:.3f},"
            f"setpts=PTS-STARTPTS,"
            f"scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},"
            f"setsar=1,fps={fps},format=yuv420p"
            f"[v{i}]"
        )

    if transition > 0 and n_clips > 1:
        # Chaîne de fondus enchaînés (xfade).
        prev = "v0"
        total = clip_dur
        for i in range(1, n_clips):
            offset = total - transition
            out = f"x{i}"
            parts.append(
                f"[{prev}][v{i}]"
                f"xfade=transition=fade:duration={transition:.3f}:offset={offset:.3f}"
                f"[{out}]"
            )
            prev = out
            total = total + clip_dur - transition
        video_label = prev
    else:
        # Coupes franches : simple concaténation.
        concat_inputs = "".join(f"[v{i}]" for i in range(n_clips))
        parts.append(f"{concat_inputs}concat=n={n_clips}:v=1:a=0[vout]")
        video_label = "vout"
        total = clip_dur * n_clips

    if has_music:
        # La musique est le dernier input. On la coupe à la durée du montage
        # et on ajoute un fondu de sortie d'1 s.
        music_idx = n_clips
        fade_start = max(0.0, total - 1.0)
        parts.append(
            f"[{music_idx}:a]"
            f"atrim=0:{total:.3f},asetpts=PTS-STARTPTS,"
            f"afade=t=out:st={fade_start:.3f}:d=1"
            f"[aout]"
        )

    return ";".join(parts), video_label, total


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Assemble des rushes en un B-roll monté (The Smile Space).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("-i", "--input", required=True,
                        help="Dossier contenant les rushes.")
    parser.add_argument("-o", "--output", default="broll.mp4",
                        help="Fichier de sortie (.mp4).")
    parser.add_argument("-f", "--format", default="9x16", choices=sorted(FORMATS),
                        help="Format/ratio de sortie.")
    parser.add_argument("--clip-duration", type=float, default=3.0,
                        help="Durée (s) prise sur chaque rush.")
    parser.add_argument("--start-offset", type=float, default=0.0,
                        help="Secondes ignorées au début de chaque rush.")
    parser.add_argument("--transition", type=float, default=0.0,
                        help="Durée (s) du fondu enchaîné entre plans. 0 = coupe franche.")
    parser.add_argument("--total-duration", type=float, default=None,
                        help="Durée max (s) du montage final. Coupe à la fin si dépassé.")
    parser.add_argument("--fps", type=int, default=30, help="Images par seconde.")
    parser.add_argument("--music", default=None,
                        help="Fichier audio de fond (mp3/m4a/wav). Optionnel.")
    parser.add_argument("--shuffle", action="store_true",
                        help="Mélange l'ordre des rushes (graine fixe, reproductible).")
    parser.add_argument("--limit", type=int, default=None,
                        help="Nombre max de rushes à utiliser.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Affiche la commande ffmpeg sans l'exécuter.")
    args = parser.parse_args()

    if not os.path.isdir(args.input):
        sys.exit(f"Dossier de rushes introuvable : {args.input}")

    ffmpeg = find_ffmpeg()
    rushes = list_rushes(args.input)
    if not rushes:
        sys.exit(f"Aucun rush vidéo trouvé dans {args.input} "
                 f"(extensions : {', '.join(sorted(VIDEO_EXTS))}).")

    if args.shuffle:
        random.Random(42).shuffle(rushes)
    if args.limit:
        rushes = rushes[: args.limit]

    width, height = FORMATS[args.format]

    # On garde les rushes dont la durée permet le segment demandé.
    usable: list[str] = []
    for path in rushes:
        dur = probe_duration(ffmpeg, path)
        if dur is None:
            print(f"  ! durée illisible, rush ignoré : {os.path.basename(path)}")
            continue
        if dur <= args.start_offset + 0.2:
            print(f"  ! trop court (< start-offset), ignoré : {os.path.basename(path)}")
            continue
        usable.append(path)

    if not usable:
        sys.exit("Aucun rush exploitable après vérification des durées.")

    print(f"Rushes retenus : {len(usable)} | format {args.format} "
          f"({width}x{height}) | {args.clip_duration}s/plan "
          f"| transition {args.transition}s")

    filtergraph, vlabel, total = build_filtergraph(
        n_clips=len(usable),
        width=width,
        height=height,
        clip_dur=args.clip_duration,
        start_offset=args.start_offset,
        transition=args.transition,
        fps=args.fps,
        has_music=bool(args.music),
    )

    cmd = [ffmpeg, "-y", "-hide_banner"]
    for path in usable:
        cmd += ["-i", path]
    if args.music:
        # -stream_loop -1 : la musique boucle si elle est plus courte que le montage.
        cmd += ["-stream_loop", "-1", "-i", args.music]

    cmd += ["-filter_complex", filtergraph, "-map", f"[{vlabel}]"]
    if args.music:
        cmd += ["-map", "[aout]", "-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-an"]  # B-roll sans son (destiné à recouvrir une voix-off)

    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    if args.total_duration:
        cmd += ["-t", str(args.total_duration)]
    cmd += [args.output]

    print(f"Durée estimée du montage : {total:.1f}s"
          + (f" (coupée à {args.total_duration}s)" if args.total_duration else ""))

    if args.dry_run:
        print("\nCommande ffmpeg :\n" + " ".join(cmd))
        return 0

    proc = subprocess.run(cmd)
    if proc.returncode != 0:
        sys.exit(f"ffmpeg a échoué (code {proc.returncode}).")

    print(f"\n✅ B-roll monté : {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
