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
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,14,10,.76),rgba(18,14,10,.44) 42%,rgba(18,14,10,.84))}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 92px}
.tag{position:absolute;top:120px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:32px;letter-spacing:2px;padding:12px 36px;border-radius:999px;text-transform:uppercase;white-space:nowrap}
.badge{width:180px;height:180px;border-radius:50%;background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:112px;display:flex;align-items:center;justify-content:center;margin-bottom:32px;box-shadow:0 18px 50px #0008}
.ans{font-family:"Poppins";font-weight:700;font-size:72px;line-height:1.12;margin-bottom:30px;text-shadow:0 3px 16px #000a}
.why{font-size:43px;line-height:1.44;font-weight:400;max-width:880px;opacity:.97;text-shadow:0 2px 12px #000a;margin-bottom:40px}
.nuance{font-size:38px;line-height:1.4;font-weight:400;max-width:900px;color:#EAD9B6;border-top:1px solid rgba(255,255,255,.22);padding-top:34px}
.nuance b{color:#F0DCB2}
.foot{position:absolute;bottom:118px;left:0;right:0;display:flex;justify-content:center}
.foot img{height:112px;filter:drop-shadow(0 2px 10px #0009)}
</style>
<div class="st"><div class="bg"></div><div class="scrim"></div>
  <div class="tag">Le quiz · 03 — la réponse</div>
  <div class="wrap">
    <div class="badge">B</div>
    <div class="ans">Un palais plus étroit</div>
    <div class="why">Bouche ouverte, la <b>langue tombe</b> au fond et n'appuie plus sur le palais&nbsp;: il <b>se resserre</b>, et les dents manquent de place.</div>
    <div class="nuance">Un <b>écarteur (expanseur) de palais</b> peut aider à mieux respirer, mais il <b>ne remplace pas</b> l'ORL et le/la logopède&nbsp;: à faire <b>en parallèle</b>, pour traiter la cause.</div>
  </div>
  <div class="foot"><img src="${logo}"></div>
</div>`;
(async()=>{
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:"/tmp/story_resp_single.png"}); await b.close();
  console.log("story unique ok");
})();
