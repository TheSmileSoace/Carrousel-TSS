#!/usr/bin/env node
// =====================================================================
//  Maquette Quiz vidéo Instagram/TikTok — The Smile Space
//  - broll propre en fond (1080x1920) ; image médicale en carte en haut
//  - en-tête + logo dès le début ; question puis options en fondu
//  - options horizontales (réponses courtes) ou verticales (phrases)
//  - verre dépoli derrière le texte ; audio dupliqué 2 canaux ; faststart
//
//  Usage :  node quiz/build_quiz.js <rush.mp4> <sortie.mp4> [preset.json]
//  Le fichier preset.json (optionnel) surcharge le bloc CONFIG.
// =====================================================================
const fs=require("fs"),path=require("path"),{execFileSync}=require("child_process");
const {chromium}=require("playwright");

const CONFIG={
  header:"Le quiz ! #1",
  logoPos:"top",
  inset:"",                 // image médicale en carte haut (ex "assets/quiz/xxx.jpg") ; "" = aucune
  insetTop:182, insetH:500, insetSide:34,
  question:"Combien de dents de lait y a-t-il sur cette radiographie ?",
  highlight:"dents de lait",// l'objet de la question -> beige/or
  answers:[["A","20"],["B","10"],["C","14"],["D","32"]],
  optsLayout:"horizontal",  // "horizontal" (réponses courtes) ou "vertical" (phrases)
  font:"poppins",
  logoTopH:113,
  paneAlpha:0.55,
  qLeft:56,qRight:56,qTop:1258,qH:196,
  optsLeft:44,optsRight:44,optsTop:1476,optsH:196,
  anim:{question:0.5, options:2.0, dur:0.4},
};
// surcharge éventuelle depuis un preset JSON
if(process.argv[4]) Object.assign(CONFIG, JSON.parse(fs.readFileSync(process.argv[4],"utf8")));

const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const ffmpeg=()=>execFileSync("python3",["-c","import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())"]).toString().trim();

async function renderOverlay(out, parts){
  const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
  const slab=b64(path.join(ROOT,"assets/fonts/RobotoSlab700.ttf"),"font/ttf");
  const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");
  const inset=CONFIG.inset?b64(path.join(ROOT,CONFIG.inset),"image/jpeg"):null;
  const insetCircles=CONFIG.insetCircles?b64(path.join(ROOT,CONFIG.insetCircles),"image/png"):null;
  const FF=CONFIG.font==="slab"?"Slab":"Poppins";
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/ \?/g,"&nbsp;?");
  let qHtml=esc(CONFIG.question);
  const hs=Array.isArray(CONFIG.highlight)?CONFIG.highlight:(CONFIG.highlight?[CONFIG.highlight]:[]);
  for(const term of hs){const h=esc(term); qHtml=qHtml.replace(h,`<span class="hl">${h}</span>`);}
  const segsH=CONFIG.answers.map(([l,t])=>`<div class="seg"><div class="lt">${l}</div><div class="tx">${esc(t)}</div></div>`).join("");
  const rowsV=CONFIG.answers.map(([l,t])=>`<div class="rowv"><div class="l">${l}.</div><div class="t">${esc(t)}</div></div>`).join("");
  const optsBlock=CONFIG.optsLayout==="vertical"
    ? `<div class="optsV pane">${rowsV}</div>`
    : `<div class="opts pane">${segsH}</div>`;
  const html=`<meta charset=utf-8><style>${fonts}
  @font-face{font-family:"Slab";src:url(${slab}) format("truetype");font-weight:700}
  *{margin:0;padding:0;box-sizing:border-box}.st{position:relative;width:1080px;height:1920px;font-family:"Inter",sans-serif}
  .pane{background:rgba(14,12,10,${CONFIG.paneAlpha});border:1.5px solid rgba(255,255,255,.18)}
  .q{position:absolute;left:${CONFIG.qLeft}px;right:${CONFIG.qRight}px;top:${CONFIG.qTop}px;height:${CONFIG.qH}px;border-radius:20px;padding:0 34px;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-family:"${FF}";font-weight:700;font-size:44px;line-height:1.14;text-shadow:0 2px 10px #000c}
  .q .hl{color:#C3A46E}
  .opts{position:absolute;left:${CONFIG.optsLeft}px;right:${CONFIG.optsRight}px;top:${CONFIG.optsTop}px;height:${CONFIG.optsH}px;border-radius:20px;display:flex;align-items:center}
  .seg{flex:1;display:flex;align-items:center;justify-content:center;gap:16px}.seg+.seg{border-left:1.5px solid rgba(255,255,255,.18)}
  .lt{flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:#C3A46E;color:#211F1C;font-family:"${FF}";font-weight:700;font-size:28px;display:flex;align-items:center;justify-content:center}
  .tx{color:#fff;font-family:"${FF}";font-weight:700;font-size:50px;text-shadow:0 2px 10px #000c}
  .optsV{position:absolute;left:${CONFIG.optsLeft}px;right:${CONFIG.optsRight}px;top:${CONFIG.optsTop}px;height:${CONFIG.optsH}px;border-radius:20px;padding:22px 30px;display:flex;flex-direction:column;justify-content:center;gap:14px}
  .rowv{display:flex;align-items:flex-start;gap:16px}
  .rowv .l{flex:0 0 auto;min-width:42px;color:#C3A46E;font-family:"${FF}";font-weight:700;font-size:42px;line-height:1.18}
  .rowv .t{color:#fff;font-family:"${FF}";font-weight:600;font-size:40px;line-height:1.18;text-shadow:0 2px 10px #000c}
  .foot{position:absolute;left:0;right:0;bottom:30px;display:flex;align-items:center;justify-content:center}
  .foot img{height:180px}
  .header{position:absolute;top:66px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"${FF}";font-weight:700;font-size:46px;letter-spacing:1px;padding:14px 44px;border-radius:999px;box-shadow:0 10px 28px #0007;white-space:nowrap}
  .logo-top{position:absolute;top:40px;left:44px;height:${CONFIG.logoTopH}px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55)) drop-shadow(0 4px 16px rgba(0,0,0,.35))}
  .inset{position:absolute;left:${CONFIG.insetSide}px;right:${CONFIG.insetSide}px;top:${CONFIG.insetTop}px;height:${CONFIG.insetH}px;border-radius:24px;overflow:hidden;border:3px solid rgba(255,255,255,.5);box-shadow:0 16px 44px rgba(0,0,0,.5)}
  .inset img{width:100%;height:100%;object-fit:cover;object-position:${CONFIG.insetPos||"center"};display:block}
  .inset.circles{border:none;box-shadow:none}
  </style><div class="st">
  ${parts.top&&inset?`<div class="inset"><img src="${inset}"></div>`:""}
  ${parts.top&&CONFIG.logoPos==="top"?`<img class="logo-top" src="${logo}">`:""}
  ${parts.top&&CONFIG.header?`<div class="header">${esc(CONFIG.header)}</div>`:""}
  ${parts.question?`<div class="q pane"><span class="qtext">${qHtml}</span></div>`:""}
  ${parts.options&&insetCircles?`<div class="inset circles"><img src="${insetCircles}"></div>`:""}
  ${parts.options?optsBlock:""}
  ${parts.top&&CONFIG.logoPos!=="top"?`<div class="foot"><img src="${logo}"></div>`:""}</div>`;
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:out,omitBackground:true}); await b.close();
}

(async()=>{
  const video=process.argv[2]; const out=process.argv[3]||"sortie/reels/quiz.mp4";
  if(!video){console.error("Usage: node quiz/build_quiz.js <video.mp4> <sortie.mp4> [preset.json]");process.exit(1);}
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const ovTop="/tmp/_ov_top.png", ovQ="/tmp/_ov_q.png", ovO="/tmp/_ov_o.png";
  await renderOverlay(ovTop,{top:true});
  await renderOverlay(ovQ,{question:true});
  await renderOverlay(ovO,{options:true});

  const {question:Q, options:O, dur:D}=CONFIG.anim;
  const qx=CONFIG.qLeft, qw=1080-CONFIG.qLeft-CONFIG.qRight, qy=CONFIG.qTop, qh=CONFIG.qH;
  const ox=CONFIG.optsLeft, ow=1080-CONFIG.optsLeft-CONFIG.optsRight, oy=CONFIG.optsTop, oh=CONFIG.optsH;
  const fc=
    `[0:v]split=3[b0][b1][b2];`
   +`[b1]crop=${qw}:${qh}:${qx}:${qy},boxblur=20:2,format=yuva420p,fade=in:st=${Q}:d=${D}:alpha=1[bq];`
   +`[b2]crop=${ow}:${oh}:${ox}:${oy},boxblur=20:2,format=yuva420p,fade=in:st=${O}:d=${D}:alpha=1[ba];`
   +`[b0][bq]overlay=${qx}:${qy}[x1];`
   +`[x1][ba]overlay=${ox}:${oy}[x2];`
   +`[2:v]format=yuva420p,fade=in:st=${Q}:d=${D}:alpha=1[qov];`
   +`[3:v]format=yuva420p,fade=in:st=${O}:d=${D}:alpha=1[oov];`
   +`[x2][1:v]overlay=0:0[x3];`
   +`[x3][qov]overlay=0:0[x4];`
   +`[x4][oov]overlay=0:0,format=yuv420p[o]`;

  execFileSync(ffmpeg(),["-y","-i",video,
    "-loop","1","-i",ovTop,"-loop","1","-i",ovQ,"-loop","1","-i",ovO,
    "-filter_complex",fc,"-map","[o]","-map","0:a?",
    "-af","pan=stereo|FL=c0+c1|FR=c0+c1",
    "-c:v","libx264","-crf","20","-preset","medium","-pix_fmt","yuv420p",
    "-c:a","aac","-b:a","192k","-movflags","+faststart","-shortest",out],
    {stdio:"inherit"});
  console.log("✅ "+out);
})();
