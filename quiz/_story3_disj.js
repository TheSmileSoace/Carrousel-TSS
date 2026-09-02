const fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
const EXEC="/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const b64=(p,m)=>`data:${m};base64,`+fs.readFileSync(p).toString("base64");
const fonts=fs.readFileSync(path.join(ROOT,"assets/fonts/fonts.css"),"utf8");
const logo=b64(path.join(ROOT,"assets/logo-light.png"),"image/png");
const img=b64(path.join(ROOT,"assets/quiz/respiration_disjoncteur.jpg"),"image/jpeg");
const html=`<meta charset=utf-8><style>${fonts}
*{margin:0;padding:0;box-sizing:border-box}
.st{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:"Inter",sans-serif;color:#fff;
 background:linear-gradient(180deg,#2C2925,#18150F)}
.tag{position:absolute;top:150px;left:50%;transform:translateX(-50%);background:#C3A46E;color:#211F1C;font-family:"Poppins";font-weight:700;font-size:34px;letter-spacing:2px;padding:13px 40px;border-radius:999px;text-transform:uppercase;white-space:nowrap}
.title{position:absolute;top:250px;left:80px;right:80px;text-align:center;font-family:"Poppins";font-weight:700;font-size:64px;line-height:1.14;text-shadow:0 3px 16px #000a}
.title .hl{color:#E7C892}
.card{position:absolute;left:80px;top:600px;width:920px;height:617px;border-radius:24px;overflow:hidden;border:4px solid rgba(255,255,255,.5);box-shadow:0 22px 60px rgba(0,0,0,.55)}
.card img{width:100%;height:100%;object-fit:cover;display:block}
.cap{position:absolute;top:1245px;left:0;right:0;text-align:center;font-family:"Poppins";font-weight:600;font-size:34px;color:#EAD9B6}
.bottom{position:absolute;left:80px;right:80px;top:1330px;text-align:center;font-size:44px;line-height:1.42;text-shadow:0 2px 12px #000a}
.bottom b{color:#F0DCB2}
.foot{position:absolute;bottom:96px;left:0;right:0;display:flex;justify-content:center}
.foot img{height:100px;filter:drop-shadow(0 2px 10px #0009)}
</style>
<div class="st">
  <div class="tag">L'expanseur de palais</div>
  <div class="title">Un <span class="hl">disjoncteur</span> élargit le palais</div>
  <div class="card"><img src="${img}"></div>
  <div class="bottom">Il aide à mieux respirer — mais il <b>ne remplace pas</b> l'ORL et le/la logopède. À faire <b>en parallèle</b>.</div>
  <div class="foot"><img src="${logo}"></div>
</div>`;
(async()=>{
  const b=await chromium.launch({executablePath:fs.existsSync(EXEC)?EXEC:undefined,args:["--no-sandbox"]});
  const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  await p.setContent(html,{waitUntil:"load"}); await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:"/tmp/story3_disjoncteur.png"}); await b.close();
  console.log("story3 disjoncteur ok");
})();
