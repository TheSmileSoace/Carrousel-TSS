#!/usr/bin/env node
// =====================================================================
//  Générateur de quiz vidéo Instagram — The Smile Space
//  - floute le texte incrusté d'origine (verre dépoli)
//  - pose des bandes fines translucides (question + 4 réponses horizontales)
//  - ré-encode un MP4 1080x1920 (audio conservé)
//
//  Usage :  node quiz/build_quiz.js <video_entrée.mp4> [sortie.mp4]
//  Édite le bloc CONFIG ci-dessous (question, réponses, police, zone floutée).
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
  // "bands"  : floute uniquement DERRIÈRE les bandes (vidéo propre, reste net)
  // "zone"   : floute toute une zone (vidéo avec texte incrusté à masquer)
  frost:"bands",
  zone:{y:1230,h:600},     // utilisé si frost:"zone"
  qLeft:56,qRight:56,qTop:1258,qH:196,
  optsLeft:44,optsRight:44,optsTop:1476,optsH:196,
};

const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const ffmpeg=()=>execFileSync("python3",["-c","import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())"]).toString().trim();

async function renderOverlay(out){
  const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
  const slab=b64(path.join(ROOT,"assets/fonts/RobotoSlab700.ttf"),"font/ttf");
  const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");   // clair (bas, sur vidéo sombre)
  const logoDark=b64(path.join(ROOT,"assets/logo.png"),"image/png");     // foncé (haut, sur plafond clair)
  const FF=CONFIG.font==="slab"?"Slab":"Poppins";
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/ \?/g,"&nbsp;?");
  const segs=CONFIG.answers.map(([l,t])=>`<div class="seg"><div class="lt">${l}</div><div class="tx">${esc(t)}</div></div>`).join("");
  const html=`<meta charset=utf-8><style>${fonts}
  @font-face{font-family:"Slab";src:url(${slab}) format("truetype");font-weight:700}
  *{margin:0;padding:0;box-sizing:border-box}.st{position:relative;width:1080px;height:1920px;font-family:"Inter",sans-serif}
  .pane{background:rgba(14,12,10,${CONFIG.paneAlpha});border:1.5px solid rgba(255,255,255,.18)}
  .q{position:absolute;left:56px;right:56px;top:${CONFIG.qTop}px;height:${CONFIG.qH}px;border-radius:20px;padding:0 34px;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-family:"${FF}";font-weight:700;font-size:44px;line-height:1.14;text-shadow:0 2px 10px #000c}
  .opts{position:absolute;left:44px;right:44px;top:${CONFIG.optsTop}px;height:${CONFIG.optsH}px;border-radius:20px;display:flex;align-items:center}
  .seg{flex:1;display:flex;align-items:center;justify-content:center;gap:16px}.seg+.seg{border-left:1.5px solid rgba(255,255,255,.18)}
  .lt{flex:0 0 auto;width:52px;height:52px;border-radius:50%;background:#C3A46E;color:#211F1C;font-family:"${FF}";font-weight:700;font-size:28px;display:flex;align-items:center;justify-content:center}
  .tx{color:#fff;font-family:"${FF}";font-weight:700;font-size:50px;text-shadow:0 2px 10px #000c}
  .foot{position:absolute;left:0;right:0;bottom:30px;display:flex;align-items:center;justify-content:center}
  .foot img{height:180px}
  .header{position:absolute;top:66px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"${FF}";font-weight:700;font-size:46px;letter-spacing:1px;padding:14px 44px;border-radius:999px;box-shadow:0 10px 28px #0007;white-space:nowrap}
  .logo-top{position:absolute;top:44px;left:44px;display:flex;align-items:center;background:rgba(14,12,10,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(255,255,255,.16);border-radius:999px;padding:14px 30px;box-shadow:0 8px 24px #0007}
  .logo-top img{height:70px;display:block}
  </style><div class="st">
  ${CONFIG.logoPos==="top"?`<div class="logo-top"><img src="${logo}"></div>`:""}
  ${CONFIG.header?`<div class="header">${esc(CONFIG.header)}</div>`:""}
  <div class="q pane">${esc(CONFIG.question)}</div>
  <div class="opts pane">${segs}</div>
  ${CONFIG.logoPos!=="top"?`<div class="foot"><img src="${logo}"></div>`:""}</div>`;
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:out,omitBackground:true}); await b.close();
}

(async()=>{
  const video=process.argv[2]; const out=process.argv[3]||"sortie/reels/quiz.mp4";
  if(!video){console.error("Usage: node quiz/build_quiz.js <video.mp4> [sortie.mp4]");process.exit(1);}
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const ov="/tmp/_quiz_overlay.png";
  await renderOverlay(ov);
  let fc;
  if(CONFIG.frost==="zone"){
    const {y,h}=CONFIG.zone;
    fc=`[0:v]split[b][t];[t]crop=1080:${h}:0:${y},boxblur=26:2[bl];[b][bl]overlay=0:${y}[f];[f][1:v]overlay=0:0:format=auto,format=yuv420p[o]`;
  }else{
    // floute uniquement les deux rectangles des bandes (vidéo reste nette ailleurs)
    const qx=CONFIG.qLeft, qw=1080-CONFIG.qLeft-CONFIG.qRight, qy=CONFIG.qTop, qh=CONFIG.qH;
    const ox=CONFIG.optsLeft, ow=1080-CONFIG.optsLeft-CONFIG.optsRight, oy=CONFIG.optsTop, oh=CONFIG.optsH;
    fc=`[0:v]crop=${qw}:${qh}:${qx}:${qy},boxblur=20:2[bq];`
      +`[0:v]crop=${ow}:${oh}:${ox}:${oy},boxblur=20:2[ba];`
      +`[0:v][bq]overlay=${qx}:${qy}[x1];[x1][ba]overlay=${ox}:${oy}[x2];`
      +`[x2][1:v]overlay=0:0:format=auto,format=yuv420p[o]`;
  }
  // audio : duplique le son sur les 2 canaux (certaines sources n'ont le son que
  // sur un canal -> silence sur téléphone). Puis AAC 192k + faststart.
  execFileSync(ffmpeg(),["-y","-i",video,"-loop","1","-i",ov,"-filter_complex",fc,
    "-map","[o]","-map","0:a?","-af","pan=stereo|FL=c0+c1|FR=c0+c1",
    "-c:v","libx264","-crf","20","-preset","medium","-pix_fmt","yuv420p",
    "-c:a","aac","-b:a","192k","-movflags","+faststart","-shortest",out],
    {stdio:"inherit"});
  console.log("✅ "+out);
})();
