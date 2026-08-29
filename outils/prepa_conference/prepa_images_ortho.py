#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
 prepa_images_ortho.py — Préparation d'images d'orthodontie pour conférence
===============================================================================

Traite EN UNE PASSE un dossier d'images (photos intra/exo, radios, tracés,
tableaux), adapte le traitement au TYPE d'image, ANONYMISE les fichiers de
sortie (code patient uniquement + purge des métadonnées) et exporte en haute
qualité, prêt à projeter.

------------------------------------------------------------------------------
 RÈGLE DE SÉCURITÉ ABSOLUE
------------------------------------------------------------------------------
 * Les fichiers d'origine ne sont JAMAIS modifiés : on LIT depuis --input et on
   ÉCRIT uniquement dans --output (dossier séparé, refusé s'il chevauche input).
 * Le script ne tourne que si vous confirmez explicitement que --input est une
   SÉLECTION DÉJÀ ANONYMISÉE (flag --confirme-selection-anonymisee).
 * Le NOM DU PATIENT est supposé être dans le NOM DU DOSSIER, pas dans les
   fichiers. Les fichiers de sortie ne portent QUE le code patient (P1, P2, …).
 * Toutes les métadonnées (EXIF/IPTC/XMP) sont purgées à l'export (ré-encodage
   pixel + passe exiftool si disponible).
 * Un manifest.csv (origine -> sortie) est écrit en local pour la traçabilité.

------------------------------------------------------------------------------
 RÈGLE ÉTHIQUE (codée dans les traitements)
------------------------------------------------------------------------------
 Autorisé   : recadrer, ajuster expo / balance des blancs / contraste,
              atténuer de légers reflets de salive, uniformiser le fond.
 INTERDIT   : modifier le contenu diagnostique (retoucher une dent, une suture,
              exagérer une correction). Aucun de ces traitements ne déforme la
              géométrie ni n'invente de contenu.

------------------------------------------------------------------------------
 DÉPENDANCES
------------------------------------------------------------------------------
   pip install pillow numpy
   pip install opencv-python-headless        # optionnel (CLAHE, inpaint, fond)
   exiftool (binaire système)                # optionnel (purge métadonnées ++)

 Tout est FACULTATIF sauf Pillow + numpy : si OpenCV/exiftool manquent, le
 script bascule sur des solutions de repli et prévient dans les logs.

===============================================================================
"""

from __future__ import annotations

import argparse
import csv
import logging
import os
import re
import shutil
import sys
import unicodedata
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageOps, ImageFilter

# --- Dépendances optionnelles -------------------------------------------------
try:
    import cv2  # OpenCV : CLAHE, inpaint, floodFill
    _HAS_CV2 = True
except Exception:  # pragma: no cover
    cv2 = None
    _HAS_CV2 = False

try:
    from PIL import ImageCms  # profil sRGB
    _HAS_CMS = True
except Exception:  # pragma: no cover
    _HAS_CMS = False


# =============================================================================
#  1) PARAMÈTRES — VOS 3 DÉCISIONS (valeurs par défaut, surchargées en ligne
#     de commande). Modifiez ici pour un comportement par défaut différent.
# =============================================================================

PATIENT_CODE      = "P1"        # code anonyme pour CE dossier (jamais le nom !)
CROP_INTRA_SERRE  = False       # False = garde le cadrage clinique d'origine
                                # True  = recadrage auto serré sur l'arcade
RADIO_CONTRASTE   = "leger"     # "aucun" | "leger" (CLAHE doux) | "fort"
RETIRER_BORDS     = True        # recadre les bandes grises/noires des radios
FOND_NOIR_RADIO   = True        # met le pourtour des radios en noir (charte sombre)

# --- Réglages secondaires (rarement à toucher) -------------------------------
EXO_UNIFORM_FOND      = True    # uniformise DOUCEMENT le fond des portraits
EXO_FOND_CREME        = (250, 247, 241)   # teinte crème de la charte
INTRA_REDUIRE_REFLETS = True    # atténue de PETITS reflets de salive (conservateur)
JPEG_QUALITE          = 95      # export JPG haute qualité
GENERER_MONTAGES      = False   # montages "T0 | T1" par vue (option --montages)


# =============================================================================
#  2) OUTILS GÉNÉRAUX
# =============================================================================

log = logging.getLogger("prepa_ortho")


def sans_accents(s: str) -> str:
    """Minuscule + suppression des accents, pour comparer/normaliser."""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()


def slug(s: str) -> str:
    """Transforme un libellé en identifiant fichier propre : sans accents,
    espaces -> '_', caractères non alphanumériques retirés."""
    s = sans_accents(s)
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return re.sub(r"_+", "_", s).strip("_")


def as_float(img: Image.Image) -> np.ndarray:
    """Image PIL -> tableau float32 RGB dans [0, 255]."""
    return np.asarray(img.convert("RGB"), dtype=np.float32)


def as_uint8(arr: np.ndarray) -> np.ndarray:
    return np.clip(arr, 0, 255).astype(np.uint8)


def luminance(arr: np.ndarray) -> np.ndarray:
    """Luminance perceptuelle (Rec.601) d'un tableau RGB float."""
    return arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32)


# =============================================================================
#  3) SÉCURITÉ / ANONYMISATION
# =============================================================================

def verifier_securite(input_dir: str, output_dir: str, confirme: bool,
                      creer_sortie: bool = True) -> None:
    """Barrières anti-erreur avant tout traitement. Lève SystemExit si un
    invariant de sécurité est violé."""
    in_abs = os.path.abspath(input_dir)
    out_abs = os.path.abspath(output_dir)

    if not os.path.isdir(in_abs):
        raise SystemExit(f"[SÉCURITÉ] Dossier d'entrée introuvable : {in_abs}")

    if not confirme:
        raise SystemExit(
            "[SÉCURITÉ] Refus de démarrer.\n"
            "  Ce script ne doit tourner QUE sur une SÉLECTION DÉJÀ ANONYMISÉE\n"
            "  (jamais votre archive brute). Relancez avec le drapeau explicite :\n"
            "      --confirme-selection-anonymisee\n"
            "  en pointant --input sur le dossier de sélection anonymisée.")

    # input et output doivent être distincts et NON imbriqués (sinon on
    # risquerait de relire/écraser des sorties, voire de toucher l'entrée).
    if in_abs == out_abs:
        raise SystemExit("[SÉCURITÉ] --input et --output doivent être différents.")
    if out_abs.startswith(in_abs + os.sep):
        raise SystemExit("[SÉCURITÉ] --output ne doit pas être à l'intérieur de --input.")
    if in_abs.startswith(out_abs + os.sep):
        raise SystemExit("[SÉCURITÉ] --input ne doit pas être à l'intérieur de --output.")

    if creer_sortie:
        os.makedirs(out_abs, exist_ok=True)


def purger_metadonnees(chemin: str) -> None:
    """Belt-and-suspenders : le ré-encodage pixel a déjà retiré EXIF/IPTC/XMP,
    mais si exiftool est présent on le passe pour être certain (sur la COPIE de
    sortie uniquement)."""
    exe = shutil.which("exiftool")
    if not exe:
        return
    try:
        import subprocess
        subprocess.run(
            [exe, "-all=", "-overwrite_original", "-q", "-q", chemin],
            check=False,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    except Exception as e:  # pragma: no cover
        log.debug("exiftool indisponible/échec (%s) — ré-encodage seul.", e)


def _icc_srgb() -> bytes | None:
    """Retourne les octets d'un profil sRGB pour les JPG couleur (facultatif)."""
    if not _HAS_CMS:
        return None
    try:
        return ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    except Exception:  # pragma: no cover
        return None


def enregistrer_propre(arr_or_img, chemin: str, *, format_: str) -> None:
    """Écrit une image SANS métadonnées (image reconstruite depuis les pixels),
    puis purge via exiftool si dispo. `format_` = "jpg" ou "png"."""
    img = arr_or_img if isinstance(arr_or_img, Image.Image) else Image.fromarray(as_uint8(arr_or_img))
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    if format_ == "jpg":
        img = img.convert("RGB")
        kwargs = dict(quality=JPEG_QUALITE, subsampling="4:2:0", optimize=True)
        icc = _icc_srgb()
        if icc:
            kwargs["icc_profile"] = icc  # profil couleur (pas une métadonnée identifiante)
        img.save(chemin, "JPEG", **kwargs)
    else:  # png
        img.save(chemin, "PNG", optimize=True)
    purger_metadonnees(chemin)


# =============================================================================
#  4) ANALYSE DU NOM DE FICHIER
#     Format : "[Type]_[Vue]_-_[Phase]__[Date]__-_[N°].jpg"
#     Tolérant aux accents, espaces et variations mineures.
# =============================================================================

# Familles de type -> clé interne + slug de sortie
TYPES = {
    "intrabuccale":            ("intra",   "intra"),
    "intra buccale":           ("intra",   "intra"),
    "intra":                   ("intra",   "intra"),
    "exobuccale":              ("exo",     "exo"),
    "exo buccale":             ("exo",     "exo"),
    "exo":                     ("exo",     "exo"),
    "radio":                   ("radio",   "radio"),
    "radiographie":            ("radio",   "radio"),
    "tableau de mesures":      ("tableau", "tableau"),
    "tableau":                 ("tableau", "tableau"),
    "trace cephalometrique":   ("trace",   "trace"),
    "trace":                   ("trace",   "trace"),
    "cephalometrique":         ("trace",   "trace"),
}

# Regex principale, très permissive : les séparateurs "_-_" et "__" du gabarit
# sont reconnus mais on tolère des variantes ("_ - _", "  ", etc.).
_RE_NOM = re.compile(
    r"""^
    (?P<type>.+?)                # Type
    [\s_]*-[\s_]*|_              # séparateur avant vue... (géré en 2 temps ci-dessous)
    """,
    re.VERBOSE,
)


@dataclass
class Meta:
    type_cle: str          # "intra" | "exo" | "radio" | "tableau" | "trace"
    type_slug: str
    vue: str               # slug de la vue (ex. "profil_droit")
    phase_brute: str       # libellé d'origine ("Avant traitement 1")
    phase_t: str           # code dérivé ("T0", "T1", "Tfin", …)
    date: str              # "JJ-MM-AA" ou ""
    num: str               # numéro ou ""
    origine: str           # nom de fichier d'origine


def _detecter_type(txt: str) -> tuple[str, str] | None:
    """Retrouve la famille de type à partir du début du nom (tolérant)."""
    n = sans_accents(txt)
    # on teste les libellés les plus longs d'abord (ex. "tableau de mesures")
    for libelle in sorted(TYPES, key=len, reverse=True):
        if n.startswith(libelle):
            return TYPES[libelle]
    return None


def _phase_vers_t(phase_brute: str) -> str:
    """Dérive un code de phase stable : Avant -> T0, Après N -> T{N}, Fin -> Tfin."""
    p = sans_accents(phase_brute)
    if "avant" in p:
        return "T0"
    if "fin" in p:
        return "Tfin"
    if "apres" in p or "post" in p:
        m = re.search(r"(\d+)", p)
        return f"T{m.group(1)}" if m else "T1"
    # phase inconnue -> slug lisible, sans planter
    s = slug(phase_brute) or "phase"
    return "T_" + s


def parser_nom(nom_fichier: str) -> Meta | None:
    """Analyse un nom de fichier vers Meta, ou None si non reconnu."""
    stem, _ = os.path.splitext(nom_fichier)

    typ = _detecter_type(stem)
    if not typ:
        return None
    type_cle, type_slug = typ

    # On retire le libellé de type détecté, puis on découpe le reste.
    n = sans_accents(stem)
    # longueur du libellé type reconnu (le plus long qui matche)
    libelle = next(l for l in sorted(TYPES, key=len, reverse=True)
                   if n.startswith(l) and TYPES[l] == typ)
    reste = stem[len(libelle):]

    # Normalise les séparateurs "_-_" / " - " -> "|", "__" -> "|"
    norm = reste
    norm = re.sub(r"[\s_]*-[\s_]*", "|", norm)   # tiret entouré d'espaces/underscores
    norm = re.sub(r"_{2,}", "|", norm)           # doubles underscores
    norm = re.sub(r"\|{2,}", "|", norm)          # pipes multiples
    parts = [p.strip(" _") for p in norm.split("|") if p.strip(" _")]

    # parts attendus (souples) : [Vue, Phase, Date, N°]
    vue = parts[0] if len(parts) >= 1 else "vue"
    phase_brute = parts[1] if len(parts) >= 2 else "Avant traitement 1"
    date = ""
    num = ""
    for p in parts[2:]:
        if re.fullmatch(r"\d{2}-\d{2}-\d{2,4}", p):
            date = p
        elif re.fullmatch(r"\d+", p):
            num = p

    return Meta(
        type_cle=type_cle,
        type_slug=type_slug,
        vue=slug(vue),
        phase_brute=phase_brute,
        phase_t=_phase_vers_t(phase_brute),
        date=date,
        num=num,
        origine=nom_fichier,
    )


# =============================================================================
#  5) BRIQUES DE TRAITEMENT IMAGE
#     (aucune ne déforme la géométrie ni n'invente de contenu diagnostique)
# =============================================================================

def balance_gris_monde(arr: np.ndarray, force: float = 1.0) -> np.ndarray:
    """Balance des blancs "gray-world" : neutralise une dominante (les intra
    tirent vers le chaud). `force` in [0,1] pour doser (portraits = doux)."""
    moy = arr.reshape(-1, 3).mean(axis=0)
    gris = float(moy.mean())
    gains = np.where(moy > 1e-3, gris / moy, 1.0)
    gains = 1.0 + (gains - 1.0) * float(force)
    return arr * gains


def normaliser_expo(arr: np.ndarray, force: float = 1.0,
                    cible: float = 0.5, p_lo: float = 1.0, p_hi: float = 99.0) -> np.ndarray:
    """Normalisation d'exposition douce : léger étirement des niveaux
    (points noir/blanc sur percentiles robustes) + recentrage de la médiane
    vers `cible`. `force` mélange avec l'original pour rester naturel."""
    lum = luminance(arr) / 255.0
    lo = np.percentile(lum, p_lo)
    hi = np.percentile(lum, p_hi)
    if hi - lo < 1e-3:
        return arr
    # étirement linéaire doux
    etire = (arr / 255.0 - lo) / (hi - lo)
    etire = np.clip(etire, 0.0, 1.0)
    # recentrage gamma vers la cible (sur la médiane)
    med = float(np.median(np.clip((lum - lo) / (hi - lo), 0, 1)))
    if 0.05 < med < 0.95:
        gamma = np.log(cible) / np.log(med)
        gamma = float(np.clip(gamma, 0.6, 1.6))   # garde-fou : jamais brutal
        etire = np.power(etire, gamma)
    out = etire * 255.0
    return arr * (1.0 - force) + out * force


def nettete(img: Image.Image, percent: int = 80) -> Image.Image:
    """Rehaussement de netteté léger (unsharp mask)."""
    return img.filter(ImageFilter.UnsharpMask(radius=2.0, percent=percent, threshold=3))


def bbox_contenu(arr: np.ndarray, tol: float = 14.0, frac: float = 0.02,
                 max_trim: float = 0.45) -> tuple[int, int, int, int]:
    """Boîte englobante du "contenu" = pixels s'écartant du fond (estimé aux
    4 coins). Sert à retirer bandes grises/noires ou marges inutiles.
    `max_trim` limite le rognage pour ne jamais amputer l'image utile."""
    h, w = arr.shape[:2]
    coins = np.concatenate([
        arr[:8, :8].reshape(-1, 3), arr[:8, -8:].reshape(-1, 3),
        arr[-8:, :8].reshape(-1, 3), arr[-8:, -8:].reshape(-1, 3),
    ])
    fond = np.median(coins, axis=0)
    diff = np.abs(arr - fond).sum(axis=2)
    masque = diff > tol
    lignes = masque.mean(axis=1) > frac
    cols = masque.mean(axis=0) > frac
    if not lignes.any() or not cols.any():
        return 0, 0, w, h
    y0, y1 = np.argmax(lignes), h - np.argmax(lignes[::-1])
    x0, x1 = np.argmax(cols), w - np.argmax(cols[::-1])
    # garde-fous : ne pas rogner plus que max_trim de chaque côté
    y0 = min(y0, int(h * max_trim)); x0 = min(x0, int(w * max_trim))
    y1 = max(y1, int(h * (1 - max_trim))); x1 = max(x1, int(w * (1 - max_trim)))
    # petite marge de respiration
    m = max(2, int(0.005 * max(h, w)))
    return max(0, x0 - m), max(0, y0 - m), min(w, x1 + m), min(h, y1 + m)


def recadrer_bords(img: Image.Image, **kw) -> Image.Image:
    x0, y0, x1, y1 = bbox_contenu(as_float(img), **kw)
    if (x1 - x0) < img.width or (y1 - y0) < img.height:
        return img.crop((x0, y0, x1, y1))
    return img


def recadrage_serre_arcade(img: Image.Image) -> Image.Image:
    """Recadrage serré (heuristique) sur la zone dentaire : on cible les pixels
    clairs et peu saturés (émail) au centre de l'image. Conservateur, avec
    repli sur l'image d'origine si l'estimation est douteuse."""
    arr = as_float(img)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = arr.max(axis=2); mn = arr.min(axis=2)
    sat = np.where(mx > 1e-3, (mx - mn) / (mx + 1e-3), 0.0)
    clair = luminance(arr) / 255.0
    dents = (clair > 0.55) & (sat < 0.35)     # émail : clair et peu coloré
    if dents.mean() < 0.03:                    # trop peu -> on ne touche pas
        return img
    ys, xs = np.where(dents)
    y0, y1 = np.percentile(ys, 2), np.percentile(ys, 98)
    x0, x1 = np.percentile(xs, 2), np.percentile(xs, 98)
    # marge autour de l'arcade
    mh = 0.10 * (y1 - y0); mw = 0.08 * (x1 - x0)
    x0 = int(max(0, x0 - mw)); x1 = int(min(img.width, x1 + mw))
    y0 = int(max(0, y0 - mh)); y1 = int(min(img.height, y1 + mh))
    if (x1 - x0) < img.width * 0.4 or (y1 - y0) < img.height * 0.3:
        return img  # recadrage suspect -> repli
    return img.crop((x0, y0, x1, y1))


def attenuer_reflets_salive(img: Image.Image) -> Image.Image:
    """Atténue de PETITS reflets spéculaires (points de salive blancs et cramés)
    sans toucher au contenu : uniquement de minuscules taches très claires et
    désaturées, comblées par inpainting local. Nécessite OpenCV, sinon no-op."""
    if not _HAS_CV2:
        return img
    arr = np.asarray(img.convert("RGB"))
    hsv = cv2.cvtColor(arr, cv2.COLOR_RGB2HSV)
    s, v = hsv[..., 1], hsv[..., 2]
    speculaire = ((v > 245) & (s < 40)).astype(np.uint8) * 255
    # uniquement de très petites taches (reflets), pas de grandes zones
    n, lab, stats, _ = cv2.connectedComponentsWithStats(speculaire, 8)
    masque = np.zeros_like(speculaire)
    for i in range(1, n):
        aire = stats[i, cv2.CC_STAT_AREA]
        if aire <= max(30, arr.size // 200000):   # seuil bas = très petits points
            masque[lab == i] = 255
    if masque.max() == 0:
        return img
    masque = cv2.dilate(masque, np.ones((3, 3), np.uint8), iterations=1)
    out = cv2.inpaint(arr, masque, 3, cv2.INPAINT_TELEA)
    return Image.fromarray(out)


def masque_fond_depuis_coins(arr: np.ndarray, tol: float = 26.0) -> np.ndarray | None:
    """Masque du fond = région uniforme connectée aux bords (flood depuis les
    coins). Sert aux portraits : on ne touche QUE le fond, jamais le visage.
    Nécessite OpenCV ; renvoie None sinon."""
    if not _HAS_CV2:
        return None
    h, w = arr.shape[:2]
    img = as_uint8(arr)
    ff_mask = np.zeros((h + 2, w + 2), np.uint8)
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1)]
    for sx, sy in seeds:
        cv2.floodFill(img.copy(), ff_mask, (sx, sy), 255,
                      loDiff=(tol,) * 3, upDiff=(tol,) * 3,
                      flags=8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
    masque = ff_mask[1:-1, 1:-1]
    if masque.mean() < 5:      # quasi rien détecté -> pas fiable
        return None
    # adoucit les bords (anti-halo)
    masque = cv2.GaussianBlur(masque.astype(np.float32), (0, 0), sigmaX=max(h, w) / 200.0)
    return np.clip(masque / 255.0, 0, 1)


def uniformiser_fond_creme(img: Image.Image) -> Image.Image:
    """Uniformise DOUCEMENT le fond d'un portrait vers la teinte crème de la
    charte, avec transition adoucie (sans halo) et légère ombre portée. Ne
    modifie pas le visage (masque connecté aux bords, feathering)."""
    arr = as_float(img)
    masque = masque_fond_depuis_coins(arr)
    if masque is None:
        return img  # OpenCV absent ou fond non détecté -> on ne touche pas
    m = masque[..., None]
    creme = np.array(EXO_FOND_CREME, dtype=np.float32)
    # mélange partiel : on garde une part du fond réel pour rester naturel
    fond_liss = arr * 0.35 + creme * 0.65
    # légère ombre portée verticale pour du volume (pas de halo dur)
    h = arr.shape[0]
    grad = np.linspace(1.0, 0.90, h, dtype=np.float32)[:, None, None]
    fond_liss = fond_liss * grad
    out = arr * (1 - m) + fond_liss * m
    return Image.fromarray(as_uint8(out))


def clahe_gris(gray: np.ndarray, clip: float) -> np.ndarray:
    """CLAHE (contraste local adaptatif) sur niveaux de gris. Repli sur
    autocontrast PIL si OpenCV absent."""
    if _HAS_CV2:
        c = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
        return c.apply(gray.astype(np.uint8))
    # repli : étirement global doux
    pil = ImageOps.autocontrast(Image.fromarray(gray.astype(np.uint8)), cutoff=1)
    return np.asarray(pil)


def fond_radio_noir(gray: np.ndarray) -> np.ndarray:
    """Met le pourtour d'une radio en noir : région claire/uniforme connectée
    aux bords -> 0. Conservateur (n'affecte pas l'anatomie interne sombre)."""
    if not _HAS_CV2:
        # repli simple : les pixels du pourtour proches du fond des coins -> noir
        fond = np.median(np.concatenate([gray[:6].ravel(), gray[-6:].ravel(),
                                          gray[:, :6].ravel(), gray[:, -6:].ravel()]))
        if fond > 40:  # pourtour clair -> on l'assombrit
            bord = np.abs(gray.astype(int) - fond) < 22
            g = gray.copy(); g[bord] = 0
            return g
        return gray
    h, w = gray.shape
    ff = np.zeros((h + 2, w + 2), np.uint8)
    src = gray.copy()
    for sx, sy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        cv2.floodFill(src, ff, (sx, sy), 255, loDiff=20, upDiff=20,
                      flags=8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
    bord = ff[1:-1, 1:-1] > 0
    g = gray.copy(); g[bord] = 0
    return g


# =============================================================================
#  6) RECETTES PAR FAMILLE — chacune renvoie (image_traitée, format "jpg"/"png")
# =============================================================================

def traiter_intra(img: Image.Image) -> tuple[Image.Image, str]:
    arr = as_float(img)
    arr = balance_gris_monde(arr, force=0.9)          # WB franche (dominante chaude)
    arr = normaliser_expo(arr, force=0.8, cible=0.52)  # expo normalisée
    out = Image.fromarray(as_uint8(arr))
    if INTRA_REDUIRE_REFLETS:
        out = attenuer_reflets_salive(out)             # petits reflets de salive
    out = nettete(out, percent=85)                     # léger piqué
    if RETIRER_BORDS:
        out = recadrer_bords(out)                      # marges inutiles
    if CROP_INTRA_SERRE:
        out = recadrage_serre_arcade(out)              # serré sur l'arcade (option)
    return out, "jpg"


def traiter_exo(img: Image.Image) -> tuple[Image.Image, str]:
    arr = as_float(img)
    arr = balance_gris_monde(arr, force=0.35)          # WB DOUCE (préserve le teint)
    arr = normaliser_expo(arr, force=0.45, cible=0.55)  # expo douce
    out = Image.fromarray(as_uint8(arr))
    if EXO_UNIFORM_FOND:
        out = uniformiser_fond_creme(out)              # fond crème léger, sans halo
    # NB : aucune retouche des traits ni de la peau.
    return out, "jpg"


def traiter_radio(img: Image.Image) -> tuple[Image.Image, str]:
    gray = np.asarray(img.convert("L")).astype(np.uint8)   # niveaux de gris
    clip = {"aucun": None, "leger": 2.0, "fort": 4.5}.get(RADIO_CONTRASTE, 2.0)
    if clip is not None:
        gray = clahe_gris(gray, clip)
    g_img = Image.fromarray(gray)
    if RETIRER_BORDS:
        g_img = recadrer_bords(g_img, tol=10.0)            # bandes grises/noires
        gray = np.asarray(g_img)
    if FOND_NOIR_RADIO:
        gray = fond_radio_noir(gray)
    return Image.fromarray(gray), "png"


def traiter_tableau_trace(img: Image.Image) -> tuple[Image.Image, str]:
    # Captures / schémas : AUCUNE modif de niveaux ni de couleurs.
    out = recadrer_bords(img, tol=10.0) if RETIRER_BORDS else img
    return out.convert("RGB"), "png"


RECETTES = {
    "intra":   traiter_intra,
    "exo":     traiter_exo,
    "radio":   traiter_radio,
    "tableau": traiter_tableau_trace,
    "trace":   traiter_tableau_trace,
}

# Format de sortie par famille (utile aussi pour le --dry-run, sans traiter l'image)
FORMAT_PAR_TYPE = {"intra": "jpg", "exo": "jpg",
                   "radio": "png", "tableau": "png", "trace": "png"}


def construire_nom(compteur: dict[str, int], code: str, meta: "Meta", fmt: str) -> tuple[str, str]:
    """Nom de sortie normalisé (code seul) + chemin relatif CODE/Phase/Type.
    Gère les doublons de vue à une même phase (ajoute le n° ou un index)."""
    base = f"{code}_{meta.phase_t}_{meta.type_slug}_{meta.vue}"
    if base in compteur:
        compteur[base] += 1
        base = f"{base}_{meta.num or compteur[base]}"
    else:
        compteur[base] = 1
    nom = f"{base}.{fmt}"
    return nom, os.path.join(code, meta.phase_t, meta.type_slug, nom)


# =============================================================================
#  7) APPARIEMENT (même taille par vue) + MONTAGES
# =============================================================================

@dataclass
class Sortie:
    meta: Meta
    img: Image.Image
    format_: str
    nom_sortie: str = ""                 # ex. "P1_T0_intra_haut.jpg"
    chemin_rel: str = ""                 # ex. "P1/T0/intra/P1_T0_intra_haut.jpg"


def aligner_paires(sorties: list[Sortie]) -> None:
    """Pour chaque (type, vue) présent à plusieurs phases, met toutes les
    images à la MÊME hauteur (celle de la plus petite -> jamais d'agrandissement)
    afin d'aligner les paires avant/après et les montages."""
    groupes: dict[tuple[str, str], list[Sortie]] = {}
    for s in sorties:
        groupes.setdefault((s.meta.type_slug, s.meta.vue), []).append(s)
    for (typ, vue), grp in groupes.items():
        phases = {s.meta.phase_t for s in grp}
        if len(phases) < 2:
            continue
        h_cible = min(s.img.height for s in grp)           # jamais au-dessus du natif
        for s in grp:
            if s.img.height != h_cible:
                w = round(s.img.width * h_cible / s.img.height)
                s.img = s.img.resize((w, h_cible), Image.LANCZOS)
                log.info("Alignement %s/%s : %s -> hauteur %d",
                         typ, vue, s.meta.phase_t, h_cible)


def generer_montages(sorties: list[Sortie], out_dir: str, code: str) -> int:
    """Montages horizontaux 'T0 | T1 | …' par (type, vue), à hauteur identique."""
    from PIL import ImageDraw
    groupes: dict[tuple[str, str], list[Sortie]] = {}
    for s in sorties:
        groupes.setdefault((s.meta.type_slug, s.meta.vue), []).append(s)
    n = 0
    dossier = os.path.join(out_dir, code, "montages")
    for (typ, vue), grp in groupes.items():
        if len({s.meta.phase_t for s in grp}) < 2:
            continue
        grp = sorted(grp, key=lambda s: s.meta.phase_t)
        h = min(s.img.height for s in grp)
        panneaux = [s.img if s.img.height == h else
                    s.img.resize((round(s.img.width * h / s.img.height), h), Image.LANCZOS)
                    for s in grp]
        sep, bandeau = 16, 54
        W = sum(p.width for p in panneaux) + sep * (len(panneaux) - 1)
        canevas = Image.new("RGB", (W, h + bandeau), (250, 247, 241))
        d = ImageDraw.Draw(canevas)
        x = 0
        for s, p in zip(grp, panneaux):
            canevas.paste(p, (x, bandeau))
            d.text((x + 12, 14), s.meta.phase_t, fill=(58, 55, 51))
            x += p.width + sep
        chemin = os.path.join(dossier, f"{code}_{typ}_{vue}_montage.png")
        enregistrer_propre(canevas, chemin, format_="png")
        n += 1
    return n


# =============================================================================
#  8) PROGRAMME PRINCIPAL
# =============================================================================

EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp", ".webp"}


def lister_images(input_dir: str) -> list[str]:
    fichiers = []
    for racine, _, noms in os.walk(input_dir):
        for nom in noms:
            if os.path.splitext(nom)[1].lower() in EXTS:
                fichiers.append(os.path.join(racine, nom))
    return sorted(fichiers)


def traiter_dossier(input_dir: str, output_dir: str, code: str, dry_run: bool = False) -> None:
    fichiers = lister_images(input_dir)
    log.info("%d image(s) trouvée(s) dans %s", len(fichiers), input_dir)

    # --- Aperçu (--dry-run) : calcule les noms de sortie SANS rien écrire ------
    if dry_run:
        compteur: dict[str, int] = {}
        plan = ignores = 0
        for chemin in fichiers:
            nom = os.path.basename(chemin)
            meta = parser_nom(nom)
            if meta is None:
                ignores += 1
                log.info("PLAN  [ignoré, non reconnu]        <- %s", nom)
                continue
            _, rel = construire_nom(compteur, code, meta, FORMAT_PAR_TYPE[meta.type_cle])
            plan += 1
            log.info("PLAN  %-42s <- %s", rel, nom)
        log.info("PLAN  %d fichier(s) seraient produits, %d ignoré(s). (aucune écriture)",
                 plan, ignores)
        return

    sorties: list[Sortie] = []
    manifest_rows: list[dict] = []
    non_reconnus = 0

    for chemin in fichiers:
        nom = os.path.basename(chemin)
        try:
            meta = parser_nom(nom)
            if meta is None:
                non_reconnus += 1
                log.warning("NON RECONNU (ignoré, pas d'erreur) : %s", nom)
                manifest_rows.append(dict(origine=nom, sortie="", type="", phase="",
                                          vue="", statut="non_reconnu"))
                continue

            with Image.open(chemin) as im:
                im.load()
                img = ImageOps.exif_transpose(im)   # respecte l'orientation EXIF...
                img = img.convert("RGB")            # ...puis on repart des pixels (métadonnées larguées)

            recette = RECETTES[meta.type_cle]
            out_img, fmt = recette(img)

            sorties.append(Sortie(meta=meta, img=out_img, format_=fmt))
            log.info("OK  %-11s %-6s %-16s <- %s",
                     meta.type_slug, meta.phase_t, meta.vue, nom)

        except Exception as e:  # ne jamais planter sur un fichier isolé
            log.error("ÉCHEC sur %s : %s", nom, e)
            manifest_rows.append(dict(origine=nom, sortie="", type="", phase="",
                                      vue="", statut=f"erreur:{e}"))

    # Appariement des tailles (paires avant/après alignées)
    aligner_paires(sorties)

    # Nommage + écriture (arborescence CODE / Phase / Type)
    compteur: dict[str, int] = {}
    for s in sorties:
        nom_sortie, rel = construire_nom(compteur, code, s.meta, s.format_)
        chemin_abs = os.path.join(output_dir, rel)
        enregistrer_propre(s.img, chemin_abs, format_=s.format_)
        s.nom_sortie, s.chemin_rel = nom_sortie, rel
        manifest_rows.append(dict(origine=s.meta.origine, sortie=rel,
                                  type=s.meta.type_slug, phase=s.meta.phase_t,
                                  vue=s.meta.vue, statut="ok"))

    # Montages optionnels
    if GENERER_MONTAGES:
        nb = generer_montages(sorties, output_dir, code)
        log.info("%d montage(s) T0|T1 généré(s).", nb)

    # Manifest de traçabilité (local, sans nom : range sous le code patient)
    manifest = os.path.join(output_dir, code, "manifest.csv")
    os.makedirs(os.path.dirname(manifest), exist_ok=True)
    with open(manifest, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["origine", "sortie", "type",
                                          "phase", "vue", "statut"])
        w.writeheader()
        w.writerows(manifest_rows)

    log.info("Terminé : %d traitée(s), %d non reconnue(s). Manifest : %s",
             len(sorties), non_reconnus, manifest)


# =============================================================================
#  8bis) MODE LOT MULTI-PATIENTS
#       --input = dossier PARENT ; chaque sous-dossier = un patient.
#       Codes P1, P2, … assignés de façon STABLE (registre réutilisé) pour que
#       le même patient garde le même code d'une exécution à l'autre.
#       ⚠ Le registre associe NOM DE DOSSIER (donc nom patient) -> code :
#         il est écrit HORS du dossier de sortie et ne doit pas être diffusé.
# =============================================================================

def sous_dossiers_patients(parent: str) -> list[str]:
    return sorted(d for d in os.listdir(parent)
                  if os.path.isdir(os.path.join(parent, d)) and not d.startswith("."))


def charger_registre(chemin: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    if chemin and os.path.exists(chemin):
        with open(chemin, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row.get("dossier"):
                    mapping[row["dossier"]] = row["code"]
    return mapping


def sauver_registre(chemin: str, mapping: dict[str, str]) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(chemin)), exist_ok=True)
    with open(chemin, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["dossier", "code"])
        w.writeheader()
        for dossier, code in mapping.items():
            w.writerow({"dossier": dossier, "code": code})


def prochain_numero(mapping: dict[str, str], prefixe: str) -> int:
    nums = [int(m.group(1)) for c in mapping.values()
            if (m := re.fullmatch(re.escape(prefixe) + r"(\d+)", c))]
    return (max(nums) + 1) if nums else 1


def traiter_lot(parent: str, output_dir: str, prefixe: str, registre: str,
                dry_run: bool = False) -> None:
    """Traite chaque sous-dossier patient avec un code auto-assigné et stable."""
    mapping = charger_registre(registre)               # réutilise les codes connus
    n = prochain_numero(mapping, prefixe)
    dossiers = sous_dossiers_patients(parent)
    if not dossiers:
        raise SystemExit(f"[LOT] Aucun sous-dossier patient dans : {parent}")

    log.info("Mode LOT%s : %d dossier(s) patient. Registre : %s",
             " (aperçu)" if dry_run else "", len(dossiers), registre)
    for dossier in dossiers:
        if dossier in mapping:
            code = mapping[dossier]                     # code déjà attribué
        else:
            code = f"{prefixe}{n}"; mapping[dossier] = code; n += 1
        log.info("── Patient « %s » -> %s ──", dossier, code)
        traiter_dossier(os.path.join(parent, dossier), output_dir, code, dry_run=dry_run)

    if dry_run:
        log.info("APERÇU : aucun fichier ni registre écrit. Mapping prévu :")
        for dossier, code in mapping.items():
            log.info("   %s  ->  %s", code, dossier)
        return

    sauver_registre(registre, mapping)
    log.warning("Registre nom->code écrit : %s  (contient des NOMS : garder en "
                "local, NE PAS diffuser avec les images).", os.path.abspath(registre))


# =============================================================================
#  9) LIGNE DE COMMANDE
# =============================================================================

def construire_argparse() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Préparation anonymisée d'images d'orthodontie pour conférence.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument("--input", required=True,
                   help="Dossier de SÉLECTION DÉJÀ ANONYMISÉE (lu, jamais modifié).")
    p.add_argument("--output", required=True,
                   help="Dossier de sortie (séparé de --input).")
    p.add_argument("--code", default=PATIENT_CODE, help="Code patient anonyme.")
    p.add_argument("--confirme-selection-anonymisee", action="store_true",
                   dest="confirme",
                   help="OBLIGATOIRE : atteste que --input est une sélection anonymisée.")
    # surcharge des 3 décisions
    p.add_argument("--crop-intra-serre", action="store_true", default=None,
                   help="Recadrage auto serré sur l'arcade (intra).")
    p.add_argument("--radio-contraste", choices=["aucun", "leger", "fort"], default=None)
    grp = p.add_mutually_exclusive_group()
    grp.add_argument("--retirer-bords", dest="retirer_bords", action="store_true", default=None)
    grp.add_argument("--garder-bords", dest="retirer_bords", action="store_false")
    grp2 = p.add_mutually_exclusive_group()
    grp2.add_argument("--fond-noir-radio", dest="fond_noir", action="store_true", default=None)
    grp2.add_argument("--fond-radio-tel-quel", dest="fond_noir", action="store_false")
    p.add_argument("--montages", action="store_true", default=None,
                   help="Génère les montages T0|T1 par vue.")
    p.add_argument("--dry-run", action="store_true", dest="dry_run",
                   help="Aperçu : liste les sorties (et le mapping en --lot) SANS rien écrire.")
    # --- Mode lot multi-patients ---
    p.add_argument("--lot", action="store_true",
                   help="--input est un PARENT : chaque sous-dossier = 1 patient "
                        "(code auto P1, P2, …). Ignore --code.")
    p.add_argument("--prefixe-code", default="P",
                   help="Préfixe des codes auto en mode --lot.")
    p.add_argument("--registre", default=None,
                   help="Chemin du registre nom_dossier->code (défaut : "
                        "correspondance_patients.csv dans le dossier courant, "
                        "HORS du dossier de sortie). Contient des noms : à garder en local.")
    return p


def main(argv=None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(message)s")
    args = construire_argparse().parse_args(argv)

    # Surcharge des paramètres globaux (seulement si fournis en CLI)
    global CROP_INTRA_SERRE, RADIO_CONTRASTE, RETIRER_BORDS, FOND_NOIR_RADIO, GENERER_MONTAGES
    if args.crop_intra_serre is not None:  CROP_INTRA_SERRE = args.crop_intra_serre
    if args.radio_contraste is not None:   RADIO_CONTRASTE = args.radio_contraste
    if args.retirer_bords is not None:     RETIRER_BORDS = args.retirer_bords
    if args.fond_noir is not None:         FOND_NOIR_RADIO = args.fond_noir
    if args.montages is not None:          GENERER_MONTAGES = args.montages

    if not _HAS_CV2:
        log.warning("OpenCV absent : CLAHE/anti-reflets/fond crème en mode repli "
                    "ou désactivés. `pip install opencv-python-headless` recommandé.")

    verifier_securite(args.input, args.output, args.confirme, creer_sortie=not args.dry_run)

    if args.lot:
        # registre par défaut : HORS du dossier de sortie (dossier courant)
        registre = args.registre or os.path.join(os.getcwd(), "correspondance_patients.csv")
        traiter_lot(args.input, args.output, args.prefixe_code, registre, dry_run=args.dry_run)
    else:
        traiter_dossier(args.input, args.output, args.code, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
