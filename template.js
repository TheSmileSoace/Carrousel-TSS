// =====================================================================
//  GABARIT — une slide = 1080 x 1350  (schéma 27 carrousels, v2.3)
//  Piloté par le rôle de chaque slide :
//    hook -> couverture sombre · cta -> clôture sombre
//    renversement -> pic de tension sombre plein (curiosity_loop)
//    marqueur [..] dans le texte -> zone image placeholder
//    sinon -> contenu éditorial (badge/kicker + titre + texte)
//  Métadonnées jamais dessinées : reel, gabarit, cta_conversion, cta_engagement.
// =====================================================================

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Métadonnées par type : libellé + tonalité (couleur du filet/badge)
//   accent = or (insight/twist) · brand = anthracite (solution/action) · plain = neutre
const TYPE_META = {
  revelation: { label: "LA RÉVÉLATION", tone: "accent" },
  renversement: { label: "LE RENVERSEMENT", tone: "accent" },
  mythe: { label: "LE MYTHE", tone: "accent" },
  promesse: { label: "LA PROMESSE", tone: "accent" },
  indice: { label: "L'INDICE", tone: "accent" },
  nuance: { label: "LA NUANCE", tone: "accent" },
  difference: { label: "LA DIFFÉRENCE", tone: "accent" },
  identification: { label: "CE QUE TU VOIS", tone: "plain" },
  repere: { label: "LE REPÈRE", tone: "plain" },
  explication: { label: "POURQUOI", tone: "plain" },
  causes: { label: "LES CAUSES", tone: "plain" },
  croissance: { label: "LA CROISSANCE", tone: "plain" },
  fonction: { label: "LA FONCTION", tone: "plain" },
  adulte: { label: "CHEZ L'ADULTE", tone: "plain" },
  probleme: { label: "LE PROBLÈME", tone: "plain" },
  diagnostic: { label: "LE DIAGNOSTIC", tone: "plain" },
  experience: { label: "L'EXPÉRIENCE", tone: "plain" },
  timing: { label: "LE TIMING", tone: "plain" },
  solution: { label: "LA SOLUTION", tone: "brand" },
  options: { label: "LES OPTIONS", tone: "brand" },
  alternative: { label: "L'ALTERNATIVE", tone: "brand" },
  decision: { label: "LA DÉCISION", tone: "brand" },
  indications: { label: "LES INDICATIONS", tone: "brand" },
  orientation: { label: "L'ORIENTATION", tone: "brand" },
  objectif: { label: "L'OBJECTIF", tone: "brand" },
  benefice: { label: "LE BÉNÉFICE", tone: "brand" },
  consequence: { label: "LA CONSÉQUENCE", tone: "brand" },
  lecon: { label: "LA LEÇON", tone: "brand" },
  limites: { label: "LES LIMITES", tone: "brand" },
  securite: { label: "LA SÉCURITÉ", tone: "brand" },
  discipline: { label: "LA DISCIPLINE", tone: "brand" },
  consigne: { label: "LA CONSIGNE", tone: "brand" },
  adaptation: { label: "L'ADAPTATION", tone: "brand" },
  utilite: { label: "L'UTILITÉ", tone: "brand" },
};

// Types affichant une pastille badge (comme « CE QUE TU VOIS » des 20)
const BADGE_TYPES = new Set(["identification"]);
// Slides à fond sombre plein
const DARK_TYPES = new Set(["hook", "cta", "renversement"]);

const prettyLabel = (t = "") => t.replace(/_/g, " ").toLocaleUpperCase("fr");
const metaFor = (t) => TYPE_META[t] || { label: prettyLabel(t), tone: "accent" };

// Extrait les marqueurs [..] du texte -> { labels[], text }
function splitMarkers(texte = "") {
  const re = /\[([^\]]+)\]/g;
  const labels = [];
  let m;
  while ((m = re.exec(texte))) labels.push(m[1].trim());
  const text = texte.replace(re, "").replace(/\s{2,}/g, " ").trim();
  return { labels, text };
}

// Surligne le mot-clé situé après « Écris » (issu du texte, pas d'une métadonnée)
function highlightEcris(texte = "") {
  return esc(texte).replace(
    /(Écris\s+)([0-9A-ZÀ-Ÿ][0-9A-ZÀ-Ÿ'’-]{1,})/u,
    (_, p1, p2) => `${p1}<span class="cta-key">${p2}</span>`
  );
}

function dots(activeIndex, total) {
  let out = '<div class="dots">';
  for (let i = 0; i < total; i++)
    out += `<span class="dot${i === activeIndex ? " on" : ""}"></span>`;
  return out + "</div>";
}

function footer({ n, total, index, cfg, logoDataUri, onBrand }) {
  const brandMark = logoDataUri
    ? `<span class="logo-chip"><img class="logo" src="${logoDataUri}" alt="${esc(cfg.brandName)}"/></span>`
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

// Rangée de cadres image placeholder
function frames(labels) {
  const cells = labels
    .map((l) => `<div class="frame"><span>${esc(l)}</span></div>`)
    .join("");
  return `<div class="frames n${labels.length}">${cells}</div>`;
}

function bodyFor({ slide, carrousel, cfg }) {
  const type = slide.type || "";
  const titre = esc(slide.titre || "");
  const { labels, text } = splitMarkers(slide.texte || "");
  const texteEsc = esc(text);

  // --- Couverture (hook) ---
  if (type === "hook") {
    return `
      <div class="eyebrow">${esc(carrousel.sujet || "")}</div>
      <div class="body body-cover">
        <h1 class="cover-title">${titre}</h1>
        <p class="cover-sub">${texteEsc}</p>
      </div>`;
  }

  // --- Pic de tension (renversement, curiosity_loop) ---
  if (type === "renversement") {
    return `
      <div class="body body-tension">
        <h1 class="tension-title">${titre}</h1>
        <p class="tension-sub">${texteEsc}</p>
      </div>`;
  }

  // --- Clôture (cta) : titre + texte uniquement ---
  if (type === "cta") {
    return `
      <div class="body body-cover">
        <h1 class="lesson-title">${titre}</h1>
        <p class="cta-line">${highlightEcris(text)}</p>
      </div>`;
  }

  const meta = metaFor(type);
  const badgeClass = meta.tone === "accent" ? "badge-accent" : "badge-neutral";

  // --- Zone image via marqueur(s) [..] ---
  if (labels.length) {
    return `
      <div class="badge ${badgeClass}">${esc(meta.label)}</div>
      <div class="body body-visual">
        <h2 class="visual-title">${titre}</h2>
        ${texteEsc ? `<p class="statement">${texteEsc}</p>` : ""}
        ${frames(labels)}
      </div>`;
  }

  // --- Slide à badge pastille (ex. identification) ---
  if (BADGE_TYPES.has(type)) {
    return `
      <div class="badge ${badgeClass}">${esc(meta.label)}</div>
      <div class="body body-badge">
        <h2 class="text-title">${titre}</h2>
        <p class="text-para">${texteEsc}</p>
      </div>`;
  }

  // --- Slide texte éditoriale ---
  const ruleClass = meta.tone === "brand" ? "rule-brand" : "rule-accent";
  return `
    <div class="body body-text ${ruleClass}">
      <div class="content-kicker">${esc(meta.label)}</div>
      <h2 class="text-title">${titre}</h2>
      <p class="text-para">${texteEsc}</p>
    </div>`;
}

function slideHTML({ slide, carrousel, index, total, cfg, fontsCss, logoDataUri }) {
  const { largeur, hauteur } = cfg.format;
  const c = cfg.colors;
  const onBrand = DARK_TYPES.has(slide.type);

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
  --brand-deep:${c.brandDeep || c.brand};
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
.slide.type-hook,.slide.type-cta,.slide.type-renversement{
  background:linear-gradient(160deg, var(--brand) 0%, var(--brand-deep) 100%);
  color:var(--onbrand);
}

/* ---------- EYEBROW ---------- */
.eyebrow{
  font-family:var(--f-title);font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;font-size:22px;opacity:.75;
}
.slide.type-hook .eyebrow{color:rgba(255,255,255,.7);}

/* ---------- BADGES ---------- */
.badge{
  align-self:flex-start;font-family:var(--f-title);font-weight:700;
  letter-spacing:.1em;text-transform:uppercase;font-size:24px;
  padding:16px 28px;border-radius:999px;
}
.badge-neutral{background:#F0EBE1;color:var(--brand);border:2px solid rgba(58,55,51,.16);}
.badge-accent{background:var(--accent);color:var(--dark);}

/* ---------- CORPS ---------- */
.body{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0;}

/* Couverture (hook) + clôture (cta) */
.body-cover{justify-content:center;gap:32px;}
.cover-title{font-family:var(--f-title);font-weight:700;font-size:84px;line-height:1.04;letter-spacing:-.02em;}
.cover-sub{font-size:38px;line-height:1.4;opacity:.9;max-width:840px;font-weight:400;}

.lesson-title{font-family:var(--f-title);font-weight:700;font-size:72px;line-height:1.06;letter-spacing:-.015em;max-width:900px;}
.cta-line{font-size:38px;line-height:1.4;max-width:880px;}
.cta-key{
  font-family:var(--f-title);font-weight:700;letter-spacing:.06em;
  background:var(--accent);color:var(--dark);padding:6px 20px;border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,.28);display:inline-block;
}

/* Pic de tension (renversement) — trancher visuellement */
.body-tension{justify-content:center;gap:36px;}
.tension-title{font-family:var(--f-title);font-weight:700;font-size:96px;line-height:1.0;letter-spacing:-.025em;}
.tension-sub{font-size:40px;line-height:1.38;opacity:.82;max-width:860px;font-weight:400;}

/* Slides visuelles (marqueurs image) */
.body-visual{justify-content:flex-start;gap:24px;padding-top:34px;}
.visual-title{font-family:var(--f-title);font-weight:700;font-size:52px;line-height:1.1;letter-spacing:-.01em;}
.statement{font-size:38px;line-height:1.3;font-weight:400;max-width:880px;color:var(--dark);}
.frames{flex:1;min-height:0;display:flex;gap:26px;}
.frames.n1{flex-direction:column;}
.frame{
  flex:1;min-height:0;border-radius:24px;background:var(--ph);
  border:3px dashed #D8CFC0;display:flex;align-items:flex-end;justify-content:center;padding:24px;
}
.frames.n1 .frame{align-items:center;}
.frame span{
  font-family:var(--f-title);font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  font-size:26px;color:var(--pht);background:#fff;padding:8px 18px;border-radius:10px;
}
.frames.n1 .frame span{background:transparent;}

/* Slide à badge pastille */
.body-badge{justify-content:center;gap:26px;padding-top:20px;}

/* Slides texte éditoriales */
.body-text{justify-content:center;gap:26px;padding-left:44px;position:relative;}
.body-text::before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:8px;border-radius:8px;}
.rule-accent::before{background:var(--accent);}
.rule-brand::before{background:var(--brand);}
.content-kicker{
  font-family:var(--f-title);font-weight:700;text-transform:uppercase;letter-spacing:.14em;
  font-size:23px;color:var(--brand);opacity:.85;
}
.rule-accent .content-kicker{color:#9B8250;}
.text-title{font-family:var(--f-title);font-weight:700;font-size:60px;line-height:1.1;letter-spacing:-.015em;}
.text-para{font-size:40px;line-height:1.4;font-weight:400;color:var(--dark);max-width:860px;}

/* ---------- PIED DE PAGE ---------- */
.foot{
  display:flex;align-items:center;justify-content:space-between;
  padding-top:30px;margin-top:20px;border-top:1px solid rgba(26,26,26,.12);
}
.foot.on-brand{border-top-color:rgba(255,255,255,.18);}
.foot-left{display:flex;align-items:center;gap:18px;}
.logo-chip{
  display:inline-flex;align-items:center;background:#fff;
  padding:9px 16px;border-radius:14px;box-shadow:0 3px 12px rgba(0,0,0,.08);
}
.foot.on-brand .logo-chip{box-shadow:0 4px 16px rgba(0,0,0,.28);}
.logo{height:40px;width:auto;object-fit:contain;display:block;}
.brandtext{font-family:var(--f-title);font-weight:700;font-size:28px;color:var(--brand);}
.slide.type-hook .brandtext,.slide.type-cta .brandtext,.slide.type-renversement .brandtext{color:#fff;}
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
  <div class="slide type-${esc(slide.type || "content")}">
    ${bodyFor({ slide, carrousel, cfg })}
    ${footer({ n: slide.n || index + 1, total, index, cfg, logoDataUri, onBrand })}
  </div>
</body>
</html>`;
}

module.exports = { slideHTML };
