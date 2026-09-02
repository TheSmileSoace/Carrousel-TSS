const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");

// Carte vidéo (expanseur) : x275-804, y430-1370
const CSS=`${fonts}
*{margin:0;padding:0;box-sizing:border-box}
.st{position:relative;width:1080px;height:1920px;font-family:"Inter",sans-serif;color:#fff}
.frame{position:absolute;left:271px;top:426px;width:538px;height:948px;border:3px solid rgba(255,255,255,.45);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.tag{position:absolute;top:150px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:34px;letter-spacing:2px;padding:13px 40px;border-radius:999px;text-transform:uppercase;white-space:nowrap}
.title{position:absolute;top:250px;left:90px;right:90px;text-align:center;font-family:"Poppins";font-weight:700;font-size:66px;line-height:1.12;text-shadow:0 3px 16px #000a}
.title .hl{color:#E7C892}
.bottom{position:absolute;left:80px;right:80px;top:1440px;text-align:center;font-size:44px;line-height:1.42;text-shadow:0 2px 12px #000a}
.bottom b{color:#F0DCB2}
.foot{position:absolute;bottom:96px;left:0;right:0;display:flex;justify-content:center}
.foot img{height:100px;filter:drop-shadow(0 2px 10px #0009)}
`;

function overlay({tag,title,bottom,logoOn}){
  return `<meta charset=utf-8><style>${CSS}</style><div class="st">
    <div class="frame"></div>
    <div class="tag">${tag}</div>
    ${title?`<div class="title">${title}</div>`:""}
    <div class="bottom">${bottom}</div>
    ${logoOn?`<div class="foot"><img src="${logo}"></div>`:""}
  </div>`;
}

const jobs=[
  {out:"/tmp/ov_story3.png", html:overlay({
    tag:"L'expanseur de palais",
    title:`Il élargit le <span class="hl">palais</span>`,
    bottom:`Il aide à mieux respirer — mais il <b>ne remplace pas</b> l'ORL et le/la logopède. À faire <b>en parallèle</b>.`,
    logoOn:true })},
  {out:"/tmp/ov_reel.png", html:overlay({
    tag:"Le quiz · 03 — la réponse",
    title:`Un <span class="hl">palais plus étroit</span>`,
    bottom:`On peut l'élargir avec un <b>expanseur</b> de palais — avec l'ORL et le/la logopède <b>en parallèle</b>.`,
    logoOn:true })},
];
(async()=>{
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  for(const j of jobs){
    await p.setContent(j.html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
    await p.screenshot({path:j.out,omitBackground:true}); console.log("ok",j.out);
  }
  await b.close();
})();
