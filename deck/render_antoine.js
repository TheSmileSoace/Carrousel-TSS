// =====================================================================
//  Cas Mathys — deck conférence 16:9 (1920x1080) à l'identité The Smile Space
//  Reprend la charte des carrousels (Poppins/Inter, or champagne, anthracite).
//  Pied de page : logo The Smile Space + logo ULB (aucune coordonnée).
//  Rendu HTML -> PNG (Playwright). Sortie : deck/out/NN.png + notes.json
// =====================================================================
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..");
const EXEC = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = path.join(__dirname, "out_antoine");
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p, m) => `data:${m};base64,` + fs.readFileSync(p).toString("base64");
const fonts = fs.readFileSync(path.join(ROOT, "assets/fonts/fonts.css"), "utf8");
const logoDark = b64(path.join(ROOT, "assets/logo.png"), "image/png");        // fonds clairs
const logoLight = b64(path.join(ROOT, "assets/logo-light.png"), "image/png");  // fonds sombres
const ulbPath = path.join(ROOT, "assets/logo-ulb.png");
const ulb = fs.existsSync(ulbPath) ? b64(ulbPath, "image/png") : null;
const coverImgPath = path.join(ROOT, "assets/carrousels/antoine/exo/face_sourire_cutout.png");
const coverImg = fs.existsSync(coverImgPath) ? b64(coverImgPath, "image/png") : null;

// notes du conférencier (nettoyées du n° de page en fin de texte)
const RAWNOTES = JSON.parse(fs.readFileSync(path.join(__dirname, "mathys_notes.json"), "utf8"));
const N = (k) => String(RAWNOTES[String(k)] || "").replace(/\s*\d+\s*$/, "").trim();

const esc = (s = "") => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

const C = {
  brand:"#3A3733", accent:"#C3A46E", light:"#FAF7F1", dark:"#2B2926",
  brandDeep:"#221F1B", onBrand:"#FFFFFF", muted:"rgba(43,41,38,.55)",
  ph:"#ECE6DC", pht:"#B0A794",
};

function foot({ n, total, dark }) {
  const tss = dark ? logoLight : logoDark;
  const ulbMark = ulb
    ? `<img class="ulb" src="${ulb}" alt="ULB"/>`
    : `<span class="ulb-ph">ULB</span>`;
  return `<footer class="foot ${dark ? "on-brand" : ""}">
    <div class="f-left"><img class="tss" src="${tss}" alt="The Smile Space"/></div>
    <div class="f-right">
      ${ulbMark}
      <span class="pageno">${n} / ${total}</span>
    </div>
  </footer>`;
}

const frame = (label, cap = "") =>
  `<div class="frame"><span>${esc(label)}</span>${cap ? `<small>${esc(cap)}</small>` : ""}</div>`;

// cadre avec vraie photo intégrée + légende sous l'image
const AR = path.join(ROOT, "assets/carrousels/antoine");
const pimg = (sub, file, label = "", { fit = "cover", aspect = null } = {}) => {
  const src = b64(path.join(AR, sub, file), "image/jpeg");
  const cls = `pf-img ${fit}` + (aspect ? " fixed" : "");
  const style = aspect ? ` style="aspect-ratio:${aspect}"` : "";
  const cap = label ? `<figcaption>${esc(label)}</figcaption>` : "";
  return `<figure class="pf"><div class="${cls}"${style} data-photo="${sub}/${file}" data-fit="${fit}"><img src="${src}" alt=""></div>${cap}</figure>`;
};
const photo = (file, label = "") => pimg("exo", file, label);

function shell({ kind, n, total, dark, body }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
${fonts}
:root{--brand:${C.brand};--accent:${C.accent};--light:${C.light};--dark:${C.dark};
 --deep:${C.brandDeep};--onb:${C.onBrand};--muted:${C.muted};--ph:${C.ph};--pht:${C.pht};
 --ft:"Poppins","Segoe UI",system-ui,sans-serif;--fb:"Inter","Segoe UI",system-ui,sans-serif;}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px}
body{font-family:var(--fb);-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.slide{position:relative;width:1920px;height:1080px;overflow:hidden;display:flex;flex-direction:column;
 padding:70px 104px 38px;background:var(--light);color:var(--dark)}
.slide.dark{background:linear-gradient(155deg,var(--brand) 0%,var(--deep) 100%);color:var(--onb)}
.stage{flex:1;min-height:0;display:flex;flex-direction:column}

.kicker{font-family:var(--ft);font-weight:700;letter-spacing:.16em;text-transform:uppercase;
 font-size:24px;color:var(--brand);opacity:.82}
.slide.dark .kicker{color:var(--accent);opacity:1}
.h-title{font-family:var(--ft);font-weight:700;font-size:58px;line-height:1.06;letter-spacing:-.02em;margin-top:12px}
.h-sub{font-size:32px;line-height:1.34;font-weight:400;margin-top:16px;max-width:1200px;color:var(--dark)}
.slide.dark .h-sub{color:rgba(255,255,255,.86)}
.hl{color:var(--accent)}

.badge{align-self:flex-start;font-family:var(--ft);font-weight:700;letter-spacing:.1em;
 text-transform:uppercase;font-size:22px;padding:12px 26px;border-radius:999px}
.badge.accent{background:var(--accent);color:var(--dark)}

/* Cadres photo */
.grid{flex:1;min-height:0;display:grid;gap:24px;margin-top:26px}
.frame{border-radius:20px;background:var(--ph);border:3px dashed #D8CFC0;
 display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:20px;text-align:center}
.slide.dark .frame{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.24)}
.frame span{font-family:var(--ft);font-weight:700;letter-spacing:.08em;text-transform:uppercase;
 font-size:21px;color:var(--pht)}
.slide.dark .frame span{color:rgba(255,255,255,.6)}
.frame small{font-family:var(--fb);font-weight:400;font-size:19px;line-height:1.3;color:var(--pht);max-width:90%}

/* Rangée de photos intégrées */
.prow{flex:1;min-height:0;display:grid;grid-template-columns:repeat(4,1fr);gap:30px;margin-top:30px;align-items:stretch}
.pf{display:flex;flex-direction:column;gap:16px;min-height:0}
.pf-img{flex:1;min-height:0;border-radius:20px;overflow:hidden;background:#EFE7DC;box-shadow:0 16px 40px rgba(43,41,38,.10)}
.pf-img img{width:100%;height:100%;object-fit:cover;display:block}
.pf-img.contain{background:#211F1C}
.pf-img.contain img{object-fit:contain}
.pf-img.fixed{flex:none;width:100%;height:auto}
.prow.vc{align-items:center;align-content:center}
.pf figcaption{font-family:var(--ft);font-weight:600;letter-spacing:.04em;text-transform:uppercase;
 font-size:22px;color:var(--brand);text-align:center}

/* Colonnes / cartes */
.cols{flex:1;min-height:0;display:grid;gap:34px;margin-top:30px}
.card{background:#fff;border:1px solid rgba(58,55,51,.12);border-radius:22px;padding:38px 42px;
 box-shadow:0 18px 44px rgba(43,41,38,.07);display:flex;flex-direction:column}
.slide.dark .card{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.16);box-shadow:none}
.card h3{font-family:var(--ft);font-weight:700;font-size:24px;letter-spacing:.08em;text-transform:uppercase;
 color:var(--brand);margin-bottom:22px}
.slide.dark .card h3{color:var(--accent)}
.card li{list-style:none;font-size:29px;line-height:1.34;padding:11px 0 11px 34px;position:relative}
.card li::before{content:"";position:absolute;left:0;top:22px;width:14px;height:14px;border-radius:4px;background:var(--accent)}
.card li b{font-weight:600}

/* Points numérotés */
.nums{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:34px;align-items:start;align-content:center}
.num{background:#fff;border:1px solid rgba(58,55,51,.12);border-radius:22px;padding:38px 36px;
 box-shadow:0 18px 44px rgba(43,41,38,.07);display:flex;flex-direction:column}
.num .no{width:66px;height:66px;border-radius:16px;background:var(--brand);color:#fff;font-family:var(--ft);
 font-weight:700;font-size:34px;display:flex;align-items:center;justify-content:center;margin-bottom:26px}
.num h4{font-family:var(--ft);font-weight:700;font-size:33px;line-height:1.14;margin-bottom:14px}
.num p{font-size:27px;line-height:1.36;color:#57534d}

/* Liste à filet (tips / dispositif) */
.rows{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:22px;margin-top:24px}
.row{display:block;font-size:34px;line-height:1.28}
.rb{color:var(--accent);font-weight:700;margin-right:14px}
.row .rd{font-weight:600}
.row .rt{color:#57534d;font-weight:400}
.rows.tight{gap:18px}
.rows.tight .row{font-size:29px;line-height:1.24}

.keybox{margin-top:26px;align-self:flex-start;background:var(--brand);color:#fff;border-radius:18px;
 padding:26px 34px;font-size:30px;line-height:1.3;max-width:1100px}
.keybox b{color:var(--accent);font-weight:700}
.slide.dark .keybox{background:rgba(255,255,255,.10)}

.refs{display:flex;flex-wrap:wrap;gap:14px;margin-top:26px}
.ref{font-family:var(--fb);font-size:22px;color:var(--brand);background:#F0EBE1;border:1px solid rgba(58,55,51,.14);
 border-radius:999px;padding:9px 20px}
.refs-note{font-size:22px;color:var(--muted);margin-top:18px;font-style:italic}

.quote{font-family:var(--ft);font-weight:600;font-style:italic;font-size:34px;line-height:1.34;
 color:rgba(255,255,255,.9);max-width:1100px;border-left:6px solid var(--accent);padding-left:34px;margin-top:6px}

.vote-tag{align-self:flex-start;font-family:var(--ft);font-weight:700;letter-spacing:.14em;text-transform:uppercase;
 font-size:24px;color:var(--accent);margin-bottom:auto}
.vote-q{font-family:var(--ft);font-weight:700;font-size:80px;line-height:1.08;letter-spacing:-.02em;max-width:1400px}
.vote-hand{margin-top:34px;align-self:flex-start;background:var(--accent);color:var(--dark);font-family:var(--ft);
 font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:26px;padding:16px 32px;border-radius:14px}

/* Couverture / chute */
.cover-eyebrow{font-family:var(--ft);font-weight:700;letter-spacing:.2em;text-transform:uppercase;font-size:26px;color:var(--accent)}
.cover-title{font-family:var(--ft);font-weight:700;font-size:150px;line-height:.98;letter-spacing:-.03em;margin-top:22px}
.cover-meta{font-family:var(--ft);font-weight:600;font-size:36px;letter-spacing:.02em;color:rgba(255,255,255,.9);margin-top:26px}
.cover-motif{font-size:32px;line-height:1.4;color:rgba(255,255,255,.78);margin-top:16px;max-width:1100px}
.cover-motif b{color:var(--accent);font-weight:700}
.cover-fiche{font-family:var(--ft);font-weight:600;letter-spacing:.04em;font-size:24px;color:rgba(255,255,255,.62);margin-top:20px}
.cover-line{font-size:38px;font-style:italic;color:rgba(255,255,255,.72);margin-top:26px}
.close-title{font-family:var(--ft);font-weight:700;font-size:76px;line-height:1.14;letter-spacing:-.02em;max-width:1500px}
.close-title .hl{color:var(--accent)}
.close-kicker{font-family:var(--ft);font-weight:700;font-size:44px;letter-spacing:-.01em;margin-top:34px}
.kind-cover .stage{max-width:1080px}
.cover-portrait{position:absolute;right:130px;bottom:150px;height:70%;width:auto;object-fit:contain;
 object-position:bottom center;filter:drop-shadow(0 14px 44px rgba(0,0,0,.5));z-index:1}

/* Emplacement image propre (sans pointillés) */
.ph{border-radius:20px;background:#EFE7DC;display:flex;align-items:center;justify-content:center;min-height:0}
.ph span{font-family:var(--ft);font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:22px;color:#B0A794}

/* QR + citation (dia Sites d'insertion) */
.qrband{display:flex;align-items:center;gap:30px;margin-top:auto}
.qrband .pf{width:190px;flex:0 0 auto}
.qrcap{font-size:24px;line-height:1.4;color:#6a655c;max-width:820px}
.qrcap b{color:var(--brand)}

.foot{display:flex;align-items:center;justify-content:space-between;padding-top:20px;margin-top:16px;
 border-top:1px solid rgba(43,41,38,.12)}
.foot.on-brand{border-top-color:rgba(255,255,255,.18)}
.tss{height:62px;width:auto;object-fit:contain;display:block}
.f-right{display:flex;align-items:center;gap:30px}
.ulb{height:54px;width:auto;object-fit:contain;display:block;opacity:.9}
.ulb-ph{font-family:var(--ft);font-weight:700;letter-spacing:.14em;font-size:26px;color:var(--muted);
 border:2px dashed rgba(43,41,38,.28);border-radius:12px;padding:10px 22px}
.foot.on-brand .ulb-ph{color:rgba(255,255,255,.6);border-color:rgba(255,255,255,.3)}
.pageno{font-family:var(--ft);font-weight:600;font-size:26px;color:var(--muted)}
.foot.on-brand .pageno{color:rgba(255,255,255,.75)}
</style></head><body>
<div class="slide ${dark ? "dark" : ""} kind-${kind}">
  ${body}
  ${foot({ n, total, dark })}
</div></body></html>`;
}

const head = (k, t, s = "") =>
  `<div class="kicker">${esc(k)}</div><h1 class="h-title">${t}</h1>${s ? `<div class="h-sub">${s}</div>` : ""}`;
const kick = (k) => `<div class="kicker">${esc(k)}</div>`;
const ph = (label) => `<div class="ph"><span>${esc(label)}</span></div>`;
const qr = (cap) => `<div class="qrband">${pimg("qr", "wilmes_sodo2024.png", "", { fit: "contain", aspect: "1" })}<div class="qrcap">${cap}</div></div>`;

// =====================================================================
//  Contenu des slides  (note = notes conférencier)
// =====================================================================
const slides = [
  // 1 — Couverture (fond sombre)
  { kind:"cover", dark:true, note:"Deuxième patient. Antoine, 15 ans et demi. On monte d'un cran : ici, quelque chose commence à changer. (Énergie : intrigué)",
    body:`<div class="stage" style="justify-content:center">
      <div class="cover-eyebrow">The Smile Space · Cas 2</div>
      <div class="cover-title">Antoine</div>
      <div class="cover-meta">14-18 ans · 15,5 ans</div>
      <div class="cover-motif"><b>Motif —</b> dents pas droites</div>
      <div class="cover-fiche">Classe II · déficit transverse · troubles du sommeil</div>
      <div class="cover-line">« Les vis polyvalentes »</div>
    </div>
    ${coverImg ? `<img class="cover-portrait" src="${coverImg}" data-portrait="assets/carrousels/antoine/exo/face_sourire_cutout.png" alt="">` : ""}` },

  // 2 — Documentation · exo
  { kind:"exo", dark:false, note:"Le motif, l'histoire d'Antoine, les 3 avis reçus. Raconter, pas décrire.",
    body:`${kick("Cas 2 · Documentation")}
    <div class="prow" style="padding-top:26px">
      ${photo("face.jpg")}${photo("face_sourire.jpg")}${photo("profil_droit.jpg")}${photo("profil_droit_sourire.jpg")}
    </div>` },

  // 3 — Documentation · intra
  { kind:"intra", dark:false, note:"[Doc intra — latéral D / face / latéral G.] Classe II, rapports transverses.",
    body:`${kick("Cas 2 · Documentation")}
    <div class="prow vc" style="grid-template-columns:repeat(3,1fr);gap:34px;padding-top:24px">
      ${pimg("intra","droite.jpg","",{aspect:"4/3"})}${pimg("intra","face.jpg","",{aspect:"4/3"})}${pimg("intra","gauche.jpg","",{aspect:"4/3"})}
    </div>` },

  // 4 — Documentation · occlusales
  { kind:"occlu", dark:false, note:"[Vues occlusales — maxillaire / mandibulaire.] Forme d'arcade, déficit transverse.",
    body:`${kick("Cas 2 · Documentation")}
    <div class="prow vc" style="grid-template-columns:repeat(2,1fr);gap:44px;padding-top:24px">
      ${pimg("intra","haut.jpg","",{aspect:"4/3"})}${pimg("intra","bas.jpg","",{aspect:"4/3"})}
    </div>` },

  // 5 — Documentation · panoramique
  { kind:"pano", dark:false, note:"[Panoramique.] Bilan général, dents de sagesse.",
    body:`${kick("Cas 2 · Documentation")}
    <div class="prow" style="grid-template-columns:1fr;padding-top:24px">${pimg("radio","panoramique.jpg","",{fit:"contain"})}</div>` },

  // 6 — Documentation · profil (+ CVS 3-4)
  { kind:"profil", dark:false, note:"Classe II squelettique, profil convexe, croissance quasi finie.",
    body:`${kick("Cas 2 · Documentation")}
    <div class="h-sub" style="margin-top:6px"><b>Maturation vertébrale — CVS 3-4</b></div>
    <div class="prow" style="grid-template-columns:1fr 1fr;gap:40px;padding-top:16px">
      ${pimg("radio","teleradio.jpg","",{fit:"contain"})}${pimg("radio","tableau.jpg","",{fit:"contain"})}
    </div>` },

  // 7 — Le plan & mon doute (fond sombre)
  { kind:"vote", dark:true, note:"Je confirme le plan idéal (expansion chirurgicale + avancée chirurgicale) ; la maman refuse tout ; j'assume mon doute sur la 2e chirurgie.",
    body:`<div class="stage">
      <div class="vote-tag">Le plan &amp; mon doute</div>
      <div class="vote-q">3 orthodontistes · 2 chirurgies ·<br><span class="hl">la maman refuse</span></div>
      <div class="quote">« Pour la 1re, j'étais convaincu. La 2e… j'avais un doute. »</div>
    </div>` },

  // 8 — La question (fond sombre)
  { kind:"vote", dark:true, note:"Laisser la salle se positionner avant de révéler.",
    body:`<div class="stage">
      <div class="vote-tag">La question</div>
      <div class="vote-q">Vous êtes à ma place.<br><span class="hl">Qu'auriez-vous proposé</span> à la maman de ce garçon ?</div>
      <div class="quote">CVS 3-4 · presque 16 ans · Classe II · sommeil — 3 confrères → 2 chirurgies, la maman → 0.</div>
    </div>` },

  // 9 — Ma réponse : prendre le problème à l'envers
  { kind:"device", dark:false, note:"Le Herbst sur arcs aurait pris trop de temps à 16 ans ; l'ouverture du maxillaire libère les ATM et réduit déjà la Classe II. « J'avais tout prévu. »",
    body:`${head("Cas 2 · Ma réponse", `Prendre le problème <span class="hl">à l'envers</span>`)}
    <div class="grid" style="grid-template-columns:0.82fr 1.18fr;margin-top:30px;gap:40px">
      ${ph("Photo — dispositif")}
      <div class="rows tight" style="justify-content:center">
        <div class="row"><span class="rb">▪  </span><span class="rd">MARPE sur vis + vérins de distalisation</span> <span class="rt">— la sécurité</span></div>
        <div class="row"><span class="rb">▪  </span><span class="rd">Armature inférieure d'emblée</span> <span class="rt">— prête pour le Herbst</span></div>
        <div class="row"><span class="rb">▪  </span><span class="rd">Ajout en haut</span> <span class="rt">— on complète le montage</span></div>
        <div class="keybox"><b>L'idée —</b> un seul ancrage osseux, plusieurs plans possibles.</div>
      </div>
    </div>` },

  // 10 — Les petits caractères
  { kind:"evolution", dark:false, note:"« Je pensais avoir tout prévu… mais il y avait des petits caractères que je n'avais pas lus. » Puis la copine, le complexe, 6 semaines, la maman qui craque à 3 mois.",
    body:`${head("Cas 2 · Les petits caractères", `Ce que je <span class="hl">n'avais pas prévu</span>`)}
    <div class="prow vc" style="grid-template-columns:1fr 1fr;gap:44px;padding-top:24px">
      ${ph("T0 + Herbst en bouche")}${ph("Photo / vidéo — témoignage")}
    </div>` },

  // 11 — Le résultat (avant / après)
  { kind:"evolution", dark:false, note:"Correction sagittale et transverse, réponse de croissance ; « Tout le monde peut finir le cas » ; j'assume avoir capté/orienté une croissance résiduelle (pas créée).",
    body:`${head("Cas 2 · Le résultat", `Avant / <span class="hl">après</span>`)}
    <div class="prow" style="grid-template-columns:1fr 1fr;gap:40px;padding-top:16px">
      ${pimg("radio","teleradio.jpg","",{fit:"contain"})}${pimg("radio","teleradio_apres.jpg","",{fit:"contain"})}
    </div>
    <div class="refs-note" style="text-align:center">Classe II → quasi Classe III · croissance mandibulaire · vérins jamais utilisés</div>` },

  // 12 — TAD-first vs TAD-last
  { kind:"change", dark:false, note:"Armature retirée sans toucher aux vis → empreinte → labo → repose ; c'est le TAD-first qui rend ça possible ; les vérins n'ont jamais servi.",
    body:`${head("Cas 2 · TAD-first vs TAD-last", `Changer de plan <span class="hl">sans redémarrer</span>`)}
    <div class="cols" style="grid-template-columns:1fr 1fr">
      <div class="card"><h3>TAD-first</h3><ul style="padding:0;margin:0">
        <li>L'ancrage osseux <b>d'abord</b> — le reste s'y adapte</li>
        <li>Armature retirée sans toucher aux vis</li>
        <li>Empreinte → labo → repose : on change de cap</li>
      </ul></div>
      <div class="card"><h3>TAD-last</h3><ul style="padding:0;margin:0">
        <li>L'ancrage <b>en dernier</b> — le plan est figé</li>
        <li>Changer de plan = souvent redémarrer</li>
        <li>Moins d'options quand l'imprévu survient</li>
      </ul></div>
    </div>` },

  // 13 — Pour lui / pour nous
  { kind:"change", dark:false, note:"Dire lentement, avec une pause entre les deux colonnes.",
    body:`${head("Cas 2 · Ce que ça change", `Pour <span class="hl">lui</span>. Pour <span class="hl">nous</span>.`)}
    <div class="cols" style="grid-template-columns:1fr 1fr">
      <div class="card"><h3>Pour lui</h3><ul style="padding:0;margin:0">
        <li><b>2 chirurgies évitées</b></li>
        <li>Il garde son visage</li>
        <li>Respiration et sommeil corrigés</li>
      </ul></div>
      <div class="card"><h3>Pour nous</h3><ul style="padding:0;margin:0">
        <li>Un seul ancrage, deux plans, changement de cap sans redémarrer</li>
        <li>La clé chez l'ado dont la croissance est incertaine</li>
      </ul></div>
    </div>` },

  // 14 — La chute (fond sombre, sans image)
  { kind:"closing", dark:true, note:"Coupure de voix avant ; fait le pont avec Mathys.",
    body:`<div class="stage" style="justify-content:center">
      <div class="cover-eyebrow">La chute</div>
      <div class="close-title" style="margin-top:26px">Cas 1, la vis <span class="hl">ancrait</span>.<br>Ici, elle est <span class="hl">polyvalente</span>.</div>
      <div class="close-kicker">Un même ancrage osseux, deux plans, sans redémarrer.<br>La clé chez l'ado, Classe II comme Classe III.</div>
    </div>` },
];

const TOTAL = slides.length;

// Textes éditables (zones natives). Inclut aussi les textes DANS des formes
// (chiffres de carte, boîte "à cet âge", pastilles réf, "à main levée").
const TEXT_SEL = [
  ".kicker", ".h-title", ".h-sub",
  ".cover-eyebrow", ".cover-title", ".cover-meta", ".cover-motif", ".cover-fiche", ".cover-line",
  ".close-title", ".close-kicker",
  ".vote-tag", ".vote-q", ".quote",
  ".num h4", ".num p", ".card h3", ".card li",
  ".refs-note", ".pf figcaption", ".row",
  ".num .no", ".keybox", ".ref", ".vote-hand", ".ph span", ".qrcap",
];

// Formes décoratives -> objets natifs : [selector, type, options]
const SHAPE_DEFS = [
  [".card", "roundrect", { fill: "FFFFFF", line: "E7E1D5", lw: 1, rad: 22, shadow: 1 }],
  [".num", "roundrect", { fill: "FFFFFF", line: "E7E1D5", lw: 1, rad: 22, shadow: 1 }],
  [".num .no", "roundrect", { fill: "3A3733", rad: 16 }],
  [".keybox", "roundrect", { fill: "3A3733", rad: 18 }],
  [".ref", "roundrect", { fill: "F0EBE1", line: "E1D9C9", lw: 1, rad: 999 }],
  [".vote-hand", "roundrect", { fill: "C3A46E", rad: 14 }],
  [".ph", "roundrect", { fill: "EFE7DC", rad: 20 }],
];

// Mesure la géométrie + le style de chaque texte, puis le rend transparent
// (graphismes conservés). Exécuté dans le navigateur.
function measureAndHide(selectors) {
  const hex = (c) => {
    const m = (c || "").match(/\d+/g);
    if (!m) return "FFFFFF";
    return ((1 << 24) + (+m[0] << 16) + (+m[1] << 8) + +m[2]).toString(16).slice(1).toUpperCase();
  };
  const runsOf = (el) => {
    const out = [];
    const walk = (node, color, bold) => {
      node.childNodes.forEach((ch) => {
        if (ch.nodeType === 3) {
          if (ch.textContent) out.push({ t: ch.textContent, color, bold });
        } else if (ch.nodeType === 1) {
          if (ch.tagName === "BR") { out.push({ br: true }); return; }
          const cs = getComputedStyle(ch);
          walk(ch, hex(cs.color), parseInt(cs.fontWeight) >= 600);
        }
      });
    };
    const cs = getComputedStyle(el);
    walk(el, hex(cs.color), parseInt(cs.fontWeight) >= 600);
    return out;
  };
  const seen = new Set();
  const items = [];
  selectors.textSel.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el) || !el.textContent.trim()) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const mid = (cs.display === "flex" && cs.alignItems === "center") || cs.justifyContent === "center";
      items.push({
        sel, x: r.left, y: r.top, w: r.width, h: r.height,
        size: parseFloat(cs.fontSize),
        lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2,
        padL: parseFloat(cs.paddingLeft) || 0, padT: parseFloat(cs.paddingTop) || 0,
        padR: parseFloat(cs.paddingRight) || 0,
        align: cs.textAlign, mid,
        family: /Poppins/.test(cs.fontFamily) ? "Poppins" : "Inter",
        runs: runsOf(el),
      });
    });
  });
  // formes décoratives -> objets natifs
  const shapes = [];
  selectors.shapeDefs.forEach(([sel, type, opt]) => {
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      let rad = opt.rad;
      if (rad === 999) rad = Math.min(r.width, r.height) / 2;
      shapes.push({ type, x: r.left, y: r.top, w: r.width, h: r.height,
        fill: opt.fill, line: opt.line || null, lw: opt.lw || 0, rad: rad || 0, shadow: opt.shadow ? 1 : 0 });
    });
  });
  // photos (images natives)
  const photos = [];
  document.querySelectorAll("[data-photo]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const im = el.querySelector("img");
    photos.push({ x: r.left, y: r.top, w: r.width, h: r.height,
      file: el.getAttribute("data-photo"), fit: el.getAttribute("data-fit"),
      nw: im ? im.naturalWidth : 0, nh: im ? im.naturalHeight : 0 });
  });
  // pied de page + portrait de couverture
  const foot = {};
  const f = document.querySelector(".foot");
  if (f) { const r = f.getBoundingClientRect(); foot.lineY = r.top; foot.lineX0 = r.left; foot.lineX1 = r.right; foot.dark = f.classList.contains("on-brand"); }
  const tss = document.querySelector(".tss");
  if (tss) { const r = tss.getBoundingClientRect(); foot.logo = { x: r.left, y: r.top, w: r.width, h: r.height }; }
  const ulb = document.querySelector(".ulb, .ulb-ph");
  if (ulb) { const r = ulb.getBoundingClientRect(); foot.ulb = { x: r.left, y: r.top, w: r.width, h: r.height, img: ulb.tagName === "IMG" }; }
  const pg = document.querySelector(".pageno");
  if (pg) { const r = pg.getBoundingClientRect(); const cs = getComputedStyle(pg); foot.num = { x: r.left, y: r.top, w: r.width, h: r.height, size: parseFloat(cs.fontSize), color: hex(cs.color), align: cs.textAlign }; }
  const cp = document.querySelector(".cover-portrait");
  if (cp) { const r = cp.getBoundingClientRect(); foot.portrait = { x: r.left, y: r.top, w: r.width, h: r.height, src: cp.getAttribute("data-portrait") || "" }; }
  // FOND PLAT : masquer tout le contenu du .slide, ne garder que sa couleur/texture
  document.querySelectorAll(".slide > *").forEach((el) => { el.style.visibility = "hidden"; });
  return { items, shapes, photos, foot };
}

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync(EXEC) ? EXEC : undefined, args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{ width:1920, height:1080 }, deviceScaleFactor:2 });
  const notesOut = {}, textOut = {}, shapeOut = {}, photoOut = {}, footOut = {}, metaOut = {};
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const html = shell({ kind:s.kind, n:i+1, total:TOTAL, dark:s.dark, body:s.body });
    await p.setContent(html, { waitUntil:"load" });
    await p.evaluate(() => document.fonts.ready);
    const nn = String(i+1).padStart(2,"0");
    await p.screenshot({ path: path.join(OUT, `${nn}.png`) });               // aperçu complet
    const { items, shapes, photos, foot } = await p.evaluate(measureAndHide, { textSel: TEXT_SEL, shapeDefs: SHAPE_DEFS });
    await p.screenshot({ path: path.join(OUT, `${nn}_bg.png`) });            // fond plat (couleur/texture)
    const k = String(i + 1);
    textOut[k] = items; shapeOut[k] = shapes; photoOut[k] = photos; footOut[k] = foot;
    metaOut[k] = { dark: !!s.dark, kind: s.kind };
    if (s.note) notesOut[k] = s.note;
    console.log("slide", nn, s.kind, `ok (${items.length} txt, ${shapes.length} formes, ${photos.length} photos)`);
  }
  fs.writeFileSync(path.join(OUT, "notes.json"), JSON.stringify(notesOut, null, 1));
  fs.writeFileSync(path.join(OUT, "text.json"), JSON.stringify(textOut));
  fs.writeFileSync(path.join(OUT, "shapes.json"), JSON.stringify(shapeOut));
  fs.writeFileSync(path.join(OUT, "photos.json"), JSON.stringify(photoOut, null, 1));
  fs.writeFileSync(path.join(OUT, "foot.json"), JSON.stringify(footOut, null, 1));
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(metaOut, null, 1));
  await b.close();
})();
