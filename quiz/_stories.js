// Génère des stories "réponse" 1080x1920 on-brand (Playwright).
const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
const bg=b64(path.join(ROOT,"assets/quiz/respiration_fond.png"),"image/png");
const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");

const CSS=`${fonts}
*{margin:0;padding:0;box-sizing:border-box}
.st{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:"Inter",sans-serif;color:#fff}
.bg{position:absolute;inset:0;background:url(${bg}) center/cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,14,10,.74),rgba(18,14,10,.40) 42%,rgba(18,14,10,.82))}
.wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 96px}
.tag{position:absolute;top:120px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:32px;letter-spacing:2px;padding:12px 36px;border-radius:999px;text-transform:uppercase;white-space:nowrap}
.q{font-family:"Poppins";font-weight:600;font-size:50px;line-height:1.28;text-shadow:0 3px 16px #000a}
.hl{color:#E7C892}
.reveal{font-family:"Poppins";font-weight:700;font-size:40px;letter-spacing:3px;text-transform:uppercase;color:#E7C892;margin-bottom:30px}
.badge{width:190px;height:190px;border-radius:50%;background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:120px;display:flex;align-items:center;justify-content:center;margin:0 auto 34px;box-shadow:0 18px 50px #0008}
.ans{font-family:"Poppins";font-weight:700;font-size:74px;line-height:1.12;margin-bottom:26px;text-shadow:0 3px 16px #000a}
.why{font-size:44px;line-height:1.42;font-weight:400;max-width:880px;opacity:.96;text-shadow:0 2px 12px #000a}
.warn{font-family:"Poppins";font-weight:700;font-size:58px;line-height:1.2;margin-bottom:30px}
.cta{margin-top:52px;background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:40px;padding:22px 44px;border-radius:20px;display:inline-block}
.arrow{margin-top:44px;font-size:64px}
.foot{position:absolute;bottom:120px;left:0;right:0;display:flex;justify-content:center}
.foot img{height:120px;filter:drop-shadow(0 2px 10px #0009)}
.small{font-size:38px;opacity:.9;margin-top:22px}
`;

const stories=[
// 1 — rappel
`<div class="tag">Le quiz · 03 — la réponse</div>
 <div class="wrap">
   <div class="q">« Ton enfant dort souvent la <span class="hl">bouche ouverte</span>.<br>Quel est le risque pour ses dents ? »</div>
   <div class="arrow">👇</div>
   <div class="q" style="font-size:44px;margin-top:10px">La réponse juste après</div>
 </div>`,
// 2 — réponse
`<div class="tag">La réponse</div>
 <div class="wrap">
   <div class="badge">B</div>
   <div class="ans">Un palais plus étroit</div>
   <div class="why">Bouche ouverte, la <b>langue tombe</b> au fond et n'appuie plus sur le palais. Sans cet appui, le palais <b>se resserre</b> — et les dents manquent de place.</div>
 </div>`,
// 3 — nuance + CTA
`<div class="tag">Le piège · réponse D</div>
 <div class="wrap">
   <div class="warn">« Un appareil règle tout » ❌</div>
   <div class="why">Un appareil peut élargir le palais… mais il <b>ne débouche pas le nez</b>. On cherche d'abord <b>POURQUOI</b> l'enfant respire par la bouche : ORL, logopède, parfois allergologue.</div>
   <div class="cta">Écris RESPIRATION en MP 💬</div>
 </div>
 <div class="foot"><img src="${logo}"></div>`,
];

(async()=>{
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  for(let i=0;i<stories.length;i++){
    const html=`<meta charset=utf-8><style>${CSS}</style><div class="st"><div class="bg"></div><div class="scrim"></div>${stories[i]}</div>`;
    await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
    await p.screenshot({path:`/tmp/story_resp_${i+1}.png`});
    console.log("story",i+1,"ok");
  }
  await b.close();
})();
