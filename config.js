// =====================================================================
//  IDENTITÉ DE MARQUE — The Smile Space
//  👉 Modifie librement ces valeurs pour ajuster la charte graphique.
// =====================================================================
module.exports = {
  // Fichier source (bibliotheque_carrousels.carrousels[])
  // On accepte le nom "canonique" ou le fichier livré.
  dataFiles: [
    "carrousels.json",
    "20 carrousels orthodontie The Smile Space v3 diagnostic.json",
  ],

  // Dossier de sortie
  outDir: "sortie",

  // Compte / signature
  handle: "@thesmilespace",
  brandName: "The Smile Space",
  logo: "assets/logo.png", // si absent → on affiche brandName en pied

  // Palette
  colors: {
    brand: "#1F3A5F", // couleur principale (marque)
    accent: "#2C7A7B", // couleur accent (clinique)
    light: "#F7FAFA", // fond clair
    dark: "#1A1A1A", // texte foncé
    // dérivés utilitaires
    onBrand: "#FFFFFF",
    muted: "rgba(26,26,26,0.55)",
    placeholder: "#E2E8E9",
    placeholderText: "#9AA6A6",
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
