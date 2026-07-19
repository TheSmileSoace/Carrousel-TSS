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
