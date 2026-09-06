const {chromium}=require("playwright");
const fs=require("fs");
(async()=>{
  fs.mkdirSync("shots",{recursive:true});
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
  const p=await b.newPage({viewport:{width:1200,height:750}});
  p.on("pageerror",e=>console.log("PAGEERR",String(e).slice(0,300)));
  await p.goto("http://127.0.0.1:8099/test.html?dev&pop=6&hour=11&shot=cab&time=0.3",{waitUntil:"load",timeout:120000});
  await p.waitForTimeout(50000);
  for(let k=0;k<6;k++){
    await p.screenshot({path:"shots/cab"+k+".png"});
    console.log("cab",k);
    await p.waitForTimeout(7000);
  }
  await b.close();
})();
