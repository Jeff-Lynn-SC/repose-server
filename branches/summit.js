/* summit.js — what a raiser is actually trying to do: make its own summit
   stand higher above the ground around it. Measured at each machine's own
   summit rather than averaged over a kilometre it cannot reach.
   node summit.js [minutes] [pop] */
const sim=require("./sim.node.js");
const MINS=+(process.argv[2]||30), POP=+(process.argv[3]||8);
const DT=1/40, STEPS=Math.round(MINS*60/DT);
sim.seedRNG(777);
sim.applyScale({ix:0,N:180,width:1000,pop:POP,vis:0.233},null,true);
sim.mixRaise=1;
for(const a of sim.machines){ a.role=0; a.sx=a.x; a.sz=a.z; a.best=0; delete a.dgx; a.pickScoop(); }
const N=sim.N, CS=sim.CS, HALF=sim.HALF;
function hAt(x,z){ const gx=((x+HALF)/CS)|0, gz=((z+HALF)/CS)|0;
  return (gx<0||gz<0||gx>=N||gz>=N)?0:sim.h[gz*N+gx]; }
/* how far a place stands above the ground around it, the machine's own measure */
function relief(x,z){ const r=38; let s=0,n=0;
  for(let a=0;a<8;a++){ const th=a*0.7853982, px=x+Math.cos(th)*r, pz=z+Math.sin(th)*r;
    if(px<-HALF||px>HALF||pz<-HALF||pz>HALF) continue; s+=hAt(px,pz); n++; }
  return n?hAt(x,z)-s/n:0; }
const M=sim.machines.slice();
const start=M.map(a=>relief(a.sx,a.sz));
const out=[]; let moved=0, last=M.map(a=>a.load);
for(let s=0;s<STEPS;s++){
  sim.substep(DT); sim.evN=0; sim.dustN=0;
  for(let i=0;i<M.length;i++){ if(M[i].load>last[i]) moved+=(M[i].load-last[i])*CS*CS; last[i]=M[i].load; }
  if((s+1)%(40*300)===0){
    let sum=0,n=0,best=-9;
    for(const a of M){ const r=relief(a.sx,a.sz); sum+=r; n++; if(r>best) best=r; }
    out.push({min:Math.round((s+1)*DT/60), meanSummitRelief:+(sum/n).toFixed(2),
      tallest:+best.toFixed(2), m3:Math.round(moved), collapses:sim.collapses});
  }
}
console.log(JSON.stringify({cap_m3:+(M[0].cap*CS*CS).toFixed(1),
  startMeanSummitRelief:+(start.reduce((a,b)=>a+b,0)/start.length).toFixed(2), out},null,1));
