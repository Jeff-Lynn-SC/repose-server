/* How big are the collapses, really? The event carries its own magnitude.
   If they cluster just above the 0.55 m test, the test is measuring the
   size of a bucket rather than the sand failing. */
const sim=require("./sim.node.js");
const MINS=+(process.argv[2]||30), POP=+(process.argv[3]||8);
const DT=1/40, STEPS=Math.round(MINS*60/DT);
sim.seedRNG(777);
sim.applyScale({ix:0,N:180,width:1000,pop:POP,vis:0.233},null,true);
sim.mixRaise=1;
for(const a of sim.machines){ a.role=0; a.sx=a.x; a.sz=a.z; a.best=0; delete a.dgx; a.pickScoop(); }
const mags=[]; let prev=0;
const best=new Map();
for(let s=0;s<STEPS;s++){
  for(const a of sim.machines) best.set(a,a.best);
  sim.substep(DT); sim.evN=0; sim.dustN=0;
  if(sim.collapses>prev){
    for(const a of sim.machines){ const b=best.get(a);
      if(b!==undefined && a.best<b-1e-9) mags.push(+(b-a.best).toFixed(2)); }
    prev=sim.collapses;
  }
}
mags.sort((x,y)=>x-y);
const bins={};
for(const m of mags){ const k=(Math.floor(m/0.25)*0.25).toFixed(2); bins[k]=(bins[k]||0)+1; }
console.log(JSON.stringify({collapses:sim.collapses, recorded:mags.length,
  median:mags.length?mags[mags.length>>1]:null, max:mags.length?mags[mags.length-1]:null,
  oneTipRaisesACellBy:+(sim.machines[0].cap*0.55).toFixed(2), bins},null,1));
