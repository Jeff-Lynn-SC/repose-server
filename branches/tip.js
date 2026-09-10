/* tip.js — watch every machine at a few times real speed, and the instant any
   bucket starts letting go, aim at it and shoot flat out. */
const {chromium}=require("playwright");
const fs=require("fs");
(async()=>{
  fs.mkdirSync(process.argv[2]||"shotstip",{recursive:true});
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const p=await b.newPage({viewport:{width:820,height:540}});
  const errs=[]; p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.goto("http://127.0.0.1:8099/test.html?dev&pop=3&hour=11&time=0.05",{waitUntil:"load",timeout:120000});
  await p.waitForTimeout(45000);
  console.log("booted");
  await p.evaluate(()=>{const e=document.getElementById("pad"); if(e) e.style.display="none";});

  const loads=()=>p.evaluate(()=>{ const R=window.__R,a=R.agB,n=R.nB,o=[];
    for(let i=0;i<n;i++) o.push(a[i*12+7]); return o; });
  const one=(i)=>p.evaluate((i)=>{ const R=window.__R,a=R.agB,q=i*12;
    return {x:a[q],z:a[q+1],ang:a[q+2],buck:a[q+5],load:a[q+7]}; },i);

  let prev=await loads(), got=0;
  for(let k=0;k<900 && got<3;k++){
    const cur=await loads();
    for(let i=0;i<cur.length;i++){
      if(prev[i]>0.20 && cur[i]<prev[i]-0.003){
        const g=await one(i);
        const clear=await p.evaluate((i)=>{ const R=window.__R,a=R.agB,n=R.nB,q=i*12;
          for(let j=0;j<n;j++){ if(j===i) continue; const r=j*12;
            if(Math.hypot(a[r]-a[q],a[r+1]-a[q+1])<3.2*R.machLen) return false; }
          return true; },i);
        if(!clear){ continue; }
        await p.evaluate(([g])=>{ const R=window.__R;
          R.manualOn(g.x+Math.cos(g.ang)*0.75*R.machLen, R.BASE+0.42*R.machLen,
                     g.z+Math.sin(g.ang)*0.75*R.machLen, 2.1*R.machLen);
          R.man.th=g.ang+Math.PI*0.50; R.man.ph=1.40; },[g]);
        console.log("pour on",i,prev[i].toFixed(3),"->",cur[i].toFixed(3));
        const d0=await p.evaluate(()=>window.__R.dCur);
        for(let f=0;f<8;f++){
          await p.screenshot({path:(process.argv[2]||"shotstip")+"/p"+got+"_"+f+".png"});
          await p.waitForTimeout(55);
        }
        const d1=await p.evaluate(()=>window.__R.dCur);
        console.log("  grains emitted during burst:",(d1-d0+1400*10)%1400 || (d1-d0));
        const after=await loads();
        console.log("  after burst, load",after[i].toFixed(3));
        got++; break;
      }
    }
    prev=cur;
    await p.waitForTimeout(80);
  }
  console.log("bursts",got);
  if(errs.length) console.log("ERRORS:\n"+errs.slice(0,4).join("\n"));
  await b.close();
})();
