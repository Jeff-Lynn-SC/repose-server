/* probe.js — machines alone on the kilometre, for N minutes.
   node probe.js <raise|fill> [minutes] [pop] [seed]
   Same figures the handover reports, so they compare. */
const sim=require("./sim.node.js");
const which=process.argv[2]||"fill";
const MINS=+(process.argv[3]||20);
const POP=+(process.argv[4]||1);
const SEED=+(process.argv[5]||12345);
const DT=1/40, STEPS=Math.round(MINS*60/DT);
const RAISE=0, FILL=1;
const role = which==="raise"?RAISE:FILL;

sim.seedRNG(SEED);
sim.applyScale({ix:0,N:180,width:1000,pop:POP,vis:0.233},null,true);
sim.mixRaise = role===RAISE?1:0;                 /* updateEra sets it; override after */
for(const a of sim.machines){
  a.role=role;
  if(role===RAISE){ a.sx=a.x; a.sz=a.z; a.ring=Math.random()*6.2832;
                    a.best=0; a.lastH=0; a.check=0; delete a.dgx; a.pickScoop(); }
  else a.newJob();
}
const M=sim.machines.slice();
const CS=sim.CS, cap=M[0].cap;

const st=M.map(a=>({
  a, loads:0, pushLoads:0, full:false, viaPush:false,
  still:0, stillMax:0, digSteps:0, teethSteps:0,
  pushT:0, carryT:0, toPushT:0, pushDist:0, cut:0, stalls:0, pushTries:0,
  why:{}, stillWhy:"", pushEnd:[],
  lastX:a.x, lastZ:a.z, lastLoad:a.load, lastMode:a.mode
}));
function mass(){ let s=0; const h=sim.h; for(let i=0;i<h.length;i++) s+=h[i]; return s; }
const mass0=mass();
const H0=Float32Array.from(sim.h);

/* How far a place stands above or below the ground around it — the same
   thing a filler is trying to reduce and a raiser to increase, measured the
   same way it measures it. Averaged over the cells this run actually
   touched, so an untouched kilometre does not drown the answer. */
function relief(h,i){
  const N=sim.N, CS=sim.CS, r=Math.round(38/CS);
  const x=i%N, z=(i/N)|0; let s=0,n=0;
  for(let a=0;a<8;a++){
    const px=x+Math.round(Math.cos(a*0.7853982)*r), pz=z+Math.round(Math.sin(a*0.7853982)*r);
    if(px<0||px>=N||pz<0||pz>=N) continue;
    s+=h[pz*N+px]; n++;
  }
  return n?h[i]-s/n:0;
}
function verdict(){
  const h=sim.h; let n=0, before=0, after=0, up=0, down=0;
  for(let i=0;i<h.length;i++){
    const d=h[i]-H0[i];
    if(Math.abs(d)<0.002) continue;
    n++; before+=Math.abs(relief(H0,i)); after+=Math.abs(relief(h,i));
    if(d>0) up+=d; else down-=d;
  }
  /* and the whole field, which is the only measure that cannot be diluted
     by touching more cells: how uneven the kilometre is, before and after */
  let fb=0, fa=0, fn=0;
  for(let i=0;i<h.length;i+=2){ fb+=Math.abs(relief(H0,i)); fa+=Math.abs(relief(h,i)); fn++; }
  return {cellsTouched:n,
          fieldReliefBefore:+(fb/fn).toFixed(4), fieldReliefAfter:+(fa/fn).toFixed(4),
          fieldEvenedBy:+((fb-fa)/fn).toExponential(2),
          touchedEvenedBy:n?+(((before-after)/n)).toFixed(3):0,
          raised:+up.toFixed(1), lowered:+down.toFixed(1)};
}

for(let s=0;s<STEPS;s++){
  sim.substep(DT); sim.evN=0; sim.dustN=0;
  for(const r of st){
    const a=r.a;
    const d=Math.hypot(a.x-r.lastX,a.z-r.lastZ); r.lastX=a.x; r.lastZ=a.z;
    if(d<1e-4){ r.still+=DT; if(r.still>r.stillMax){ r.stillMax=r.still; r.stillWhy=a.mode+"/"+a.state+(a.idle?"/idle":""); } } else r.still=0;
    if(r.still>5){ const k=a.mode+"/"+a.state; r.why[k]=(r.why[k]||0)+DT; }
    if(r.lastMode==="push" && a.mode!=="push") r.pushEnd.push(+(r.lastLoad/cap).toFixed(3));
    if(a.mode==="push"){ r.pushT+=DT; r.pushDist+=d; r.viaPush=true; }
    else if(a.mode==="toPush"){ r.toPushT+=DT; if(r.lastMode!=="toPush") r.pushTries++; }
    else r.carryT+=DT;
    if(a.mode==="scoop"&&a.state==="work"){ r.digSteps++; if(a.digging) r.teethSteps++; }
    if(a.load>r.lastLoad) r.cut+=a.load-r.lastLoad;
    if(r.still>5 && r.still-DT<=5) r.stalls++;
    if(a.load>=0.60*cap) r.full=true;
    if(r.full && a.load<0.05*cap){
      r.loads++; if(r.viaPush) r.pushLoads++;
      r.full=false; r.viaPush=false;
    }
    if(r.lastMode==="push" && a.mode!=="push" && !r.viaPush) r.viaPush=false;
    r.lastLoad=a.load; r.lastMode=a.mode;
  }
}
const mass1=mass();
const sum=(f)=>st.reduce((s,r)=>s+f(r),0);
const T=sum(r=>r.pushT+r.toPushT+r.carryT)||1;
console.log(JSON.stringify({
  who:which, minutes:MINS, pop:POP, seed:SEED, alive:sim.machines.length,
  loads:sum(r=>r.loads),
  pushLoads:sum(r=>r.pushLoads),
  carryLoads:sum(r=>r.loads-r.pushLoads),
  pushTries:sum(r=>r.pushTries),
  longestStill:+Math.max(...st.map(r=>r.stillMax)).toFixed(1),
  stallsOver5s:sum(r=>r.stalls),
  longestStillDoing:st.map(r=>r.stillWhy).join(","),
  secondsStalledBy:(()=>{const o={};for(const r of st)for(const k in r.why)o[k]=+((o[k]||0)+r.why[k]).toFixed(1);return o;})(),
  pushLoadAtDrop:(()=>{const v=[].concat(...st.map(r=>r.pushEnd));return v.length?{n:v.length,mean:+(v.reduce((x,y)=>x+y,0)/v.length).toFixed(2),max:+Math.max(...v).toFixed(2)}:null;})(),
  teethInSand:+(sum(r=>r.teethSteps)/Math.max(1,sum(r=>r.digSteps))).toFixed(2),
  timePushing:+(sum(r=>r.pushT)/T).toFixed(3),
  timeGoingToPush:+(sum(r=>r.toPushT)/T).toFixed(3),
  pushMetres:+sum(r=>r.pushDist).toFixed(0),
  bucketsMoved:+(sum(r=>r.cut)/cap).toFixed(1),
  massDrift:+(mass1-mass0).toExponential(2),
  ground:verdict(),
  collapses:sim.collapses
},null,1));
