/* Run this on the Pi first: node bench.js
   It says whether the machine can carry the world, and at what speed. */
const sim=require("./sim.node.js");
console.log("Repose — what this machine can do\n");
sim.applyScale({ix:0,N:180,width:1000,pop:5,vis:0.233},null,true);
for(let i=0;i<40;i++) sim.substep(1/40);              // warm up
function timeIt(pop){
  sim.applyScale({ix:0,N:180,width:1000,pop:pop,vis:0.233},null,true);
  for(let i=0;i<20;i++){ sim.substep(1/40); sim.evN=0; sim.dustN=0; }
  const t0=Date.now(), n=120;
  for(let i=0;i<n;i++){ sim.substep(1/40); sim.evN=0; sim.dustN=0; }
  return (Date.now()-t0)/n;
}
console.log("machines   ms per step   real-time speed it can sustain");
for(const pop of [1,50,400,2000]){
  const ms=timeIt(pop);
  const mult=1000/(40*ms);
  console.log(String(pop).padStart(8), (ms.toFixed(2)+" ms").padStart(14),
    ("  "+mult.toFixed(1)+"x").padStart(14),
    mult>=2.4?"  comfortable at 2.4x":(mult>=1?"  set TIME_MUL="+Math.max(0.5,Math.floor(mult*10)/10):"  too slow: lower the grid"));
}
console.log("\nA speed of 1x means the world advances at the same rate as the clock.");
console.log("Repose is tuned for 2.4x. Anything above 1x is watchable.");
