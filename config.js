// =====================================================================
//  IDENTITÉ DE MARQUE — The Smile Space
//  👉 Modifie librement ces valeurs pour ajuster la charte graphique.
// =====================================================================
module.exports = {
  // Fichier source (bibliotheque_carrousels.carrousels[])
  // On accepte le nom "canonique" ou le fichier livré.
  dataFiles: [
    "carrousels.json",
    "bibliotheque_27_carrousels_TU_final_The_Smile_Space.json",
    "20 carrousels orthodontie The Smile Space v3 diagnostic.json",
  ],

  // Les zones image sont pilotées par des marqueurs dans le texte des slides :
  //   [PHOTO PATIENT] · [IMAGE CLINIQUE / RADIO] · [AVANT] [APRÈS] · [SCHÉMA — …]
  // → un cadre vide légendé est dessiné, le reste du texte devient la légende.
  // (Aucun marqueur = tout en texte.)

  // Dossier de sortie
  outDir: "sortie",

  // Compte / signature
  handle: "@the_smile_space",
  practitioner: "Dr. Linos Tsague", // nom affiché au pied de page, à côté du logo
  locations: ["Mons", "Soignies"], // villes des cabinets (pied de page, à droite) — [] pour masquer

  // Bloc de contact ajouté au bas de chaque legende.txt (caption Instagram, pas sur l'image).
  contact: [
    "📍 The Smile Space — Orthodontie · Dr. Linos Tsague",
    "Soignies : 23 boulevard Roosevelt, 7060 Soignies · 065 38 01 55 · contact@thesmilespace.be",
    "Mons : 2A rue des Archers, 7000 Mons · 065 14 30 16 · mons@thesmilespace.be",
  ],
  brandName: "The Smile Space",
  logo: "assets/logo.png", // version foncée (fonds clairs) — sinon brandName
  logoLight: "assets/logo-light.png", // version claire (fonds sombres : hook/renversement/cta)

  // Palette — dérivée du logo « Le Cabinet Orthodontie »
  // (anthracite chaud + or champagne, sur crème/ivoire)
  colors: {
    brand: "#3A3733", // couleur principale (anthracite chaud du tracé)
    accent: "#C3A46E", // couleur accent (or champagne des lettres)
    light: "#FAF7F1", // fond clair (ivoire/crème)
    dark: "#2B2926", // texte foncé (presque-noir chaud)
    // dérivés utilitaires
    onBrand: "#FFFFFF",
    muted: "rgba(43,41,38,0.55)",
    placeholder: "#ECE6DC", // gris chaud pour zones image
    placeholderText: "#B0A794",
    // teinte de fond du dégradé de couverture (variante plus sombre de brand)
    brandDeep: "#2A2723",
  },

  // Polices (embarquées en base64 dans assets/fonts/fonts.css)
  fonts: {
    title: '"Poppins", "Segoe UI", system-ui, sans-serif',
    body: '"Inter", "Segoe UI", system-ui, sans-serif',
  },

  // Format cible (peut être surchargé par le format du JSON)
  format: { largeur: 1080, hauteur: 1350 },

  // Rendu
  deviceScaleFactor: 2,
};
