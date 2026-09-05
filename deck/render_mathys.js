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
const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p, m) => `data:${m};base64,` + fs.readFileSync(p).toString("base64");
const fonts = fs.readFileSync(path.join(ROOT, "assets/fonts/fonts.css"), "utf8");
const logoDark = b64(path.join(ROOT, "assets/logo.png"), "image/png");        // fonds clairs
const logoLight = b64(path.join(ROOT, "assets/logo-light.png"), "image/png");  // fonds sombres
const ulbPath = path.join(ROOT, "assets/logo-ulb.png");
const ulb = fs.existsSync(ulbPath) ? b64(ulbPath, "image/png") : null;
const coverImgPath = path.join(ROOT, "assets/carrousels/mathys/exo/face_sourire_cutout.png");
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
const AR = path.join(ROOT, "assets/carrousels/mathys");
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
.row{display:flex;align-items:flex-start;gap:26px;font-size:34px;line-height:1.28}
.row .rd{font-weight:600}
.row .rt{color:#57534d;font-weight:400}
.dot{flex:0 0 auto;width:16px;height:16px;border-radius:50%;background:var(--accent);margin-top:12px}

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
.cover-portrait{position:absolute;right:120px;bottom:96px;height:80%;width:auto;object-fit:contain;
 object-position:bottom center;filter:drop-shadow(0 14px 44px rgba(0,0,0,.5));z-index:1}

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

// =====================================================================
//  Contenu des slides  (note = notes conférencier)
// =====================================================================
const slides = [
  // 1 — Couverture (âge + motif de consultation)
  { kind:"cover", dark:true, note:N(1), body:`<div class="stage" style="justify-content:center">
      <div class="cover-eyebrow">The Smile Space · Cas 1</div>
      <div class="cover-title">Mathys</div>
      <div class="cover-meta">Denture mixte · [ … ] ans</div>
      <div class="cover-motif"><b>Motif de consultation —</b> [ … ]</div>
      <div class="cover-fiche">Angelieri A-B · déficit transverse · encombrement</div>
      <div class="cover-line">« Même outil, deux missions »</div>
    </div>
    ${coverImg ? `<img class="cover-portrait" src="${coverImg}" alt="">` : ""}` },

  // 2 — Documentation · Photos extra-orales (4 vues réelles)
  { kind:"exo", dark:false, note:N(2), body:`
    ${head("Cas 1 · Documentation", `Photos <span class="hl">extra-orales</span>`)}
    <div class="prow">
      ${photo("face.jpg")}
      ${photo("face_sourire.jpg")}
      ${photo("profil_droit.jpg")}
      ${photo("profil_droit_sourire.jpg")}
    </div>` },

  // 3 — Documentation · Photos intra-orales (D / face / G)
  { kind:"intra", dark:false, note:"[Documentation intra-orale — vues latérales et frontale.] Occlusion en intercuspidie : rapports transverses et sagittaux, encombrement.",
    body:`
    <div class="prow vc" style="grid-template-columns:repeat(3,1fr);gap:34px;padding-top:20px">
      ${pimg("intra","droite.jpg","",{aspect:"4/3"})}
      ${pimg("intra","face.jpg","",{aspect:"4/3"})}
      ${pimg("intra","gauche.jpg","",{aspect:"4/3"})}
    </div>` },

  // 4 — Documentation · Occlusales (haut / bas)
  { kind:"occlu", dark:false, note:"[Vues occlusales — arcades maxillaire et mandibulaire.] Forme d'arcade, déficit transverse, encombrement.",
    body:`
    <div class="prow vc" style="grid-template-columns:repeat(2,1fr);gap:44px;padding-top:20px">
      ${pimg("intra","haut.jpg","",{aspect:"4/3"})}
      ${pimg("intra","bas.jpg","",{aspect:"4/3"})}
    </div>` },

  // 5 — Documentation · Panoramique
  { kind:"pano", dark:false, note:"[Radiographie panoramique — denture mixte.] Présence et position des germes, séquence d'éruption, bilan général.",
    body:`
    ${head("Cas 1 · Documentation", `Radiographie <span class="hl">panoramique</span>`)}
    <div class="prow" style="grid-template-columns:1fr">
      ${pimg("radio","panoramique.jpg","",{fit:"contain"})}
    </div>` },

  // 6 — Documentation · Profil (téléradio + tracé + analyse)
  { kind:"profil", dark:false, note:"[Téléradiographie de profil + tracé + tableau de mesures.] Rapports squelettiques et dentaires ; base des mesures.",
    body:`
    ${head("Cas 1 · Documentation", `Profil — <span class="hl">tracé & analyse</span>`)}
    <div class="prow" style="grid-template-columns:1fr 1fr;gap:40px">
      ${pimg("radio","trace.jpg","",{fit:"contain"})}
      ${pimg("radio","tableau.jpg","",{fit:"contain"})}
    </div>` },

  // 7 — Participation 1
  { kind:"vote", dark:true, note:N(3), body:`<div class="stage">
      <div class="vote-tag">Participation</div>
      <div class="vote-q">Suture ouverte. Stade A-B. Aucune résistance.<br><span class="hl">Et pourtant, des vis.</span> Pourquoi ?</div>
      <div class="quote">« La première idée à laquelle on pourrait tous penser : pas de résistance, donc pas besoin de vis… »</div>
    </div>` },

  // 8 — La réponse
  { kind:"answer", dark:false, note:N(4), body:`
    ${head("Cas 1 · La réponse", `<span class="hl">Ancrage</span>, pas résistance.`)}
    <div class="nums">
      <div class="num"><div class="no">1</div><h4>La suture cède</h4><p>À cet âge elle est ouverte — elle ne résiste pas.</p></div>
      <div class="num"><div class="no">2</div><h4>Le vrai problème : l'ancrage</h4><p>Les dents de lait ne tiennent pas les forces.</p></div>
      <div class="num"><div class="no">3</div><h4>La vis ne force pas l'os</h4><p>Elle remplace un ancrage défaillant.</p></div>
    </div>
    <div class="refs">
      <span class="ref">Wilmes 2010 · PMID 21490997</span>
      <span class="ref">Méta ≤16 ans · 10.3390/app15158326</span>
      <span class="ref">Copello 2020 · 10.1111/ocr.12374</span>
      <span class="ref">Mohamed 2018 · 10.2319/091717-624.1</span>
    </div>` },

  // 9 — Le dispositif
  { kind:"device", dark:false, note:N(5), body:`
    ${head("Cas 1 · Le dispositif", `MARPE + 2 vis de <span class="hl">distalisation</span>`)}
    <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:30px">
      ${frame("Photo : MARPE + 2 vis", "occlusal + 3/4")}
      <div style="display:flex;flex-direction:column;justify-content:center;gap:20px">
        <div class="row"><div class="dot"></div><div><span class="rd">Vérin central</span> <span class="rt">— expansion transverse</span></div></div>
        <div class="row"><div class="dot"></div><div><span class="rd">2 vis de distalisation</span> <span class="rt">— recul des quadrants I et II</span></div></div>
        <div class="row"><div class="dot"></div><div><span class="rd">Ancrage osseux paramédian</span> <span class="rt">— en arrière des incisives</span></div></div>
        <div class="keybox"><b>À cet âge —</b> 7 mm d'ancrage osseux suffisent (faible résistance suturale).</div>
      </div>
    </div>` },

  // 10 — Résultats avant/après
  { kind:"results", dark:false, note:N(6), body:`
    ${head("Cas 1 · Résultats", `Avant / <span class="hl">après</span>`)}
    <div class="grid" style="grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">
      ${frame("Occlusale — AVANT")}
      ${frame("Occlusale — APRÈS")}
      ${frame("CBCT / profil — AVANT")}
      ${frame("CBCT / profil — APRÈS")}
    </div>` },

  // 11 — Vidéo (pose)
  { kind:"video", dark:false, note:N(7), body:`
    ${head("Vidéo", `La pose, en <span class="hl">trente secondes</span>.`)}
    <div class="grid" style="grid-template-columns:1.15fr .85fr;margin-top:30px">
      ${frame("Vidéo : pose des vis")}
      <div class="card">
        <h3>Le tempo</h3>
        <ul style="padding:0;margin:0">
          <li>On repère.</li>
          <li>Un quart de tour, deux, trois… la <b>stabilité primaire</b>.</li>
          <li>Pas de forcing — on s'arrête quand la tête touche la gencive.</li>
        </ul>
      </div>
    </div>` },

  // 12 — Participation 2
  { kind:"vote", dark:true, note:N(8), body:`<div class="stage">
      <div class="vote-tag">Participation</div>
      <div class="vote-q">L'ancrage bicortical —<br><span class="hl">indispensable à 12 ans ?</span></div>
      <div class="vote-hand">✋ À main levée</div>
    </div>` },

  // 13 — Tips & protocole
  { kind:"tips", dark:false, note:N(9), body:`
    ${head("Cas 1 · Tips & protocole", `<span class="hl">7 mm</span> suffisent.`)}
    <div class="rows">
      <div class="row"><div class="dot"></div><div><span class="rd">T-zone</span> <span class="rt">— ni guide ni bicortical nécessaires à cet âge</span></div></div>
      <div class="row"><div class="dot"></div><div><span class="rd">7 mm d'ancrage osseux</span> <span class="rt">— faible résistance suturale</span></div></div>
      <div class="row"><div class="dot"></div><div><span class="rd">Double charge (expansion + distalisation)</span> <span class="rt">— stabilité primaire critique</span></div></div>
      <div class="row"><div class="dot"></div><div><span class="rd">Vigilance</span> <span class="rt">— bascule · rotation disto-palatine · dimension verticale</span></div></div>
    </div>
    <div class="refs-note">« 7 mm, dans ma pratique » — expérience clinique, pas un seuil publié.</div>` },

  // 14 — Ce que ça change (deux colonnes)
  { kind:"change", dark:false, note:N(10), body:`
    ${head("Cas 1 · Ce que ça change", `Pour <span class="hl">lui</span>. Pour <span class="hl">nous</span>.`)}
    <div class="cols" style="grid-template-columns:1fr 1fr">
      <div class="card"><h3>Pour le patient</h3><ul style="padding:0;margin:0">
        <li>Traité <b>au bon moment</b>, sans compensation dentaire</li>
        <li>Il aborde l'adolescence avec une bouche fonctionnelle</li>
        <li>Il respire et dort mieux — au moment où le regard des autres compte le plus</li>
      </ul></div>
      <div class="card"><h3>Pour l'orthodontiste</h3><ul style="padding:0;margin:0">
        <li>Un ancrage fiable même quand la denture ne suit pas</li>
        <li>Un geste simple : 7 mm, T-zone, pas de guide</li>
        <li>Reproductible — on repense la fenêtre d'intervention</li>
      </ul></div>
    </div>` },

  // 15 — La chute
  { kind:"closing", dark:true, note:N(11), body:`<div class="stage" style="justify-content:center">
      <div class="cover-eyebrow">La leçon</div>
      <div class="close-title" style="margin-top:26px">Chez l'adulte, la vis <span class="hl">vainc l'os</span>.<br>Chez l'enfant, elle ne vainc rien : elle <span class="hl">ancre</span>.</div>
      <div class="close-kicker">Même outil, deux missions.</div>
    </div>` },
];

const TOTAL = slides.length;

// Sélecteurs des textes rendus ÉDITABLES dans le .pptx (posés en zones de texte
// natives par-dessus un fond sans texte). Le reste (pastilles, puces, chiffres,
// logos) reste graphique.
const TEXT_SEL = [
  ".kicker", ".h-title", ".h-sub",
  ".cover-eyebrow", ".cover-title", ".cover-meta", ".cover-motif", ".cover-fiche", ".cover-line",
  ".close-title", ".close-kicker",
  ".vote-tag", ".vote-q", ".quote",
  ".num h4", ".num p", ".card h3", ".card li",
  ".refs-note", ".pf figcaption", ".row div:last-child",
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
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (seen.has(el) || !el.textContent.trim()) return;
      seen.add(el);
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      items.push({
        x: r.left, y: r.top, w: r.width, h: r.height,
        size: parseFloat(cs.fontSize),
        lh: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2,
        padL: parseFloat(cs.paddingLeft) || 0,
        align: cs.textAlign, valign: cs.justifyContent,
        family: /Poppins/.test(cs.fontFamily) ? "Poppins" : "Inter",
        runs: runsOf(el),
      });
    });
  });
  // masquer le texte (glyphes) en conservant les graphismes
  seen.forEach((el) => {
    el.style.textShadow = "none";
    el.style.color = "transparent";
    el.querySelectorAll("*").forEach((c) => { c.style.color = "transparent"; c.style.textShadow = "none"; });
  });
  // photos : mesurer puis retirer du fond (posées en images natives dans le .pptx)
  const photos = [];
  document.querySelectorAll("[data-photo]").forEach((el) => {
    const r = el.getBoundingClientRect();
    const im = el.querySelector("img");
    photos.push({
      x: r.left, y: r.top, w: r.width, h: r.height,
      file: el.getAttribute("data-photo"), fit: el.getAttribute("data-fit"),
      nw: im ? im.naturalWidth : 0, nh: im ? im.naturalHeight : 0,
    });
    const fig = el.closest(".pf") || el;
    fig.style.visibility = "hidden";
  });
  return { items, photos };
}

(async () => {
  const b = await chromium.launch({ executablePath: fs.existsSync(EXEC) ? EXEC : undefined, args:["--no-sandbox"] });
  const p = await b.newPage({ viewport:{ width:1920, height:1080 }, deviceScaleFactor:2 });
  const notesOut = {};
  const textOut = {};
  const photoOut = {};
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const html = shell({ kind:s.kind, n:i+1, total:TOTAL, dark:s.dark, body:s.body });
    await p.setContent(html, { waitUntil:"load" });
    await p.evaluate(() => document.fonts.ready);
    const nn = String(i+1).padStart(2,"0");
    // rendu complet (aperçu) puis rendu "fond sans texte ni photo" pour le .pptx éditable
    await p.screenshot({ path: path.join(OUT, `${nn}.png`) });
    const { items, photos } = await p.evaluate(measureAndHide, TEXT_SEL);
    await p.screenshot({ path: path.join(OUT, `${nn}_bg.png`) });
    textOut[String(i + 1)] = items;
    photoOut[String(i + 1)] = photos;
    if (s.note) notesOut[String(i+1)] = s.note;
    console.log("slide", nn, s.kind, "ok", "(" + items.length + " textes, " + photos.length + " photos)");
  }
  fs.writeFileSync(path.join(OUT, "notes.json"), JSON.stringify(notesOut, null, 1));
  fs.writeFileSync(path.join(OUT, "text.json"), JSON.stringify(textOut));
  fs.writeFileSync(path.join(OUT, "photos.json"), JSON.stringify(photoOut, null, 1));
  await b.close();
})();
