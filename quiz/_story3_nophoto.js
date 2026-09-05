const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
const bg=b64(path.join(ROOT,"assets/quiz/respiration_fond.png"),"image/png");
const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");
const html=`<meta charset=utf-8><style>${fonts}
*{margin:0;padding:0;box-sizing:border-box}
.st{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:"Inter",sans-serif;color:#fff}
.bg{position:absolute;inset:0;background:url(${bg}) center/cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,14,10,.78),rgba(18,14,10,.46) 42%,rgba(18,14,10,.86))}
.tag{position:absolute;top:120px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:32px;letter-spacing:2px;padding:12px 36px;border-radius:999px;text-transform:uppercase;white-space:nowrap}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 96px}
.title{font-family:"Poppins";font-weight:700;font-size:76px;line-height:1.12;text-shadow:0 3px 16px #000a;margin-bottom:44px}
.title .hl{color:#E7C892}
.bottom{font-size:45px;line-height:1.44;text-shadow:0 2px 12px #000a;max-width:900px}
.bottom b{color:#F0DCB2}
.foot{position:absolute;bottom:120px;left:0;right:0;display:flex;justify-content:center}
.foot img{height:118px;filter:drop-shadow(0 2px 10px #0009)}
</style>
<div class="st"><div class="bg"></div><div class="scrim"></div>
  <div class="tag">L'expanseur de palais</div>
  <div class="wrap">
    <div class="title">Un <span class="hl">disjoncteur</span><br>élargit le palais</div>
    <div class="bottom">Il aide à mieux respirer — mais il <b>ne remplace pas</b> l'ORL et le/la logopède. À faire <b>en parallèle</b>.</div>
  </div>
  <div class="foot"><img src="${logo}"></div>
</div>`;
(async()=>{
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:"/tmp/story3_nophoto.png"}); await b.close();
  console.log("story3 nophoto ok");
})();
