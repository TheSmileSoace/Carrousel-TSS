// =====================================================================
//  GABARIT — une slide = 1080 x 1350
//  Un seul gabarit qui adapte son style selon slide.type.
// =====================================================================

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// "1. Ce que tu vois / ..." -> "Ce que tu vois / ..."
const cleanSerie = (s = "") => s.replace(/^\s*\d+\s*[\.\)]\s*/, "").trim();

// Libellés de badge fixes (indépendants du titre générique des données)
const BADGES = {
  patient_voit: "CE QUE TU VOIS",
  ortho_voit: "CE QUE JE VOIS",
  resultat: "LE RÉSULTAT",
};

// Rangée de 7 points de progression
function dots(activeIndex, total = 7) {
  let out = '<div class="dots">';
  for (let i = 0; i < total; i++) {
    out += `<span class="dot${i === activeIndex ? " on" : ""}"></span>`;
  }
  return out + "</div>";
}

// Pied de page commun (logo/marque + handle) + n/7 + dots
function footer({ n, total, index, cfg, logoDataUri, onBrand }) {
  const brandMark = logoDataUri
    ? `<img class="logo" src="${logoDataUri}" alt="${esc(cfg.brandName)}"/>`
    : `<span class="brandtext">${esc(cfg.brandName)}</span>`;
  return `
    <footer class="foot ${onBrand ? "on-brand" : ""}">
      <div class="foot-left">
        ${brandMark}
        <span class="handle">${esc(cfg.handle)}</span>
      </div>
      <div class="foot-right">
        ${dots(index, total)}
        <span class="pageno">${n}/${total}</span>
      </div>
    </footer>`;
}

// Zone image placeholder
function photoZone(label, extraClass = "") {
  return `<div class="photozone ${extraClass}"><span>${esc(label)}</span></div>`;
}

// Bloc corps selon le type
function bodyFor(type, { slide, carrousel, cfg }) {
  const titre = esc(slide.titre || "");
  const texte = esc(slide.texte || "");
  const badge = BADGES[type];

  switch (type) {
    case "accroche":
      return `
        <div class="eyebrow">${esc(cleanSerie(carrousel.serie))}</div>
        <div class="body body-cover">
          <h1 class="cover-title">${titre}</h1>
          <p class="cover-sub">${texte}</p>
        </div>`;

    case "patient_voit":
      return `
        <div class="badge badge-neutral">${badge}</div>
        <div class="body body-visual">
          <p class="statement">${texte}</p>
          ${photoZone("PHOTO PATIENT")}
        </div>`;

    case "ortho_voit":
      return `
        <div class="badge badge-accent">${badge}</div>
        <div class="body body-visual">
          <p class="statement">${texte}</p>
          ${photoZone("IMAGE CLINIQUE / RADIO", "clinique")}
        </div>`;

    case "raisonnement":
      return `
        <div class="body body-text rule-accent">
          <h2 class="text-title">${titre}</h2>
          <p class="text-para">${texte}</p>
        </div>`;

    case "pourquoi_traitement":
      return `
        <div class="body body-text rule-brand">
          <div class="switch-kicker">La solution</div>
          <h2 class="text-title">${titre}</h2>
          <p class="text-para">${texte}</p>
        </div>`;

    case "resultat":
      return `
        <div class="badge badge-accent">${badge}</div>
        <div class="body body-visual">
          <p class="statement">${texte}</p>
          <div class="beforeafter">
            <div class="ba-frame"><span>AVANT</span></div>
            <div class="ba-frame"><span>APRÈS</span></div>
          </div>
        </div>`;

    case "lecon_cta": {
      // Sépare la leçon de l'appel à l'action, sans réécrire les textes.
      const raw = slide.texte || "";
      const mot = carrousel.mot_cle || "";
      const idxEcris = raw.search(/[ÉE]cris/i);
      let lecon = raw;
      let ctaTail = ""; // texte après le mot-clé (ex. " en commentaire.")
      if (idxEcris >= 0) {
        lecon = raw.slice(0, idxEcris).trim();
        const after = raw.slice(idxEcris);
        const im = after.indexOf(mot);
        ctaTail = im >= 0 ? after.slice(im + mot.length).trim() : "";
      }
      const cta = `
        <div class="cta">
          <span class="cta-verb">Écris</span>
          <span class="cta-key">${esc(mot)}</span>
          ${ctaTail ? `<span class="cta-tail">${esc(ctaTail)}</span>` : ""}
        </div>`;
      return `
        <div class="eyebrow">${titre}</div>
        <div class="body body-cover">
          <h1 class="lesson-title">${esc(lecon)}</h1>
          ${cta}
        </div>`;
    }

    default:
      return `<div class="body body-text"><h2 class="text-title">${titre}</h2><p class="text-para">${texte}</p></div>`;
  }
}

// Gabarit complet d'une slide -> document HTML autonome
function slideHTML({ slide, carrousel, index, total, cfg, fontsCss, logoDataUri }) {
  const { largeur, hauteur } = cfg.format;
  const c = cfg.colors;
  const onBrandTypes = new Set(["accroche", "lecon_cta"]);
  const onBrand = onBrandTypes.has(slide.type);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
${fontsCss}

:root{
  --brand:${c.brand}; --accent:${c.accent}; --light:${c.light};
  --dark:${c.dark}; --onbrand:${c.onBrand}; --muted:${c.muted};
  --ph:${c.placeholder}; --pht:${c.placeholderText};
  --f-title:${cfg.fonts.title}; --f-body:${cfg.fonts.body};
}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${largeur}px;height:${hauteur}px;}
body{font-family:var(--f-body);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;}

.slide{
  position:relative;width:${largeur}px;height:${hauteur}px;overflow:hidden;
  padding:90px;display:flex;flex-direction:column;
  background:var(--light);color:var(--dark);
}
/* Couvertures pleine couleur marque */
.slide.type-accroche,.slide.type-lecon_cta{
  background:linear-gradient(160deg, var(--brand) 0%, #16293f 100%);
  color:var(--onbrand);
}

/* ---------- EYEBROW / SERIE ---------- */
.eyebrow{
  font-family:var(--f-title);font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;font-size:22px;opacity:.75;
}
.slide.type-accroche .eyebrow,.slide.type-lecon_cta .eyebrow{color:rgba(255,255,255,.7);}

/* ---------- BADGES ---------- */
.badge{
  align-self:flex-start;font-family:var(--f-title);font-weight:700;
  letter-spacing:.1em;text-transform:uppercase;font-size:24px;
  padding:16px 28px;border-radius:999px;
}
.badge-neutral{background:#EAF0F0;color:var(--brand);border:2px solid rgba(31,58,95,.15);}
.badge-accent{background:var(--accent);color:#fff;}

/* ---------- CORPS ---------- */
.body{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;}

/* Couverture (accroche) */
.body-cover{justify-content:center;gap:34px;}
.cover-title{
  font-family:var(--f-title);font-weight:700;font-size:92px;line-height:1.02;
  letter-spacing:-.02em;
}
.cover-sub{font-size:38px;line-height:1.4;opacity:.9;max-width:820px;font-weight:400;}

/* Leçon / CTA */
.lesson-title{
  font-family:var(--f-title);font-weight:700;font-size:70px;line-height:1.08;
  letter-spacing:-.015em;max-width:880px;
}
.cta{
  margin-top:20px;display:flex;align-items:center;flex-wrap:wrap;gap:16px;
  font-size:34px;
}
.cta-verb{font-family:var(--f-title);font-weight:600;color:rgba(255,255,255,.85);}
.cta-key{
  font-family:var(--f-title);font-weight:700;letter-spacing:.06em;font-size:36px;
  background:var(--accent);color:#fff;padding:12px 26px;border-radius:14px;
  box-shadow:0 10px 30px rgba(44,122,123,.45);
}
.cta-tail{color:rgba(255,255,255,.7);font-size:30px;}

/* Slides visuelles (image) */
.body-visual{justify-content:flex-start;gap:36px;padding-top:40px;}
.statement{font-size:42px;line-height:1.32;font-weight:500;max-width:880px;color:var(--dark);}
.photozone{
  flex:1;min-height:0;border-radius:24px;background:var(--ph);
  border:3px dashed #C6D2D2;display:flex;align-items:center;justify-content:center;
}
.photozone span{
  font-family:var(--f-title);font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;font-size:26px;color:var(--pht);
}
.photozone.clinique{background:#E9EFEF;border-color:#BFD3D3;}

/* Avant / Après (cadres horizontaux empilés) */
.beforeafter{flex:1;min-height:0;display:flex;flex-direction:column;gap:26px;}
.ba-frame{
  flex:1;border-radius:24px;background:var(--ph);border:3px dashed #C6D2D2;
  display:flex;align-items:flex-end;justify-content:flex-start;padding:24px;
}
.ba-frame span{
  font-family:var(--f-title);font-weight:700;letter-spacing:.12em;font-size:26px;
  color:var(--pht);background:#fff;padding:8px 18px;border-radius:10px;
}

/* Slides texte épurées */
.body-text{justify-content:center;gap:30px;padding-left:44px;position:relative;}
.body-text::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:8px;border-radius:8px;}
.rule-accent::before{background:var(--accent);}
.rule-brand::before{background:var(--brand);}
.switch-kicker{
  font-family:var(--f-title);font-weight:700;text-transform:uppercase;letter-spacing:.14em;
  font-size:22px;color:var(--brand);
}
.text-title{font-family:var(--f-title);font-weight:700;font-size:64px;line-height:1.1;letter-spacing:-.015em;}
.text-para{font-size:40px;line-height:1.4;font-weight:400;color:var(--dark);max-width:840px;}

/* ---------- PIED DE PAGE ---------- */
.foot{
  display:flex;align-items:center;justify-content:space-between;
  padding-top:30px;margin-top:20px;border-top:1px solid rgba(26,26,26,.12);
}
.foot.on-brand{border-top-color:rgba(255,255,255,.18);}
.foot-left{display:flex;align-items:center;gap:16px;}
.logo{height:46px;width:auto;object-fit:contain;}
.brandtext{font-family:var(--f-title);font-weight:700;font-size:28px;color:var(--brand);}
.slide.type-accroche .brandtext,.slide.type-lecon_cta .brandtext{color:#fff;}
.handle{font-size:24px;color:var(--muted);}
.foot.on-brand .handle{color:rgba(255,255,255,.7);}
.foot-right{display:flex;align-items:center;gap:22px;}
.dots{display:flex;gap:11px;}
.dot{width:12px;height:12px;border-radius:50%;background:rgba(26,26,26,.18);}
.dot.on{background:var(--accent);transform:scale(1.15);}
.foot.on-brand .dot{background:rgba(255,255,255,.28);}
.foot.on-brand .dot.on{background:#fff;}
.pageno{font-family:var(--f-title);font-weight:600;font-size:24px;color:var(--muted);}
.foot.on-brand .pageno{color:rgba(255,255,255,.8);}
</style>
</head>
<body>
  <div class="slide type-${slide.type}">
    ${bodyFor(slide.type, { slide, carrousel, cfg })}
    ${footer({ n: slide.n || index + 1, total, index, cfg, logoDataUri, onBrand })}
  </div>
</body>
</html>`;
}

module.exports = { slideHTML, cleanSerie };
