// load three + live geometry + meccano geometry in node, record every part,
// and list each part whose box meets a wheel (tyre cylinder, plus boss)
const fs=require("fs"), vm=require("vm");
const ctx={console, Math, Float32Array, Uint16Array, Uint32Array, Array, Object};
ctx.self=ctx; ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("three.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("geom-current.js","utf8"),ctx);
let mec=fs.readFileSync(process.argv[2]||"geom-meccano.js","utf8");
mec=mec.replace("function mergeMec(parts){","function mergeMec(parts){ __rec(parts);");
const groups=[]; ctx.__rec=function(p){ groups.push(p.map(q=>{q.g.computeBoundingBox(); const b=q.g.boundingBox; return {min:b.min.clone(),max:b.max.clone(),mid:q.mid,bolt:!!q.isBolt,c:q.c};})); };
vm.runInContext(mec,ctx);
const names=["under","wheel","house","boom","stick","bucket"];
const WBX=ctx.WBX, WBZ=ctx.WBZ, WR=ctx.WR, WW=ctx.WW;
console.log("wheels at x=±"+WBX+" z=±"+WBZ+" r="+WR+" tyre width "+WW);
// a box meets a wheel if it overlaps the wheel's z slab and comes within WR of the axle in x-y
function meets(b,wx,wz,rad,hw){
  if(b.max.z<wz-hw||b.min.z>wz+hw) return false;
  const cx=Math.max(b.min.x,Math.min(wx,b.max.x)), cy=Math.max(b.min.y,Math.min(WR,b.max.y));
  return (cx-wx)**2+(cy-WR)**2<rad*rad;
}
[0,2].forEach(gi=>{
  const list=groups[gi]; let n=0;
  list.forEach((b,i)=>{
    const hits=[];
    for(const sx of [1,-1]) for(const sz of [1,-1]){
      if(meets(b,sx*WBX,sz*WBZ,WR*1.0,WW*0.5)) hits.push((sx>0?"front":"rear")+(sz>0?"+z":"-z")+"(tyre)");
      else if(meets(b,sx*WBX,sz*WBZ,WR*0.2,WW*0.65)) hits.push((sx>0?"front":"rear")+(sz>0?"+z":"-z")+"(boss)");
    }
    if(hits.length){ n++; console.log(names[gi],"part",i,b.bolt?"bolt":"", "x",b.min.x.toFixed(3),b.max.x.toFixed(3),"y",b.min.y.toFixed(3),b.max.y.toFixed(3),"z",b.min.z.toFixed(3),b.max.z.toFixed(3),"->",hits.join(" ")); }
  });
  console.log(names[gi],": ",n,"of",list.length,"parts meet a wheel");
});
