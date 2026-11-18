// Precise clash check: every part as an oriented box; wheels as solid
// cylinders sampled densely; the arm at every pose a running pit really used.
const fs=require("fs"), vm=require("vm");
const ctx={console, Math, Float32Array, Uint16Array, Uint32Array, Array, Object};
ctx.self=ctx; ctx.window=ctx; ctx.globalThis=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("three.js","utf8"),ctx);
vm.runInContext(fs.readFileSync("geom-current.js","utf8"),ctx);
let mec=fs.readFileSync(process.argv[2]||"geom-meccano.js","utf8");
mec=mec.replace("function mergeMec(parts){","function mergeMec(parts){ __rec(parts);");
const groups=[];
ctx.__rec=function(parts){ groups.push(parts.map(obbOf)); };
function obbOf(q,idx){
  const p=q.g.attributes.position.array; let R=[[1,0,0],[0,1,0],[0,0,1]];
  if(q.perf>0 && q.pa){ const a=q.pa, c=Math.cos(a), s=Math.sin(a);
    if(q.perf===3) R=[[c,-s,0],[s,c,0],[0,0,1]];          // Rz(a): columns are local axes
    else if(q.perf===2) R=[[c,0,-s],[0,1,0],[s,0,c]];     // Ry(-a)
    else R=[[1,0,0],[0,c,s],[0,-s,c]]; }                  // Rx(-a)
  const lo=[1e9,1e9,1e9], hi=[-1e9,-1e9,-1e9];
  for(let i=0;i<p.length;i+=3){ for(let k=0;k<3;k++){ const v=R[0][k]*p[i]+R[1][k]*p[i+1]+R[2][k]*p[i+2]; if(v<lo[k])lo[k]=v; if(v>hi[k])hi[k]=v; } }
  const cl=[0,1,2].map(k=>(lo[k]+hi[k])/2), h=[0,1,2].map(k=>(hi[k]-lo[k])/2);
  const c=[0,1,2].map(r=>R[r][0]*cl[0]+R[r][1]*cl[1]+R[r][2]*cl[2]);
  const ax=[0,1,2].map(k=>[R[0][k],R[1][k],R[2][k]]);
  return {c, ax, h, bolt:!!q.isBolt, idx, perf:q.perf||0, col:q.c};
}
vm.runInContext(mec,ctx);
const [UNDER,WHEEL,HOUSE,BOOM,STICK,BUCK]=groups;
const {WBX,WBZ,WR,WW,BL}=ctx;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function sat(A,B,eps){ // true if overlapping by more than eps
  const T=sub(B.c,A.c), axes=[...A.ax,...B.ax];
  for(const a of A.ax) for(const b of B.ax){ const c=cross(a,b); const l=Math.hypot(...c); if(l>1e-6) axes.push(c.map(v=>v/l)); }
  for(const L of axes){ const ra=A.h.reduce((s,h,i)=>s+h*Math.abs(dot(A.ax[i],L)),0), rb=B.h.reduce((s,h,i)=>s+h*Math.abs(dot(B.ax[i],L)),0);
    if(Math.abs(dot(T,L))>ra+rb-eps) return false; }
  return true;
}
function xform(o,M){ // M: {R(3x3 rows),t}
  const ap=v=>[0,1,2].map(r=>M.R[r][0]*v[0]+M.R[r][1]*v[1]+M.R[r][2]*v[2]);
  const c=ap(o.c); return {...o, c:[c[0]+M.t[0],c[1]+M.t[1],c[2]+M.t[2]], ax:o.ax.map(ap)};
}
const mul=(A,B)=>({R:[0,1,2].map(r=>[0,1,2].map(k=>A.R[r][0]*B.R[0][k]+A.R[r][1]*B.R[1][k]+A.R[r][2]*B.R[2][k])),
  t:[0,1,2].map(r=>A.R[r][0]*B.t[0]+A.R[r][1]*B.t[1]+A.R[r][2]*B.t[2]+A.t[r])});
const T=(x,y,z)=>({R:[[1,0,0],[0,1,0],[0,0,1]],t:[x,y,z]});
const Rz=a=>({R:[[Math.cos(a),-Math.sin(a),0],[Math.sin(a),Math.cos(a),0],[0,0,1]],t:[0,0,0]});
// wheel sample points (tyre volume and boss), in the body frame, for a steer
function wheelPts(wx,wz,steer){
  const pts=[], cs=Math.cos(steer), sn=Math.sin(steer);
  const add=(r,a,z)=>{ const x=r*Math.cos(a), y=r*Math.sin(a); pts.push([wx+x*cs+z*sn, WR+y, wz-x*sn+z*cs]); };
  for(let i=0;i<96;i++){ const a=i/96*2*Math.PI;
    for(const rf of [0.40,0.62,0.80,0.92,1.0]) for(let j=0;j<=24;j++) add(rf*WR,a,(j/24-0.5)*WW); }
  for(let i=0;i<24;i++){ const a=i/24*2*Math.PI; for(let j=0;j<=20;j++) add(0.2*WR,a,(j/20-0.5)*WW*1.3); }
  return pts;
}
const inside=(o,p,eps)=>{ const d=sub(p,o.c); for(let i=0;i<3;i++) if(Math.abs(dot(d,o.ax[i]))>o.h[i]-eps) return false; return true; };
const WHEELS=[[WBX,WBZ,1],[WBX,-WBZ,1],[-WBX,WBZ,0],[-WBX,-WBZ,0]];
const STEERS=[0,0.5,-0.5];
const EPS=0.0005;
const BODY=[...UNDER.map(o=>({...o,g:"under"})),...HOUSE.map(o=>({...o,g:"house"}))];
// 1. body against wheels
let wb=0;
for(const [wx,wz,fr] of WHEELS) for(const st of (fr?STEERS:[0])){
  const pts=wheelPts(wx,wz,st);
  for(const o of BODY){ if(o.g==="under" && o.perf===0 && !o.bolt && o.h[2]>0.2) continue; // the axles, which go into the wheels
    const n=pts.filter(p=>inside(o,p,EPS)).length;
    if(n){ wb++; console.log("BODY/WHEEL",o.g,o.idx,(wx>0?"front":"rear")+(wz>0?"R":"L"),"steer",st,"pts",n,"c",o.c.map(v=>v.toFixed(3)).join(",")); } }
}
console.log("body against wheels:",wb,"clashes");
// 2. arm at real poses. The pivot plates, their braces and the pin are the
// boom's bearing: they are meant to meet it, as is the boom's own boss.
const PIVOT=new Set([HOUSE.length-9,HOUSE.length-8,HOUSE.length-7,HOUSE.length-6,HOUSE.length-5]);
const poses=JSON.parse(fs.readFileSync(process.argv[3]||"../srv/poses.json"));
const tally={}; let posesHit=0, wheelHit=0;
const wheelSets=[]; for(const [wx,wz,fr] of WHEELS) for(const st of (fr?STEERS:[0])) wheelSets.push({w:(wx>0?"front":"rear")+(wz>0?"R":"L"),st,pts:wheelPts(wx,wz,st)});
for(const [bm,st,bk] of poses){
  const MB=mul(T(-0.408,0.308,0.092),Rz(bm)), MS=mul(MB,T(st,0,0)), MK=mul(MS,mul(T(BL,0,0),Rz(bk)));
  const arm=[...BOOM.map(o=>({...xform(o,MB),g:"boom"})),...STICK.map(o=>({...xform(o,MS),g:"stick"})),...BUCK.map(o=>({...xform(o,MK),g:"bucket"}))];
  let hit=false;
  for(const a of arm){
    for(const o of BODY){ if(a.g==='boom' && o.g==='house' && PIVOT.has(o.idx)) continue; if(a.g==='boom' && a.idx===BOOM.length-1) continue;
      if(sat(a,o,EPS)){ const k=a.g+a.idx+" x "+o.g+o.idx; tally[k]=(tally[k]||0)+1; hit=true; } }
    for(const W of wheelSets){ if(W.st!==0) continue; if(W.pts.some(p=>inside(a,p,EPS))){ const k=a.g+a.idx+" x wheel "+W.w; tally[k]=(tally[k]||0)+1; hit=true; } }
  }
  if(hit) posesHit++;
}
console.log("poses",poses.length,"with any clash:",posesHit,"("+(100*posesHit/poses.length).toFixed(1)+"%)");
Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([k,v])=>console.log(" ",k,v));
