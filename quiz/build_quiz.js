#!/usr/bin/env node
// =====================================================================
//  Générateur de quiz vidéo Instagram — The Smile Space
//  - vidéo propre en fond (1080x1920), verre dépoli derrière les bandes
//  - en-tête + logo dès le début ; question et options apparaissent en fondu
//  - audio dupliqué sur 2 canaux, AAC 192k, faststart
//
//  Usage :  node quiz/build_quiz.js <video_entrée.mp4> [sortie.mp4]
//  Édite le bloc CONFIG ci-dessous.
// =====================================================================
const fs=require("fs"),path=require("path"),{execFileSync}=require("child_process");
const {chromium}=require("playwright");

const CONFIG={
  header:"Le quiz !",      // en-tête en haut (pastille or) ; "" pour masquer
  logoPos:"top",           // "top" (zone sûre, recommandé) ou "bottom"
  question:"Combien de dents de lait y a-t-il sur cette radiographie ?",
  answers:[["A","20"],["B","10"],["C","14"],["D","32"]],
  font:"poppins",          // "poppins" (charte) ou "slab" (Roboto Slab)
  paneAlpha:0.55,          // opacité des bandes
  qLeft:56,qRight:56,qTop:1258,qH:196,
  optsLeft:44,optsRight:44,optsTop:1476,optsH:196,
  // apparition (secondes depuis le début) + durée du fondu
  anim:{question:0.5, options:2.0, dur:0.4},
};

const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const ffmpeg=()=>execFileSync("python3",["-c","import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())"]).toString().trim();

// Rend un calque transparent contenant seulement les `parts` demandées.
async function renderOverlay(out, parts){
  const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
  const slab=b64(path.join(ROOT,"assets/fonts/RobotoSlab700.ttf"),"font/ttf");
  const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");
  const FF=CONFIG.font==="slab"?"Slab":"Poppins";
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/ \?/g,"&nbsp;?");
  const segs=CONFIG.answers.map(([l,t])=>`<div class="seg"><div class="lt">${l}</div><div class="tx">${esc(t)}</div></div>`).join("");
  const html=`<meta charset=utf-8><style>${fonts}
  @font-face{font-family:"Slab";src:url(${slab}) format("truetype");font-weight:700}
  *{margin:0;padding:0;box-sizing:border-box}.st{position:relative;width:1080px;height:1920px;font-family:"Inter",sans-serif}
  .pane{background:rgba(14,12,10,${CONFIG.paneAlpha});border:1.5px solid rgba(255,255,255,.18)}
  .q{position:absolute;left:${CONFIG.qLeft}px;right:${CONFIG.qRight}px;top:${CONFIG.qTop}px;height:${CONFIG.qH}px;border-radius:20px;padding:0 34px;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-family:"${FF}";font-weight:700;font-size:44px;line-height:1.14;text-shadow:0 2px 10px #000c}
  .opts{position:absolute;left:${CONFIG.optsLeft}px;right:${CONFIG.optsRight}px;top:${CONFIG.optsTop}px;height:${CONFIG.optsH}px;border-radius:20px;display:flex;align-items:center}
  .seg{flex:1;display:flex;align-items:center;justify-content:center;gap:16px}.seg+.seg{border-left:1.5px solid rgba(255,255,255,.18)}
  .lt{flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:#C3A46E;color:#211F1C;font-family:"${FF}";font-weight:700;font-size:28px;display:flex;align-items:center;justify-content:center}
  .tx{color:#fff;font-family:"${FF}";font-weight:700;font-size:50px;text-shadow:0 2px 10px #000c}
  .foot{position:absolute;left:0;right:0;bottom:30px;display:flex;align-items:center;justify-content:center}
  .foot img{height:180px}
  .header{position:absolute;top:66px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"${FF}";font-weight:700;font-size:46px;letter-spacing:1px;padding:14px 44px;border-radius:999px;box-shadow:0 10px 28px #0007;white-space:nowrap}
  .logo-top{position:absolute;top:40px;left:44px;height:150px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.55)) drop-shadow(0 4px 16px rgba(0,0,0,.35))}
  </style><div class="st">
  ${parts.top&&CONFIG.logoPos==="top"?`<img class="logo-top" src="${logo}">`:""}
  ${parts.top&&CONFIG.header?`<div class="header">${esc(CONFIG.header)}</div>`:""}
  ${parts.question?`<div class="q pane">${esc(CONFIG.question)}</div>`:""}
  ${parts.options?`<div class="opts pane">${segs}</div>`:""}
  ${parts.top&&CONFIG.logoPos!=="top"?`<div class="foot"><img src="${logo}"></div>`:""}</div>`;
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:out,omitBackground:true}); await b.close();
}

(async()=>{
  const video=process.argv[2]; const out=process.argv[3]||"sortie/reels/quiz.mp4";
  if(!video){console.error("Usage: node quiz/build_quiz.js <video.mp4> [sortie.mp4]");process.exit(1);}
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const ovTop="/tmp/_ov_top.png", ovQ="/tmp/_ov_q.png", ovO="/tmp/_ov_o.png";
  await renderOverlay(ovTop,{top:true});
  await renderOverlay(ovQ,{question:true});
  await renderOverlay(ovO,{options:true});

  const {question:Q, options:O, dur:D}=CONFIG.anim;
  const qx=CONFIG.qLeft, qw=1080-CONFIG.qLeft-CONFIG.qRight, qy=CONFIG.qTop, qh=CONFIG.qH;
  const ox=CONFIG.optsLeft, ow=1080-CONFIG.optsLeft-CONFIG.optsRight, oy=CONFIG.optsTop, oh=CONFIG.optsH;
  // frost (verre dépoli) fondu-enchaîné en même temps que chaque bande, puis calques
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
