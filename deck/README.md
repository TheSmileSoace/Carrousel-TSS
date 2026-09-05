# Decks conférence — identité The Smile Space (16:9)

Chaîne de rendu HTML→PNG→PPTX à la charte des carrousels (Poppins/Inter, or
champagne, anthracite), pied de page **The Smile Space + logo ULB** sans
coordonnées.

## Traitement standard des photos EXO (à appliquer à TOUS les cas)

`prep_exo.py` normalise les 4 vues extra-orales d'un cas :

- **recadrage homogène** : hauteur de tête normalisée + visage centré → marges
  symétriques identiques sur les 4 vues ;
- **alignement bipupillaire** : sur les vues de FACE, détection des pupilles
  (OpenCV) puis rotation pour remettre la ligne des yeux à l'horizontale ;
- **détourage** optionnel de la face-sourire (`--cutout`) sur fond transparent,
  pour la couverture.

```bash
# Entrée : dossier contenant les 4 photos (noms libres, reconnus par mots-clés
#          "face"/"profil", "gauche"/"droit", "sourire")
python3 deck/prep_exo.py <dossier_photos_du_cas> assets/carrousels/<cas>/exo --cutout
```

Sorties : `face.jpg`, `face_sourire.jpg`, `profil_droit(.._sourire).jpg`
(+ `face_sourire_cutout.png` avec `--cutout`).

Dépendances : `opencv-python-headless==4.10.0.84`, `Pillow`, `numpy`.

## Rendu d'un deck

```bash
node deck/render_mathys.js       # -> deck/out/NN.png (+ out/notes.json)
node deck/build_deck_pptx.js     # -> sortie/Cas_Mathys_TSS.pptx (16:9, notes conservées)
```

Pour un nouveau cas : dupliquer `render_mathys.js`, adapter le contenu des
slides et le dossier d'assets `assets/carrousels/<cas>/`.
