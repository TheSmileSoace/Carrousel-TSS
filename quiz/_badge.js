// Génère un PNG transparent 1080x1920 avec juste le badge "difficulté" (haut-gauche).
// Usage: node quiz/_badge.js "<texte>" <out.png> [top]
const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
(async()=>{
  const txt=process.argv[2]||"Plus de 98% se trompent";
  const out=process.argv[3]||"/tmp/_badge.png";
  const top=process.argv[4]||"110";
  const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");
  const html=`<meta charset=utf-8><style>${fonts}
  *{margin:0;padding:0;box-sizing:border-box}.st{position:relative;width:1080px;height:1920px}
  .hook-badge{position:absolute;top:${top}px;left:44px;max-width:600px;background:#C24B3A;color:#FFF3EA;
  font-family:"Poppins";font-weight:700;font-size:27px;letter-spacing:1px;text-transform:uppercase;
  padding:11px 22px;border-radius:12px;box-shadow:0 8px 22px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.22);white-space:nowrap}
  </style><div class="st"><div class="hook-badge">${esc(txt)}</div></div>`;
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:out,omitBackground:true}); await b.close();
  console.log("badge -> "+out);
})();
