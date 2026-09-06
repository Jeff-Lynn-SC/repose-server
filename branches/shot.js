/* shot.js — boot the world in a headless browser, aim at a machine, look.
   node shot.js <outdir> [seconds-to-boot] [query]  */
const {chromium}=require("playwright");
const fs=require("fs");

(async()=>{
  const out=process.argv[2]||"shots";
  const boot=+(process.argv[3]||35);
  const q=process.argv[4]||"?dev&pop=2";
  fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const p=await b.newPage({viewport:{width:1280,height:800}});
  const errs=[];
  p.on("pageerror",e=>errs.push(String(e)));
  p.on("console",m=>{ if(m.type()==="error") errs.push("console: "+m.text()); });
  await p.goto("http://127.0.0.1:8099/test.html"+q,{waitUntil:"load",timeout:120000});
  await p.waitForTimeout(boot*1000);

  const ok=await p.evaluate(()=>!!(window.__R&&window.__R.agB&&window.__R.nB));
  if(!ok){ console.log("world not up"); console.log(errs.slice(0,10).join("\n")); await b.close(); return; }

  /* every machine, then a close look at each of the first few */
  const info=await p.evaluate(()=>{
    const R=window.__R, a=R.agB, n=R.nB, out=[];
    for(let i=0;i<n;i++){ const p=i*12;
      out.push({x:+a[p].toFixed(1),z:+a[p+1].toFixed(1),ang:+a[p+2].toFixed(2),
                boom:+a[p+3].toFixed(2),stick:+a[p+4].toFixed(2),buck:+a[p+5].toFixed(2),
                load:+a[p+7].toFixed(3),role:a[p+8]}); }
    return out;
  });
  console.log(JSON.stringify(info));

  for(let i=0;i<Math.min(info.length,4);i++){
    await p.evaluate((i)=>{
      const R=window.__R, a=R.agB, p=i*12;
      R.manualOn(a[p], R.BASE, a[p+1], 8.0*R.machLen);
      R.man.th=-0.55; R.man.ph=1.12;
    },i);
    await p.waitForTimeout(2500);
    await p.screenshot({path:out+"/m"+i+".png"});
  }
  /* and the ground from above, to see what the work has left behind */
  await p.evaluate(()=>{ const R=window.__R; R.manualOn(0,R.BASE,0,R.HALF*0.9); R.man.ph=0.55; });
  await p.waitForTimeout(600);
  await p.screenshot({path:out+"/wide.png"});
  if(errs.length) console.log("ERRORS:\n"+errs.slice(0,10).join("\n"));
  await b.close();
})();
