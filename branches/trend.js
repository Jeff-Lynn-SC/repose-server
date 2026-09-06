/* trend.js — does a raiser get anywhere given longer? Relief over the whole
   field, and the tallest ground, every ten minutes.
   node trend.js <raise|fill> [minutes] [pop] */
const sim=require("./sim.node.js");
const who=process.argv[2]||"raise", MINS=+(process.argv[3]||60), POP=+(process.argv[4]||8);
const DT=1/40, STEPS=Math.round(MINS*60/DT), ROLE=who==="raise"?0:1;
sim.seedRNG(777);
sim.applyScale({ix:0,N:180,width:1000,pop:POP,vis:0.233},null,true);
sim.mixRaise=ROLE===0?1:0;
for(const a of sim.machines){ a.role=ROLE;
  if(ROLE===0){ a.sx=a.x; a.sz=a.z; a.best=0; delete a.dgx; a.pickScoop(); } else a.newJob(); }
const N=sim.N, CS=sim.CS, H0=Float32Array.from(sim.h);
function relief(h,i){ const r=Math.round(38/CS), x=i%N, z=(i/N)|0; let s=0,n=0;
  for(let a=0;a<8;a++){ const px=x+Math.round(Math.cos(a*0.7853982)*r), pz=z+Math.round(Math.sin(a*0.7853982)*r);
    if(px<0||px>=N||pz<0||pz>=N) continue; s+=h[pz*N+px]; n++; }
  return n?h[i]-s/n:0; }
function field(){ let s=0,n=0; for(let i=0;i<sim.h.length;i+=2){ s+=Math.abs(relief(sim.h,i)); n++; } return s/n; }
const base=field(), out=[];
let moved=0, last=sim.machines.map(a=>a.load);
for(let s=0;s<STEPS;s++){
  sim.substep(DT); sim.evN=0; sim.dustN=0;
  const m=sim.machines;
  for(let i=0;i<m.length&&i<last.length;i++){ if(m[i].load>last[i]) moved+=(m[i].load-last[i])*CS*CS; last[i]=m[i].load; }
  if((s+1)%(40*600)===0){ const f=sim.figures;
    out.push({min:Math.round((s+1)*DT/60), relief:+field().toFixed(4), vsStart:+(field()-base).toFixed(4),
              peakOverMean:+(f.max-f.mean).toFixed(2), m3:Math.round(moved), collapses:sim.collapses}); }
}
console.log(JSON.stringify({who,cap_m3:+(sim.machines[0].cap*CS*CS).toFixed(1),startRelief:+base.toFixed(4),out},null,1));
