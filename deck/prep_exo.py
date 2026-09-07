#!/usr/bin/env python3
# =====================================================================
#  prep_exo.py — Préparation standard des photos EXO-buccales (tous cas)
#  Pour chaque cas : recadrage homogène (hauteur de tête normalisée +
#  visage centré, marges symétriques) et, sur les vues de FACE,
#  alignement de la ligne bipupillaire à l'horizontale (rotation).
#  Produit aussi un détourage transparent de la face-sourire (couverture).
#
#  Usage :
#    python3 deck/prep_exo.py <dossier_entree> <dossier_sortie> [--cutout]
#  Les fichiers d'entrée sont reconnus par mots-clés dans le nom :
#    "face"/"profil", "gauche"/"droit", "sourire".
#  Sorties : face.jpg, face_sourire.jpg, profil_droit(.._sourire).jpg …
#            + face_sourire_cutout.png si --cutout
# =====================================================================
import sys, os, glob, math
import numpy as np
from PIL import Image
import cv2

ASPECT = 0.78      # largeur/hauteur du cadre de sortie
HEAD_FRAC = 0.60   # hauteur de tête / hauteur du cadre
TOP_FRAC = 0.18    # marge cheveux-haut / hauteur du cadre
BG_DIST = 42       # seuil distance-couleur sujet vs fond

_H = cv2.data.haarcascades
_FC = cv2.CascadeClassifier(_H + "haarcascade_frontalface_alt2.xml")
_EC = cv2.CascadeClassifier(_H + "haarcascade_eye.xml")
_LC = cv2.CascadeClassifier(_H + "haarcascade_lefteye_2splits.xml")
_RC = cv2.CascadeClassifier(_H + "haarcascade_righteye_2splits.xml")


def _bg_color(a):
    return np.median(a[:80].reshape(-1, 3), axis=0)


def _submask(a):
    d = np.sqrt(((a - _bg_color(a)) ** 2).sum(2))
    return d > BG_DIST


def eye_angle(im_bgr):
    """Angle (deg) de la ligne bipupillaire, ou None."""
    g = cv2.cvtColor(im_bgr, cv2.COLOR_BGR2GRAY)
    fs = _FC.detectMultiScale(g, 1.1, 5, minSize=(250, 250))
    if len(fs) == 0:
        return None
    x, y, w, h = sorted(fs.tolist(), key=lambda r: r[2] * r[3])[-1]
    y0, y1 = y + int(0.20 * h), y + int(0.52 * h)
    band = g[y0:y1, x:x + w]
    mid = w // 2

    def best(cc, lo, hi):
        c = []
        for ex, ey, ew, eh in cc.detectMultiScale(band, 1.05, 3, minSize=(45, 45)):
            if lo <= ex + ew / 2 < hi:
                c.append((x + ex + ew / 2, y0 + ey + eh / 2, ew * eh))
        return max(c, key=lambda t: t[2]) if c else None

    L = best(_EC, 0, mid) or best(_LC, 0, mid)
    R = best(_EC, mid, w) or best(_RC, mid, w)
    if not (L and R):
        return None
    return math.degrees(math.atan2(R[1] - L[1], R[0] - L[0]))


def level_eyes(pil):
    """Fait pivoter l'image pour rendre la ligne bipupillaire horizontale.
    Essaie les deux sens et garde celui qui minimise l'angle résiduel."""
    a0 = eye_angle(cv2.cvtColor(np.asarray(pil), cv2.COLOR_RGB2BGR))
    if a0 is None or abs(a0) < 0.15:
        return pil, (a0 or 0.0)
    bg = tuple(int(v) for v in _bg_color(np.asarray(pil).astype(float)))
    best = None
    for sign in (1, -1):
        cand = pil.rotate(sign * a0, resample=Image.BICUBIC, expand=False, fillcolor=bg)
        res = eye_angle(cv2.cvtColor(np.asarray(cand), cv2.COLOR_RGB2BGR))
        res = 999.0 if res is None else abs(res)
        if best is None or res < best[0]:
            best = (res, cand, sign)
    return best[1], a0


def crop_head(pil):
    """Recadre : tête normalisée + centrée, marges symétriques."""
    a = np.asarray(pil).astype(float)
    bg = _bg_color(a)
    m = _submask(a)
    ys = np.where(m.any(1))[0]
    y0 = int(ys.min())
    w = m.sum(1)
    lo, hi = y0 + 520, min(y0 + 1150, len(w) - 1)
    neck = lo + int(np.argmin(w[lo:hi]))
    xs = np.where(m[y0:neck].any(0))[0]
    cx = int((xs.min() + xs.max()) / 2)
    headH = neck - y0
    ch = int(round(headH / HEAD_FRAC))
    cw = int(round(ch * ASPECT))
    x0 = int(round(cx - cw / 2))
    yy0 = int(round(y0 - TOP_FRAC * ch))
    canvas = Image.new("RGB", (cw, ch), tuple(bg.astype(int)))
    sx0, sy0 = max(0, x0), max(0, yy0)
    sx1, sy1 = min(pil.width, x0 + cw), min(pil.height, yy0 + ch)
    canvas.paste(pil.crop((sx0, sy0, sx1, sy1)), (sx0 - x0, sy0 - yy0))
    return canvas


def cutout(pil):
    """Détourage sur fond transparent (fond uni) avec bords adoucis."""
    a = np.asarray(pil.convert("RGB")).astype(float)
    d = np.sqrt(((a - _bg_color(a)) ** 2).sum(2))
    raw = (d > 44).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, k)
    raw = cv2.morphologyEx(raw, cv2.MORPH_OPEN, k)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(raw, 8)
    if n > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        raw = np.where(lab == big, 255, 0).astype(np.uint8)
    raw = cv2.erode(raw, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    alpha = cv2.GaussianBlur(raw, (0, 0), 1.8)
    out = np.dstack([np.asarray(pil.convert("RGB")), alpha])
    return Image.fromarray(out, "RGB A".replace(" ", ""))


def classify(name):
    n = name.lower()
    side = "gauche" if "gauche" in n else "droit"
    smile = "sourire" in n
    if "profil" in n:
        return f"profil_{side}" + ("_sourire" if smile else "")
    return "face" + ("_sourire" if smile else "")


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 deck/prep_exo.py <in_dir> <out_dir> [--cutout]")
        sys.exit(1)
    ind, outd = sys.argv[1], sys.argv[2]
    want_cut = "--cutout" in sys.argv[3:]
    os.makedirs(outd, exist_ok=True)
    files = [f for f in glob.glob(os.path.join(ind, "**", "*.*"), recursive=True)
             if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    for f in files:
        key = classify(os.path.basename(f))
        pil = Image.open(f).convert("RGB")
        info = ""
        if key.startswith("face"):
            pil, ang = level_eyes(pil)
            info = f" (bipupillaire {ang:+.2f}deg -> 0)"
        crop = crop_head(pil)
        crop.save(os.path.join(outd, key + ".jpg"), quality=95)
        print(f"{os.path.basename(f)} -> {key}.jpg{info}")
        if want_cut and key == "face_sourire":
            cutout(crop).save(os.path.join(outd, "face_sourire_cutout.png"))
            print("   + face_sourire_cutout.png")


if __name__ == "__main__":
    main()
