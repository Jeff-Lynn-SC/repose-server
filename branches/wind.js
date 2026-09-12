/* wind.js — does the wind conserve sand, and does it do anything?
   node branches/wind.js [minutes] [pop] */
const sim=require("../sim.node.js");
const MINS=+(process.argv[2]||30), POP=+(process.argv[3]||0);
const DT=1/40, STEPS=Math.round(MINS*60/DT);
sim.seedRNG(777);
sim.applyScale({ix:0,N:180,width:1000,pop:POP,vis:0.233},null,true);
const h=sim.h, wear=sim.wear;
const mass=()=>{let s=0;for(let i=0;i<h.length;i++)s+=h[i];return s;};
const rough=()=>{const N=sim.N;let s=0,n=0;
  for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=z*N+x;
    const nb=(h[i-1]+h[i+1]+h[i-N]+h[i+N])*0.25; s+=Math.abs(h[i]-nb); n++;}
  return s/n;};
/* lay a patch of packed ground and a patch of loose bump, and watch them */
const N=sim.N, mid=((N/2)|0)*N+((N/2)|0);
for(let k=-3;k<=3;k++) wear[mid+k]=1;              /* a packed strip */
for(let k=-3;k<=3;k++) h[mid+20*N+k]+=0.35;        /* a loose ridge */
const m0=mass(), packed0=[], ridge0=[];
for(let k=-3;k<=3;k++){packed0.push(wear[mid+k]); ridge0.push(h[mid+20*N+k]);}
console.log(JSON.stringify({at:0,mass:+m0.toFixed(1),rough:+rough().toFixed(4),
  windStr:+sim.windStr.toFixed(3),gust:+sim.windGust.toFixed(2)}));
const every=Math.round(MINS*60/DT/6);
for(let s=1;s<=STEPS;s++){
  sim.substep(DT); sim.evN=0; sim.dustN=0;
  if(s%every===0){
    let pk=0,rg=0;
    for(let k=-3;k<=3;k++){pk+=wear[mid+k];rg+=h[mid+20*N+k];}
    console.log(JSON.stringify({at:+(s*DT/60).toFixed(0),
      mass:+mass().toFixed(1), drift:+(mass()-m0).toExponential(2),
      rough:+rough().toFixed(4),
      windStr:+sim.windStr.toFixed(3), gust:+sim.windGust.toFixed(2),
      packedStrip:+(pk/7).toFixed(3), looseRidge:+(rg/7-19.27).toFixed(3)}));
  }
}
