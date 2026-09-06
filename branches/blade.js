const {chromium}=require("playwright");
const fs=require("fs");
(async()=>{
  fs.mkdirSync("shots",{recursive:true});
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const p=await b.newPage({viewport:{width:1200,height:750}});
  p.on("pageerror",e=>console.log("PAGEERR",String(e).slice(0,200)));
  await p.goto("http://127.0.0.1:8099/test.html?dev&pop=1&hour=11&time=0.15",{waitUntil:"load",timeout:120000});
  await p.waitForTimeout(45000);
  const read=()=>p.evaluate(()=>{ const R=window.__R,a=R.agB; if(!a||!R.nB) return null;
      return {x:a[0],z:a[1],ang:a[2],boom:+a[3].toFixed(2),stick:+a[4].toFixed(2),buck:+a[5].toFixed(2),load:+a[7].toFixed(2)}; });
  let got=0;
  for(let k=0;k<300 && got<3;k++){
    const f=await read();
    if(!f || !(f.load < -0.30)){ await p.waitForTimeout(400); continue; }   /* negative load = shoving */
    await p.evaluate(()=>window.__R.run(false));           /* hold it still */
    await p.waitForTimeout(500);
    const g=await read();
    const shot=async(name,dth,dph,r,ahead)=>{
      await p.evaluate(([g,dth,dph,r,ahead])=>{ const R=window.__R;
        R.manualOn(g.x+Math.cos(g.ang)*ahead*R.machLen, R.BASE, g.z+Math.sin(g.ang)*ahead*R.machLen, r*R.machLen);
        R.man.th=g.ang+dth; R.man.ph=dph; },[g,dth,dph,r,ahead]);
      await p.waitForTimeout(1100);
      await p.screenshot({path:"shots/"+name+got+".png"});
    };
    await shot("blade-side",Math.PI*0.5,1.44,3.0,0.55);
    await shot("blade-back",Math.PI,1.22,4.0,-0.3);
    await shot("blade-front",-0.35,1.36,3.2,0.9);
    console.log("caught",got,JSON.stringify(g));
    got++;
    await p.evaluate(()=>window.__R.run(true));
    await p.waitForTimeout(4000);
  }
  if(!got) console.log("never caught the blade down");
  await b.close();
})();
