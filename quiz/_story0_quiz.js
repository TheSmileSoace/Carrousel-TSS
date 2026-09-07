const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
const bg=b64(path.join(ROOT,"assets/quiz/respiration_fond.png"),"image/png");
const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");
const opts=[["A","Aucun, c'est une habitude"],["B","Un palais plus étroit"],["C","Les dents s'usent plus vite"],["D","Un appareil règle tout"]];
const html=`<meta charset=utf-8><style>${fonts}
*{margin:0;padding:0;box-sizing:border-box}
.st{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:"Inter",sans-serif;color:#fff}
.bg{position:absolute;inset:0;background:url(${bg}) center/cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,14,10,.80),rgba(18,14,10,.52) 42%,rgba(18,14,10,.88))}
.tag{position:absolute;top:120px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:32px;letter-spacing:2px;padding:12px 36px;border-radius:999px;text-transform:uppercase;white-space:nowrap}
.badge{position:absolute;top:240px;left:50%;transform:translateX(-50%);background:#C24B3A;color:#FFF3EA;font-family:"Poppins";font-weight:700;font-size:29px;letter-spacing:1px;text-transform:uppercase;padding:12px 26px;border-radius:12px;white-space:nowrap;box-shadow:0 10px 30px #0007}
.q{position:absolute;top:390px;left:70px;right:70px;text-align:center;font-family:"Poppins";font-weight:700;font-size:60px;line-height:1.18;text-shadow:0 3px 16px #000a}
.q .hl{color:#E7C892}
.opts{position:absolute;left:80px;right:80px;top:760px;display:flex;flex-direction:column;gap:26px}
.opt{display:flex;align-items:center;gap:26px;background:rgba(255,255,255,.10);border:1.5px solid rgba(255,255,255,.28);border-radius:20px;padding:26px 32px;backdrop-filter:blur(2px)}
.opt .l{flex:0 0 auto;width:62px;height:62px;border-radius:14px;background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:38px;display:flex;align-items:center;justify-content:center}
.opt .t{font-size:41px;font-weight:500;line-height:1.15}
.foot{position:absolute;bottom:96px;left:0;right:0;display:flex;justify-content:center}
.foot img{height:104px;filter:drop-shadow(0 2px 10px #0009)}
</style>
<div class="st"><div class="bg"></div><div class="scrim"></div>
  <div class="tag">Le quiz · 03</div>
  <div class="badge">9 sur 10 se trompent</div>
  <div class="q">Ton enfant dort souvent la <span class="hl">bouche ouverte</span>.<br>Quel est le risque pour ses dents&nbsp;?</div>
  <div class="opts">
    ${opts.map(([l,t])=>`<div class="opt"><div class="l">${l}</div><div class="t">${t}</div></div>`).join("")}
  </div>
  <div class="foot"><img src="${logo}"></div>
</div>`;
(async()=>{
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:"/tmp/story0_quiz.png"}); await b.close();
  console.log("story0 quiz ok");
})();
