/* soak.js — a whole pit left to itself, to see that nothing degenerates.
   node soak.js [minutes] [pop] [seed] */
const sim=require("./sim.node.js");
const MINS=+(process.argv[2]||60), POP=+(process.argv[3]||40), SEED=+(process.argv[4]||99);
const DT=1/40, STEPS=Math.round(MINS*60/DT);
sim.seedRNG(SEED);
sim.applyScale({ix:1,N:180,width:1000,pop:POP,vis:0.233},null,true);
function mass(){ let s=0; const h=sim.h; for(let i=0;i<h.length;i++) s+=h[i]; return s; }
const m0=mass();
let modes={}, nan=0, worst=0, sample=0;
for(let s=0;s<STEPS;s++){
  sim.substep(DT); sim.evN=0; sim.dustN=0;
  if((s&63)===0){
    for(const a of sim.machines){
      modes[a.mode]=(modes[a.mode]||0)+1;
      if(!isFinite(a.x)||!isFinite(a.z)||!isFinite(a.load)||!isFinite(a.boom)) nan++;
    }
    sample++;
    const d=Math.abs(mass()-m0); if(d>worst) worst=d;
  }
}
const f=sim.figures;
console.log(JSON.stringify({
  minutes:MINS, pop:POP, alive:f.alive, births:f.births, deaths:f.deaths,
  modes, nonFinite:nan,
  massStart:+m0.toFixed(1), massEnd:+mass().toFixed(1), worstDrift:+worst.toFixed(3),
  peak:+f.max.toFixed(2), lowest:+f.min.toFixed(2), gini:+f.gini.toFixed(3),
  collapses:sim.collapses, stripped:+f.stripped.toFixed(3)
},null,1));
